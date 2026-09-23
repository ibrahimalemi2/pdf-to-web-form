import base64
from typing import Dict, Any, List, Optional
import pymupdf as fitz


def parse_hex_color(hex_str: Optional[str], default=(0.1, 0.2, 0.8)):
    """Parses a hex color string like #1d4ed8 to RGB tuple (0.0 - 1.0)."""
    if not hex_str or not isinstance(hex_str, str):
        return default
    hex_str = hex_str.strip().lstrip('#')
    if len(hex_str) == 6:
        try:
            return (
                int(hex_str[0:2], 16) / 255.0,
                int(hex_str[2:4], 16) / 255.0,
                int(hex_str[4:6], 16) / 255.0
            )
        except ValueError:
            pass
    return default


def fill_pdf_template(
    pdf_bytes: bytes,
    fields: List[Dict[str, Any]],
    form_data: Dict[str, Any]
) -> bytes:
    """
    Stamps user-submitted form data onto the original PDF document.
    Accurately positions text, numbers, signatures, and checkboxes based on
    field geometry (inputBbox or percentage mapping) and optionCoordinates.
    """
    if not pdf_bytes:
        raise ValueError("Original PDF bytes must not be empty.")

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    for field in fields:
        field_type = field.get("type", "Short Text")
        if field_type in ("Header", "Section"):
            continue

        field_id = field.get("id")
        val = form_data.get(field_id) if field_id in form_data else field.get("value")

        if val is None or val == "" or val == []:
            continue

        # 1. Determine target page (1-indexed to 0-indexed)
        page_num = field.get("pdfMapping", {}).get("page") or field.get("page", 1)
        try:
            page_num = int(page_num)
        except (ValueError, TypeError):
            page_num = 1

        if page_num < 1 or page_num > len(doc):
            continue

        page = doc[page_num - 1]
        page_w = page.rect.width
        page_h = page.rect.height

        # 2. Determine target input bounding box
        rect = None
        ibbox = field.get("inputBbox")
        if ibbox and isinstance(ibbox, (list, tuple)) and len(ibbox) == 4:
            try:
                rect = fitz.Rect(float(ibbox[0]), float(ibbox[1]), float(ibbox[2]), float(ibbox[3]))
            except Exception:
                rect = None

        if rect is None:
            pm = field.get("pdfMapping") or field.get("percentage") or {}
            try:
                px = float(str(pm.get("x", "0")).replace("%", "")) / 100.0
                py = float(str(pm.get("y", "0")).replace("%", "")) / 100.0
                pw = float(str(pm.get("w", "0")).replace("%", "")) / 100.0
                ph = float(str(pm.get("h", "0")).replace("%", "")) / 100.0
                rect = fitz.Rect(px * page_w, py * page_h, (px + pw) * page_w, (py + ph) * page_h)
            except Exception:
                rect = None

        # 3. Handle Field Types
        if field_type == "Checkbox":
            opts_coords = field.get("optionsCoordinates") or field.get("pdfMapping", {}).get("optionsCoordinates")
            tick_format = field.get("tickFormat", "Tick")
            rgb = parse_hex_color(field.get("tickColor"), default=(0.1, 0.2, 0.75))

            selected_list = val if isinstance(val, list) else [str(val)]
            clean_selected = {str(s).strip().lower() for s in selected_list}

            if opts_coords and isinstance(opts_coords, list) and len(opts_coords) > 0:
                for opt in opts_coords:
                    opt_lbl = str(opt.get("label", "")).strip().lower()
                    if opt_lbl in clean_selected or any(s in opt_lbl for s in clean_selected):
                        opt_bbox = opt.get("bbox")
                        if opt_bbox and isinstance(opt_bbox, (list, tuple)) and len(opt_bbox) == 4:
                            box = fitz.Rect(opt_bbox)
                        else:
                            try:
                                bx = float(str(opt.get("x", "0")).replace("%", "")) / 100.0 * page_w
                                by = float(str(opt.get("y", "0")).replace("%", "")) / 100.0 * page_h
                                bw = float(str(opt.get("w", "0")).replace("%", "")) / 100.0 * page_w
                                bh = float(str(opt.get("h", "0")).replace("%", "")) / 100.0 * page_h
                                box = fitz.Rect(bx, by, bx + bw, by + bh)
                            except Exception:
                                continue

                        _stamp_mark_on_page(page, box, tick_format, rgb)
            elif rect:
                # Standalone single checkbox
                _stamp_mark_on_page(page, rect, tick_format, rgb)
            continue

        if field_type == "Signature" and rect:
            val_str = str(val).strip()
            # If user provided a canvas data URL signature
            if val_str.startswith("data:image/") and ";base64," in val_str:
                try:
                    img_data = base64.b64decode(val_str.split(";base64,")[1])
                    page.insert_image(rect, stream=img_data)
                    continue
                except Exception:
                    pass

            # Otherwise format text as digital signature
            fs = min(12, max(8, int(rect.height * 0.65)))
            sig_text = val_str if "[Signed" in val_str else f"{val_str} [Signed Digitally]"
            page.insert_textbox(rect, sig_text, fontsize=fs, fontname="times-italic", color=(0.05, 0.15, 0.65))
            continue

        # Textual fields: Short Text, Long Text, Dropdown, Date
        if rect:
            val_str = str(val).strip()
            if not val_str:
                continue

            text_color = (0.05, 0.08, 0.16)

            if field_type == "Long Text":
                # Paragraph with multiple lines
                fontsize = min(10.0, max(7.0, rect.height * 0.28))
                while fontsize >= 6.0:
                    res = page.insert_textbox(rect, val_str, fontsize=fontsize, fontname="helv", color=text_color)
                    if res >= 0:
                        break
                    fontsize -= 0.5
            else:
                # Single line text / dropdown / date
                fontsize = min(11.0, max(7.5, rect.height * 0.65))
                while fontsize >= 6.0:
                    res = page.insert_textbox(rect, val_str, fontsize=fontsize, fontname="helv", color=text_color)
                    if res >= 0:
                        break
                    fontsize -= 0.5

    out_bytes = doc.tobytes(deflate=True)
    doc.close()
    return out_bytes


def _stamp_mark_on_page(page, box: fitz.Rect, tick_format: str, rgb: tuple):
    """Draws a vector tick mark, cross, or circle cleanly inside the target box."""
    if tick_format == "Cross":
        page.draw_line(
            fitz.Point(box.x0 + 1.8, box.y0 + 1.8),
            fitz.Point(box.x1 - 1.8, box.y1 - 1.8),
            color=rgb,
            width=1.8
        )
        page.draw_line(
            fitz.Point(box.x0 + 1.8, box.y1 - 1.8),
            fitz.Point(box.x1 - 1.8, box.y0 + 1.8),
            color=rgb,
            width=1.8
        )
    elif tick_format == "Circle":
        center = fitz.Point((box.x0 + box.x1) / 2.0, (box.y0 + box.y1) / 2.0)
        radius = max(2.5, min(box.width, box.height) * 0.32)
        page.draw_circle(center, radius, color=rgb, fill=rgb)
    else:  # Standard Tick
        p1 = fitz.Point(box.x0 + box.width * 0.18, box.y0 + box.height * 0.52)
        p2 = fitz.Point(box.x0 + box.width * 0.44, box.y0 + box.height * 0.82)
        p3 = fitz.Point(box.x0 + box.width * 0.88, box.y0 + box.height * 0.22)
        page.draw_polyline([p1, p2, p3], color=rgb, width=2.0)
