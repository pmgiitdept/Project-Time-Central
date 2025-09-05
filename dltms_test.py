import pdfplumber
import pytesseract
from PIL import Image
import pandas as pd
import os

# Path to tesseract.exe (change if needed)
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

pdf_path = "LRT.pdf"   # Replace with your PDF filename
output_file = "report_output.xlsx"

all_rows = []

try:
    # ✅ First try extracting text/tables with pdfplumber
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            table = page.extract_table()
            if table:
                all_rows.extend(table)

    if not all_rows:
        raise ValueError("No tables found with pdfplumber, switching to OCR...")

except Exception as e:
    print(f"⚠️ pdfplumber failed: {e}")
    print("👉 Falling back to OCR with Tesseract...")

    from pdf2image import convert_from_path
    pages = convert_from_path(pdf_path, dpi=300)

    for page_num, page in enumerate(pages, start=1):
        text = pytesseract.image_to_string(page)
        rows = [line.split() for line in text.splitlines() if line.strip()]
        all_rows.extend(rows)

# Save to Excel
df = pd.DataFrame(all_rows)
df.to_excel(output_file, index=False, header=False)

print(f"✅ Extracted table saved to {output_file}")
