import pdfplumber
import sys

pdf = pdfplumber.open(r'C:\LIVROS SCRIB\350_Quest_es_de_Direito_Administrativo___PDF___Administra__o_p_blica___Descentraliza__o.pdf')
print(f'Pages: {len(pdf.pages)}', file=sys.stderr)

all_text = []
for i in range(4, 15):
    text = pdf.pages[i].extract_text() or ''
    all_text.append(f'=== PAGE {i+1} ===\n{text}\n')

output = '\n'.join(all_text)
with open('pdf_sample.txt', 'w', encoding='utf-8', errors='replace') as f:
    f.write(output)
print('Done - check pdf_sample.txt')
