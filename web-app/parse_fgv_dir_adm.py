"""
Script de parsing REVISADO e importação de questões do PDF FGV de Direito Administrativo.

Regras de importação:
- Matéria: "Noções de Direito Administrativo" (já existente no site)
- Tópico/Subtópico: mapear para hierarquia existente em constants.ts (sem duplicar)
- Dificuldade: classificar como Fácil/Médio/Difícil/Avançado
- Explicação: sempre incluir explicação completa com justificativas de cada alternativa
"""

import pdfplumber
import json
import re
import uuid
import sys

PDF_PATH = r'C:\LIVROS SCRIB\350_Quest_es_de_Direito_Administrativo___PDF___Administra__o_p_blica___Descentraliza__o.pdf'
OUTPUT_PATH = r'public/data/questions/native-nocoes-de-direito-administrativo.json'
EXISTING_PATH = OUTPUT_PATH

# ============================================================
# MAPEAMENTO: palavras-chave → (Tópico, Subtópico do site)
# Hierarquia existente no constants.ts para 'Noções de Direito Administrativo':
# Fundamentos → Estado, Governo e Administração Pública | Princípios da Administração (LIMPE) | Poderes Administrativos
# Organização Administrativa → Administração Direta e Indireta | Autarquias e Fundações | Empresas Públicas e Sociedades de Economia Mista
# Atos Administrativos → Conceito, Requisitos e Atributos | Classificação e Espécies | Invalidação (Revogação e Anulação)
# Licitações e Contratos → Nova Lei de Licitações (Lei 14.133/21) | Princípios e Modalidades | Dispensa e Inexigibilidade
# Agentes Públicos → Cargo, Emprego e Função Pública | Concurso Público | Regime Jurídico Único
# Responsabilidade e Controle → Responsabilidade Civil do Estado | Lei de Improbidade Administrativa (Lei 8.429/92)
# ============================================================

