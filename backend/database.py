import os
import sys
import sqlite3
import json
import secrets
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Union

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from auth_utils import hash_password, verify_password, slugify
except ImportError:
    from backend.auth_utils import hash_password, verify_password, slugify

DB_PATH = os.path.join(os.path.dirname(__file__), "templates.db")

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the SQLite database with users, forms, and legacy templates tables."""
    conn = get_connection()
    cursor = conn.cursor()

    # Legacy templates table for layout memory
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fingerprint TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            page_count INTEGER DEFAULT 1,
            fields_json TEXT NOT NULL,
            form_meta_json TEXT DEFAULT '{}',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_templates_fingerprint 
        ON templates(fingerprint)
    """)

    # Users / Creator accounts table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            display_name TEXT NOT NULL,
            agency_name TEXT NOT NULL,
            portal_slug TEXT UNIQUE NOT NULL COLLATE NOCASE,
            portal_title TEXT DEFAULT '',
            portal_description TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_users_portal_slug ON users(portal_slug)
    """)

    # User Forms table (Drafts and Published Forms)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS forms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            form_slug TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            status TEXT DEFAULT 'draft',
            original_filename TEXT NOT NULL,
            pdf_storage_path TEXT DEFAULT '',
            pdf_base64 TEXT DEFAULT '',
            page_count INTEGER DEFAULT 1,
            fingerprint TEXT DEFAULT '',
            fields_json TEXT NOT NULL,
            form_meta_json TEXT DEFAULT '{}',
            logic_rules_json TEXT DEFAULT '[]',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_forms_user_id ON forms(user_id)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_forms_form_slug ON forms(form_slug)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_forms_status ON forms(status)
    """)

    conn.commit()
    conn.close()

# -------------------------------------------------------------
# User Accounts Operations
# -------------------------------------------------------------

