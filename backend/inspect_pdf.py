import os
import pymupdf as fitz

pdf_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads', '8fa5bad3_visa..pdf')
if not os.path.exists(pdf_path):
    uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    if os.path.exists(uploads_dir):
        for f in os.listdir(uploads_dir):
            if f.endswith('.pdf'):
                pdf_path = os.path.join(uploads_dir, f)
                break

if not os.path.exists(pdf_path):
    sample_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sample_document.pdf')
    if os.path.exists(sample_path):
        pdf_path = sample_path
    else:
        print("No PDF document found in uploads or sample_document.pdf to inspect.")
        raise SystemExit(0)

doc = fitz.open(pdf_path)
print("Total pages:", len(doc))

for p in range(len(doc)):
    page = doc[p]
    print(f"\n=== PAGE {p+1} WINGDINGS & CHECKBOXES ===")
    blocks = page.get_text("dict")["blocks"]
    for b in blocks:
        if b.get("type") != 0: continue
        for l in b.get("lines", []):
            has_box = False
            for s in l.get("spans", []):
                if 'wingdings' in s.get('font', '').lower() or '\x86' in s.get('text', '') or '\u25a1' in s.get('text', ''):
                    has_box = True
            if has_box:
                line_str = " ".join(s.get("text", "") for s in l.get("spans", []))
                print(f"CHECKBOX LINE: {repr(line_str)}")
                for s in l.get("spans", []):
                    print(f"   span: {repr(s['text'])} | bbox: {s['bbox']} | font: {s['font']}")

