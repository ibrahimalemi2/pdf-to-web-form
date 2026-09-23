import re
import pymupdf as fitz
from typing import List, Dict, Any

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
    # Matches times like 12:00, 10:15 am, etc.
    if re.match(r'^\d{1,2}:\d{2}(?:\s*(?:am|pm|noon|\(noon\)))?$', t):
        return True
    if re.match(r'^\d{1,2}\s*/\s*[a-z]+\s*/\s*\d{4}', t):
        return True
    return False

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

def parse_page_checkboxes(page: fitz.Page, page_num: int) -> List[Dict[str, Any]]:
    pw = float(page.rect.width)
    ph = float(page.rect.height)
    
    text_page = page.get_text("dict")
    spans = []
    
    for b in text_page.get("blocks", []):
        if b.get("type") != 0:
            continue
        for l in b.get("lines", []):
            for s in l.get("spans", []):
                font = s.get("font", "").lower()
                txt = s.get("text", "")
                is_cb = "wingdings" in font or "webdings" in font or any(ch in txt for ch in ["☐", "☑", "\u25a1", "\u25a2", "\x86"])
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
                    
        clean_lbl = prefix_label.rstrip(":").strip() if prefix_label else f"Choice Group {len(checkbox_groups)+1}"
        
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

def detect_form_fields_on_page(page: fitz.Page, page_num: int) -> List[Dict[str, Any]]:
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
    except Exception:
        pass

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
    except Exception:
        pass

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
                    if not is_next_label and (candidate_next["y0"] - current_line["y1"]) < 18 and len(candidate_next["text"]) < 120:
                        if candidate_next["x0"] >= current_line["x0"]:
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
        for existing in deduped_fields:
            e_box = existing.get("labelBbox", [0, 0, 0, 0])
            if abs(f_box[1] - e_box[1]) < 8.0 and abs(f_box[0] - e_box[0]) < 15.0:
                if existing["type"] == "Checkbox" and f["type"] != "Checkbox":
                    is_dup = True
                    break
        if not is_dup:
            deduped_fields.append(f)

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

def parse_pdf_document(pdf_bytes: bytes, filename: str = "document.pdf") -> Dict[str, Any]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
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

        if not doc_inferred_title:
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
    clean_title = re.sub(r'\.pdf$', '', raw_title, flags=re.IGNORECASE)
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
    if page_number < 1 or page_number > len(doc):
        doc.close()
        raise ValueError(f"Page {page_number} out of range (1..{len(doc)})")

    page = doc[page_number - 1]
    pix = page.get_pixmap(dpi=dpi)
    png_bytes = pix.tobytes("png")
    doc.close()
    return png_bytes
