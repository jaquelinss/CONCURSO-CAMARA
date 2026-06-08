import re, json, uuid, os

questions = []

# --- Parse File 1 ---
with open(r"C:\projetos_dev\CONCURSO CAMARA\testes\QUESTÕES\leiorganica-questoes-1.txt", "r", encoding="utf-8") as f:
    text1 = f.read()

# Parse gabarito for file 1
# The gabarito format is continuous text like:
# "FÁCIL 1. Resposta: C. explanation text . 2. Resposta: A. explanation text . 3. ..."
# We need to split individual answers properly.
gabarito_map = {}

# First, find all gabarito sections (after "GABARITO" headers)
# Split text into question sections and gabarito sections
gabarito_sections = re.findall(
    r'(?:GABARITO.*?\n)(.*?)(?=\n(?:BLOCO \d|$))',
    text1, re.DOTALL
)

# Join all gabarito text
all_gabarito_text = '\n'.join(gabarito_sections)

# Now parse individual answers: "N. Resposta: X. explanation..."
# The pattern is: number + ". Resposta: " + letter + ". " + explanation
# Explanation ends when we hit the next "N. Resposta:" or end of text
gab_pattern = r'(\d+)\.\s*Resposta:\s*([A-E])\.\s*(.*?)(?=\d+\.\s*Resposta:|$)'
for m in re.finditer(gab_pattern, all_gabarito_text, re.DOTALL):
    num = m.group(1)
    letter = m.group(2).upper()
    explanation = m.group(3).strip()
    # Clean up the explanation - remove trailing dots and whitespace
    explanation = re.sub(r'\s*\.\s*$', '', explanation)
    # Remove leading difficulty labels if they bleed in
    explanation = re.sub(r'^\s*(?:FÁCIL|MÉDIO|DIFÍCIL|AVANÇADO)\s*', '', explanation)
    # Replace newlines with spaces
    explanation = explanation.replace('\r\n', ' ').replace('\n', ' ')
    # Collapse multiple spaces
    explanation = re.sub(r'\s+', ' ', explanation).strip()
    
    gabarito_map[num] = {
        'correct': letter,
        'explanation': explanation
    }

print(f"Parsed {len(gabarito_map)} gabarito entries from file 1")
# Debug: print first few entries
for k in sorted(gabarito_map.keys(), key=int)[:5]:
    v = gabarito_map[k]
    print(f"  Q{k}: Answer={v['correct']}, Explanation={v['explanation'][:80]}...")

# Extract blocks delimited by "Nível:"
blocks = re.split(r'(?m)^Nível:\s*(FÁCIL|MÉDIO|DIFÍCIL|AVANÇADO)', text1)
current_difficulty = "Médio"

for i in range(1, len(blocks), 2):
    diff_str = blocks[i].strip()
    content_block = blocks[i+1]
    
    if diff_str == 'FÁCIL':
        current_difficulty = 'Fácil'
    elif diff_str == 'MÉDIO':
        current_difficulty = 'Médio'
    elif diff_str == 'DIFÍCIL':
        current_difficulty = 'Difícil'
    elif diff_str == 'AVANÇADO':
        current_difficulty = 'Avançado'
        
    q_matches = list(re.finditer(
        r'(?m)^(\d+)\.\s*\[Tópico:\s*(.*?)\s*\|\s*Subtópico:\s*(.*?)\](.*?)(?=\n\d+\.\s*\[Tópico:|GABARITO|\n-{10,}|$)',
        content_block, re.DOTALL
    ))
    for m in q_matches:
        num = m.group(1)
        topic = m.group(2).strip()
        subtopic = m.group(3).strip()
        content = m.group(4).strip()
        
        # Parse options: A) ... B) ... C) ... D) ...
        opt_matches = list(re.finditer(r'\s+([A-E])\)\s+', content))
        if not opt_matches:
            continue
            
        statement = content[:opt_matches[0].start()].strip()
        options = []
        for j in range(len(opt_matches)):
            start = opt_matches[j].end()
            end = opt_matches[j+1].start() if j+1 < len(opt_matches) else len(content)
            options.append(content[start:end].strip())
            
        while len(options) < 5:
            options.append("N/A")
            
        gab = gabarito_map.get(num, {})
        correct_letter = gab.get('correct', 'A')
        explanation = gab.get('explanation', '')
        idx = ord(correct_letter) - ord('A')
        correct_text = options[idx] if 0 <= idx < len(options) else ""
        
        questions.append({
            "id": f"ai-gen-parsed-{uuid.uuid4().hex[:8]}",
            "subject": "Lei Orgânica de Caruaru",
            "topics": [topic, subtopic],
            "difficulty": current_difficulty,
            "contexto": statement,
            "tabelaHtml": "",
            "imagemSvg": "",
            "pergunta": "",
            "opcoes": options,
            "correta": correct_text,
            "explicacao": explanation
        })

