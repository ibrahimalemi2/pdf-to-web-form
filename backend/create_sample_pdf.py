import os
import pymupdf as fitz

def generate_sample_pdf(output_path: str = None):
    """
    Generates a clean digital PDF with standard form fields for testing
    PyMuPDF extraction: Instructor, Section, Course Title, Schedule, Remarks.
    """
    if output_path is None:
        output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample_document.pdf")
    doc = fitz.open()
    # Standard Letter page: 612 x 792 pt
    page = doc.new_page(width=612, height=792)

    # Add header text
    page.insert_text((54, 54), "STATE UNIVERSITY REGISTRAR OFFICE", fontsize=11, fontname="helv", color=(0.2, 0.2, 0.2))
    page.insert_text((54, 76), "OFFICIAL COURSE REGISTRATION & SYLLABUS VERIFICATION", fontsize=15, fontname="hebo", color=(0.1, 0.1, 0.1))

    # Decorative header rule
    page.draw_line((54, 90), (558, 90), color=(0.15, 0.25, 0.4), width=1.5)

    # Document metadata box
    page.draw_rect((54, 105, 558, 140), color=(0.8, 0.8, 0.85), fill=(0.95, 0.96, 0.98), width=1)
    page.insert_text((65, 126), "TERM: Fall 2026", fontsize=9, fontname="hebo", color=(0.2, 0.2, 0.2))
    page.insert_text((220, 126), "CAMPUS: Main North", fontsize=9, fontname="hebo", color=(0.2, 0.2, 0.2))
    page.insert_text((390, 126), "DOC ID: ENR-8849-B", fontsize=9, fontname="hebo", color=(0.2, 0.2, 0.2))

    # Form Fields & Labels
    y = 175

    # 1. Course Title
    page.insert_text((54, y), "01. Course Title:", fontsize=10, fontname="hebo", color=(0.2, 0.2, 0.2))
    page.draw_rect((54, y + 8, 558, y + 36), color=(0.75, 0.75, 0.8), width=1)
    page.insert_text((64, y + 26), "CS-402: Distributed Systems & Cloud Infrastructure", fontsize=10, fontname="helv", color=(0.1, 0.1, 0.1))

    # 2. Instructor & Section
    y = 235
    page.insert_text((54, y), "02. Instructor Name:", fontsize=10, fontname="hebo", color=(0.2, 0.2, 0.2))
    page.draw_rect((54, y + 8, 380, y + 36), color=(0.75, 0.75, 0.8), width=1)
    page.insert_text((64, y + 26), "Dr. Evelyn Martinez", fontsize=10, fontname="helv", color=(0.1, 0.1, 0.1))

    page.insert_text((396, y), "03. Section / CRN:", fontsize=10, fontname="hebo", color=(0.2, 0.2, 0.2))
    page.draw_rect((396, y + 8, 558, y + 36), color=(0.75, 0.75, 0.8), width=1)
    page.insert_text((406, y + 26), "CS-402", fontsize=10, fontname="helv", color=(0.1, 0.1, 0.1))

    # 3. Schedule & Room
    y = 295
    page.insert_text((54, y), "04. Schedule & Room:", fontsize=10, fontname="hebo", color=(0.2, 0.2, 0.2))
    page.draw_rect((54, y + 8, 558, y + 36), color=(0.75, 0.75, 0.8), width=1)
    page.insert_text((64, y + 26), "MWF 10:00 AM - 11:15 AM | Hall C, Room 302", fontsize=10, fontname="helv", color=(0.1, 0.1, 0.1))

    # 4. Remarks & Special Requests
    y = 355
    page.insert_text((54, y), "05. Special Remarks & Notes:", fontsize=10, fontname="hebo", color=(0.2, 0.2, 0.2))
    page.draw_rect((54, y + 8, 558, y + 78), color=(0.75, 0.75, 0.8), width=1)
    page.insert_text((64, y + 26), "Enrolled under prerequisite waiver approved by Dean office.", fontsize=9, fontname="helv", color=(0.25, 0.25, 0.25))
    page.insert_text((64, y + 42), "Full electronic audit trail attached and verified by registrar.", fontsize=9, fontname="helv", color=(0.25, 0.25, 0.25))

    # 5. Effective Date
    y = 460
    page.insert_text((54, y), "06. Effective Date:", fontsize=10, fontname="hebo", color=(0.2, 0.2, 0.2))
    page.draw_rect((54, y + 8, 280, y + 36), color=(0.75, 0.75, 0.8), width=1)
    page.insert_text((64, y + 26), "September 13, 2026", fontsize=10, fontname="helv", color=(0.1, 0.1, 0.1))

    # 6. Consent & Signature
    y = 520
    page.insert_text((54, y), "07. Authorized Signature:", fontsize=10, fontname="hebo", color=(0.2, 0.2, 0.2))
    page.draw_rect((54, y + 8, 558, y + 60), color=(0.75, 0.75, 0.8), width=1)
    page.insert_text((64, y + 36), "Dr. Evelyn Martinez [Signed Digitally]", fontsize=10, fontname="helv", color=(0.1, 0.3, 0.6))

    # Footer
    page.draw_line((54, 730), (558, 730), color=(0.85, 0.85, 0.85), width=1)
    page.insert_text((54, 746), "REG-AUTHO-VERIFIED • Page 1 of 1 • Official Academic Record", fontsize=8, fontname="helv", color=(0.5, 0.5, 0.5))

    doc.save(output_path)
    doc.close()
    print(f"Sample PDF generated successfully at {output_path}")

if __name__ == "__main__":
    generate_sample_pdf()
