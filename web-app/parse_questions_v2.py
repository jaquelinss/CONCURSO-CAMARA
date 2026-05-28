import json
import re
import uuid

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

    if "porcentagem" in txt_topic_lower:
        return "Matemática Financeira", "Porcentagem"
        
    if "média" in txt_topic_lower:
        return "Estatística", "Medidas de Tendência Central (Média, Moda, Mediana)"
        
    # Default
    return "Matemática Básica", "Operações Fundamentais (+, -, *, /)"

def parse_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Build Gabarito Map
    gabarito_map = {}
    gabarito_matches = re.finditer(r'(?i)Questão\s+(\d+)[^:]*:\s*\[?([A-E])\]?', content)
    for m in gabarito_matches:
        gabarito_map[m.group(1)] = m.group(2).upper()
        
    questions = []
    
    # We will split the text by "QUESTÃO \d+"
    # But wait, there are "QUESTÃO 101 (Original 01)"
    # We can match "QUESTÃO (\d+)"
    q_matches = list(re.finditer(r'(?m)^QUESTÃO\s+(\d+)', content))
    
    for i in range(len(q_matches)):
        start_idx = q_matches[i].start()
        end_idx = q_matches[i+1].start() if i+1 < len(q_matches) else len(content)
        
        q_block = content[start_idx:end_idx]
        q_num = q_matches[i].group(1)
        
        # Ensure we don't accidentally parse a gabarito line if there's any anomaly
        # But gabarito uses "Questão", here we look for uppercase "QUESTÃO"
        
        # Remove any leading "QUESTÃO XX"
        q_content = re.sub(r'^QUESTÃO\s+\d+.*?\n', '', q_block, 1)
        # Sometime the statement is on the same line: "QUESTÃO 48 (G1 - ifpe 2014) Um elevador..."
        q_content_inline_match = re.match(r'^QUESTÃO\s+\d+[^\n]*?\)\s*(.*)', q_block, re.DOTALL)
        if q_content_inline_match:
            # Maybe the text continues on the same line
            first_line = q_block.split('\n')[0]
            # remove "QUESTÃO XX " or "QUESTÃO XX (xxx) "
            first_line_cleaned = re.sub(r'^QUESTÃO\s+\d+(?:\s+\([^\)]+\))?\s*', '', first_line)
            rest = '\n'.join(q_block.split('\n')[1:])
            q_content = first_line_cleaned + '\n' + rest
        else:
            # Normal case
            q_content = re.sub(r'^QUESTÃO\s+\d+.*?\n', '', q_block, 1)
            
        if "Classificação:" not in q_content and "Matéria:" not in q_content:
            # Maybe the block was cut
            pass
            
        # Find options
        options = []
        opt_matches = list(re.finditer(r'(?m)^ *([a-e])\)', q_content))
        if not opt_matches:
            # try finding " a) ", " b) " inline
            opt_matches = list(re.finditer(r' ([a-e])\) ', q_content))
        
        if not opt_matches:
            continue
            
        statement_end = opt_matches[0].start()
        statement_raw = q_content[:statement_end].strip()
        
        # Clean statement
        statement_raw = re.sub(r'^\s*\"?\d+\.\s*\([^\)]+\)\s*', '', statement_raw)
        statement_raw = re.sub(r'\"+', '', statement_raw)
        statement_raw = statement_raw.replace('\n', ' ')
        
        materia_match = re.search(r'(?m)^Matéria:\s*(.*)', q_block)
        topico_match = re.search(r'(?m)^Tópico:\s*(.*)', q_block)
        subtopico_match = re.search(r'(?m)^Subtópico:\s*(.*)', q_block)
        diff_match = re.search(r'(?m)^Dificuldade:\s*(.*)', q_block)
        
        topico = topico_match.group(1).strip() if topico_match else "Matemática Básica"
        subtopico = subtopico_match.group(1).strip() if subtopico_match else "Operações Fundamentais (+, -, *, /)"
        difficulty = diff_match.group(1).strip() if diff_match else "Médio"
        
        mapped_topic, mapped_subtopic = map_topics(topico, subtopico)
        
        for k in range(len(opt_matches)):
            start = opt_matches[k].end()
            end = opt_matches[k+1].start() if k+1 < len(opt_matches) else len(q_content)
            opt_text = q_content[start:end]
            for cutoff in ["Classificação:", "Matéria:", "----------------", "GABARITO"]:
                if cutoff in opt_text:
                    opt_text = opt_text[:opt_text.find(cutoff)]
            options.append(opt_text.strip())
            
        while len(options) < 5:
            options.append("N/A")
        if len(options) > 5:
            options = options[:5]
            
        correct_letter = gabarito_map.get(q_num)
        correct_text = ""
        if correct_letter:
            idx = ord(correct_letter) - ord('A')
            if 0 <= idx < len(options):
                correct_text = options[idx]
        
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
        
    # Since we already appended 46 questions, let's remove the ones with 'ai-gen-parsed' to avoid duplicates
    existing_data = [q for q in existing_data if not str(q.get('id', '')).startswith('ai-gen-parsed')]
    
    existing_data.extend(new_questions)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, ensure_ascii=False, indent=2)
        
    print(f"Appended to {output_file}. Total questions: {len(existing_data)}")

if __name__ == '__main__':
    main()