print(f"Parsed {len(questions)} questions from file 1")

# --- Parse File 2 ---
file2_path = r"C:\projetos_dev\CONCURSO CAMARA\testes\QUESTOES LEI ORGANICA CARUARU\Quiz_Lei_Orgânica_de_Caruaru.txt"
file2_gab_path = r"C:\projetos_dev\CONCURSO CAMARA\testes\QUESTOES LEI ORGANICA CARUARU\Gabarito_Lei_Orgânica_de_Caruaru.txt"

if os.path.exists(file2_path) and os.path.exists(file2_gab_path):
    with open(file2_path, "r", encoding="utf-8") as f:
        text2 = f.read()

    with open(file2_gab_path, "r", encoding="utf-8") as f:
        gab2_text = f.read()
        
    # parse gab 2
    gab2_map = {}
    gab2_matches = re.finditer(r'Questão\s+(\d+).*?Resposta Correta:\s*(.*?)\n\nExplicação:\s*(.*?)(?=\n-|$)', gab2_text, re.DOTALL | re.IGNORECASE)
    for m in gab2_matches:
        num = m.group(1)
        ans = m.group(2).strip()
        expl = m.group(3).strip().replace('\n', ' ')
        if ans.startswith(('A)', 'B)', 'C)', 'D)', 'E)')):
            ans = ans[:2]
        gab2_map[num] = {
            'correct': ans,
            'explanation': expl
        }

    q2_matches = list(re.finditer(r'(?m)^Questão\s+(\d+):\s*(.*?)(?=\nQuestão\s+\d+|$)', text2, re.DOTALL))
    for m in q2_matches:
        num = m.group(1)
        content = m.group(2).strip()
        
        opt_matches = list(re.finditer(r'(?m)^[a-e]\)\s+', content))
        if not opt_matches:
            continue
            
        statement = content[:opt_matches[0].start()].strip()
        options = []
        for j in range(len(opt_matches)):
            start = opt_matches[j].end()
            end = opt_matches[j+1].start() if j+1 < len(opt_matches) else len(content)
            opt_text = content[start:end].strip()
            opt_text = re.sub(r'^[A-E]\)\s+', '', opt_text)
            options.append(opt_text)
            
        while len(options) < 5:
            options.append("N/A")
            
        gab = gab2_map.get(num, {})
        ans = gab.get('correct', 'Certo')
        
        correct_text = ""
        if ans.lower() in ['certo', 'errado']:
            for opt in options:
                if opt.lower() == ans.lower():
                    correct_text = opt
                    break
        else:
            match = re.match(r'([A-E])\)', ans.upper())
            if match:
                idx = ord(match.group(1)) - ord('A')
                if 0 <= idx < len(options):
                    correct_text = options[idx]
                    
        if not correct_text:
            correct_text = options[0]
            
        questions.append({
            "id": f"ai-gen-parsed-{uuid.uuid4().hex[:8]}",
            "subject": "Lei Orgânica de Caruaru",
            "topics": ["Questões Gerais Cespe/Cebraspe", "Lei Orgânica"],
            "difficulty": "Médio",
            "contexto": statement,
            "tabelaHtml": "",
            "imagemSvg": "",
            "pergunta": "",
            "opcoes": options,
            "correta": correct_text,
            "explicacao": gab.get('explanation', '')
        })

    print(f"Total questions after file 2: {len(questions)}")

# Write to JSON (REPLACE existing data entirely to fix corrupted entries)
output_file = r"C:\projetos_dev\CONCURSO CAMARA\web-app\public\data\questions\native-lei-organica-de-caruaru.json"

def normalize(text):
    return re.sub(r'\W+', '', text.lower())

# Deduplicate within the new parsed set
seen = set()
deduped = []
for q in questions:
    norm_q = normalize(q.get("contexto", "") + q.get("pergunta", ""))
    if norm_q not in seen and len(norm_q) > 10:
        deduped.append(q)
        seen.add(norm_q)

with open(output_file, "w", encoding="utf-8") as f:
    json.dump(deduped, f, ensure_ascii=False, indent=2)

print(f"Written {len(deduped)} unique questions to {output_file}")
