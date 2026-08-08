import sys
import os
import traceback

output_file = r"c:\projetos_dev\CONCURSO CAMARA\web-app\ufpe_output.txt"
pdf_edital_path = r"G:\Meu Drive\JASQUE\CONCURSOS\Assistente em administração  UFPE 2026\030826_EDITAL_N_12_2026.pdf"
pdf_crono_path = r"G:\Meu Drive\JASQUE\CONCURSOS\Assistente em administração  UFPE 2026\030826_CRONOGRAMA.pdf"

with open(output_file, "w", encoding="utf-8") as out:
    out.write("=== START UFPE EXTRACTION ===\n")
    
    # Try pdfplumber
    try:
        import pdfplumber
        out.write("Opening EDITAL with pdfplumber...\n")
        with pdfplumber.open(pdf_edital_path) as pdf:
            out.write(f"Total pages: {len(pdf.pages)}\n")
            for i, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                out.write(f"\n--- PAGE {i+1} ---\n")
                out.write(text + "\n")
                
        out.write("\nOpening CRONOGRAMA with pdfplumber...\n")
        with pdfplumber.open(pdf_crono_path) as pdf:
            out.write(f"Total crono pages: {len(pdf.pages)}\n")
            for i, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                out.write(f"\n--- CRONO PAGE {i+1} ---\n")
                out.write(text + "\n")
                
    except Exception as e:
        out.write(f"Error with pdfplumber: {e}\n")
        out.write(traceback.format_exc() + "\n")
        
        # Try pypdf fallback
        try:
            import pypdf
            out.write("Trying pypdf fallback...\n")
            reader = pypdf.PdfReader(pdf_edital_path)
            for i, page in enumerate(reader.pages):
                out.write(f"\n--- PAGE {i+1} ---\n")
                out.write((page.extract_text() or "") + "\n")
            
            crono_reader = pypdf.PdfReader(pdf_crono_path)
            for i, page in enumerate(crono_reader.pages):
                out.write(f"\n--- CRONO PAGE {i+1} ---\n")
                out.write((page.extract_text() or "") + "\n")
        except Exception as e2:
            out.write(f"Error with pypdf: {e2}\n")

print("Finished extraction attempt.")
