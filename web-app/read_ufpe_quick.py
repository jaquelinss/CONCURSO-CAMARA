import pdfplumber, sys

pdf_path = r'G:\Meu Drive\JASQUE\CONCURSOS\Assistente em administração  UFPE 2026\030826_EDITAL_N_12_2026.pdf'

with pdfplumber.open(pdf_path) as pdf:
    total = len(pdf.pages)
    print(f'Total pages: {total}', file=sys.stderr)
    # Check last pages for content programatico
    for i in range(max(0, total-8), total):
        text = pdf.pages[i].extract_text() or ''
        print(f'\n=== PAGE {i+1} of {total} ===')
        print(text[:4000])