KEYWORD_MAP = [
    # Fundamentos
    (r'\bprincíp(?:io|ios)\b.*\b(?:LIMPE|legalidade|impessoalidade|moralidade|publicidade|eficiência)\b', ('Fundamentos', 'Princípios da Administração (LIMPE)')),
    (r'\b(?:legalidade|impessoalidade|moralidade|publicidade|eficiência)\b.*\bAdministração', ('Fundamentos', 'Princípios da Administração (LIMPE)')),
    (r'\bpoder(?:es)? de polícia\b', ('Fundamentos', 'Poderes Administrativos')),
    (r'\bpoder(?:es)? (?:vinculado|discricionário|hierárquico|disciplinar|normativo|regulamentar)\b', ('Fundamentos', 'Poderes Administrativos')),
    (r'\bintervenção (?:do Estado|na propriedade)\b', ('Fundamentos', 'Estado, Governo e Administração Pública')),
    (r'\bserviço(?:s)? público(?:s)?\b', ('Fundamentos', 'Estado, Governo e Administração Pública')),
    (r'\bbens? público(?:s)?\b', ('Fundamentos', 'Estado, Governo e Administração Pública')),
    (r'\bdesapropriação\b', ('Fundamentos', 'Estado, Governo e Administração Pública')),
    (r'\bconcessão|permissão|autorização\b.*\bserviço\b', ('Fundamentos', 'Estado, Governo e Administração Pública')),
    
    # Organização Administrativa
    (r'\bautarquia(?:s)?\b', ('Organização Administrativa', 'Autarquias e Fundações')),
    (r'\bfundação\b.*\bpública\b', ('Organização Administrativa', 'Autarquias e Fundações')),
    (r'\bagência(?:s)? reguladora(?:s)?\b', ('Organização Administrativa', 'Autarquias e Fundações')),
    (r'\bagência(?:s)? executiva(?:s)?\b', ('Organização Administrativa', 'Autarquias e Fundações')),
    (r'\bempresa(?:s)? pública(?:s)?\b', ('Organização Administrativa', 'Empresas Públicas e Sociedades de Economia Mista')),
    (r'\bsociedade(?:s)? de economia mista\b', ('Organização Administrativa', 'Empresas Públicas e Sociedades de Economia Mista')),
    (r'\bdescentralização\b', ('Organização Administrativa', 'Administração Direta e Indireta')),
    (r'\badministração (?:direta|indireta)\b', ('Organização Administrativa', 'Administração Direta e Indireta')),
    (r'\bórgão(?:s)? público(?:s)?\b', ('Organização Administrativa', 'Administração Direta e Indireta')),
    (r'\bentidade(?:s)? (?:da administração|parapública)\b', ('Organização Administrativa', 'Administração Direta e Indireta')),
    
    # Atos Administrativos
    (r'\bato(?:s)? administrativo(?:s)?\b', ('Atos Administrativos', 'Conceito, Requisitos e Atributos')),
    (r'\banulação\b.*\bato\b', ('Atos Administrativos', 'Invalidação (Revogação e Anulação)')),
    (r'\brevogação\b.*\bato\b', ('Atos Administrativos', 'Invalidação (Revogação e Anulação)')),
    (r'\bconvalidação\b', ('Atos Administrativos', 'Invalidação (Revogação e Anulação)')),
    (r'\bvinculado|discricionário\b.*\bato\b', ('Atos Administrativos', 'Classificação e Espécies')),
    (r'\bmotivação\b.*\bato\b', ('Atos Administrativos', 'Conceito, Requisitos e Atributos')),
    (r'\bpresunção de legitimidade\b', ('Atos Administrativos', 'Conceito, Requisitos e Atributos')),
    (r'\bautotutela\b', ('Atos Administrativos', 'Invalidação (Revogação e Anulação)')),
    
    # Agentes Públicos
    (r'\bconcurso público\b', ('Agentes Públicos', 'Concurso Público')),
    (r'\bempossamento|nomeação\b', ('Agentes Públicos', 'Cargo, Emprego e Função Pública')),
    (r'\bcargo|emprego|função pública\b', ('Agentes Públicos', 'Cargo, Emprego e Função Pública')),
    (r'\bregime jurídico\b', ('Agentes Públicos', 'Regime Jurídico Único')),
    (r'\bservidor(?:es)? público(?:s)?\b', ('Agentes Públicos', 'Cargo, Emprego e Função Pública')),
    (r'\bagente(?:s)? público(?:s)?\b', ('Agentes Públicos', 'Cargo, Emprego e Função Pública')),
    (r'\bprocesso administrativo disciplinar\b', ('Agentes Públicos', 'Regime Jurídico Único')),
    (r'\bregime disciplinar\b', ('Agentes Públicos', 'Regime Jurídico Único')),
    
    # Licitações e Contratos
    (r'\blicitação(?:ões)?\b', ('Licitações e Contratos', 'Princípios e Modalidades')),
    (r'\bpregão\b', ('Licitações e Contratos', 'Princípios e Modalidades')),
    (r'\bdispensa\b.*\blicitação\b', ('Licitações e Contratos', 'Dispensa e Inexigibilidade')),
    (r'\binexigibilidade\b', ('Licitações e Contratos', 'Dispensa e Inexigibilidade')),
    (r'\blei 14\.133|lei 8\.666\b', ('Licitações e Contratos', 'Nova Lei de Licitações (Lei 14.133/21)')),
    (r'\bcontrato(?:s)? administrativo(?:s)?\b', ('Licitações e Contratos', 'Nova Lei de Licitações (Lei 14.133/21)')),
    (r'\bparceria público.privada|PPP\b', ('Licitações e Contratos', 'Nova Lei de Licitações (Lei 14.133/21)')),
    
    # Responsabilidade e Controle
    (r'\bresponsabilidade (?:civil )?do Estado\b', ('Responsabilidade e Controle', 'Responsabilidade Civil do Estado')),
    (r'\bresponsabilidade (?:civil )?(?:objetiva|subjetiva)\b', ('Responsabilidade e Controle', 'Responsabilidade Civil do Estado')),
    (r'\bimprobidade administrativa\b', ('Responsabilidade e Controle', 'Lei de Improbidade Administrativa (Lei 8.429/92)')),
    (r'\blei 8\.429\b', ('Responsabilidade e Controle', 'Lei de Improbidade Administrativa (Lei 8.429/92)')),
    (r'\bcontrole (?:da )?administração\b', ('Responsabilidade e Controle', 'Responsabilidade Civil do Estado')),
    (r'\btribunal de contas\b', ('Responsabilidade e Controle', 'Responsabilidade Civil do Estado')),
]

DEFAULT = ('Fundamentos', 'Estado, Governo e Administração Pública')

