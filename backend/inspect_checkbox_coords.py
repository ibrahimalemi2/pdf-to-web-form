import os
import pymupdf as fitz
import json

pdf_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads', '8fa5bad3_visa..pdf')
if not os.path.exists(pdf_path):
    # fallback to any available pdf in uploads
    uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    for f in os.listdir(uploads_dir):
        if f.endswith('.pdf'):
            pdf_path = os.path.join(uploads_dir, f)
            break

doc = fitz.open(pdf_path)

for p in range(len(doc)):
    page = doc[p]
    pw = page.rect.width
    ph = page.rect.height
    print(f"\n================ PAGE {p+1} ({pw}x{ph}) ================")
    blocks = page.get_text("dict")["blocks"]
    for b in blocks:
        if b.get("type") != 0: continue
        for l in b.get("lines", []):
            spans = l.get("spans", [])
            has_wing = any('wingdings' in s.get('font', '').lower() or '\x86' in s.get('text', '') for s in spans)
            if has_wing:
                print("Line bbox:", l["bbox"])
                for s in spans:
                    t = s.get("text", "")
                    bb = s.get("bbox")
                    x_pct = f"{round((bb[0]/pw)*100, 2)}%"
                    y_pct = f"{round((bb[1]/ph)*100, 2)}%"
                    w_pct = f"{round(((bb[2]-bb[0])/pw)*100, 2)}%"
                    h_pct = f"{round(((bb[3]-bb[1])/ph)*100, 2)}%"
                    print(f"   [{s.get('font')}] {repr(t)} => x={x_pct}, y={y_pct}, w={w_pct}, h={h_pct}")
