import os
import sys
import uuid
import base64
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import uvicorn

from pdf_parser import parse_pdf_document, render_page_to_png
from pdf_filler import fill_pdf_template
from database import (
    init_db,
    get_template_by_fingerprint,
    save_or_update_template,
    list_templates,
    delete_template,
)
from template_matcher import compute_document_fingerprint

# Initialize SQLite templates database
init_db()

app = FastAPI(
    title="PDF to Web Form Backend",
    description="FastAPI + PyMuPDF engine for parsing PDFs, extracting text blocks, template fingerprinting, and SQLite memory.",
    version="2.0.0",
)

# Enable CORS for React frontend (avoids wildcard '*' conflict with allow_credentials=True)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
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


if __name__ == "__main__":
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True, app_dir=backend_dir)
