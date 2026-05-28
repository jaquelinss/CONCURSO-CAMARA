import json
import re

def normalize_topics():
    filepath = r'C:\projetos_dev\CONCURSO CAMARA\web-app\public\data\questions\native-matematica.json'
    
    with open(filepath, 'r', encoding='utf-8') as f:
        questions = json.load(f)

    # We want to replace messy topics with the standard ones
    # Standard topics mapping
    # (messy_string_lower -> list of clean topics)
    mapping = {
        'matemática básica (35%)': ['Matemática Básica'],
        'matemática básica': ['Matemática Básica'],
        'geometria plana (8,3%)': ['Geometria', 'Geometria Plana (Áreas e Perímetros)'],
        'geometria plana': ['Geometria', 'Geometria Plana (Áreas e Perímetros)'],
        'geometria espacial (9,2%)': ['Geometria', 'Geometria Espacial (Volumes e Áreas)'],
        'geometria espacial': ['Geometria', 'Geometria Espacial (Volumes e Áreas)'],
        'estatística (8,6%)': ['Estatística'],
        'estatística': ['Estatística'],
        'razão e proporção': ['Matemática Básica', 'Razão e Proporção'],
        'razão e proporção': ['Matemática Básica', 'Razão e Proporção'], # to handle capitalization
        'função 1º grau': ['Conjuntos e Funções', 'Função do 1º Grau'],
        'função do 1º grau': ['Conjuntos e Funções', 'Função do 1º Grau'],
        'matemática comercial': ['Matemática Financeira'],
        'matemática financeira': ['Matemática Financeira'],
        'matéria de consumo': ['Matemática Básica'],
        'matemática geral': ['Matemática Básica'],
        'consumo eletricidade': ['Matemática Básica'],
        'escalas': ['Matemática Básica', 'Razão e Proporção'],
        'geral': ['Matemática Básica'],
        'proporção': ['Matemática Básica', 'Razão e Proporção'],
        'porcentagem comercial': ['Matemática Financeira', 'Porcentagem'],
        'potenciação e radiciação avançada': ['Matemática Básica', 'Potenciação e Radiciação'],
        'medidas de tendência central (média, moda, mediana)': ['Estatística', 'Medidas de Tendência Central (Média, Moda, Mediana)'],
        'operações fundamentais (+, -, *, /)': ['Matemática Básica', 'Operações Fundamentais (+, -, *, /)'],
        'frações e números decimais': ['Matemática Básica', 'Frações e Números Decimais'],
        'potenciação e radiciação': ['Matemática Básica', 'Potenciação e Radiciação'],
        'regra de três simples e composta': ['Matemática Básica', 'Regra de Três Simples e Composta'],
        'grandezas proporcionais': ['Matemática Básica', 'Razão e Proporção'],
        'juros simples e compostos': ['Matemática Financeira', 'Juros Simples e Compostos'],
        'descontos e acréscimos': ['Matemática Financeira', 'Descontos e Acréscimos'],
        'porcentagem': ['Matemática Financeira', 'Porcentagem'],
        'gráficos e tabelas': ['Estatística', 'Gráficos e Tabelas'],
        'conjuntos e funções': ['Conjuntos e Funções'],
        'progressão aritmética (pa)': ['Sequências e Análise Combinatória', 'Progressão Aritmética (PA)'],
    }

    for q in questions:
        if not 'topics' in q or not isinstance(q['topics'], list):
            continue
            
        new_topics = []
        for t in q['topics']:
            tl = t.lower().strip()
            # Find matching
            matched = False
            for k, v in mapping.items():
                if k == tl:
                    new_topics.extend(v)
                    matched = True
                    break
            
            if not matched:
                # keep it as is, or try to clean it
                cleaned = re.sub(r'\s*\([\d,]+%\)', '', t).strip()
                if cleaned.lower() in mapping:
                    new_topics.extend(mapping[cleaned.lower()])
                else:
                    # just capitalize properly if it's "Razão E Proporção"
                    if tl == 'razão e proporção':
                        new_topics.append('Razão e Proporção')
                    else:
                        new_topics.append(cleaned)

        # Remove duplicates while preserving order
        final_topics = []
        for nt in new_topics:
            if nt not in final_topics:
                final_topics.append(nt)
                
        # Ensure that if it has a subtopic but no main topic, we add the main topic?
        # The mapping already adds main topics.
        q['topics'] = final_topics

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)

    print("Normalized topics.")

if __name__ == '__main__':
    normalize_topics()
