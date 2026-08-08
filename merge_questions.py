import json
import uuid

def merge_questions():
    with open(r'C:\projetos_dev\CONCURSO CAMARA\parsed_questions.json', 'r', encoding='utf-8') as f:
        new_q = json.load(f)
        
    db_path = r'C:\projetos_dev\CONCURSO CAMARA\web-app\public\data\questions\native-nocoes-de-informatica.json'
    with open(db_path, 'r', encoding='utf-8') as f:
        db = json.load(f)
        
    for q in new_q:
        # map A B C D to actual option string
        # first, strip "A) " from options
        cleaned_options = []
        for opt in q['opcoes']:
            # removes the prefix "A) ", "B) " etc
            cleaned_opt = opt[2:].strip() if len(opt) > 2 and opt[1] == ')' else opt
            cleaned_options.append(cleaned_opt)
            
        correct_idx = ord(q['correta'].upper()) - ord('A') if q['correta'] else -1
        correct_str = cleaned_options[correct_idx] if 0 <= correct_idx < len(cleaned_options) else ""
        
        # also, ensure N/A is present to match standard
        while len(cleaned_options) < 5:
            cleaned_options.append("N/A")
            
        mapped_q = {
            "id": f"ai-gen-parsed-{uuid.uuid4().hex[:8]}",
            "subject": "Noções de Informática",
            "topics": [q['topico'], q['subtopico']] if q['subtopico'] else [q['topico']],
            "difficulty": q['dificuldade'],
            "contexto": q['pergunta'],
            "tabelaHtml": "",
            "imagemSvg": "",
            "pergunta": "",
            "opcoes": cleaned_options,
            "correta": correct_str,
            "explicacao": q['explicacao']
        }
        db.append(mapped_q)
        
    with open(db_path, 'w', encoding='utf-8') as f:
        json.dump(db, f, ensure_ascii=False, indent=2)
        
    print(f"Added {len(new_q)} questions. Total is now {len(db)}.")

if __name__ == '__main__':
    merge_questions()
