import os
import sys
import uuid
import base64
import re
from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import FastAPI, File, UploadFile, HTTPException, Query, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import uvicorn

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from pdf_parser import parse_pdf_document, render_page_to_png
from pdf_filler import fill_pdf_template
from auth_utils import create_access_token, verify_access_token
from database import (
    init_db,
    get_template_by_fingerprint,
    save_or_update_template,
    list_templates,
    delete_template,
    create_user,
    authenticate_user,
    get_user_by_id,
    get_user_by_portal_slug,
    update_user_profile,
    save_user_form,
    get_form_by_id,
    get_form_by_slug,
    list_user_forms,
    set_form_status,
    delete_user_form,
    get_public_portal_catalog,
)
from template_matcher import compute_document_fingerprint

# Initialize SQLite database (templates, users, forms)
init_db()

app = FastAPI(
    title="ConsularDoc Backend API",
    description="Automated Interactive Web Form Generation and Coordinate-Accurate PDF Stamping for Diplomatic and Consular Services",
    version="2.0.0",
)

# Enable CORS for React frontend (supports localhost, *.vercel.app, and custom CORS_ORIGINS)
cors_env = os.environ.get("CORS_ORIGINS", "")
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
if cors_env:
    allowed_origins.extend([o.strip() for o in cors_env.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://([a-zA-Z0-9-]+\.)*vercel\.app(:\d+)?$|^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory document cache {doc_id: {"bytes": b"...", "parsed": {...}, "filename": "..."}}
DOCUMENTS_CACHE: Dict[str, Dict[str, Any]] = {}

# Ensure upload storage folder exists
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Load pre-generated sample document into cache on startup
SAMPLE_PDF_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample_document.pdf")
if os.path.exists(SAMPLE_PDF_PATH):
    try:
        with open(SAMPLE_PDF_PATH, "rb") as f:
            sample_bytes = f.read()
            sample_parsed = parse_pdf_document(sample_bytes, filename="Syllabus_Enrollment_Form_2026.pdf")
            DOCUMENTS_CACHE["sample"] = {
                "bytes": sample_bytes,
                "parsed": sample_parsed,
                "filename": "Syllabus_Enrollment_Form_2026.pdf",
            }
    except Exception as e:
        print(f"Warning: Could not pre-load sample document: {e}")

# Pre-load any existing files from uploads directory
if os.path.exists(UPLOAD_DIR):
    for fname in os.listdir(UPLOAD_DIR):
        if fname.endswith(".pdf"):
            try:
                parts = fname.split("_", 1)
                d_id = parts[0]
                original_name = parts[1] if len(parts) > 1 else fname
                f_path = os.path.join(UPLOAD_DIR, fname)
                with open(f_path, "rb") as f:
                    content = f.read()
                    parsed = parse_pdf_document(content, filename=original_name)
                    fp = compute_document_fingerprint(content)
                    matched_tpl = get_template_by_fingerprint(fp)
                    if matched_tpl:
                        parsed["fields"] = matched_tpl["fields"]
                        parsed["totalDetectedFields"] = len(matched_tpl["fields"])
                    DOCUMENTS_CACHE[d_id] = {
                        "bytes": content,
                        "parsed": parsed,
                        "filename": original_name,
                        "fingerprint": fp,
                        "isTemplateMatch": bool(matched_tpl),
                    }
                    # If it's the assignment pdf, also alias as 'assignment'
                    if "assignment" in original_name.lower() and "assignment" not in DOCUMENTS_CACHE:
                        DOCUMENTS_CACHE["assignment"] = DOCUMENTS_CACHE[d_id]
            except Exception as e:
                print(f"Warning preloading {fname}: {e}")


def get_or_load_document(doc_id: str) -> Optional[Dict[str, Any]]:
    if doc_id in DOCUMENTS_CACHE:
        return DOCUMENTS_CACHE[doc_id]

    # Special fallback for 'sample'
    if doc_id == "sample" and os.path.exists(SAMPLE_PDF_PATH):
        try:
            with open(SAMPLE_PDF_PATH, "rb") as f:
                content = f.read()
                parsed = parse_pdf_document(content, filename="Syllabus_Enrollment_Form_2026.pdf")
                DOCUMENTS_CACHE["sample"] = {
                    "bytes": content,
                    "parsed": parsed,
                    "filename": "Syllabus_Enrollment_Form_2026.pdf",
                }
                return DOCUMENTS_CACHE["sample"]
        except Exception:
            pass

    # Check upload directory
    if os.path.exists(UPLOAD_DIR):
        for fname in os.listdir(UPLOAD_DIR):
            is_match = (
                fname.startswith(f"{doc_id}_")
                or (doc_id == "assignment" and "assignment" in fname.lower())
                or (doc_id == "57f57a0b" and "57f57a0b" in fname)
            )
            if is_match and fname.endswith(".pdf"):
                f_path = os.path.join(UPLOAD_DIR, fname)
                try:
                    with open(f_path, "rb") as f:
                        content = f.read()
                        original_name = fname.split("_", 1)[1] if "_" in fname else fname
                        parsed = parse_pdf_document(content, filename=original_name)
                        fp = compute_document_fingerprint(content)
                        matched_tpl = get_template_by_fingerprint(fp)
                        if matched_tpl:
                            parsed["fields"] = matched_tpl["fields"]
                            parsed["totalDetectedFields"] = len(matched_tpl["fields"])
                        doc_obj = {
                            "bytes": content,
                            "parsed": parsed,
                            "filename": original_name,
                            "fingerprint": fp,
                            "isTemplateMatch": bool(matched_tpl),
                        }
                        DOCUMENTS_CACHE[doc_id] = doc_obj
                        if "assignment" in original_name.lower():
                            DOCUMENTS_CACHE["assignment"] = doc_obj
                        return doc_obj
                except Exception:
                    pass

    # Check public folder fallback for assignment PDF
    if doc_id == "assignment":
        public_pdf = os.path.join(os.path.dirname(__file__), "..", "public", "Assignment_1_F23-2353.pdf")
        if os.path.exists(public_pdf):
            try:
                with open(public_pdf, "rb") as f:
                    content = f.read()
                    original_name = "Assignment_1_F23-2353.pdf"
                    parsed = parse_pdf_document(content, filename=original_name)
                    fp = compute_document_fingerprint(content)
                    matched_tpl = get_template_by_fingerprint(fp)
                    if matched_tpl:
                        parsed["fields"] = matched_tpl["fields"]
                        parsed["totalDetectedFields"] = len(matched_tpl["fields"])
                    doc_obj = {
                        "bytes": content,
                        "parsed": parsed,
                        "filename": original_name,
                        "fingerprint": fp,
                        "isTemplateMatch": bool(matched_tpl),
                    }
                    DOCUMENTS_CACHE["assignment"] = doc_obj
                    return doc_obj
            except Exception:
                pass

    return None


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "PDF-to-Web-Form Parser Backend",
        "engine": "FastAPI + PyMuPDF (fitz)",
        "cachedDocuments": len(DOCUMENTS_CACHE),
        "endpoints": [
            "POST /upload-pdf",
            "POST /fill-pdf",
            "POST /templates/save",
            "GET /templates",
            "GET /templates/{fingerprint}",
            "DELETE /templates/{template_id}",
            "GET /sample-pdf",
            "GET /sample-assignment-pdf",
            "GET /document/{doc_id}",
            "GET /document/{doc_id}/page/{page_number}.png",
            "GET /document/{doc_id}/pdf",
            "GET /health",
        ],
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}


class TemplateSavePayload(BaseModel):
    fingerprint: str
    name: str
    description: Optional[str] = ""
    fields: List[Dict[str, Any]] = Field(default_factory=list)
    formMeta: Optional[Dict[str, Any]] = None
    pageCount: Optional[int] = 1


@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Accepts a multipart PDF file upload:
    1. Computes structural document layout fingerprint hash.
    2. Checks SQLite for an existing saved template.
    3. If matched, immediately returns the custom-calibrated schema.
    4. If not matched, runs the PyMuPDF heuristic scanner for a first-pass.
    """
    if not file.filename or (not file.filename.lower().endswith(".pdf") and file.content_type != "application/pdf"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a valid PDF (.pdf).")

    try:
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Uploaded PDF file is empty.")

        doc_id = str(uuid.uuid4())[:8]
        safe_filename = os.path.basename(file.filename or "document.pdf")

        # 1. Compute structural document fingerprint hash
        fingerprint = compute_document_fingerprint(content)

        # 2. Check SQLite for pre-saved learned template
        matched_template = get_template_by_fingerprint(fingerprint)

        # 3. Parse base document structure & pages
        parsed_data = parse_pdf_document(content, filename=safe_filename)

        # 4. Hybrid resolution: use learned template if exists, else heuristic fields
        if matched_template:
            final_fields = matched_template["fields"]
            is_template_match = True
            template_id = matched_template["id"]
            template_name = matched_template["name"]
            meta_title = matched_template["name"] or parsed_data["metadata"]["title"]
        else:
            final_fields = parsed_data["fields"]
            is_template_match = False
            template_id = None
            template_name = None
            meta_title = parsed_data["metadata"]["title"]

        # Store in cache
        DOCUMENTS_CACHE[doc_id] = {
            "bytes": content,
            "parsed": {
                **parsed_data,
                "fields": final_fields,
            },
            "filename": safe_filename,
            "fingerprint": fingerprint,
            "isTemplateMatch": is_template_match,
        }

        # Also persist to disk
        file_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{safe_filename}")
        with open(file_path, "wb") as f:
            f.write(content)

        return {
            "status": "success",
            "documentId": doc_id,
            "filename": safe_filename,
            "fileSizeBytes": len(content),
            "fingerprint": fingerprint,
            "isTemplateMatch": is_template_match,
            "templateId": template_id,
            "templateName": template_name,
            "totalPages": parsed_data["totalPages"],
            "metadata": {
                **parsed_data["metadata"],
                "title": meta_title,
            },
            "totalDetectedFields": len(final_fields),
            "pages": parsed_data["pages"],
            "fields": final_fields,
            "previewUrl": f"/document/{doc_id}/page/1.png",
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse PDF: {e!s}")


class FillPdfPayload(BaseModel):
    documentId: Optional[str] = "assignment"
    filename: Optional[str] = "document.pdf"
    formData: Dict[str, Any] = Field(default_factory=dict)
    fields: List[Dict[str, Any]] = Field(default_factory=list)
    pdfBase64: Optional[str] = None


@app.post("/fill-pdf")
def fill_pdf_route(payload: FillPdfPayload):
    """
    Fills out the original PDF with user-submitted form data and returns
    the generated binary PDF file ready for download.
    """
    pdf_bytes = None

    # 1. If client provided base64 fallback bytes
    if payload.pdfBase64:
        try:
            pdf_bytes = base64.b64decode(payload.pdfBase64)
        except Exception:
            pass

    # 2. Try fetching from in-memory cache or upload disk storage
    if not pdf_bytes and payload.documentId:
        doc_info = get_or_load_document(payload.documentId)
        if doc_info:
            pdf_bytes = doc_info["bytes"]

    # 3. Fallback to sample assignment or sample document if applicable
    if not pdf_bytes:
        doc_info = get_or_load_document("assignment") or get_or_load_document("sample")
        if doc_info:
            pdf_bytes = doc_info["bytes"]

    if not pdf_bytes:
        raise HTTPException(status_code=404, detail="Original PDF document not found for filling.")

    try:
        filled_bytes = fill_pdf_template(
            pdf_bytes=pdf_bytes,
            fields=payload.fields,
            form_data=payload.formData,
        )

        raw_filename = payload.filename or "Filled_Document.pdf"
        clean_filename = os.path.basename(raw_filename).replace('"', "").strip()
        if not clean_filename.lower().endswith(".pdf"):
            clean_filename += ".pdf"
        if not clean_filename.startswith("Filled_"):
            clean_filename = f"Filled_{clean_filename}"

        return Response(
            content=filled_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{clean_filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate filled PDF: {e!s}")


@app.post("/templates/save")
def save_template_route(payload: TemplateSavePayload):
    """
    Saves or updates a customized form layout into SQLite permanently.
    This teaches the local project this document layout for future uploads.
    """
    try:
        saved = save_or_update_template(
            fingerprint=payload.fingerprint,
            name=payload.name,
            description=payload.description or "",
            fields=payload.fields,
            form_meta=payload.formMeta,
            page_count=payload.pageCount or 1,
        )
        return {
            "status": "success",
            "message": f"Template '{payload.name}' successfully learned and saved to local SQLite database.",
            "template": saved,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save template: {e!s}")


@app.get("/templates")
def list_templates_route():
    """Returns all learned templates stored in the local SQLite database."""
    try:
        templates = list_templates()
        return {
            "status": "success",
            "totalTemplates": len(templates),
            "templates": templates,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list templates: {e!s}")


@app.get("/templates/{fingerprint}")
def get_template_route(fingerprint: str):
    """Retrieves a specific learned template by structural document fingerprint."""
    template = get_template_by_fingerprint(fingerprint)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found for this fingerprint.")
    return {
        "status": "success",
        "template": template,
    }


@app.delete("/templates/{template_id}")
def delete_template_route(template_id: str):
    """Deletes a learned template by ID or fingerprint."""
    success = delete_template(template_id)
    if not success:
        raise HTTPException(status_code=404, detail="Template not found or already deleted.")
    return {
        "status": "success",
        "message": f"Template {template_id} deleted.",
    }


@app.get("/sample-pdf")
def get_sample_pdf():
    """Returns the pre-parsed sample PDF data if available, or parses it on-demand."""
    if "sample" in DOCUMENTS_CACHE:
        data = DOCUMENTS_CACHE["sample"]["parsed"]
        return {
            "status": "success",
            "documentId": "sample",
            "filename": data["filename"],
            "totalPages": data["totalPages"],
            "metadata": data["metadata"],
            "totalDetectedFields": data["totalDetectedFields"],
            "pages": data["pages"],
            "fields": data["fields"],
            "previewUrl": "/document/sample/page/1.png",
        }

    if os.path.exists(SAMPLE_PDF_PATH):
        with open(SAMPLE_PDF_PATH, "rb") as f:
            sample_bytes = f.read()
            data = parse_pdf_document(sample_bytes, filename="Syllabus_Enrollment_Form_2026.pdf")
            DOCUMENTS_CACHE["sample"] = {
                "bytes": sample_bytes,
                "parsed": data,
                "filename": "Syllabus_Enrollment_Form_2026.pdf",
            }
            return {
                "status": "success",
                "documentId": "sample",
                "filename": data["filename"],
                "totalPages": data["totalPages"],
                "metadata": data["metadata"],
                "totalDetectedFields": data["totalDetectedFields"],
                "pages": data["pages"],
                "fields": data["fields"],
                "previewUrl": "/document/sample/page/1.png",
            }

    raise HTTPException(status_code=404, detail="Sample PDF not generated yet.")


@app.get("/sample-assignment-pdf")
def get_sample_assignment():
    """Returns pre-parsed assignment form (Assignment_1_F23-2353.pdf) with template memory integration."""
    doc_info = get_or_load_document("assignment") or get_or_load_document("57f57a0b")
    if doc_info:
        data = doc_info["parsed"]
        pdf_bytes = doc_info["bytes"]
        fingerprint = compute_document_fingerprint(pdf_bytes)
        matched_template = get_template_by_fingerprint(fingerprint)

        if matched_template:
            final_fields = matched_template["fields"]
            is_template_match = True
            template_id = matched_template["id"]
            template_name = matched_template["name"]
        else:
            final_fields = data["fields"]
            is_template_match = False
            template_id = None
            template_name = None

        return {
            "status": "success",
            "documentId": "assignment",
            "filename": doc_info["filename"],
            "fingerprint": fingerprint,
            "isTemplateMatch": is_template_match,
            "templateId": template_id,
            "templateName": template_name,
            "totalPages": data["totalPages"],
            "metadata": data["metadata"],
            "totalDetectedFields": len(final_fields),
            "pages": data["pages"],
            "fields": final_fields,
            "previewUrl": "/document/assignment/page/1.png",
        }
    raise HTTPException(status_code=404, detail="Sample assignment document not found.")


@app.get("/document/{doc_id}")
def get_document(doc_id: str):
    """Retrieves metadata and detected fields for a cached document."""
    doc_info = get_or_load_document(doc_id)
    if not doc_info:
        raise HTTPException(status_code=404, detail="Document not found.")

    return {
        "status": "success",
        "documentId": doc_id,
        "filename": doc_info["filename"],
        "parsed": doc_info["parsed"],
    }


@app.get("/document/{doc_id}/page/{page_number}.png")
def get_page_png(doc_id: str, page_number: int = 1, dpi: int = Query(150, ge=72, le=300)):
    """Renders and returns a high-resolution PNG image of a specified PDF page."""
    doc_info = get_or_load_document(doc_id)
    if not doc_info:
        raise HTTPException(status_code=404, detail="Document not found.")

    pdf_bytes = doc_info["bytes"]
    try:
        png_bytes = render_page_to_png(pdf_bytes, page_number=page_number, dpi=dpi)
        return Response(content=png_bytes, media_type="image/png")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to render page: {e!s}")


@app.get("/document/{doc_id}/pdf")
def get_document_pdf(doc_id: str):
    """Returns raw PDF binary bytes for direct PDF.js rendering."""
    doc_info = get_or_load_document(doc_id)
    if not doc_info:
        raise HTTPException(status_code=404, detail="Document not found.")

    pdf_bytes = doc_info["bytes"]
    clean_filename = os.path.basename(doc_info["filename"]).replace('"', "").strip()
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{clean_filename}"'},
    )


# =============================================================================
# User Authentication & Creator Profiles
# =============================================================================

class RegisterPayload(BaseModel):
    email: str
    password: str
    displayName: Optional[str] = ""
    agencyName: Optional[str] = ""
    portalSlug: Optional[str] = None

class LoginPayload(BaseModel):
    email: str
    password: str

class ProfileUpdatePayload(BaseModel):
    displayName: Optional[str] = None
    agencyName: Optional[str] = None
    portalSlug: Optional[str] = None
    portalTitle: Optional[str] = None
    portalDescription: Optional[str] = None

def get_current_user_dep(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Dependency that checks Bearer JWT and extracts currently authenticated creator."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication token required. Please log in.")
    token = authorization.split(" ", 1)[1].strip()
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Session expired or invalid. Please log in again.")
    user_id = payload.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Session expired or invalid. Please log in again.")
    user = get_user_by_id(int(user_id))
    if not user:
        raise HTTPException(status_code=401, detail="User account not found.")
    return user


@app.post("/api/auth/register")
def register_route(payload: RegisterPayload):
    """Registers a new creator user account."""
    try:
        user = create_user(
            email=payload.email,
            password=payload.password,
            display_name=payload.displayName or "",
            agency_name=payload.agencyName or "",
            portal_slug=payload.portalSlug
        )
        token = create_access_token(user["id"], user["email"])
        return {
            "status": "success",
            "message": "Account created successfully.",
            "token": token,
            "user": user
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {e!s}")


@app.post("/api/auth/login")
def login_route(payload: LoginPayload):
    """Logs in an existing creator user account."""
    user = authenticate_user(payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_access_token(user["id"], user["email"])
    return {
        "status": "success",
        "message": "Logged in successfully.",
        "token": token,
        "user": user
    }


@app.get("/api/auth/me")
def me_route(user: Dict[str, Any] = Depends(get_current_user_dep)):
    """Returns profile and public portal settings of currently logged in user."""
    return {
        "status": "success",
        "user": user
    }


@app.put("/api/auth/profile")
def update_profile_route(payload: ProfileUpdatePayload, user: Dict[str, Any] = Depends(get_current_user_dep)):
    """Updates agency settings, portal slug, title, and description."""
    try:
        updated = update_user_profile(
            user_id=user["id"],
            display_name=payload.displayName,
            agency_name=payload.agencyName,
            portal_slug=payload.portalSlug,
            portal_title=payload.portalTitle,
            portal_description=payload.portalDescription
        )
        return {
            "status": "success",
            "message": "Profile updated successfully.",
            "user": updated
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {e!s}")


# =============================================================================
# Creator Form Management (Drafts & Published)
# =============================================================================

class SaveFormPayload(BaseModel):
    id: Optional[int] = None
    title: str
    description: Optional[str] = ""
    originalFilename: Optional[str] = "document.pdf"
    documentId: Optional[str] = None
    status: Optional[str] = "draft"  # 'draft' or 'published'
    pageCount: Optional[int] = 1
    fingerprint: Optional[str] = ""
    fields: List[Dict[str, Any]] = Field(default_factory=list)
    formMeta: Optional[Dict[str, Any]] = None
    logicRules: Optional[List[Dict[str, Any]]] = None
    pdfBase64: Optional[str] = None


class FormStatusPayload(BaseModel):
    status: str  # 'draft' or 'published'


@app.get("/api/forms")
def list_user_forms_route(
    status: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(get_current_user_dep)
):
    """Lists all forms owned by current creator, optionally filtered by status."""
    forms = list_user_forms(user["id"], status_filter=status)
    return {
        "status": "success",
        "totalForms": len(forms),
        "forms": forms
    }


@app.get("/api/forms/{form_id}")
def get_user_form_route(form_id: int, user: Dict[str, Any] = Depends(get_current_user_dep)):
    """Retrieves full form configuration including all fields and logic rules."""
    form = get_form_by_id(form_id, user_id=user["id"])
    if not form:
        raise HTTPException(status_code=404, detail="Form not found.")
    return {
        "status": "success",
        "form": form
    }


@app.get("/api/forms/{form_id}/preview.png")
def get_form_preview_png_route(form_id: int):
    """Renders page 1 PNG preview for a saved form if available."""
    form = get_form_by_id(form_id)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found.")

    pdf_bytes = None
    if form.get("pdfStoragePath") and os.path.exists(form["pdfStoragePath"]):
        try:
            with open(form["pdfStoragePath"], "rb") as f:
                pdf_bytes = f.read()
        except Exception:
            pass

    if not pdf_bytes and form.get("pdfBase64"):
        try:
            pdf_bytes = base64.b64decode(form["pdfBase64"])
        except Exception:
            pass

    if not pdf_bytes and form.get("originalFilename"):
        orig_name = os.path.basename(form["originalFilename"]).lower().replace(".pdf", "")
        uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
        if os.path.exists(uploads_dir):
            for root, _, files in os.walk(uploads_dir):
                for fname in files:
                    if fname.lower().endswith(".pdf") and (orig_name in fname.lower() or fname.lower() in orig_name):
                        try:
                            candidate_path = os.path.join(root, fname)
                            with open(candidate_path, "rb") as f:
                                pdf_bytes = f.read()
                            if pdf_bytes:
                                break
                        except Exception:
                            pass
                if pdf_bytes:
                    break

    if not pdf_bytes:
        raise HTTPException(status_code=404, detail="No PDF file stored for preview.")

    try:
        png_bytes = render_page_to_png(pdf_bytes, page_number=1, dpi=120)
        return Response(content=png_bytes, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to render preview: {e!s}")



@app.post("/api/forms")
def save_user_form_route(payload: SaveFormPayload, user: Dict[str, Any] = Depends(get_current_user_dep)):
    """
    Saves or updates a form under the creator's account as 'draft' or 'published'.
    Also preserves the master template PDF file for coordinate stamping.
    """
    try:
        pdf_path = ""
        pdf_b64 = payload.pdfBase64

        # Persist master PDF file if doc was in cache
        if payload.documentId:
            doc_info = get_or_load_document(payload.documentId)
            if doc_info and "bytes" in doc_info:
                master_dir = os.path.join(UPLOAD_DIR, "master_templates")
                os.makedirs(master_dir, exist_ok=True)
                fname = f"user_{user['id']}_{str(uuid.uuid4())[:8]}.pdf"
                full_path = os.path.join(master_dir, fname)
                with open(full_path, "wb") as f:
                    f.write(doc_info["bytes"])
                pdf_path = full_path

        # If base64 was provided directly
        elif payload.pdfBase64:
            try:
                b_data = base64.b64decode(payload.pdfBase64)
                master_dir = os.path.join(UPLOAD_DIR, "master_templates")
                os.makedirs(master_dir, exist_ok=True)
                fname = f"user_{user['id']}_{str(uuid.uuid4())[:8]}.pdf"
                full_path = os.path.join(master_dir, fname)
                with open(full_path, "wb") as f:
                    f.write(b_data)
                pdf_path = full_path
            except Exception:
                pass

        saved_form = save_user_form(
            user_id=user["id"],
            form_id=payload.id,
            title=payload.title,
            description=payload.description or "",
            original_filename=payload.originalFilename or "document.pdf",
            fields=payload.fields,
            status=payload.status or "draft",
            pdf_storage_path=pdf_path,
            pdf_base64=pdf_b64,
            page_count=payload.pageCount or 1,
            fingerprint=payload.fingerprint or "",
            form_meta=payload.formMeta,
            logic_rules=payload.logicRules
        )
        return {
            "status": "success",
            "message": f"Form successfully saved as {saved_form['status']}.",
            "form": saved_form
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save form: {e!s}")


@app.patch("/api/forms/{form_id}/status")
def set_form_status_route(form_id: int, payload: FormStatusPayload, user: Dict[str, Any] = Depends(get_current_user_dep)):
    """Toggles form between draft and published state."""
    success = set_form_status(form_id, user["id"], payload.status)
    if not success:
        raise HTTPException(status_code=404, detail="Form not found.")
    return {
        "status": "success",
        "message": f"Form status changed to {payload.status}.",
        "formId": form_id,
        "newStatus": payload.status
    }


@app.delete("/api/forms/{form_id}")
def delete_user_form_route(form_id: int, user: Dict[str, Any] = Depends(get_current_user_dep)):
    """Deletes a form belonging to the creator."""
    success = delete_user_form(form_id, user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Form not found or already deleted.")
    return {
        "status": "success",
        "message": "Form deleted successfully."
    }


# =============================================================================
# Public Live Portal & Zero-Retention Client Filling
# =============================================================================

class PublicGeneratePdfPayload(BaseModel):
    formData: Dict[str, Any] = Field(default_factory=dict)


@app.get("/api/public/portal/{portal_slug}")
def get_public_portal_route(portal_slug: str):
    """
    Public kiosk catalog:
    Returns agency information and ONLY published forms.
    Walk-in clients cannot view drafts or builder settings.
    """
    catalog = get_public_portal_catalog(portal_slug)
    if not catalog:
        raise HTTPException(status_code=404, detail="Public portal not found for this URL.")
    return {
        "status": "success",
        **catalog
    }


@app.get("/api/public/form/{form_slug}")
def get_public_form_route(form_slug: str):
    """
    Public form loader:
    Returns the published form layout for client interactive filling.
    """
    form = get_form_by_slug(form_slug, require_published=True)
    if not form:
        raise HTTPException(status_code=404, detail="Published form not found or has been withdrawn.")
    user = get_user_by_id(form["userId"]) if form.get("userId") else None
    return {
        "status": "success",
        "form": {
            "id": form["id"],
            "formSlug": form["formSlug"],
            "title": form["title"],
            "description": form["description"],
            "fields": form["fields"],
            "formMeta": form["formMeta"],
            "logicRules": form["logicRules"],
            "pageCount": form["pageCount"],
            "originalFilename": form["originalFilename"],
            "portalSlug": user["portalSlug"] if user else None,
            "agencyName": user["agencyName"] if user else None,
        }
    }


@app.post("/api/public/form/{form_slug}/generate-pdf")
def generate_public_filled_pdf(form_slug: str, payload: PublicGeneratePdfPayload):
    """
    ZERO-RETENTION DOCUMENT GENERATION:
    Stamps client answers transiently in-memory and returns the official PDF.
    ABSOLUTELY ZERO CLIENT RESPONSES OR PII ARE SAVED TO ANY DATABASE.
    """
    form = get_form_by_slug(form_slug, require_published=True)
    if not form:
        raise HTTPException(status_code=404, detail="Published form not found.")

    pdf_bytes = None

    # 1. Check pdf_storage_path
    storage_path = form.get("pdfStoragePath")
    if storage_path and os.path.exists(storage_path):
        try:
            with open(storage_path, "rb") as f:
                pdf_bytes = f.read()
        except Exception:
            pass

    # 2. Check base64 stored with form
    if not pdf_bytes and form.get("pdfBase64"):
        try:
            pdf_bytes = base64.b64decode(form["pdfBase64"])
        except Exception:
            pass

    # 3. Check in-memory cache fallback by filename
    if not pdf_bytes:
        orig_fname = form.get("originalFilename") or ""
        for cached in DOCUMENTS_CACHE.values():
            if cached.get("filename") == orig_fname:
                pdf_bytes = cached.get("bytes")
                break

    # 4. Fallback to sample assignment or sample document if available
    if not pdf_bytes:
        doc_info = get_or_load_document("assignment") or get_or_load_document("sample")
        if doc_info:
            pdf_bytes = doc_info["bytes"]

    if not pdf_bytes:
        raise HTTPException(status_code=404, detail="Master PDF template is unavailable for stamping.")

    try:
        # In-memory stamping
        stamped_bytes = fill_pdf_template(
            pdf_bytes=pdf_bytes,
            fields=form.get("fields", []),
            form_data=payload.formData
        )

        clean_title = re.sub(r"[^\w\s-]", "", form.get("title", "Official_Document")).strip().replace(" ", "_")
        filename = f"{clean_title}_{datetime.now().strftime('%Y%m%d')}.pdf"

        return Response(
            content=stamped_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition",
                "X-Zero-Retention": "True"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stamp document: {e!s}")


if __name__ == "__main__":
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True, app_dir=backend_dir)

