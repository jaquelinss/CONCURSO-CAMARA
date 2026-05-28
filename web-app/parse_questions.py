import json
import re
import uuid

# Topics from constants.ts
topic_mapping = {
    'Matemática Básica': ['Operações Fundamentais (+, -, *, /)', 'Frações e Números Decimais', 'Potenciação e Radiciação', 'Razão e Proporção', 'Regra de Três Simples e Composta'],
    'Conjuntos e Funções': ['Teoria dos Conjuntos', 'Função do 1º Grau', 'Função do 2º Grau', 'Função Modular', 'Função Exponencial', 'Função Logarítmica'],
    'Trigonometria': ['Relações no Triângulo Retângulo', 'Ciclo Trigonométrico', 'Funções Trigonométricas', 'Equações e Inequações Trigonométricas'],
    'Geometria': ['Geometria Plana (Áreas e Perímetros)', 'Geometria Espacial (Volumes e Áreas)', 'Geometria Analítica (Ponto, Reta, Circunferência)'],
    'Sequências e Análise Combinatória': ['Progressão Aritmética (PA)', 'Progressão Geométrica (PG)', 'Análise Combinatória', 'Probabilidade', 'Binômio de Newton'],
    'Polinômios e Números Complexos': ['Operações com Polinômios', 'Equações Polinomiais', 'Números Complexos'],
    'Estatística': ['Medidas de Tendência Central (Média, Moda, Mediana)', 'Medidas de Dispersão (Variância, Desvio Padrão)', 'Gráficos e Tabelas'],
    'Matemática Financeira': ['Porcentagem', 'Juros Simples e Compostos', 'Descontos e Acréscimos']
}

def map_topics(txt_topic, txt_subtopic):
    txt_topic_lower = txt_topic.lower()
    txt_subtopic_lower = txt_subtopic.lower()
    
    if "aritmética" in txt_topic_lower:
        if "fração" in txt_subtopic_lower or "decim" in txt_subtopic_lower:
            return "Matemática Básica", "Frações e Números Decimais"
        if "potencia" in txt_subtopic_lower or "radicia" in txt_subtopic_lower:
            return "Matemática Básica", "Potenciação e Radiciação"
        return "Matemática Básica", "Operações Fundamentais (+, -, *, /)"
        
    if "grandezas proporcionais" in txt_topic_lower:
        if "regra de três" in txt_subtopic_lower:
            return "Matemática Básica", "Regra de Três Simples e Composta"
        return "Matemática Básica", "Razão e Proporção"
        
    if "álgebra" in txt_topic_lower:
        if "função" in txt_subtopic_lower:
            return "Conjuntos e Funções", "Função do 1º Grau"
        return "Matemática Básica", "Operações Fundamentais (+, -, *, /)"
        
    if "financeira" in txt_topic_lower:
        if "juros" in txt_subtopic_lower:
            return "Matemática Financeira", "Juros Simples e Compostos"
        if "porcentagem" in txt_subtopic_lower:
            return "Matemática Financeira", "Porcentagem"
        return "Matemática Financeira", "Descontos e Acréscimos"
        
    if "progress" in txt_topic_lower or "progress" in txt_subtopic_lower:
        if "geométrica" in txt_subtopic_lower:
            return "Sequências e Análise Combinatória", "Progressão Geométrica (PG)"
        return "Sequências e Análise Combinatória", "Progressão Aritmética (PA)"
        
    if "lógica" in txt_topic_lower:
        return "Conjuntos e Funções", "Teoria dos Conjuntos"
        
    if "medidas" in txt_topic_lower:
        return "Matemática Básica", "Razão e Proporção"
        
    if "análise de gráficos" in txt_topic_lower:
        return "Estatística", "Gráficos e Tabelas"
        
    # Default
    return "Matemática Básica", "Operações Fundamentais (+, -, *, /)"

