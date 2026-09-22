import re
import hashlib
from typing import Union
import pymupdf as fitz

# Keywords that typically identify structural form labels and headings
STRUCTURAL_KEYWORDS = [
    "instructor", "faculty", "professor", "teacher",
    "course", "subject", "assignment", "section", "crn",
    "program", "department", "degree", "major",
    "student", "roll", "applicant", "candidate", "name",
    "date", "time", "deadline", "term", "semester",
    "question", "answer", "part", "response", "solution",
    "signature", "remarks", "notes", "description",
    "office", "university", "college", "school", "form"
]

def clean_structural_token(text: str) -> str:
    """Normalizes text by removing punctuation, digits, and extra spaces."""
    if not text:
        return ""
    # Lowercase and replace non-alphanumeric chars
    cleaned = re.sub(r'[^a-z0-9]', ' ', text.lower())
    words = [w for w in cleaned.split() if len(w) > 1]
    return ' '.join(words)

def compute_document_fingerprint(pdf_data: Union[bytes, fitz.Document]) -> str:
    """
    Computes a structural layout fingerprint hash from a PDF document using PyMuPDF.
    
    The fingerprint represents the document's spatial structural skeleton:
    - Page count and page aspect ratios
    - Spatial positions of static text labels, headings, and field anchors
    - Normalized into a spatial coordinate grid to remain robust across slight rendering variances
    
    Returns a 16-character hexadecimal hash.
    """
    if isinstance(pdf_data, bytes):
        doc = fitz.open(stream=pdf_data, filetype="pdf")
        should_close = True
    else:
        doc = pdf_data
        should_close = False

    try:
        tokens = []
        page_count = len(doc)
        tokens.append(f"pages:{page_count}")

        for page_idx in range(page_count):
            page = doc[page_idx]
            rect = page.rect
            pw = float(rect.width)
            ph = float(rect.height)
            aspect = round(pw / ph, 2) if ph > 0 else 0.77
            tokens.append(f"p{page_idx}:ar{aspect}")

            # Extract structured text blocks
            blocks = page.get_text("blocks")
            # Sort blocks top-to-bottom, left-to-right
            blocks = sorted(blocks, key=lambda b: (round(b[1], -1), round(b[0], -1)))

            for b in blocks:
                # b = (x0, y0, x1, y1, text, block_no, block_type)
                if b[6] != 0:  # Text blocks only
                    continue

                raw_text = b[4].strip()
                if not raw_text:
                    continue

                lines = raw_text.split("\n")
                first_line = lines[0].strip()

                # Normalize the line into a structural token
                token = clean_structural_token(first_line)
                if len(token) < 2:
                    continue

                # Check if it's a structural label/heading or significant text
                is_structural = (
                    ":" in first_line or
                    any(kw in token for kw in STRUCTURAL_KEYWORDS) or
                    len(lines) > 1 or
                    first_line.isupper()
                )

                # Quantize spatial coordinates to a 100x100 relative grid
                rx = int((b[0] / pw) * 100) if pw > 0 else 0
                ry = int((b[1] / ph) * 100) if ph > 0 else 0

                # Truncate token length to avoid variable body text differences
                truncated_token = token[:32]

                if is_structural:
                    tokens.append(f"s_{rx}_{ry}:{truncated_token}")
                else:
                    # Generic text anchor
                    tokens.append(f"t_{rx}_{ry}:{truncated_token[:16]}")

        # Combine all tokens into canonical structural representation
        canonical_str = "|".join(tokens)
        fingerprint = hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()[:16]
        return fingerprint

    finally:
        if should_close:
            doc.close()