# Seções do sumário do PDF → mapeamento inicial
PDF_SECTION_MAP = {
    'Princípios': ('Fundamentos', 'Princípios da Administração (LIMPE)'),
    'Organização Administrativa': ('Organização Administrativa', 'Administração Direta e Indireta'),
    'Agentes Públicos': ('Agentes Públicos', 'Cargo, Emprego e Função Pública'),
    'Atos Administrativos': ('Atos Administrativos', 'Conceito, Requisitos e Atributos'),
    'Bens Públicos': ('Fundamentos', 'Estado, Governo e Administração Pública'),
    'Contratos': ('Licitações e Contratos', 'Nova Lei de Licitações (Lei 14.133/21)'),
    'Controle Administrativo': ('Responsabilidade e Controle', 'Responsabilidade Civil do Estado'),
    'Improbidade Administrativa': ('Responsabilidade e Controle', 'Lei de Improbidade Administrativa (Lei 8.429/92)'),
    'Intervenção do Estado na Propriedade': ('Fundamentos', 'Estado, Governo e Administração Pública'),
    'Introdução ao Direito Administrativo': ('Fundamentos', 'Estado, Governo e Administração Pública'),
    'Licitações': ('Licitações e Contratos', 'Princípios e Modalidades'),
    'Poder de Polícia': ('Fundamentos', 'Poderes Administrativos'),
    'Responsabilidade Civil': ('Responsabilidade e Controle', 'Responsabilidade Civil do Estado'),
    'Serviços Públicos': ('Fundamentos', 'Estado, Governo e Administração Pública'),
}


def classify_difficulty(statement, options, section):
    """Classifica dificuldade baseada em heurísticas do conteúdo."""
    text = (statement + ' ' + ' '.join(options or [])).lower()
    
    advanced_markers = [
        'stf', 'stj', 'supremo tribunal federal', 'superior tribunal',
        'súmula vinculante', 'repercussão geral', 'mandado de segurança',
        'ação direta de inconstitucionalidade', 'recurso extraordinário',
    ]
    
    hard_markers = [
        'jurisprudência', 'inconstitucionalidade', 'prazo decadencial',
        'decadência', 'prescrição', 'autotutela', 'lei 14.133', 'lei 8.429',
        'cláusula exorbitante', 'parceria público-privada', 'ppp',
        'convalidação', 'teoria dos motivos determinantes',
        'responsabilidade objetiva', 'risco administrativo',
        'processo administrativo disciplinar', 'sindicância',
        'tomada de preços', 'pregão eletrônico',
        'inexigibilidade', 'dispensa de licitação',
    ]
    
    easy_markers = [
        'legalidade', 'impessoalidade', 'moralidade', 'publicidade', 'eficiência',
        'limpe', 'administração pública deve', 'agente público deve',
        'é correto afirmar', 'o que é', 'qual é', 'define',
        'assinale a alternativa que apresenta', 'princípio que estabelece',
    ]
    
    adv_count = sum(1 for m in advanced_markers if m in text)
    hard_count = sum(1 for m in hard_markers if m in text)
    easy_count = sum(1 for m in easy_markers if m in text)
    
    if adv_count >= 1:
        return 'Avançado'
    elif hard_count >= 2:
        return 'Difícil'
    elif hard_count >= 1 and easy_count == 0:
        return 'Médio'
    elif easy_count >= 2:
        return 'Fácil'
    elif easy_count >= 1 and hard_count == 0:
        return 'Fácil'
    else:
        return 'Médio'


def map_content_to_topics(statement, banca_info, current_section):
    """Mapeia conteúdo da questão para (tópico, subtópico) do site."""
    text = (statement or '').lower()
    
    for pattern, result in KEYWORD_MAP:
        if re.search(pattern, text, re.IGNORECASE):
            return result
    
    # Fallback: seção do PDF
    for sec_key, result in PDF_SECTION_MAP.items():
        if sec_key.lower() in (current_section or '').lower():
            return result
    
    return DEFAULT


def clean_page_headers(text):
    """Remove cabeçalhos e rodapés de página do PDF."""
    text = re.sub(r'gran\.com\.br\s*\d+\s*de\s*\d+', '', text)
    text = re.sub(r'Missão FGV:.*?Lógico\s*\n?', '', text, flags=re.DOTALL)
    text = re.sub(r'Direito Administrativo e Raciocínio Lógico\s*\n?', '', text)
    return text.strip()


def extract_full_text(pdf_path):
    """Extrai todo o texto do PDF em um string único."""
    parts = []
    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        print(f'Extracting {total} pages...', file=sys.stderr)
        for i, page in enumerate(pdf.pages):
            t = page.extract_text() or ''
            parts.append(t)
    return '\n'.join(parts)