def parse_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Remove block headers like "BLOCO 1: Questões 1 a 20"
    content = re.sub(r'BLOCO \d+:.*\n', '', content)
    
    # Split by GABARITO to get the questions blocks and their gabaritos
    parts = re.split(r'GABARITO - BLOCO \d+', content)
    
    questions = []
    
    for i in range(len(parts) - 1):
        questions_text = parts[i]
        gabarito_text = parts[i+1].split('QUESTÃO')[0] if i+1 < len(parts) else parts[i+1]
        
        # Parse Gabarito
        gabarito_map = {}
        for line in gabarito_text.split('\n'):
            match = re.search(r'Questão (\d+): ([A-E])', line, re.IGNORECASE)
            if match:
                gabarito_map[match.group(1)] = match.group(2).upper()
                
        # Parse Questions
        q_blocks = re.split(r'QUESTÃO (\d+)', questions_text)
        for j in range(1, len(q_blocks), 2):
            q_num = q_blocks[j]
            q_content = q_blocks[j+1].strip()
            
            # Find options
            options = []
            opt_matches = list(re.finditer(r'(?m)^ *([a-e])\)', q_content))
            
            if not opt_matches:
                continue
                
            statement_end = opt_matches[0].start()
            statement_raw = q_content[:statement_end].strip()
            
            # Remove the "2. (G1 - ifba 2018)" from statement_raw
            statement_raw = re.sub(r'^\s*\"?\d+\.\s*\([^\)]+\)\s*', '', statement_raw)
            # Remove double quotes that wrap the paragraphs
            statement_raw = re.sub(r'\"+', '', statement_raw)
            # Some statements have multiple lines wrapped in quotes
            statement_raw = statement_raw.replace('\n', ' ')
            
            # Extract Matéria, Tópico, Subtópico, Dificuldade
            materia_match = re.search(r'Matéria:\s*(.*)', q_content)
            topico_match = re.search(r'Tópico:\s*(.*)', q_content)
            subtopico_match = re.search(r'Subtópico:\s*(.*)', q_content)
            diff_match = re.search(r'Dificuldade:\s*(.*)', q_content)
            
            materia = materia_match.group(1).strip() if materia_match else "Matemática"
            topico = topico_match.group(1).strip() if topico_match else "Matemática Básica"
            subtopico = subtopico_match.group(1).strip() if subtopico_match else "Operações Fundamentais (+, -, *, /)"
            difficulty = diff_match.group(1).strip() if diff_match else "Médio"
            
            # Map topics
            mapped_topic, mapped_subtopic = map_topics(topico, subtopico)
            
            # Extract options texts
            for k in range(len(opt_matches)):
                start = opt_matches[k].end()
                end = opt_matches[k+1].start() if k+1 < len(opt_matches) else len(q_content)
                opt_text = q_content[start:end]
                
                # Truncate at "Matéria:" or "Classificação:"
                for cutoff in ["Matéria:", "Classificação:"]:
                    if cutoff in opt_text:
                        opt_text = opt_text[:opt_text.find(cutoff)]
                
                opt_text = opt_text.strip()
                # Remove trailing dots if present, but keep if it's part of the answer
                # Just keep it as is
                options.append(opt_text)
            
            # Ensure we have exactly 5 or 4 options
            while len(options) < 5:
                options.append("N/A")
            if len(options) > 5:
                options = options[:5]
                
            # Get correct answer text
            correct_letter = gabarito_map.get(q_num)
            correct_text = ""
            if correct_letter:
                idx = ord(correct_letter) - ord('A')
                if 0 <= idx < len(options):
                    correct_text = options[idx]
            
            # Build question object
            q_obj = {
                "id": f"ai-gen-parsed-{uuid.uuid4().hex[:8]}",
                "subject": "Matemática",
                "topics": [mapped_topic, mapped_subtopic],
                "difficulty": difficulty,
                "contexto": statement_raw,
                "tabelaHtml": "",
                "imagemSvg": "",
                "pergunta": "",
                "opcoes": options,
                "correta": correct_text,
                "explicacao": "Explicação não disponível."
            }
            questions.append(q_obj)
            
    return questions

def main():
    input_file = r'C:\projetos_dev\CONCURSO CAMARA\testes\QUESTÕES\matematica-lista1.txt'
    output_file = r'C:\projetos_dev\CONCURSO CAMARA\web-app\public\data\questions\native-matematica.json'
    
    new_questions = parse_file(input_file)
    print(f"Parsed {len(new_questions)} questions.")
    
    with open(output_file, 'r', encoding='utf-8') as f:
        existing_data = json.load(f)
        
    existing_data.extend(new_questions)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, ensure_ascii=False, indent=2)
        
    print(f"Appended to {output_file}. Total questions: {len(existing_data)}")

if __name__ == '__main__':
    main()
