import pdfplumber, sys

pdf_path = r'G:\Meu Drive\JASQUE\CONCURSOS\Auditor fiscal municipal - caruaru 2026\Edital 012026 - Auditor Fiscal Municipal e Analista Fiscal Municipal.pdf'

with pdfplumber.open(pdf_path) as pdf:
    for i, page in enumerate(pdf.pages):
        text = page.extract_text() or ''
        if 'cronograma' in text.lower() or 'ETAPA' in text:
            print(f'=== PAGE {i+1} ===')
            print(text)
            print()