def parse_questions(full_text):
    """
    Parseia questões do formato:
      NNN. (BANCA/INFO) Enunciado
      a) Opção a
      b) Opção b
      ...
      Letra X.
      a) Certa/Errada. Comentário
      ...
    """
    # Remove cabeçalhos/rodapés de forma global
    text = clean_page_headers(full_text)
    
    questions = []
    letter_to_idx = {'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4}
    
    # Detectar seções (palavras que aparecem sozinhas como títulos de seção)
    section_headers = list(PDF_SECTION_MAP.keys())
    current_section = 'Introdução ao Direito Administrativo'
    
    # Divide o texto em blocos de questões
    # Uma questão começa com: início de linha + 3 dígitos + ponto + espaço + parêntese
    question_split = re.compile(r'(?=\n\d{3}\.\s+\()')
    blocks = question_split.split(text)
    
    # Pattern para questão completa
    question_header = re.compile(r'^(\d{3})\.\s+\(([^)]+)\)\s+(.*)', re.DOTALL)
    
    # Alternativas: linha que começa com a) até e) (minúsculo)
    # A) até E) (maiúsculo) → para questões com letras maiúsculas
    option_line = re.compile(r'^([a-eA-E])\)\s+(.+?)(?=\n[a-eA-E]\)|\nLetra\s+[a-eA-E]|\Z)', re.DOTALL | re.MULTILINE)
    
    # Gabarito: "Letra X." onde X é uma letra
    gabarito_re = re.compile(r'\nLetra\s+([a-eA-E])\.\s*\n', re.IGNORECASE)
    
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        
        # Verificar se começa com número de questão
        m = question_header.match(block)
        if not m:
            # Pode ser uma seção
            for sec in section_headers:
                if block.strip().startswith(sec):
                    current_section = sec
            continue
        
        num = m.group(1)
        banca_info = m.group(2).strip()
        content = m.group(3).strip()
        
        # Detectar mudança de seção no bloco
        for sec in section_headers:
            if re.search(r'^\s*' + re.escape(sec) + r'\s*$', content[:100], re.MULTILINE):
                current_section = sec
                content = content.replace(sec, '', 1).strip()
        
        # Encontrar onde começam as alternativas
        # Alternativas são linhas que começam com a), b), c), d), e) OU A), B), C), D), E)
        alt_match = re.search(r'\n[aA]\)', content)
        if alt_match:
            statement = content[:alt_match.start()].strip()
            rest = content[alt_match.start():]
        else:
            # Pode não ter alternativas (questões dissertativas raras)
            continue
        
        # Separar enunciado das alternativas e do gabarito
        # Gabarito aparece com "Letra X."
        gabarito_m = gabarito_re.search(rest)
        if not gabarito_m:
            # Tentar sem newline antes
            gabarito_m = re.search(r'Letra\s+([a-eA-E])\.', rest, re.IGNORECASE)
            if not gabarito_m:
                continue
        
        correct_letter = gabarito_m.group(1).lower()
        correct_idx = letter_to_idx.get(correct_letter, -1)
        
        # Parte de alternativas: entre o início e o gabarito
        options_text = rest[:gabarito_m.start()]
        explanation_text = rest[gabarito_m.end():]
        
        # Extrair alternativas — cada uma começa com a), b)... e termina antes da próxima
        options = []
        opt_pattern = re.compile(r'[aA-eE]\)\s+(.*?)(?=\n[a-eA-E]\)|\Z)', re.DOTALL)
        for om in opt_pattern.finditer(options_text):
            opt_text = clean_page_headers(om.group(1).strip())
            # Remover qualquer texto de comentário que tenha vazado
            opt_text = re.sub(r'\n(Certa|Errada)\..*', '', opt_text, flags=re.DOTALL)
            options.append(opt_text.strip())
        
        if len(options) < 2:
            continue
        
        if correct_idx >= len(options):
            correct_idx = 0
        
        correct_option = options[correct_idx] if correct_idx >= 0 else ''
        
        # Extrair e formatar explicação
        explanation_raw = clean_page_headers(explanation_text.strip())
        # A explicação tem formato: a) Certa/Errada. comentário ... b) Errada. ... etc.
        # Reformatar para uma explicação coesa
        
        correct_letter_upper = correct_letter.upper()
        
        if explanation_raw:
            # Formatar cada linha de comentário das alternativas
            comment_pattern = re.compile(r'([a-eA-E])\)\s+(Certa|Errada)\.\s+(.+?)(?=\n[a-eA-E]\)|\Z)', re.DOTALL)
            comment_parts = []
            for cm in comment_pattern.finditer(explanation_raw):
                let = cm.group(1).upper()
                status = cm.group(2)
                comment = clean_page_headers(cm.group(3).strip())
                emoji = '✅' if status == 'Certa' else '❌'
                comment_parts.append(f'{emoji} **{let}) {status}:** {comment}')
            
            if comment_parts:
                full_explanation = (
                    f'✅ **Gabarito: Letra {correct_letter_upper}**\n\n'
                    + '\n\n'.join(comment_parts)
                )
            else:
                # Usar o texto bruto como explicação
                full_explanation = (
                    f'✅ **Gabarito: Letra {correct_letter_upper}**\n\n'
                    f'{explanation_raw[:800]}'
                )
        else:
            full_explanation = (
                f'✅ **Gabarito: Letra {correct_letter_upper}**\n\n'
                f'A alternativa correta é: {correct_option}'
            )
        
        # Limpar statement
        statement = clean_page_headers(statement)
        
        # Mapear para tópico/subtópico do site
        main_topic, subtopic = map_content_to_topics(statement, banca_info, current_section)
        
        # Classificar dificuldade
        difficulty = classify_difficulty(statement, options, current_section)
        
        # Gerar ID único
        qid = f'fgv-dir-adm-{num}-{uuid.uuid4().hex[:8]}'
        
        question = {
            'id': qid,
            'subject': 'Noções de Direito Administrativo',
            'topics': [subtopic],
            'difficulty': difficulty,
            'contexto': '',
            'tabelaHtml': '',
            'imagemSvg': '',
            'pergunta': statement,
            'opcoes': options,
            'correta': correct_option,
            'explicacao': full_explanation,
            'lei_seca': '',
        }
        
        questions.append(question)
    
    return questions


def main():
    print('Extracting text from PDF...', file=sys.stderr)
    
    # Use already extracted text if available
    import os
    if os.path.exists('pdf_full_text.txt'):
        print('Using cached text file...', file=sys.stderr)
        with open('pdf_full_text.txt', 'r', encoding='utf-8', errors='replace') as f:
            full_text = f.read()
    else:
        full_text = extract_full_text(PDF_PATH)
        with open('pdf_full_text.txt', 'w', encoding='utf-8', errors='replace') as f:
            f.write(full_text)
    
    print(f'Text length: {len(full_text)} chars', file=sys.stderr)
    
    print('Parsing questions...', file=sys.stderr)
    new_questions = parse_questions(full_text)
    print(f'Parsed: {len(new_questions)} questions', file=sys.stderr)
    
    # Load existing questions (keep originals, replace only new ones)
    with open(EXISTING_PATH, 'r', encoding='utf-8') as f:
        existing = json.load(f)
    
    # Remove previously imported FGV questions (from failed run)
    original = [q for q in existing if not (q.get('id', '').startswith('fgv-dir-adm'))]
    print(f'Original questions (non-FGV): {len(original)}', file=sys.stderr)
    
    combined = original + new_questions
    
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(combined, f, ensure_ascii=False, indent=2)
    
    print(f'\n✅ Done! {len(new_questions)} new FGV questions added.', file=sys.stderr)
    print(f'Total: {len(combined)} questions in file', file=sys.stderr)
    
    # Show stats
    from collections import Counter
    diff_stats = Counter(q['difficulty'] for q in new_questions)
    topic_stats = Counter(q['topics'][0] for q in new_questions if q.get('topics'))
    
    print('\n--- Difficulty distribution ---', file=sys.stderr)
    for k, v in sorted(diff_stats.items()):
        print(f'  {k}: {v}', file=sys.stderr)
    
    print('\n--- Topics distribution ---', file=sys.stderr)
    for k, v in sorted(topic_stats.items(), key=lambda x: -x[1]):
        print(f'  {k}: {v}', file=sys.stderr)
    
    # Validate sample
    print('\n--- Sample question validation ---', file=sys.stderr)
    q = new_questions[0]
    print(f'ID: {q["id"]}', file=sys.stderr)
    print(f'Topics: {q["topics"]}', file=sys.stderr)
    print(f'Difficulty: {q["difficulty"]}', file=sys.stderr)
    print(f'Statement (50 chars): {q["pergunta"][:50]}', file=sys.stderr)
    print(f'Options count: {len(q["opcoes"])}', file=sys.stderr)
    for i, o in enumerate(q["opcoes"]):
        print(f'  {i}: {o[:60]}', file=sys.stderr)
    print(f'Correct idx: {q["opcoes"].index(q["correta"]) if q["correta"] in q["opcoes"] else "NOT FOUND"}', file=sys.stderr)
    print(f'Explanation (200 chars): {q["explicacao"][:200]}', file=sys.stderr)


if __name__ == '__main__':
    main()