def create_user(
    email: str,
    password: str,
    display_name: str,
    agency_name: str,
    portal_slug: Optional[str] = None
) -> Dict[str, Any]:
    """Registers a new creator user account."""
    clean_email = email.strip().lower()
    if not clean_email or "@" not in clean_email:
        raise ValueError("A valid email address is required.")
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters.")

    clean_display = display_name.strip() or clean_email.split("@")[0]
    clean_agency = agency_name.strip() or "Consular & Document Services"

    # Derive unique portal slug
    base_slug = slugify(portal_slug or clean_agency or clean_display)
    if not base_slug:
        base_slug = f"portal-{secrets.token_hex(3)}"

    conn = get_connection()
    cursor = conn.cursor()

    # Check if email already registered
    cursor.execute("SELECT id FROM users WHERE email = ?", (clean_email,))
    if cursor.fetchone():
        conn.close()
        raise ValueError("An account with this email already exists.")

    # Ensure unique portal slug
    unique_slug = base_slug
    counter = 1
    while True:
        cursor.execute("SELECT id FROM users WHERE portal_slug = ?", (unique_slug,))
        if not cursor.fetchone():
            break
        counter += 1
        unique_slug = f"{base_slug}-{counter}"

    now = datetime.now(timezone.utc).isoformat()
    pwd_hash = hash_password(password)
    default_title = f"{clean_agency} Public Portal"
    default_desc = "Select an official document below, fill out the required information, and download your printable copy."

    cursor.execute("""
        INSERT INTO users (email, password_hash, display_name, agency_name, portal_slug, portal_title, portal_description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (clean_email, pwd_hash, clean_display, clean_agency, unique_slug, default_title, default_desc, now, now))

    user_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "id": user_id,
        "email": clean_email,
        "displayName": clean_display,
        "agencyName": clean_agency,
        "portalSlug": unique_slug,
        "portalTitle": default_title,
        "portalDescription": default_desc,
        "createdAt": now,
    }

def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    """Validates login credentials and returns user profile if correct."""
    clean_email = email.strip().lower()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, email, password_hash, display_name, agency_name, portal_slug, portal_title, portal_description, created_at
        FROM users
        WHERE email = ?
    """, (clean_email,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    if not verify_password(password, row["password_hash"]):
        return None

    return {
        "id": row["id"],
        "email": row["email"],
        "displayName": row["display_name"],
        "agencyName": row["agency_name"],
        "portalSlug": row["portal_slug"],
        "portalTitle": row["portal_title"],
        "portalDescription": row["portal_description"],
        "createdAt": row["created_at"],
    }

def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """Retrieves user profile by ID without password hash."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, email, display_name, agency_name, portal_slug, portal_title, portal_description, created_at, updated_at
        FROM users
        WHERE id = ?
    """, (user_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    return {
        "id": row["id"],
        "email": row["email"],
        "displayName": row["display_name"],
        "agencyName": row["agency_name"],
        "portalSlug": row["portal_slug"],
        "portalTitle": row["portal_title"],
        "portalDescription": row["portal_description"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }

def get_user_by_portal_slug(portal_slug: str) -> Optional[Dict[str, Any]]:
    """Retrieves public portal profile info by agency portal slug."""
    clean_slug = portal_slug.strip().lower()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, display_name, agency_name, portal_slug, portal_title, portal_description
        FROM users
        WHERE portal_slug = ?
    """, (clean_slug,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    return {
        "userId": row["id"],
        "displayName": row["display_name"],
        "agencyName": row["agency_name"],
        "portalSlug": row["portal_slug"],
        "portalTitle": row["portal_title"] or f"{row['agency_name']} Public Portal",
        "portalDescription": row["portal_description"] or "Select an official document below to complete and download.",
    }

def update_user_profile(
    user_id: int,
    display_name: Optional[str] = None,
    agency_name: Optional[str] = None,
    portal_slug: Optional[str] = None,
    portal_title: Optional[str] = None,
    portal_description: Optional[str] = None
) -> Dict[str, Any]:
    """Updates user agency profile and portal settings."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, portal_slug FROM users WHERE id = ?", (user_id,))
    current = cursor.fetchone()
    if not current:
        conn.close()
        raise ValueError("User not found.")

    now = datetime.now(timezone.utc).isoformat()
    fields_to_update = []
    params = []

    if display_name is not None:
        fields_to_update.append("display_name = ?")
        params.append(display_name.strip())

    if agency_name is not None:
        fields_to_update.append("agency_name = ?")
        params.append(agency_name.strip())

    if portal_slug is not None:
        new_slug = slugify(portal_slug)
        if new_slug != current["portal_slug"]:
            cursor.execute("SELECT id FROM users WHERE portal_slug = ? AND id != ?", (new_slug, user_id))
            if cursor.fetchone():
                conn.close()
                raise ValueError("This portal URL slug is already taken.")
            fields_to_update.append("portal_slug = ?")
            params.append(new_slug)

    if portal_title is not None:
        fields_to_update.append("portal_title = ?")
        params.append(portal_title.strip())

    if portal_description is not None:
        fields_to_update.append("portal_description = ?")
        params.append(portal_description.strip())

    if fields_to_update:
        fields_to_update.append("updated_at = ?")
        params.append(now)
        params.append(user_id)
        cursor.execute(f"UPDATE users SET {', '.join(fields_to_update)} WHERE id = ?", params)
        conn.commit()

    conn.close()
    user = get_user_by_id(user_id)
    if not user:
        raise ValueError("Failed to retrieve updated user.")
    return user

# -------------------------------------------------------------
# User Forms Operations (Drafts & Published)
# -------------------------------------------------------------

def _format_form_row(row: sqlite3.Row, include_full_fields: bool = True) -> Dict[str, Any]:
    fields = []
    if include_full_fields:
        try:
            fields = json.loads(row["fields_json"]) if row["fields_json"] else []
        except Exception:
            fields = []

    try:
        form_meta = json.loads(row["form_meta_json"]) if row["form_meta_json"] else {}
    except Exception:
        form_meta = {}

    try:
        logic_rules = json.loads(row["logic_rules_json"]) if row["logic_rules_json"] else []
    except Exception:
        logic_rules = []

    field_count = len(fields)
    if not include_full_fields and row["fields_json"]:
        try:
            parsed = json.loads(row["fields_json"])
            field_count = len(parsed)
        except Exception:
            field_count = 0

    item = {
        "id": row["id"],
        "userId": row["user_id"],
        "formSlug": row["form_slug"],
        "title": row["title"],
        "description": row["description"] or "",
        "status": row["status"] or "draft",
        "originalFilename": row["original_filename"],
        "pdfStoragePath": row["pdf_storage_path"] or "",
        "pageCount": row["page_count"] or 1,
        "fingerprint": row["fingerprint"] or "",
        "fieldCount": field_count,
        "formMeta": form_meta,
        "logicRules": logic_rules,
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }

    if include_full_fields:
        item["fields"] = fields
        item["hasPdfBase64"] = bool(row["pdf_base64"])
        # Only return pdfBase64 if specifically needed to avoid large payload overhead
        if "pdf_base64" in row.keys() and row["pdf_base64"]:
            item["pdfBase64"] = row["pdf_base64"]

    return item

def save_user_form(
    user_id: int,
    title: str,
    original_filename: str,
    fields: List[Dict[str, Any]],
    form_id: Optional[int] = None,
    description: Optional[str] = "",
    status: str = "draft",
    pdf_storage_path: Optional[str] = "",
    pdf_base64: Optional[str] = None,
    page_count: int = 1,
    fingerprint: Optional[str] = "",
    form_meta: Optional[Dict[str, Any]] = None,
    logic_rules: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Creates or updates a form owned by a user (status: 'draft' or 'published')."""
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()

    clean_status = "published" if str(status).lower() == "published" else "draft"
    fields_str = json.dumps(fields or [])
    form_meta_str = json.dumps(form_meta or {})
    logic_rules_str = json.dumps(logic_rules or [])

    if form_id:
        cursor.execute("SELECT id, form_slug FROM forms WHERE id = ? AND user_id = ?", (form_id, user_id))
        existing = cursor.fetchone()
        if not existing:
            conn.close()
            raise ValueError("Form not found or you do not have permission to modify it.")

        update_query = """
            UPDATE forms
            SET title = ?, description = ?, status = ?, page_count = ?, fingerprint = ?,
                fields_json = ?, form_meta_json = ?, logic_rules_json = ?, updated_at = ?
        """
        params = [title, description or "", clean_status, page_count, fingerprint or "", fields_str, form_meta_str, logic_rules_str, now]

        if pdf_storage_path:
            update_query += ", pdf_storage_path = ?"
            params.append(pdf_storage_path)
        if pdf_base64:
            update_query += ", pdf_base64 = ?"
            params.append(pdf_base64)

        update_query += " WHERE id = ? AND user_id = ?"
        params.extend([form_id, user_id])

        cursor.execute(update_query, params)
        saved_id = form_id
        saved_slug = existing["form_slug"]
    else:
        # Generate clean unique form slug
        base_slug = slugify(title) or "form"
        saved_slug = f"{base_slug}-{secrets.token_hex(4)}"

        cursor.execute("""
            INSERT INTO forms (
                user_id, form_slug, title, description, status, original_filename,
                pdf_storage_path, pdf_base64, page_count, fingerprint,
                fields_json, form_meta_json, logic_rules_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id, saved_slug, title, description or "", clean_status, original_filename,
            pdf_storage_path or "", pdf_base64 or "", page_count, fingerprint or "",
            fields_str, form_meta_str, logic_rules_str, now, now
        ))
        saved_id = cursor.lastrowid

    conn.commit()
    conn.close()

    if saved_id is None:
        raise ValueError("Failed to obtain form ID.")
    saved_form = get_form_by_id(saved_id, user_id=user_id)
    if not saved_form:
        raise ValueError("Failed to retrieve saved form.")
    return saved_form

def get_form_by_id(form_id: int, user_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """Retrieves full form schema by ID, optionally verifying creator user_id."""
    conn = get_connection()
    cursor = conn.cursor()
    if user_id is not None:
        cursor.execute("SELECT * FROM forms WHERE id = ? AND user_id = ?", (form_id, user_id))
    else:
        cursor.execute("SELECT * FROM forms WHERE id = ?", (form_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None
    return _format_form_row(row, include_full_fields=True)

def get_form_by_slug(form_slug: str, require_published: bool = True) -> Optional[Dict[str, Any]]:
    """Retrieves form schema by slug (for public client filling)."""
    clean_slug = form_slug.strip()
    conn = get_connection()
    cursor = conn.cursor()
    if require_published:
        cursor.execute("SELECT * FROM forms WHERE form_slug = ? AND status = 'published'", (clean_slug,))
    else:
        cursor.execute("SELECT * FROM forms WHERE form_slug = ?", (clean_slug,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None
    return _format_form_row(row, include_full_fields=True)

def list_user_forms(user_id: int, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    """Lists all forms owned by a creator, with optional draft/published filter."""
    conn = get_connection()
    cursor = conn.cursor()

    if status_filter in ("draft", "published"):
        cursor.execute("""
            SELECT id, user_id, form_slug, title, description, status, original_filename,
                   pdf_storage_path, page_count, fingerprint, fields_json, form_meta_json,
                   logic_rules_json, created_at, updated_at
            FROM forms
            WHERE user_id = ? AND status = ?
            ORDER BY updated_at DESC
        """, (user_id, status_filter))
    else:
        cursor.execute("""
            SELECT id, user_id, form_slug, title, description, status, original_filename,
                   pdf_storage_path, page_count, fingerprint, fields_json, form_meta_json,
                   logic_rules_json, created_at, updated_at
            FROM forms
            WHERE user_id = ?
            ORDER BY updated_at DESC
        """, (user_id,))

    rows = cursor.fetchall()
    conn.close()
    return [_format_form_row(r, include_full_fields=False) for r in rows]

def set_form_status(form_id: int, user_id: int, new_status: str) -> bool:
    """Toggles form status between 'draft' and 'published'."""
    clean_status = "published" if str(new_status).lower() == "published" else "draft"
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        UPDATE forms
        SET status = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
    """, (clean_status, now, form_id, user_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

def delete_user_form(form_id: int, user_id: int) -> bool:
    """Deletes a form belonging to a user."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM forms WHERE id = ? AND user_id = ?", (form_id, user_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

def get_public_portal_catalog(portal_slug: str) -> Optional[Dict[str, Any]]:
    """Retrieves creator agency details and all published forms for their public kiosk page."""
    portal = get_user_by_portal_slug(portal_slug)
    if not portal:
        return None

    user_id = portal["userId"]
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, user_id, form_slug, title, description, status, original_filename,
               pdf_storage_path, page_count, fingerprint, fields_json, form_meta_json,
               logic_rules_json, created_at, updated_at
        FROM forms
        WHERE user_id = ? AND status = 'published'
        ORDER BY updated_at DESC
    """, (user_id,))
    rows = cursor.fetchall()
    conn.close()

    published_forms = [_format_form_row(r, include_full_fields=False) for r in rows]

    return {
        "agency": portal,
        "totalForms": len(published_forms),
        "forms": published_forms,
    }

# -------------------------------------------------------------
# Legacy Template Functions (Retained for Document Layout Fingerprints)
# -------------------------------------------------------------

def get_template_by_fingerprint(fingerprint: str) -> Optional[Dict[str, Any]]:
    """Retrieves a saved form schema by structural document fingerprint."""
    if not fingerprint:
        return None
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, fingerprint, name, description, page_count, fields_json, form_meta_json, created_at, updated_at
        FROM templates
        WHERE fingerprint = ?
    """, (fingerprint,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    try:
        fields = json.loads(row["fields_json"])
    except Exception:
        fields = []

    try:
        form_meta = json.loads(row["form_meta_json"]) if row["form_meta_json"] else {}
    except Exception:
        form_meta = {}

    return {
        "id": row["id"],
        "fingerprint": row["fingerprint"],
        "name": row["name"],
        "description": row["description"],
        "pageCount": row["page_count"],
        "fields": fields,
        "formMeta": form_meta,
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"]
    }

def save_or_update_template(
    fingerprint: str,
    name: str,
    description: str,
    fields: List[Dict[str, Any]],
    form_meta: Optional[Dict[str, Any]] = None,
    page_count: int = 1
) -> Dict[str, Any]:
    """Saves or updates a template schema keyed by document structural fingerprint."""
    if not fingerprint:
        raise ValueError("Fingerprint is required to save a template.")

    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()

    fields_str = json.dumps(fields)
    form_meta_str = json.dumps(form_meta or {})

    cursor.execute("SELECT id FROM templates WHERE fingerprint = ?", (fingerprint,))
    row = cursor.fetchone()

    if row:
        template_id = row["id"]
        cursor.execute("""
            UPDATE templates
            SET name = ?, description = ?, page_count = ?, fields_json = ?, form_meta_json = ?, updated_at = ?
            WHERE id = ?
        """, (name, description, page_count, fields_str, form_meta_str, now, template_id))
    else:
        cursor.execute("""
            INSERT INTO templates (fingerprint, name, description, page_count, fields_json, form_meta_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (fingerprint, name, description, page_count, fields_str, form_meta_str, now, now))
        template_id = cursor.lastrowid

    conn.commit()
    conn.close()

    return {
        "id": template_id,
        "fingerprint": fingerprint,
        "name": name,
        "description": description,
        "pageCount": page_count,
        "fieldCount": len(fields),
        "updatedAt": now
    }

def list_templates() -> List[Dict[str, Any]]:
    """Returns a list of all learned templates stored in SQLite."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, fingerprint, name, description, page_count, fields_json, created_at, updated_at
        FROM templates
        ORDER BY updated_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        try:
            fields_data = json.loads(r["fields_json"])
            field_count = len(fields_data)
        except Exception:
            field_count = 0

        result.append({
            "id": r["id"],
            "fingerprint": r["fingerprint"],
            "name": r["name"],
            "description": r["description"],
            "pageCount": r["page_count"],
            "fieldCount": field_count,
            "createdAt": r["created_at"],
            "updatedAt": r["updated_at"]
        })
    return result

def delete_template(identifier: Union[int, str]) -> bool:
    """Deletes a template by integer ID or fingerprint string."""
    conn = get_connection()
    cursor = conn.cursor()
    if str(identifier).isdigit():
        cursor.execute("DELETE FROM templates WHERE id = ?", (int(identifier),))
    else:
        cursor.execute("DELETE FROM templates WHERE fingerprint = ?", (str(identifier),))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0
