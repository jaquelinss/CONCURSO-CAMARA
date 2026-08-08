import re
import json
import uuid

with open('decoded_fcc.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix the remaining 2 -> :
text = text.replace("Assunto2", "Assunto:")
text = re.sub(r'Questão (\d+)2', r'Questão \1:', text)

# Extract Gabarito
gabarito_text = re.search(r'Gabarito\n(.*?)$', text, re.DOTALL)
gabarito = {}
if gabarito_text:
    matches = re.finditer(r'(\d+)\)\s*([A-E])', gabarito_text.group(1))
    for m in matches:
        gabarito[m.group(1)] = m.group(2)

print(f"Found {len(gabarito)} gabaritos")

# Extract Questions
questions = []
q_splits = re.split(r'(?m)^(Questão \d+:)', text)

for i in range(1, len(q_splits), 2):
    q_header = q_splits[i]
    q_body = q_splits[i+1]
    
    num_match = re.search(r'Questão (\d+):', q_header)
    if not num_match:
        continue
    num = num_match.group(1)
    
    assunto_match = re.search(r'Assunto:(.*?)\n(.*)', q_body, re.DOTALL)
    if not assunto_match:
        continue
    
    banca_match = re.match(r'([^\n]+)', q_body)
    banca = banca_match.group(1).strip() if banca_match else ""
    
    assunto = assunto_match.group(1).strip()
    rest = assunto_match.group(2)
    
    opt_start = re.search(r'(?m)^\s*a\)', rest)
    if not opt_start:
        continue
        
    statement = rest[:opt_start.start()].strip()
    options_text = rest[opt_start.start():].strip()
    
    opts = []
    for opt_char in ['a', 'b', 'c', 'd', 'e']:
        next_char = chr(ord(opt_char) + 1)
        if next_char <= 'e':
            pattern = fr'^\s*{opt_char}\)(.*?)(?:^\s*{next_char}\))'
            opt_m = re.search(pattern, options_text, re.MULTILINE | re.DOTALL)
            if opt_m:
                opts.append(opt_m.group(1).strip())
        else:
            pattern = fr'^\s*{opt_char}\)(.*)'
            opt_m = re.search(pattern, options_text, re.MULTILINE | re.DOTALL)
            if opt_m:
                opts.append(opt_m.group(1).strip())
                
    if len(opts) < 2:
        opt_matches = re.split(r'(?m)^\s*[a-e]\)\s*', options_text)
        opts = [o.strip() for o in opt_matches if o.strip()]
        
    if num in gabarito and len(opts) >= 4:
        gab_char = gabarito[num]
        idx = ord(gab_char) - ord('A')
        correct_opt = opts[idx] if idx < len(opts) else opts[0]
        
        statement = re.sub(r'^\s*FCC - [^\n]+\n', '', statement)
        
        questions.append({
            "id": f"fcc-admin-{uuid.uuid4().hex[:8]}",
            "subject": "Noções de Direito Administrativo",
            "topics": [assunto],
            "difficulty": "Médio",
            "contexto": statement + f"\n\n(Banca: {banca})",
            "tabelaHtml": "",
            "imagemSvg": "",
            "pergunta": "",
            "opcoes": opts,
            "correta": correct_opt,
            "explicacao": f"Gabarito oficial: {gab_char}"
        })

print(f"Extracted {len(questions)} questions")
with open(r'public/data/questions/native-nocoes-de-direito-administrativo.json', 'w', encoding='utf-8') as f:
    json.dump(questions, f, ensure_ascii=False, indent=2)
