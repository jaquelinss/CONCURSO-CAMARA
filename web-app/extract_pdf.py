import pdfplumber
import sys

pdf_path = sys.argv[1]

with pdfplumber.open(pdf_path) as pdf:
    for page in pdf.pages:
        text = page.extract_text()
        if text:
            print(text)
