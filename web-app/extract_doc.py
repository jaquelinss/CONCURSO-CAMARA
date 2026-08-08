import sys

file_path = sys.argv[1]
try:
    import mammoth
    with open(file_path, "rb") as docx_file:
        result = mammoth.extract_raw_text(docx_file)
        print(result.value)
except Exception as e:
    print("Mammoth failed:", e)
    try:
        import docx2txt
        text = docx2txt.process(file_path)
        print(text)
    except Exception as e2:
        print("docx2txt failed:", e2)
