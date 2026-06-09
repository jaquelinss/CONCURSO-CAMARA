import re
import json
import uuid
import os

with open("temp_extract.txt", "r", encoding="utf-8") as f:
    text = f.read()

questions = []

# First extract Gabaritos
gabaritos = {}

# For Block 1: string of answers BCCBADBCDBCBACDBCACB
gab1_match = re.search(r'GABARITO - BLOCO 1(.*?)Se desejar', text, re.DOTALL)
if gab1_match:
    gab_str = re.sub(r'[^A-E]', '', gab1_match.group(1))
    for i, char in enumerate(gab_str):
        gabaritos[i + 1] = {"correct": char, "explanation": "Gabarito oficial: " + char}

# For Blocks 2, 3, etc: NN. Correta: X. [Feedback...]
gab_pattern2 = re.compile(r'(\d+)\.\s*Correta:\s*([A-E])\.(.*?)(?=(?:\d+\.\s*Correta:)|(?:BLOCO)|(?:Aqui está)|$)', re.DOTALL)
for m in gab_pattern2.finditer(text):
    num = int(m.group(1))
    correct = m.group(2)
    feedback = m.group(3).strip()
    feedback = re.sub(r'^(?:Por que está certa:|Feedback:)\s*', '', feedback).strip()
    gabaritos[num] = {"correct": correct, "explanation": feedback}


# Now extract questions
q_pattern = re.compile(r'Questão\s+(\d+)\s*Tópico:\s*(.*?)\s*Subtópico:\s*(.*?)\s*Dificuldade:\s*(Fácil|Médio|Difícil|Avançado)\s*(.*?)(?=(?:Questão\s+\d+\s*Tópico:)|(?:GABARITO)|$)', re.DOTALL)

parsed_questions = {}
for m in q_pattern.finditer(text):
    num_str = m.group(1).strip()
    topic = m.group(2).strip()
    subtopic = m.group(3).strip()
    difficulty = m.group(4).strip()
    content = m.group(5).strip()
    
    # Clean up "Nível: XXX" from the end of the content
    content = re.sub(r'\s*Nível:\s*(?:FÁCIL|MÉDIO|DIFÍCIL|AVANÇADO)\s*$', '', content, flags=re.IGNORECASE).strip()
    
    # Extract options: A) ... B) ... C) ... D) ...
    opt_pattern = re.compile(r'([A-E]\))\s+(.*?)(?=(?:[A-E]\)\s+)|$)', re.DOTALL)
    opts = []
    statement = content
    
    first_opt = re.search(r'^[A-E]\)', content, re.MULTILINE)
    if first_opt:
        statement_end = first_opt.start()
        statement = content[:statement_end].strip()
        opts_text = content[statement_end:]
        for opt_m in opt_pattern.finditer(opts_text):
            opt_content = opt_m.group(2).strip()
            opts.append(opt_content)
    else:
        opt_matches = list(re.finditer(r'([A-E]\))\s+', content))
        if opt_matches:
            statement = content[:opt_matches[0].start()].strip()
            for j in range(len(opt_matches)):
                start = opt_matches[j].end()
                end = opt_matches[j+1].start() if j+1 < len(opt_matches) else len(content)
                opt_content = content[start:end].strip()
                opts.append(opt_content)
            
    while len(opts) < 5:
        opts.append("N/A")
        
    parsed_questions[int(num_str)] = {
        "num": int(num_str),
        "topic": topic,
        "subtopic": subtopic,
        "difficulty": difficulty,
        "statement": statement,
        "options": opts
    }


final_questions = []
for num, q in parsed_questions.items():
    gab = gabaritos.get(num, {"correct": "A", "explanation": ""})
    correct_char = gab["correct"]
    idx = ord(correct_char) - ord('A')
    correct_text = q["options"][idx] if 0 <= idx < len(q["options"]) else q["options"][0]
    
    expl = gab["explanation"]
    expl = re.sub(r'Por que as outras estão erradas:.*', '', expl, flags=re.DOTALL).strip()
    
    final_questions.append({
        "id": f"ai-gen-parsed-{uuid.uuid4().hex[:8]}",
        "subject": "Noções de Informática",
        "topics": [q["topic"], q["subtopic"]],
        "difficulty": q["difficulty"].capitalize(),
        "contexto": q["statement"],
        "tabelaHtml": "",
        "imagemSvg": "",
        "pergunta": "",
        "opcoes": q["options"],
        "correta": correct_text,
        "explicacao": expl
    })

output_file = r"C:\projetos_dev\CONCURSO CAMARA\web-app\public\data\questions\native-nocoes-de-informatica.json"
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(final_questions, f, ensure_ascii=False, indent=2)

print(f"Wrote {len(final_questions)} questions to {output_file}")
