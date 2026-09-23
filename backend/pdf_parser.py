# pyrefly: ignore-errors
import asyncio
import io
import logging
import re
from typing import Any

import cv2
import numpy as np
from PIL import Image
import pymupdf as fitz

try:
    import winocr
except ImportError:
    winocr = None

logger = logging.getLogger(__name__)

def run_coro_sync(coro):
    """Safely executes an async coroutine synchronously whether or not an event loop is running."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if loop and loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(asyncio.run, coro).result()
    else:
        return asyncio.run(coro)

def clean_ocr_label(text: str) -> str:
    """Cleans OCR noise and fixes common character recognition inaccuracies on scanned forms."""
    t = text.strip()
    t = re.sub(r'^[_\W]+', '', t)
    t = re.sub(r'[_\W]+$', '', t)
    t = re.sub(r'[\x80-\xff\ufffd]', '', t)
    t = re.sub(r'\s+', ' ', t).strip()
    
    replacements = [
        (r'\bbate of birth\b', 'Date of birth'),
        (r'\bbate\b', 'Date'),
        (r'\bnumte\.?r\b', 'Phone number'),
        (r'\bpir\.?one numipr\b', 'Phone number'),
        (r'\bmaih\b', 'Email'),
        (r'\bemail\.\b', 'Email'),
        (r'\bfred\b', 'lived'),
        (r'\bIQed\b', 'lived'),
        (r'\bheed\b', 'lived'),
        (r'\bplea;e\b', 'Please'),
        (r'\bpkase\b', 'Please'),
        (r'\bidentifkation\b', 'Identification'),
        (r'\bversan\b', 'Version'),
        (r'\bversion r\.?o\b', 'Version no.'),
        (r'\bfarm of lb\b', 'Alternative form of ID'),
        (r'\bCaf/?vehicle\b', 'Car/vehicle'),
        (r'\bCaf/vehkle\b', 'Car/vehicle'),
        (r'\bkt\b', 'Act'),
        (r'\bxid\.?resv\b', 'address'),
        (r'\b\*cdre-?w\b', 'address'),
        (r'\bcdre-?w\b', 'address'),
        (r'\bcurrent\b$', 'Current address'),
        (r'\bapplicant detail\b', 'Applicant details'),
        (r'\blorg\b', 'long'),
        (r'\bkavirg\b', 'leaving'),
        (r'\btails\b', 'details'),
        (r'\bitsi%nths\b', 'Months'),
        (r'\bnunths\b', 'Months'),
        (r'\bmobile pharr\.?e\b', 'Mobile phone'),
    ]
    for pat, rep in replacements:
        t = re.sub(pat, rep, t, flags=re.IGNORECASE)
    t = t.replace('*', ' ')
    t = re.sub(r'^[_\W]+', '', t)
    t = re.sub(r'[_\W]+$', '', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

# Words that indicate field labels
LABEL_KEYWORDS = [
    "instructor", "faculty", "professor", "lecturer", "teacher",
    "course title", "course id", "course no", "course code", "subject",
    "assignment number", "assignment no", "assignment title", "assignment release", "release",
    "section", "crn", "program", "department", "degree", "major",
    "student name", "roll no", "roll number", "student id", "applicant", "candidate", "full name",
    "submission date", "due date", "release date", "deadline", "term", "semester",
    "signature", "remarks", "notes", "accommodations", "comments", "description",
    "email", "phone", "campus", "room", "schedule", "building"
]

def clean_text(text: str) -> str:
    """Trim and clean whitespace and encoding artifacts."""
    if not text:
        return ""
    # Normalize common smart quotes, dashes, and replacement characters
    text = text.replace('\u2019', "'").replace('\u2018', "'").replace('\x92', "'").replace('\x91', "'")
    text = text.replace('\u201c', '"').replace('\u201d', '"').replace('\x93', '"').replace('\x94', '"')
    text = text.replace('\u2013', '-').replace('\u2014', '-').replace('\x96', '-').replace('\x97', '-')
    text = text.replace('\ufffd', "'")
    return re.sub(r'\s+', ' ', text).strip()

def is_time_or_numeric_string(text: str) -> bool:
    """Checks if text is a time or timestamp, not a form label (e.g. '12:00 (noon)', '10:00 AM')."""
    t = text.strip().lower()
    if re.match(r'^\d{1,2}:\d{2}(?:\s*(?:am|pm|noon|\(noon\)))?$', t):
        return True
    return bool(re.match(r'^\d{1,2}\s*/\s*[a-z]+\s*/\s*\d{4}', t))

def detect_field_type(label: str) -> str:
    """Classifies probable field type based on label semantics."""
    lower = label.lower()
    if any(k in lower for k in ["answer", "response", "solution", "remarks", "notes", "accommodations", "comments", "description"]):
        return "Long Text"
    elif any(k in lower for k in ["date", "deadline", "term", "time"]):
        return "Date"
    elif any(k in lower for k in ["section", "campus", "program"]):
        return "Dropdown"
    elif re.search(r'\b(signature|signed|sign)\b', lower) and "assign" not in lower:
        return "Signature"
    elif any(k in lower for k in ["agree", "consent", "confirm", "check", "marital", "gender", "status"]):
        return "Checkbox"
    elif any(k in lower for k in ["attach", "upload", "document", "file"]):
        return "File Upload"
    return "Short Text"

def parse_page_checkboxes(page: fitz.Page, page_num: int) -> list[dict[str, Any]]:
    pw = float(page.rect.width)
    ph = float(page.rect.height)
    
    text_page = page.get_text("dict")
    spans = []
    
    cb_chars = {"☐", "☑", "☒", "\u25a1", "\u25a2", "\u25a0", "\u25aa", "\u25ab", "\u25fd", "\u25fe", "\u2751", "\u2752", "\x86", "\x87", "\xa8", "\xfe", "\xfc"}
    cb_fonts = ("wingding", "webding", "dingbat", "marlett", "symbol", "zapf")

    for b in text_page.get("blocks", []):
        if b.get("type") != 0:
            continue
        for l in b.get("lines", []):
            for s in l.get("spans", []):
                font = s.get("font", "").lower()
                txt = s.get("text", "")
                is_cb = any(f in font for f in cb_fonts) or any(ch in txt for ch in cb_chars)
                if txt.strip() or is_cb:
                    spans.append({
                        "text": txt,
                        "is_cb": is_cb,
                        "bbox": s["bbox"],
                        "x0": s["bbox"][0],
                        "y0": s["bbox"][1],
                        "x1": s["bbox"][2],
                        "y1": s["bbox"][3],
                        "center_y": (s["bbox"][1] + s["bbox"][3]) / 2
                    })

    # Collect vector-drawn square checkboxes from PDF drawing paths (rectangles with width/height ~ 6-22pt)
    try:
        drawings = page.get_drawings()
        for d in drawings:
            r = d.get("rect")
            if r:
                w = float(r.width)
                h = float(r.height)
                if 6.0 <= w <= 24.0 and 6.0 <= h <= 24.0 and abs(w - h) <= 4.0:
                    if not any(abs(s["x0"] - r.x0) < 5 and abs(s["y0"] - r.y0) < 5 for s in spans):
                        spans.append({
                            "text": "☐",
                            "is_cb": True,
                            "bbox": [float(r.x0), float(r.y0), float(r.x1), float(r.y1)],
                            "x0": float(r.x0),
                            "y0": float(r.y0),
                            "x1": float(r.x1),
                            "y1": float(r.y1),
                            "center_y": (r.y0 + r.y1) / 2
                        })
    except Exception:
        pass
                    
    spans.sort(key=lambda s: (s["y0"], s["x0"]))
    
    rows = []
    for s in spans:
        matched_row = None
        for r in rows:
            if abs(s["center_y"] - r["center_y"]) < 6.0:
                matched_row = r
                break
        if matched_row:
            matched_row["spans"].append(s)
            matched_row["y0"] = min(matched_row["y0"], s["y0"])
            matched_row["y1"] = max(matched_row["y1"], s["y1"])
            matched_row["center_y"] = (matched_row["y0"] + matched_row["y1"]) / 2
        else:
            rows.append({
                "y0": s["y0"],
                "y1": s["y1"],
                "center_y": s["center_y"],
                "spans": [s]
            })
            
    for r in rows:
        r["spans"].sort(key=lambda s: s["x0"])
        
    checkbox_groups = []
    
    r_idx = 0
    while r_idx < len(rows):
        r = rows[r_idx]
        cb_spans = [s for s in r["spans"] if s["is_cb"]]
        if not cb_spans:
            r_idx += 1
            continue
            
        first_cb = cb_spans[0]
        prefix_spans = [s for s in r["spans"] if s["x1"] <= first_cb["x0"] + 2 and not s["is_cb"]]
        prefix_label = " ".join(s["text"] for s in prefix_spans).strip()
        
        lbl_bbox = [prefix_spans[0]["x0"], prefix_spans[0]["y0"], prefix_spans[-1]["x1"], prefix_spans[-1]["y1"]] if prefix_spans else [r["spans"][0]["x0"], r["y0"], first_cb["x0"], r["y1"]]
        
        if not prefix_label and r_idx > 0:
            prev_r = rows[r_idx - 1]
            if not any(s["is_cb"] for s in prev_r["spans"]) and (r["y0"] - prev_r["y1"]) < 18.0:
                prefix_label = " ".join(s["text"] for s in prev_r["spans"]).strip()
                lbl_bbox = [prev_r["spans"][0]["x0"], prev_r["y0"], prev_r["spans"][-1]["x1"], prev_r["y1"]]
                
        options = []
        options_coords = []
        
        for idx, cb in enumerate(cb_spans):
            next_cb_x0 = cb_spans[idx + 1]["x0"] if idx + 1 < len(cb_spans) else 9999.0
            opt_spans = [s for s in r["spans"] if cb["x1"] - 2 <= s["x0"] < next_cb_x0 and not s["is_cb"]]
            opt_text = " ".join(s["text"] for s in opt_spans).strip()
            opt_text = re.sub(r'[\x86\x7f\u25a1\u25a2☐☑]+', '', opt_text).strip()
            if not opt_text:
                opt_text = f"Option {len(options)+1}"
                
            bx0, by0, bx1, by1 = cb["bbox"]
            bw = max(10.0, bx1 - bx0)
            bh = max(10.0, by1 - by0)
            
            options.append(opt_text)
            options_coords.append({
                "label": opt_text,
                "x": f"{round((bx0 / pw) * 100, 2)}%",
                "y": f"{round((by0 / ph) * 100, 2)}%",
                "w": f"{round((bw / pw) * 100, 2)}%",
                "h": f"{round((bh / ph) * 100, 2)}%",
                "bbox": [round(bx0, 2), round(by0, 2), round(bx0 + bw, 2), round(by0 + bh, 2)]
            })
            
        if r_idx + 1 < len(rows):
            next_r = rows[r_idx + 1]
            next_cb_spans = [s for s in next_r["spans"] if s["is_cb"]]
            if next_cb_spans and (next_r["y0"] - r["y1"]) < 16.0:
                next_first_cb = next_cb_spans[0]
                next_prefix_spans = [s for s in next_r["spans"] if s["x1"] <= next_first_cb["x0"] + 2 and not s["is_cb"]]
                if not next_prefix_spans:
                    for idx, cb in enumerate(next_cb_spans):
                        next_cb_x0 = next_cb_spans[idx + 1]["x0"] if idx + 1 < len(next_cb_spans) else 9999.0
                        opt_spans = [s for s in next_r["spans"] if cb["x1"] - 2 <= s["x0"] < next_cb_x0 and not s["is_cb"]]
                        opt_text = " ".join(s["text"] for s in opt_spans).strip()
                        opt_text = re.sub(r'[\x86\x7f\u25a1\u25a2☐☑]+', '', opt_text).strip()
                        if not opt_text:
                            opt_text = f"Option {len(options)+1}"
                        bx0, by0, bx1, by1 = cb["bbox"]
                        bw = max(10.0, bx1 - bx0)
                        bh = max(10.0, by1 - by0)
                        options.append(opt_text)
                        options_coords.append({
                            "label": opt_text,
                            "x": f"{round((bx0 / pw) * 100, 2)}%",
                            "y": f"{round((by0 / ph) * 100, 2)}%",
                            "w": f"{round((bw / pw) * 100, 2)}%",
                            "h": f"{round((bh / ph) * 100, 2)}%",
                            "bbox": [round(bx0, 2), round(by0, 2), round(bx0 + bw, 2), round(by0 + bh, 2)]
                        })
                    r_idx += 1
                    
        clean_lbl = prefix_label.rstrip(":").strip() if prefix_label else (options[0] if len(options) == 1 else f"Choice Group {len(checkbox_groups)+1}")
        clean_lbl = re.sub(r'^(?:\d+\.|\*|\-)\s*', '', clean_lbl).strip()
        
        all_x0 = min(o["bbox"][0] for o in options_coords)
        all_y0 = min(o["bbox"][1] for o in options_coords)
        all_x1 = max(o["bbox"][2] for o in options_coords)
        all_y1 = max(o["bbox"][3] for o in options_coords)
        
        is_multi = any(k in clean_lbl.lower() for k in ["purpose", "visit", "interest"])
        per_row = 2 if len(options) <= 4 else (4 if len(options) >= 8 else 3)
        
        checkbox_groups.append({
            "label": clean_lbl,
            "type": "Checkbox",
            "options": options,
            "optionsCoordinates": options_coords,
            "multipleChoices": is_multi,
            "choicesPerRow": per_row,
            "tickFormat": "Tick",
            "tickColor": "#000000",
            "labelBbox": [round(c, 2) for c in lbl_bbox],
            "inputBbox": [round(all_x0, 2), round(all_y0, 2), round(all_x1, 2), round(all_y1, 2)],
            "labelDimensions": {"width": round(lbl_bbox[2] - lbl_bbox[0], 2), "height": round(lbl_bbox[3] - lbl_bbox[1], 2)},
            "inputDimensions": {"width": round(all_x1 - all_x0, 2), "height": round(all_y1 - all_y0, 2)},
            "columnSpan": 2,
            "percentage": {
                "x": f"{round((all_x0 / pw) * 100, 2)}%",
                "y": f"{round((all_y0 / ph) * 100, 2)}%",
                "w": f"{round(((all_x1 - all_x0) / pw) * 100, 2)}%",
                "h": f"{round(((all_y1 - all_y0) / ph) * 100, 2)}%",
                "targetX": f"{round((all_x0 / pw) * 100, 2)}%",
                "targetY": f"{round((all_y0 / ph) * 100, 2)}%",
                "targetW": f"{round(((all_x1 - all_x0) / pw) * 100, 2)}%",
                "targetH": f"{round(((all_y1 - all_y0) / ph) * 100, 2)}%"
            }
        })
        r_idx += 1
        
    return checkbox_groups

def detect_scanned_page_fields(page: fitz.Page, page_num: int) -> tuple[list[dict[str, Any]], str]:
    """Extracts form fields and document title from scanned or rasterized PDF pages using Windows Native OCR + OpenCV."""
    if winocr is None:
        return [], ""
    
    pw = float(page.rect.width)
    ph = float(page.rect.height)
    if pw <= 0 or ph <= 0:
        return [], ""
        
    dpi = 180
    pix = page.get_pixmap(dpi=dpi)
    scale_x = pw / pix.width
    scale_y = ph / pix.height
    
    img_pil = Image.open(io.BytesIO(pix.tobytes("png")))
    try:
        ocr_res = run_coro_sync(winocr.recognize_pil(img_pil, "en"))
    except Exception as e:
        logger.warning("winocr recognition failed on page %d: %s", page_num, e)
        return [], ""
        
    # Detect horizontal lines using OpenCV
    form_lines = []
    try:
        img_np = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.height, pix.width, pix.n))
        if pix.n == 4:
            img_np = cv2.cvtColor(img_np, cv2.COLOR_RGBA2BGR)
        gray = cv2.cvtColor(img_np, cv2.COLOR_BGR2GRAY)
        bw = cv2.adaptiveThreshold(~gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 15, -2)
        h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (int(pix.width * 0.05), 1))
        h_lines = cv2.morphologyEx(bw, cv2.MORPH_OPEN, h_kernel)
        contours, _ = cv2.findContours(h_lines, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in contours:
            x, y, w, h = cv2.boundingRect(c)
            if w > pix.width * 0.06 and y > pix.height * 0.12:
                form_lines.append({
                    "x0": x * scale_x,
                    "y0": y * scale_y,
                    "x1": (x + w) * scale_x,
                    "y1": (y + h) * scale_y,
                    "w": w * scale_x,
                    "h": h * scale_y
                })
    except Exception as e:
        logger.debug("OpenCV line detection non-fatal error: %s", e)
        
    inferred_title = ""
    fields = []
    seen_labels = set()
    field_counter = 1
    
    ocr_lines = []
    for line in ocr_res.lines:
        t = line.text.strip()
        if len(t) < 2:
            continue
        min_x = min(w.bounding_rect.x for w in line.words) * scale_x
        min_y = min(w.bounding_rect.y for w in line.words) * scale_y
        max_x = max(w.bounding_rect.x + w.bounding_rect.width for w in line.words) * scale_x
        max_y = max(w.bounding_rect.y + w.bounding_rect.height for w in line.words) * scale_y
        ocr_lines.append({
            "text": t,
            "min_x": min_x,
            "min_y": min_y,
            "max_x": max_x,
            "max_y": max_y,
            "line": line
        })
        
    ocr_lines.sort(key=lambda l: (l["min_y"], l["min_x"]))
    
    for item in ocr_lines:
        raw_text = item["text"]
        min_x = item["min_x"]
        min_y = item["min_y"]
        max_x = item["max_x"]
        max_y = item["max_y"]
        
        cleaned = clean_ocr_label(raw_text)
        if len(cleaned) < 2:
            continue
            
        lower_cleaned = cleaned.lower()
        
        # Check for title near the top
        if not inferred_title and min_y < ph * 0.25 and ("form" in lower_cleaned or "application" in lower_cleaned or "agreement" in lower_cleaned or "submission" in lower_cleaned):
            inferred_title = cleaned
            continue
            
        # Skip pure explanatory paragraphs without inputs
        if any(k in lower_cleaned for k in ["privacy", "privet", "protected under", "information you provide", "credit reference", "credit check", "address below", "please complete"]):
            continue
        if len(cleaned) > 50 and ":" not in cleaned and "name" not in lower_cleaned:
            continue
            
        # Skip section headers that have no input
        if lower_cleaned in ["tenancy details", "applicant details", "identification", "personal details", "section 1", "section 2"]:
            continue
            
        # Avoid duplicate labels
        norm_key = re.sub(r'[^a-z0-9]', '', lower_cleaned)
        if norm_key in seen_labels:
            continue
        seen_labels.add(norm_key)
        
        # Find closest form line that is either to the right on the same row, or directly below
        matched_line = None
        for fl in form_lines:
            if fl["x0"] >= min_x + 10 and abs((fl["y0"] + fl["y1"])/2 - (min_y + max_y)/2) < 14:
                matched_line = fl
                break
            if abs(fl["y0"] - max_y) < 12 and fl["x0"] <= max_x and fl["x1"] >= min_x:
                matched_line = fl
                break
                
        if matched_line:
            inp_x0 = max(min_x, matched_line["x0"])
            inp_x1 = min(pw - 20, matched_line["x1"])
            inp_y0 = max(min_y - 2, matched_line["y0"] - 18)
            inp_y1 = matched_line["y0"] + 4
        else:
            if max_x < pw * 0.45:
                inp_x0 = max_x + 8
                inp_x1 = min(pw * 0.55, max(inp_x0 + 90, pw * 0.48))
                inp_y0 = min_y - 2
                inp_y1 = max_y + 4
            else:
                inp_x0 = max_x + 8
                inp_x1 = min(pw - 20, max(inp_x0 + 80, pw - 24))
                inp_y0 = min_y - 2
                inp_y1 = max_y + 4
                
        f_type = detect_field_type(cleaned)
        inp_w = round(inp_x1 - inp_x0, 2)
        inp_h = round(inp_y1 - inp_y0, 2)
        lbl_w = round(max_x - min_x, 2)
        lbl_h = round(max_y - min_y, 2)
        
        span = 2 if (f_type == "Long Text" or inp_w > 260) else 1
        
        fields.append({
            "id": f"field_{page_num}_{field_counter}",
            "fieldNumber": field_counter,
            "page": page_num,
            "type": f_type,
            "label": cleaned,
            "value": "",
            "rawText": raw_text,
            "labelBbox": [round(min_x, 2), round(min_y, 2), round(max_x, 2), round(max_y, 2)],
            "inputBbox": [round(inp_x0, 2), round(inp_y0, 2), round(inp_x1, 2), round(inp_y1, 2)],
            "labelDimensions": {"width": lbl_w, "height": lbl_h},
            "inputDimensions": {"width": inp_w, "height": inp_h},
            "columnSpan": span,
            "percentage": {
                "x": f"{round((inp_x0 / pw) * 100, 2)}%",
                "y": f"{round((inp_y0 / ph) * 100, 2)}%",
                "w": f"{round((inp_w / pw) * 100, 2)}%",
                "h": f"{round((inp_h / ph) * 100, 2)}%",
                "targetX": f"{round((inp_x0 / pw) * 100, 2)}%",
                "targetY": f"{round((inp_y0 / ph) * 100, 2)}%",
                "targetW": f"{round((inp_w / pw) * 100, 2)}%",
                "targetH": f"{round((inp_h / ph) * 100, 2)}%"
            }
        })
        field_counter += 1
        
    return fields, inferred_title

def detect_form_fields_on_page(page: fitz.Page, page_num: int) -> list[dict[str, Any]]:
    rect = page.rect
    page_width = float(rect.width)
    page_height = float(rect.height)
    
    fields = []
    seen_labels = set()
    field_counter = 1

    # 1. Interactive AcroForm widgets check
    try:
        widgets = list(page.widgets())
        for w in widgets:
            w_rect = w.rect
            lbl = w.field_name or f"Field {field_counter}"
            val = w.field_value or ""
            f_type = "Short Text"
            if w.field_type == fitz.PDF_WIDGET_TYPE_TEXT:
                f_type = "Long Text" if (w_rect.height > 40) else "Short Text"
            elif w.field_type == fitz.PDF_WIDGET_TYPE_CHECKBOX:
                f_type = "Checkbox"
            elif w.field_type in (fitz.PDF_WIDGET_TYPE_LISTBOX, fitz.PDF_WIDGET_TYPE_COMBOBOX):
                f_type = "Dropdown"
            elif w.field_type == fitz.PDF_WIDGET_TYPE_SIGNATURE:
                f_type = "Signature"

            tx0, ty0, tx1, ty1 = round(w_rect.x0, 2), round(w_rect.y0, 2), round(w_rect.x1, 2), round(w_rect.y1, 2)
            tw, th = round(tx1 - tx0, 2), round(ty1 - ty0, 2)

            fields.append({
                "id": f"field_{page_num}_{field_counter}",
                "fieldNumber": field_counter,
                "page": page_num,
                "type": f_type,
                "label": clean_text(lbl),
                "value": str(val),
                "rawText": clean_text(lbl),
                "labelBbox": [tx0, ty0, tx1, ty1],
                "inputBbox": [tx0, ty0, tx1, ty1],
                "labelDimensions": {"width": tw, "height": th},
                "inputDimensions": {"width": tw, "height": th},
                "columnSpan": 2 if (f_type == "Long Text" or tw > page_width * 0.5) else 1,
                "percentage": {
                    "x": f"{round((tx0 / page_width) * 100, 2)}%",
                    "y": f"{round((ty0 / page_height) * 100, 2)}%",
                    "w": f"{round((tw / page_width) * 100, 2)}%",
                    "h": f"{round((th / page_height) * 100, 2)}%",
                    "targetX": f"{round((tx0 / page_width) * 100, 2)}%",
                    "targetY": f"{round((ty0 / page_height) * 100, 2)}%",
                    "targetW": f"{round((tw / page_width) * 100, 2)}%",
                    "targetH": f"{round((th / page_height) * 100, 2)}%"
                }
            })
            seen_labels.add(lbl.lower())
            field_counter += 1
    except Exception as exc:  # noqa: BLE001 - resilience against unpredictable C-library/PDF corruption
        logger.debug("Non-fatal error extracting widgets on page %d: %s", page_num, exc)

    # 2. Extract visual checkbox groups
    try:
        cb_groups = parse_page_checkboxes(page, page_num)
        for cb in cb_groups:
            fields.append({
                "id": f"field_{page_num}_{field_counter}",
                "fieldNumber": field_counter,
                "page": page_num,
                "type": "Checkbox",
                "label": cb["label"],
                "value": "",
                "rawText": cb["label"],
                "options": cb["options"],
                "optionsCoordinates": cb["optionsCoordinates"],
                "multipleChoices": cb["multipleChoices"],
                "choicesPerRow": cb["choicesPerRow"],
                "tickFormat": cb["tickFormat"],
                "tickColor": cb["tickColor"],
                "labelBbox": cb["labelBbox"],
                "inputBbox": cb["inputBbox"],
                "labelDimensions": cb["labelDimensions"],
                "inputDimensions": cb["inputDimensions"],
                "columnSpan": cb["columnSpan"],
                "percentage": cb["percentage"]
            })
            seen_labels.add(cb["label"].lower())
            field_counter += 1
    except Exception as exc:  # noqa: BLE001 - resilience against unpredictable C-library/PDF corruption
        logger.debug("Non-fatal error parsing checkboxes on page %d: %s", page_num, exc)

    # 3. Extract structured text lines
    text_page = page.get_text("dict")
    lines_list = []
    
    for block in text_page.get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            line_text = ""
            for span in line.get("spans", []):
                line_text += span.get("text", "") + " "
            cleaned = clean_text(line_text)
            if cleaned and len(cleaned) >= 1:
                bx0, by0, bx1, by1 = line["bbox"]
                lines_list.append({
                    "text": cleaned,
                    "bbox": [bx0, by0, bx1, by1],
                    "center_y": (by0 + by1) / 2,
                    "x0": bx0,
                    "x1": bx1,
                    "y0": by0,
                    "y1": by1
                })

    lines_list.sort(key=lambda l: (l["y0"], l["x0"]))

    # Scan lines for Answer blocks and Field labels
    i = 0
    while i < len(lines_list):
        current_line = lines_list[i]
        txt = current_line["text"]

        # Skip timestamp lines or purely numeric values like '12:00 (noon)'
        if is_time_or_numeric_string(txt):
            i += 1
            continue

        # Check if line matches an Answer or Response header
        is_answer_header = bool(re.match(r'^(?:answer|response|solution)\s*\d*[:.]?$', txt, re.IGNORECASE))
        
        if is_answer_header:
            ans_label = txt.rstrip(":").strip()
            ans_lines = []
            j = i + 1
            min_x0 = current_line["x0"]
            max_x1 = current_line["x1"]
            min_y0 = current_line["y1"] + 2
            max_y1 = min_y0 + 70

            while j < len(lines_list):
                next_l = lines_list[j]
                if re.match(r'^(?:question|answer|section|part)\s*\d*[:.]?', next_l["text"], re.IGNORECASE):
                    break
                ans_lines.append(next_l["text"])
                min_x0 = min(min_x0, next_l["x0"])
                max_x1 = max(max_x1, next_l["x1"])
                max_y1 = max(max_y1, next_l["y1"])
                j += 1

            ans_value = " ".join(ans_lines)
            target_x0 = max(20.0, min_x0 - 6.0)
            target_y0 = min_y0
            target_x1 = min(page_width - 20.0, max(max_x1 + 10.0, target_x0 + 350.0))
            target_y1 = max(target_y0 + 55.0, max_y1 + 8.0)

            target_w = round(target_x1 - target_x0, 2)
            target_h = round(target_y1 - target_y0, 2)

            fields.append({
                "id": f"field_{page_num}_{field_counter}",
                "fieldNumber": field_counter,
                "page": page_num,
                "type": "Long Text",
                "label": ans_label,
                "value": ans_value,
                "rawText": txt,
                "labelBbox": [round(c, 2) for c in current_line["bbox"]],
                "inputBbox": [round(target_x0, 2), round(target_y0, 2), round(target_x1, 2), round(target_y1, 2)],
                "labelDimensions": {"width": round(current_line["x1"] - current_line["x0"], 2), "height": round(current_line["y1"] - current_line["y0"], 2)},
                "inputDimensions": {"width": target_w, "height": target_h},
                "columnSpan": 2,
                "percentage": {
                    "x": f"{round((target_x0 / page_width) * 100, 2)}%",
                    "y": f"{round((target_y0 / page_height) * 100, 2)}%",
                    "w": f"{round((target_w / page_width) * 100, 2)}%",
                    "h": f"{round((target_h / page_height) * 100, 2)}%",
                    "targetX": f"{round((target_x0 / page_width) * 100, 2)}%",
                    "targetY": f"{round((target_y0 / page_height) * 100, 2)}%",
                    "targetW": f"{round((target_w / page_width) * 100, 2)}%",
                    "targetH": f"{round((target_h / page_height) * 100, 2)}%"
                }
            })
            seen_labels.add(ans_label.lower())
            field_counter += 1
            i = j
            continue

        matched = False
        matched_label = ""

        # Check for multi-line broken label like "Assignment Release \n Date:"
        if "assignment release" in txt.lower():
            # Check if Date: exists in the next couple lines on the left column
            for look_idx in range(i + 1, min(i + 4, len(lines_list))):
                if lines_list[look_idx]["text"].lower().startswith("date") and lines_list[look_idx]["x0"] <= 120:
                    txt = "Assignment Release Date"
                    matched = True
                    matched_label = "Assignment Release Date"
                    lines_list.pop(look_idx)
                    break

        # Check keyword list
        if not matched:
            lower_txt = txt.lower()
            for kw in LABEL_KEYWORDS:
                if kw in lower_txt:
                    matched = True
                    # If line has a colon, take text up to colon
                    if ":" in txt and not is_time_or_numeric_string(txt):
                        matched_label = txt.split(":", 1)[0].strip()
                    else:
                        matched_label = txt.strip()
                    break

        # Check generic colon line
        if not matched and ":" in txt and not is_time_or_numeric_string(txt):
            parts = txt.split(":", 1)
            candidate = parts[0].strip()
            # If candidate is short, not a sentence
            if len(candidate) <= 32 and not re.search(r'\b(?:because|which|where|when|state|states|guarantee)\b', candidate, re.IGNORECASE):
                matched = True
                matched_label = candidate

        if matched and matched_label:
            clean_lbl = re.sub(r'^(?:\d+\.|\*|\-)\s*', '', matched_label).rstrip(":").strip()
            if len(clean_lbl) > 1 and clean_lbl.lower() not in seen_labels and not is_time_or_numeric_string(clean_lbl):
                seen_labels.add(clean_lbl.lower())

                f_value = ""
                val_bbox = None

                # Look for value to the right on the same line
                for other_l in lines_list:
                    if other_l == current_line:
                        continue
                    if other_l["x0"] > current_line["x0"] + 30 and abs(other_l["center_y"] - current_line["center_y"]) < 16:
                        f_value = other_l["text"]
                        val_bbox = other_l["bbox"]
                        break

                # If not found on same line, look for value in line directly below
                if not f_value and i + 1 < len(lines_list):
                    candidate_next = lines_list[i + 1]
                    lower_next = candidate_next["text"].lower()
                    is_next_label = any(kw in lower_next for kw in LABEL_KEYWORDS) or candidate_next["text"].endswith(":")
                    if (
                        not is_next_label
                        and (candidate_next["y0"] - current_line["y1"]) < 18
                        and len(candidate_next["text"]) < 120
                        and candidate_next["x0"] >= current_line["x0"]
                    ):
                        f_value = candidate_next["text"]
                        val_bbox = candidate_next["bbox"]

                f_type = detect_field_type(clean_lbl)

                lx0, ly0, lx1, ly1 = current_line["bbox"]
                lw = round(lx1 - lx0, 2)
                lh = round(ly1 - ly0, 2)

                if val_bbox:
                    vx0, vy0, vx1, vy1 = val_bbox
                    inp_x0 = max(lx1 + 8, vx0 - 4)
                    inp_x1 = max(vx1 + 8, inp_x0 + 120)
                    inp_y0 = vy0 - 2
                    inp_y1 = vy1 + 2
                else:
                    inp_x0 = min(lx1 + 8, page_width - 120)
                    inp_x1 = min(page_width - 24, inp_x0 + 200)
                    inp_y0 = ly0 - 2
                    inp_y1 = ly1 + 3

                tw = round(inp_x1 - inp_x0, 2)
                th = round(inp_y1 - inp_y0, 2)

                span = 2 if (f_type == "Long Text" or tw > 260) else 1

                fields.append({
                    "id": f"field_{page_num}_{field_counter}",
                    "fieldNumber": field_counter,
                    "page": page_num,
                    "type": f_type,
                    "label": clean_lbl,
                    "value": f_value,
                    "rawText": txt,
                    "labelBbox": [round(lx0, 2), round(ly0, 2), round(lx1, 2), round(ly1, 2)],
                    "inputBbox": [round(inp_x0, 2), round(inp_y0, 2), round(inp_x1, 2), round(inp_y1, 2)],
                    "labelDimensions": {"width": lw, "height": lh},
                    "inputDimensions": {"width": tw, "height": th},
                    "columnSpan": span,
                    "percentage": {
                        "x": f"{round((inp_x0 / page_width) * 100, 2)}%",
                        "y": f"{round((inp_y0 / page_height) * 100, 2)}%",
                        "w": f"{round((tw / page_width) * 100, 2)}%",
                        "h": f"{round((th / page_height) * 100, 2)}%",
                        "targetX": f"{round((inp_x0 / page_width) * 100, 2)}%",
                        "targetY": f"{round((inp_y0 / page_height) * 100, 2)}%",
                        "targetW": f"{round((tw / page_width) * 100, 2)}%",
                        "targetH": f"{round((th / page_height) * 100, 2)}%"
                    }
                })
                field_counter += 1

        i += 1

    # Filter duplicates where a generic text field was created at the same position as a Checkbox
    deduped_fields = []
    for f in fields:
        f_box = f.get("labelBbox", [0, 0, 0, 0])
        is_dup = False
        for existing in list(deduped_fields):
            e_box = existing.get("labelBbox", [0, 0, 0, 0])
            if (
                abs(f_box[1] - e_box[1]) < 14.0
                and abs(f_box[0] - e_box[0]) < 30.0
            ):
                if existing.get("options") and not f.get("options"):
                    is_dup = True
                    break
                elif not existing.get("options") and f.get("options"):
                    deduped_fields.remove(existing)
                    break
                elif existing["type"] == "Checkbox" and f["type"] != "Checkbox":
                    is_dup = True
                    break
        if not is_dup:
            deduped_fields.append(f)

    # If standard text extraction found fewer than 2 fields, fallback to scanned/raster OCR
    if len(deduped_fields) < 2:
        try:
            scanned_fields, scanned_title = detect_scanned_page_fields(page, page_num)
            if scanned_fields and len(scanned_fields) >= 2:
                if scanned_title:
                    page._inferred_title = scanned_title
                return scanned_fields
        except Exception as exc:
            logger.warning("Scanned page OCR fallback failed on page %d: %s", page_num, exc)

    # Sort fields on this page in natural visual reading order: top-to-bottom, then left-to-right
    deduped_fields.sort(key=lambda f: (
        round(f.get("labelBbox", [0, 0, 0, 0])[1] / 12.0) * 12.0,
        f.get("labelBbox", [0, 0, 0, 0])[0]
    ))

    # Re-assign sequential field numbers and IDs
    for idx, f in enumerate(deduped_fields, start=1):
        f["fieldNumber"] = idx
        f["id"] = f"field_{page_num}_{idx}"

    return deduped_fields

def parse_pdf_document(pdf_bytes: bytes, filename: str = "document.pdf") -> dict[str, Any]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        total_pages = len(doc)
        pages_data = []
        all_fields = []

        doc_inferred_title = ""

        for page_index in range(total_pages):
            page = doc[page_index]
            page_num = page_index + 1
            rect = page.rect
            page_width = float(rect.width)
            page_height = float(rect.height)

            detected_fields = detect_form_fields_on_page(page, page_num)
            all_fields.extend(detected_fields)

            if not doc_inferred_title and hasattr(page, "_inferred_title") and page._inferred_title:
                doc_inferred_title = page._inferred_title
            elif not doc_inferred_title:
                for f in detected_fields:
                    if f["label"].lower() in ["course title", "subject"]:
                        doc_inferred_title = f"{f['value']} - Submission Form" if f["value"] else ""
                        break

            pages_data.append({
                "pageNumber": page_num,
                "width": page_width,
                "height": page_height,
                "aspectRatio": round(page_width / page_height, 3) if page_height > 0 else 0.77,
                "detectedFields": detected_fields
            })

        raw_title = doc_inferred_title or doc.metadata.get("title") or filename
        clean_title = re.sub(r'^[0-9a-f]{8}_', '', raw_title, flags=re.IGNORECASE)
        clean_title = re.sub(r'\.pdf$', '', clean_title, flags=re.IGNORECASE)
        clean_title = re.sub(r'[._-]+$', '', clean_title)
        clean_title = re.sub(r'[-_.]+', ' ', clean_title).strip()
        if clean_title.islower() or clean_title.isupper():
            clean_title = clean_title.title()

        metadata = {
            "title": clean_title,
            "author": doc.metadata.get("author") or "Unknown",
            "creator": doc.metadata.get("creator") or "PDF-to-Web-Form Parser",
            "totalPages": total_pages
        }
    finally:
        doc.close()

    # Sort all fields in natural document reading order (page first, then Y top-to-bottom, then X left-to-right)
    all_fields.sort(key=lambda f: (
        f["page"],
        round(f.get("labelBbox", [0, 0, 0, 0])[1] / 12.0) * 12.0,
        f.get("labelBbox", [0, 0, 0, 0])[0]
    ))
    for idx, f in enumerate(all_fields, start=1):
        f["fieldNumber"] = idx

    return {
        "filename": filename,
        "metadata": metadata,
        "totalPages": total_pages,
        "pages": pages_data,
        "totalDetectedFields": len(all_fields),
        "fields": all_fields
    }

def render_page_to_png(pdf_bytes: bytes, page_number: int = 1, dpi: int = 150) -> bytes:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        if page_number < 1 or page_number > len(doc):
            raise ValueError(f"Page {page_number} out of range (1..{len(doc)})")

        page = doc[page_number - 1]
        pix = page.get_pixmap(dpi=dpi)
        return pix.tobytes("png")
    finally:
        doc.close()
