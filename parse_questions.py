import docx2txt
import json
import re

def parse_docx(file_path):
    text = docx2txt.process(file_path)
    
    answers = {}
    ans_matches = list(re.finditer(r'(\d+)\s*[.-]?\s*Correta:\s*([A-E])\.(.*?)(?=\d+\s*[.-]?\s*Correta:|\nNível|\nQuestão|\Z)', text, re.IGNORECASE | re.DOTALL))
    for m in ans_matches:
        q_num = m.group(1)
        correct_letter = m.group(2).upper()
        explicacao = m.group(3).strip()
        explicacao = re.sub(r'\n+', '\n\n', explicacao)
        answers[q_num] = {
            'correta': correct_letter,
            'explicacao': explicacao
        }
        
    q_blocks = re.finditer(r'(Questão\s+(\d+)\s*Tópico:.*?)(?=Questão\s+\d+\s*Tópico:|GABARITO|\Z)', text, re.IGNORECASE | re.DOTALL)
    
    questions = []
    
    for m in q_blocks:
        block = m.group(1)
        number = m.group(2)
        
        meta_match = re.search(r'Questão\s+\d+\s*Tópico:\s*(.*?)\s*Subtópico:\s*(.*?)\s*Dificuldade:\s*(Fácil|Médio|Média|Difícil|Avançado)(.*)', block, re.IGNORECASE | re.DOTALL)
        if not meta_match:
            continue
            
        topico = meta_match.group(1).strip()
        subtopico = meta_match.group(2).strip()
        dificuldade = meta_match.group(3).strip()
        if dificuldade.lower() == 'média':
            dificuldade = 'Médio'
            
        rest = meta_match.group(4)
        
        # Simpler explicitly searching for A) B) C) D) sequentially
        opt_pattern = re.search(r'(.*?)A\)(.*?)B\)(.*?)C\)(.*?)D\)(.*)', rest, re.DOTALL)
        
        if opt_pattern:
            enunciado = opt_pattern.group(1).strip()
            options = [
                f"A) {opt_pattern.group(2).strip()}",
                f"B) {opt_pattern.group(3).strip()}",
                f"C) {opt_pattern.group(4).strip()}",
                f"D) {opt_pattern.group(5).strip()}"
            ]
        else:
            enunciado = rest.strip()
            options = []
            
        enunciado = re.sub(r'Nível:\s*(FÁCIL|MÉDIO|MÉDIA|DIFÍCIL|Avançado).*?(?=\n|$)', '', enunciado, flags=re.IGNORECASE).strip()
        
        q_data = {
            'number': number,
            'topico': topico,
            'subtopico': subtopico,
            'dificuldade': dificuldade,
            'pergunta': enunciado,
            'opcoes': options,
            'correta': '',
            'explicacao': ''
        }
        
        if number in answers:
            q_data['correta'] = answers[number]['correta']
            q_data['explicacao'] = answers[number]['explicacao']
            
        questions.append(q_data)
        
    with open('C:\\projetos_dev\\CONCURSO CAMARA\\parsed_questions.json', 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
        
    print(f"Parsed {len(questions)} questions and {len(answers)} answers.")

if __name__ == '__main__':
    parse_docx(r'C:\projetos_dev\CONCURSO CAMARA\testes\QUESTÕES\bloco 3 - Simulado de Informática_ Sistemas Operacionais e Windows.docx')
