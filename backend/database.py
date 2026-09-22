import os
import sqlite3
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Union

DB_PATH = os.path.join(os.path.dirname(__file__), "templates.db")

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the SQLite database and templates table."""
    conn = get_connection()
    cursor = conn.cursor()
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
    conn.commit()
    conn.close()

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

    # Check if exists
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
