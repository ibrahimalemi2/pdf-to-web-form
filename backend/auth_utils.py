import os
import time
import json
import base64
import hmac
import hashlib
import secrets
import re
from typing import Optional, Dict, Any

AUTH_SECRET = os.environ.get("CONSULAR_AUTH_SECRET", "consulardoc_secure_jwt_secret_token_2026_xyz")

def hash_password(password: str) -> str:
    """Hashes a password with PBKDF2-HMAC-SHA256 and a random 16-byte salt."""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return salt.hex() + ":" + key.hex()

def verify_password(password: str, hashed: str) -> bool:
    """Verifies a plaintext password against a stored salt:hash string."""
    try:
        if not hashed or ":" not in hashed:
            return False
        salt_hex, key_hex = hashed.split(":", 1)
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(key_hex)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
        return secrets.compare_digest(expected, actual)
    except Exception:
        return False

def slugify(text: str) -> str:
    """Generates an alphanumeric URL-safe slug from text."""
    clean = re.sub(r"[^\w\s-]", "", text.strip().lower())
    clean = re.sub(r"[-\s]+", "-", clean).strip("-")
    return clean or f"portal-{secrets.token_hex(4)}"

def create_access_token(user_id: int, email: str, expires_in_seconds: int = 86400 * 14) -> str:
    """Creates a signed tamper-proof Bearer token."""
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": int(time.time()) + expires_in_seconds,
        "nonce": secrets.token_hex(6),
    }
    payload_json = json.dumps(payload, separators=(",", ":"))
    b64_payload = base64.urlsafe_b64encode(payload_json.encode("utf-8")).decode("utf-8").rstrip("=")
    signature = hmac.new(AUTH_SECRET.encode("utf-8"), b64_payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{b64_payload}.{signature}"

def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Verifies and decodes a signed Bearer token, returning payload if valid and unexpired."""
    try:
        if not token or "." not in token:
            return None
        parts = token.split(".", 1)
        if len(parts) != 2:
            return None
        b64_payload, signature = parts
        expected_sig = hmac.new(AUTH_SECRET.encode("utf-8"), b64_payload.encode("utf-8"), hashlib.sha256).hexdigest()
        if not secrets.compare_digest(signature, expected_sig):
            return None

        # Add base64 padding if needed
        padding = "=" * ((4 - (len(b64_payload) % 4)) % 4)
        payload_bytes = base64.urlsafe_b64decode(b64_payload + padding)
        payload = json.loads(payload_bytes.decode("utf-8"))

        if payload.get("exp", 0) < int(time.time()):
            return None

        return payload
    except Exception:
        return None
