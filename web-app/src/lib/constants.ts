export const ENEM_AREAS = {
  'Ciências da Natureza': {
    distribution: { 'Biologia': 0.40, 'Física': 0.35, 'Química': 0.25 },
  },
  'Ciências Humanas': {
    distribution: { 'História': 0.30, 'Geografia': 0.30, 'Filosofia': 0.20, 'Sociologia': 0.20 },
  },
  'Linguagens e Códigos': {
    distribution: { 'Interpretação Textual': 0.55, 'Literatura': 0.30, 'Português': 0.15 },
    foreignLanguageProportion: 5/45,
  }
};

export const subjectsGeral = [
  'Ciências da Natureza', 'Ciências Humanas', 'Linguagens e Códigos', 'Matemática', 'Redação',
  'Medicina', 'Português', 'Interpretação Textual', 'Biologia', 'Inglês', 'Espanhol', 'Geografia', 'História', 'Sociologia', 'Filosofia', 'Literatura', 'Química', 'Física', 'Artes',
  'Atualidades', 'Constituição Federal', 'Tecnologia e Sociedade'
];

export const subjectsEnem = [
  'Ciências da Natureza', 'Ciências Humanas', 'Linguagens e Códigos', 'Matemática', 'Redação',
  'Biologia', 'Física', 'Química', 
  'História', 'Geografia', 'Filosofia', 'Sociologia',
  'Português', 'Artes', 'Literatura', 'Inglês', 'Espanhol'
];

export const subjectsConcurso = [
  'Língua Portuguesa', 'Raciocínio Lógico-Matemático', 'Matemática', 'Noções de Informática', 'Lei Orgânica de Caruaru', 'Legislação Específica', 'Administração Pública', 'Noções de Arquivologia', 'Noções de Direito Constitucional', 'Noções de Direito Administrativo'
];

export const getSubjectsByMode = (mode: 'Geral' | 'ENEM' | 'Concurso') => {
  if (mode === 'ENEM') return subjectsEnem;
  if (mode === 'Concurso') return subjectsConcurso;
  return subjectsGeral;
}

export const getModelsByMode = (mode: 'Geral' | 'ENEM' | 'Concurso') => {
  if (mode === 'Concurso') return ['Técnica', 'Ibam', 'Cespe', 'FGV', 'Flashcard', 'Aula Explicativa'];
  if (mode === 'ENEM') return ['Enem', 'Técnica', 'Fuvest', 'Fanema', 'Flashcard', 'Aula Explicativa'];
  return ['Técnica', 'Enem', 'Ibam', 'Cespe', 'FGV', 'Flashcard', 'Aula Explicativa'];
}

export const questionModels = ['Técnica', 'Enem', 'Fuvest', 'Fanema', 'Ibam', 'Cespe', 'FGV', 'Flashcard', 'Aula Explicativa'];
export const difficulties = ['Fácil', 'Médio', 'Difícil', 'Avançado'];
export const lessonLevels = ['Introdutória', 'Intermediária', 'Aprofundada'];

export const themes: Record<string, any> = {
  'Medicina': { bg: 'bg-teal-50', text: 'text-teal-900', accent: 'text-teal-600', border: 'border-teal-300', ring: 'ring-teal-400', button: 'bg-teal-500 hover:bg-teal-600 text-white', option: 'bg-white hover:bg-teal-100', cardFront: 'bg-teal-100', cardBack: 'bg-teal-200' },
  'Ciências da Natureza': { bg: 'bg-emerald-50', text: 'text-emerald-900', accent: 'text-emerald-600', border: 'border-emerald-300', ring: 'ring-emerald-400', button: 'bg-emerald-500 hover:bg-emerald-600 text-white', option: 'bg-white hover:bg-emerald-100', cardFront: 'bg-emerald-100', cardBack: 'bg-emerald-200' },
  'Ciências Humanas': { bg: 'bg-amber-50', text: 'text-amber-900', accent: 'text-amber-600', border: 'border-amber-300', ring: 'ring-amber-400', button: 'bg-amber-500 hover:bg-amber-600 text-white', option: 'bg-white hover:bg-amber-100', cardFront: 'bg-amber-100', cardBack: 'bg-amber-200' },
  'Linguagens e Códigos': { bg: 'bg-rose-50', text: 'text-rose-900', accent: 'text-rose-600', border: 'border-rose-300', ring: 'ring-rose-400', button: 'bg-rose-500 hover:bg-rose-600 text-white', option: 'bg-white hover:bg-rose-100', cardFront: 'bg-rose-100', cardBack: 'bg-rose-200' },
  'Matemática': { bg: 'bg-blue-50', text: 'text-blue-900', accent: 'text-blue-600', border: 'border-blue-300', ring: 'ring-blue-400', button: 'bg-blue-500 hover:bg-blue-600 text-white', option: 'bg-white hover:bg-blue-100', cardFront: 'bg-blue-100', cardBack: 'bg-blue-200' },
  'Português': { bg: 'bg-yellow-50', text: 'text-yellow-900', accent: 'text-yellow-600', border: 'border-yellow-300', ring: 'ring-yellow-400', button: 'bg-yellow-500 hover:bg-yellow-600 text-white', option: 'bg-white hover:bg-yellow-100', cardFront: 'bg-yellow-100', cardBack: 'bg-yellow-200' },
  'Biologia': { bg: 'bg-green-50', text: 'text-green-900', accent: 'text-green-600', border: 'border-green-300', ring: 'ring-green-400', button: 'bg-green-500 hover:bg-green-600 text-white', option: 'bg-white hover:bg-green-100', cardFront: 'bg-green-100', cardBack: 'bg-green-200' },
  'Inglês': { bg: 'bg-red-50', text: 'text-red-900', accent: 'text-red-600', border: 'border-red-300', ring: 'ring-red-400', button: 'bg-red-500 hover:bg-red-600 text-white', option: 'bg-white hover:bg-red-100', cardFront: 'bg-red-100', cardBack: 'bg-red-200' },
  'Espanhol': { bg: 'bg-lime-50', text: 'text-lime-900', accent: 'text-lime-600', border: 'border-lime-300', ring: 'ring-lime-400', button: 'bg-lime-500 hover:bg-lime-600 text-white', option: 'bg-white hover:bg-lime-100', cardFront: 'bg-lime-100', cardBack: 'bg-lime-200' },
  'Geografia': { bg: 'bg-teal-50', text: 'text-teal-900', accent: 'text-teal-600', border: 'border-teal-300', ring: 'ring-teal-400', button: 'bg-teal-500 hover:bg-teal-600 text-white', option: 'bg-white hover:bg-teal-100', cardFront: 'bg-teal-100', cardBack: 'bg-teal-200' },
  'História': { bg: 'bg-orange-50', text: 'text-orange-900', accent: 'text-orange-600', border: 'border-orange-300', ring: 'ring-orange-400', button: 'bg-orange-500 hover:bg-orange-600 text-white', option: 'bg-white hover:bg-orange-100', cardFront: 'bg-orange-100', cardBack: 'bg-orange-200' },
  'Sociologia': { bg: 'bg-purple-50', text: 'text-purple-900', accent: 'text-purple-600', border: 'border-purple-300', ring: 'ring-purple-400', button: 'bg-purple-500 hover:bg-purple-600 text-white', option: 'bg-white hover:bg-purple-100', cardFront: 'bg-purple-100', cardBack: 'bg-purple-200' },
  'Filosofia': { bg: 'bg-indigo-50', text: 'text-indigo-900', accent: 'text-indigo-600', border: 'border-indigo-300', ring: 'ring-indigo-400', button: 'bg-indigo-500 hover:bg-indigo-600 text-white', option: 'bg-white hover:bg-indigo-100', cardFront: 'bg-indigo-100', cardBack: 'bg-indigo-200' },
  'Redação': { bg: 'bg-gray-100', text: 'text-gray-900', accent: 'text-gray-600', border: 'border-gray-300', ring: 'ring-gray-400', button: 'bg-gray-500 hover:bg-gray-600 text-white', option: 'bg-white hover:bg-gray-200', cardFront: 'bg-gray-200', cardBack: 'bg-gray-300' },
  'Literatura': { bg: 'bg-pink-50', text: 'text-pink-900', accent: 'text-pink-600', border: 'border-pink-300', ring: 'ring-pink-400', button: 'bg-pink-500 hover:bg-pink-600 text-white', option: 'bg-white hover:bg-pink-100', cardFront: 'bg-pink-100', cardBack: 'bg-pink-200' },
  'Química': { bg: 'bg-cyan-50', text: 'text-cyan-900', accent: 'text-cyan-600', border: 'border-cyan-300', ring: 'ring-cyan-400', button: 'bg-cyan-500 hover:bg-cyan-600 text-white', option: 'bg-white hover:bg-cyan-100', cardFront: 'bg-cyan-100', cardBack: 'bg-cyan-200' },
  'Física': { bg: 'bg-rose-50', text: 'text-rose-900', accent: 'text-rose-600', border: 'border-rose-300', ring: 'ring-rose-400', button: 'bg-rose-500 hover:bg-rose-600 text-white', option: 'bg-white hover:bg-rose-100', cardFront: 'bg-rose-100', cardBack: 'bg-rose-200' },
  'Atualidades': { bg: 'bg-fuchsia-50', text: 'text-fuchsia-900', accent: 'text-fuchsia-600', border: 'border-fuchsia-300', ring: 'ring-fuchsia-400', button: 'bg-fuchsia-500 hover:bg-fuchsia-600 text-white', option: 'bg-white hover:bg-fuchsia-100', cardFront: 'bg-fuchsia-100', cardBack: 'bg-fuchsia-200' },
  'Constituição Federal': { bg: 'bg-amber-50', text: 'text-amber-900', accent: 'text-amber-600', border: 'border-amber-300', ring: 'ring-amber-400', button: 'bg-amber-500 hover:bg-amber-600 text-white', option: 'bg-white hover:bg-amber-100', cardFront: 'bg-amber-100', cardBack: 'bg-amber-200' },
  'Interpretação Textual': { bg: 'bg-emerald-50', text: 'text-emerald-900', accent: 'text-emerald-600', border: 'border-emerald-300', ring: 'ring-emerald-400', button: 'bg-emerald-500 hover:bg-emerald-600 text-white', option: 'bg-white hover:bg-emerald-100', cardFront: 'bg-emerald-100', cardBack: 'bg-emerald-200' },
  'Tecnologia e Sociedade': { bg: 'bg-sky-50', text: 'text-sky-900', accent: 'text-sky-600', border: 'border-sky-300', ring: 'ring-sky-400', button: 'bg-sky-500 hover:bg-sky-600 text-white', option: 'bg-white hover:bg-sky-100', cardFront: 'bg-sky-100', cardBack: 'bg-sky-200' },
  'Língua Portuguesa': { bg: 'bg-yellow-50', text: 'text-yellow-900', accent: 'text-yellow-600', border: 'border-yellow-300', ring: 'ring-yellow-400', button: 'bg-yellow-500 hover:bg-yellow-600 text-white', option: 'bg-white hover:bg-yellow-100', cardFront: 'bg-yellow-100', cardBack: 'bg-yellow-200' },
  'Raciocínio Lógico-Matemático': { bg: 'bg-blue-50', text: 'text-blue-900', accent: 'text-blue-600', border: 'border-blue-300', ring: 'ring-blue-400', button: 'bg-blue-500 hover:bg-blue-600 text-white', option: 'bg-white hover:bg-blue-100', cardFront: 'bg-blue-100', cardBack: 'bg-blue-200' },
  'Noções de Informática': { bg: 'bg-sky-50', text: 'text-sky-900', accent: 'text-sky-600', border: 'border-sky-300', ring: 'ring-sky-400', button: 'bg-sky-500 hover:bg-sky-600 text-white', option: 'bg-white hover:bg-sky-100', cardFront: 'bg-sky-100', cardBack: 'bg-sky-200' },
  'Legislação Específica': { bg: 'bg-amber-50', text: 'text-amber-900', accent: 'text-amber-600', border: 'border-amber-300', ring: 'ring-amber-400', button: 'bg-amber-500 hover:bg-amber-600 text-white', option: 'bg-white hover:bg-amber-100', cardFront: 'bg-amber-100', cardBack: 'bg-amber-200' },
  'Administração Pública': { bg: 'bg-emerald-50', text: 'text-emerald-900', accent: 'text-emerald-600', border: 'border-emerald-300', ring: 'ring-emerald-400', button: 'bg-emerald-500 hover:bg-emerald-600 text-white', option: 'bg-white hover:bg-emerald-100', cardFront: 'bg-emerald-100', cardBack: 'bg-emerald-200' },
  'Noções de Arquivologia': { bg: 'bg-orange-50', text: 'text-orange-900', accent: 'text-orange-600', border: 'border-orange-300', ring: 'ring-orange-400', button: 'bg-orange-500 hover:bg-orange-600 text-white', option: 'bg-white hover:bg-orange-100', cardFront: 'bg-orange-100', cardBack: 'bg-orange-200' },
  'Noções de Direito Constitucional': { bg: 'bg-amber-50', text: 'text-amber-900', accent: 'text-amber-600', border: 'border-amber-300', ring: 'ring-amber-400', button: 'bg-amber-500 hover:bg-amber-600 text-white', option: 'bg-white hover:bg-amber-100', cardFront: 'bg-amber-100', cardBack: 'bg-amber-200' },
  'Noções de Direito Administrativo': { bg: 'bg-emerald-50', text: 'text-emerald-900', accent: 'text-emerald-600', border: 'border-emerald-300', ring: 'ring-emerald-400', button: 'bg-emerald-500 hover:bg-emerald-600 text-white', option: 'bg-white hover:bg-emerald-100', cardFront: 'bg-emerald-100', cardBack: 'bg-emerald-200' },
  'Lei Orgânica de Caruaru': { bg: 'bg-amber-50', text: 'text-amber-900', accent: 'text-amber-600', border: 'border-amber-300', ring: 'ring-amber-400', button: 'bg-amber-500 hover:bg-amber-600 text-white', option: 'bg-white hover:bg-amber-100', cardFront: 'bg-amber-100', cardBack: 'bg-amber-200' },
  'Artes': { bg: 'bg-rose-50', text: 'text-rose-900', accent: 'text-rose-600', border: 'border-rose-300', ring: 'ring-rose-400', button: 'bg-rose-500 hover:bg-rose-600 text-white', option: 'bg-white hover:bg-rose-100', cardFront: 'bg-rose-100', cardBack: 'bg-rose-200' },
};

export const topicsBySubject: Record<string, any> = {
  // --- Matérias de Concurso ---
  'Língua Portuguesa': {
    'Interpretação e Estrutura': ['Compreensão de textos literários', 'Mecanismos de coesão textual'],
    'Gramática e Sintaxe': ['Classes gramaticais', 'Flexão', 'Concordância nominal e verbal', 'Regência', 'Colocação pronominal'],
    'Regras Oficiais e Estilo': ['Ortografia', 'Acentuação', 'Crase', 'Figuras de linguagem']
  },
  'Raciocínio Lógico-Matemático': {
    'Lógica Formal': ['Proposições', 'Tabelas-verdade', 'Equivalências lógicas', 'Diagramas lógicos'],
    'Matemática Básica e Álgebra': ['Porcentagem', 'Proporcionalidade', 'Equações e Sistemas', 'Juros'],
    'Geometria e Outros': ['Probabilidade', 'Área e Perímetro', 'Volume', 'Contagem']
  },
  'Noções de Informática': {
    'Ambiente Windows': ['Windows 10 e 11 (Principais Ferramentas)', 'Gerenciamento de Arquivos e Pastas', 'Atalhos de Teclado'],
    'Suíte de Escritório': ['Edição de Textos (Word)', 'Planilhas Eletrônicas (Excel)', 'Apresentações (PowerPoint)'],
    'Redes e Internet': ['Navegadores (Chrome, Edge)', 'Correio Eletrônico e Protocolos', 'Computação em Nuvem e Ferramentas de Colaboração'],
    'Segurança da Informação': ['Malwares e Pragas Virtuais', 'Antivírus e Firewall', 'Backup e Armazenamento Externo', 'LGPD (Conceitos Básicos)']
  },
  'Legislação Específica': {
    'Geral': ['Resolução nº 554/2010 (Regimento Interno)']
  },
  'Lei Orgânica de Caruaru': {
    'Disposições Preliminares': ['Dos Princípios Fundamentais', 'Da Organização Municipal'],
    'Competências do Município': ['Competência Privativa', 'Competência Comum e Suplementar', 'Vedações'],
    'Poder Legislativo': ['Câmara Municipal', 'Vereadores (Inviolabilidade, Impedimentos)', 'Processo Legislativo', 'Fiscalização Contábil e Financeira'],
    'Poder Executivo': ['Prefeito e Vice-Prefeito', 'Atribuições e Responsabilidades', 'Auxiliares do Prefeito'],
    'Administração Pública': ['Disposições Gerais', 'Servidores Públicos', 'Bens Municipais', 'Obras e Serviços Municipais'],
    'Tributação e Orçamento': ['Tributos Municipais', 'Receitas e Despesas', 'Orçamento (PPA, LDO, LOA)'],
    'Ordem Econômica e Social': ['Desenvolvimento Urbano', 'Saúde', 'Educação e Cultura', 'Assistência Social', 'Meio Ambiente'],
  },
  'Administração Pública': {
    'Gestão Pública': ['Conceitos Básicos', 'Eficiência, Eficácia e Efetividade', 'Novas Tecnologias na Gestão'],
    'Organização e Processos': ['Estruturas Organizacionais', 'Cultura e Clima Organizacional', 'Gestão por Processos'],
    'Gestão de Pessoas': ['Motivação e Liderança', 'Comunicação Organizacional', 'Gestão de Conflitos'],
    'Ética no Serviço Público': ['Código de Ética', 'Transparência e Lei de Acesso à Informação', 'Accountability']
  },
  'Noções de Arquivologia': {
    'Conceitos Fundamentais': ['Definição e Tipos de Arquivos', 'Ciclo Vital dos Documentos (Teoria das Três Idades)', 'Classificação de Documentos'],
    'Gestão de Documentos': ['Protocolo (Recebimento, Registro, Autuação)', 'Expedição e Tramitação', 'Arquivamento'],
    'Preservação e Acesso': ['Tabela de Temporalidade', 'Acondicionamento e Armazenamento', 'Gestão de Documentos Eletrônicos']
  },
  'Noções de Direito Constitucional': {
    'Teoria Geral': ['Conceito e Classificação das Constituições', 'Poder Constituinte', 'Princípios Fundamentais'],
    'Direitos e Garantias': ['Direitos Individuais e Coletivos (Art. 5º)', 'Direitos Sociais', 'Nacionalidade e Direitos Políticos'],
    'Organização do Estado': ['Organização Político-Administrativa', 'A União', 'Os Estados Federados', 'Os Municípios (Art. 29 a 31)'],
    'Organização dos Poderes': ['Poder Legislativo (Estrutura e Funcionamento)', 'Processo Legislativo', 'Poder Executivo e Judiciário'],
    'Fiscalização e Controle': ['Tribunais de Contas', 'Ministério Público', 'Controle de Constitucionalidade']
  },
  'Noções de Direito Administrativo': {
    'Fundamentos': ['Estado, Governo e Administração Pública', 'Princípios da Administração (LIMPE)', 'Poderes Administrativos'],
    'Organização Administrativa': ['Administração Direta e Indireta', 'Autarquias e Fundações', 'Empresas Públicas e Sociedades de Economia Mista'],
    'Atos Administrativos': ['Conceito, Requisitos e Atributos', 'Classificação e Espécies', 'Invalidação (Revogação e Anulação)'],
    'Licitações e Contratos': ['Nova Lei de Licitações (Lei 14.133/21)', 'Princípios e Modalidades', 'Dispensa e Inexigibilidade'],
    'Agentes Públicos': ['Cargo, Emprego e Função Pública', 'Concurso Público', 'Regime Jurídico Único'],
    'Responsabilidade e Controle': ['Responsabilidade Civil do Estado', 'Lei de Improbidade Administrativa (Lei 8.429/92)']
  },

  // --- Matérias do ENEM / Geral ---
  'Medicina': {
    'Saúde Coletiva e SUS': ['Princípios e Diretrizes do SUS', 'Legislação (Lei 8.080/90, Lei 8.142/90)', 'Redes de Atenção à Saúde (RAS)', 'Atenção Primária à Saúde da Saúde (APS)', 'Vigilância em Saúde (Epidemiológica, Sanitária, Ambiental)', 'Políticas Nacionais de Saúde'],
    'Ciclo Básico': ['Anatomia Humana', 'Fisiologia', 'Bioquímica Médica', 'Histologia e Biologia Celular', 'Embriologia', 'Genética Médica', 'Farmacologia Básica', 'Patologia Geral', 'Microbiologia e Imunologia'],
    'Cardiologia': ['Hipertensão Arterial Sistêmica', 'Insuficiência Cardíaca', 'Doença Coronariana', 'Arritmias', 'Valvopatias'],
    'Pneumologia': ['Asma e DPOC', 'Pneumonias', 'Tuberculose', 'Tromboembolismo Pulmonar', 'Câncer de Pulmão'],
    'Gastroenterologia': ['Doença do Refluxo Gastroesofágico', 'Úlcera Péptica', 'Doenças Inflamatórias Intestinais', 'Hepatites Virais', 'Cirrose Hepática'],
    'Nefrologia': ['Lesão Renal Aguda', 'Doença Renal Crônica', 'Glomerulopatias', 'Distúrbios Hidroeletrolíticos e Ácido-Base'],
    'Endocrinologia': ['Diabetes Mellitus', 'Doenças da Tireoide', 'Obesidade e Síndrome Metabólica', 'Doenças da Adrenal'],
    'Neurologia': ['Acidente Vascular Cerebral (AVC)', 'Cefaleias', 'Epilepsia', 'Doenças Neurodegenerativas (Alzheimer, Parkinson)'],
    'Reumatologia': ['Artrite Reumatoide', 'Lúpus Eritematoso Sistêmico', 'Gota', 'Fibromialgia'],
    'Infectologia': ['HIV/AIDS', 'Dengue, Zika e Chikungunya', 'Infecções Sexualmente Transmissíveis (ISTs)', 'Malária'],
    'Ginecologia e Obstetrícia': ['Ciclo Menstrual e Anticoncepção', 'Assistência Pré-Natal', 'Parto e Puerpério', 'Principais Cânceres Ginecológicos', 'Sangramento Uterino Anormal'],
    'Pediatria': ['Puericultura e Imunizações', 'Doenças Exantemáticas', 'Infecções de Vias Aéreas', 'Gastroenterites e Desidratação', 'Crescimento e Desenvolvimento'],
    'Cirurgia Geral': ['Abdome Agudo', 'Trauma (ATLS)', 'Hérnias da Parede Abdominal', 'Doenças da Vesícula Biliar', 'Preparo e Risco Cirúrgico'],
    'Psiquiatria': ['Transtornos de Ansiedade', 'Transtornos Depressivos', 'Transtorno Bipolar', 'Esquizofrenia', 'Dependência Química'],
    'Ética Médica e Bioética': ['Código de Ética Médica', 'Relação Médico-Paciente', 'Autonomia, Beneficência, Não-maleficência, Justiça', 'Terminalidade da Vida'],
  },
  'Matemática': {
    'Assuntos Mais Cobrados no ENEM': ['Matemática Básica (35%)', 'Estatística (11,7%)', 'Geometria Espacial (11,2%)', 'Funções (11%)', 'Geometria Plana (8,3%)'],
    'Matemática Básica': ['Operações Fundamentais (+, -, *, /)', 'Frações e Números Decimais', 'Potenciação e Radiciação', 'Razão e Proporção', 'Regra de Três Simples e Composta'],
    'Conjuntos e Funções': ['Teoria dos Conjuntos', 'Função do 1º Grau', 'Função do 2º Grau', 'Função Modular', 'Função Exponencial', 'Função Logarítmica'],
    'Trigonometria': ['Relações no Triângulo Retângulo', 'Ciclo Trigonométrico', 'Funções Trigonométricas', 'Equações e Inequações Trigonométricas'],
    'Geometria': ['Geometria Plana (Áreas e Perímetros)', 'Geometria Espacial (Volumes e Áreas)', 'Geometria Analítica (Ponto, Reta, Circunferência)'],
    'Sequências e Análise Combinatória': ['Progressão Aritmética (PA)', 'Progressão Geométrica (PG)', 'Análise Combinatória', 'Probabilidade', 'Binômio de Newton'],
    'Polinômios e Números Complexos': ['Operações com Polinômios', 'Equações Polinomiais', 'Números Complexos'],
    'Estatística': ['Medidas de Tendência Central (Média, Moda, Mediana)', 'Medidas de Dispersão (Variância, Desvio Padrão)', 'Gráficos e Tabelas'],
    'Matemática Financeira': ['Porcentagem', 'Juros Simples e Compostos', 'Descontos e Acréscimos'],
  },
  'Português': {
    'Assuntos Mais Cobrados no ENEM': ['Gêneros Textuais (44,8%)', 'Introdução à Língua Portuguesa (22,4%)', 'Linguagem Culta e Coloquial (10%)', 'Funções da Linguagem (6,2%)', 'Texto e Contexto (5,8%)'],
    'Gramática': ['Fonologia e Ortografia', 'Acentuação Gráfica', 'Morfologia (Classes de Palavras)', 'Sintaxe (Período Simples e Composto)', 'Pontuação', 'Crase', 'Concordância Verbal e Nominal', 'Regência Verbal e Nominal'],
    'Semântica': ['Sinonímia e Antonímia', 'Homonímia e Paronímia', 'Polissemia e Ambiguidade', 'Denotação e Conotação'],
  },
  'Interpretação Textual': {
    'Fundamentos da Interpretação': ['Leitura Atenta (Scanning e Skimming)', 'Identificação da Ideia Central', 'Localização de Informações Explícitas', 'Inferência e Pressuposição'],
    'Gêneros e Tipologias': ['Textos Narrativos (Conto, Crônica)', 'Textos Descritivos', 'Textos Dissertativo-Argumentativos (Artigo de Opinião)', 'Textos Expositivos (Notícia, Verbete)', 'Textos Injuntivos (Receita, Manual)', 'Textos Híbridos (Charges, Tiras, Publicidade)'],
    'Recursos Linguísticos': ['Coesão e Coerência', 'Funções da Linguagem', 'Variações Linguísticas (Norma Padrão e Coloquial)', 'Figuras de Linguagem (Metáfora, Ironia, etc.)'],
    'Análise do Discurso': ['Polissemia e Ambiguidade', 'Denotação e Conotação', 'Intertextualidade (Paráfrase, Paródia)', 'Argumentação e Persuasão'],
  },
  'Biologia': {
    'Assuntos Mais Cobrados no ENEM': ['Ecologia (25,2%)', 'Botânica (8,2%)', 'Fisiologia Humana (8,2%)', 'Bioenergética (7,5%)', 'Zoologia (6,8%)'],
    'Citologia e Histologia': ['Membrana Plasmática e Transportes', 'Citoplasma e Organelas', 'Núcleo e Divisão Celular', 'Tecidos Animais'],
    'Bioquímica': ['Água e Sais Minerais', 'Carboidratos, Lipídios e Proteínas', 'Vitamina', 'Enzimas', 'Ácidos Nucleicos (DNA e RNA)'],
    'Genética e Evolução': ['Leis de Mendel', 'Heredogramas', 'Sistema ABO e Rh', 'Engenharia Genética', 'Teorias Evolutivas (Lamarck, Darwin, Neodarwinismo)', 'Especiação'],
    'Ecologia': ['Conceitos Fundamentais', 'Cadeias e Teias Alimentares', 'Relações Ecológicas', 'Ciclos Biogeoquímicos', 'Biomas', 'Impactos Ambientais e Desequilíbrios'],
    'Fisiologia Humana': ['Sistema Digestório', 'Sistema Respiratório', 'Sistema Circulatório', 'Sistema Excretor', 'Sistema Nervoso', 'Sistema Endócrino', 'Sistema Imunológico'],
    'Reinos e Seres Vivos': ['Vírus', 'Reino Monera', 'Reino Protoctista (Algas e Protozoários)', 'Reino Fungi', 'Reino Plantae (Botânica)', 'Reino Animalia (Zoologia)'],
  },
  'História': {
    'Assuntos Mais Cobrados no ENEM': ['Brasil Colônia (13%)', 'Idade Moderna (12,3%)', 'Tempo Presente (10,9%)', 'Estado Novo e Populismo (9,4%)', 'Idade Média (8%)'],
    'História do Brasil': ['Brasil Pré-Colonial e Colonial', 'Período Joanino e Independência', 'Primeiro e Segundo Reinado', 'República Velha', 'Era Vargas', 'República Populista (1945-1964)', 'Ditadura Militar (1945-1985)', 'Nova República'],
    'História Geral': ['Pré-História e Antiguidade Oriental', 'Antiguidade Clássica (Grécia e Roma)', 'Idade Média (Alta e Baixa)', 'Idade Moderna (Absolutismo, Mercantilismo, Renascimento, Reformas)', 'Revoluções Burguesas (Inglesa, Industrial, Francesa)', 'Era Napoleônica e Século XIX', 'Primeira e Segunda Guerra Mundial', 'Guerra Fria e Mundo Contemporâneo'],
  },
  'Geografia': {
    'Assuntos Mais Cobrados no ENEM': ['Geopolítica (12,3%)', 'Espaço Agrário (11,6%)', 'Espaço Urbano (11%)', 'Geologia (7,1%)', 'Domínios Morfoclimáticos (5,2%)'],
    'Geografia Geral': ['Cartografia e Orientação', 'Geologia e Relevo', 'Clima e Vegetação', 'Hidrografia', 'Geopolítica e Globalização', 'População Mundial e Migrações', 'Fontes de Energia e Questões Ambientais'],
    'Geografia do Brasil': ['Formação Territorial', 'Domínios Morfoclimáticos', 'Bacias Hidrográficas', 'População Brasileira (Formação, Distribuição, Estrutura)', 'Urbanização e Industrialização', 'Agropecuária', 'Regionalização do Espaço Brasileiro'],
  },
  'Física': {
    'Assuntos Mais Cobrados no ENEM': ['Eletrodinâmica (20%)', 'Termologia (16,4%)', 'Ondulatória (13,3%)', 'Cinemática (10,9%)', 'Óptica (9,1%)'],
    'Mecânica': ['Cinemática Escalar e Vetorial', 'Leis de Newton e Aplicações', 'Trabalho, Potência e Energia', 'Impulso, Quantidade de Movimento e Colisões', 'Estática e Hidrostática', 'Gravitação Universal'],
    'Termologia': ['Termometria', 'Calorimetria e Propagação de Calor', 'Estudo dos Gases', 'Termodinâmica'],
    'Óptica': ['Princípios da Óptica Geométrica', 'Reflexão da Luz (Espelhos Planos e Esféricos)', 'Refração da Luz (Lentes e Dioptros)'],
    'Ondulatória': ['Fenômenos Ondulatórios', 'Acústica', 'Ondas Eletromagnéticas'],
    'Eletricidade': ['Eletrostática (Força, Campo, Potencial)', 'Eletrodinâmica (Corrente, Resistores, Geradores, Receptores)', 'Eletromagnetismo (Campo Magnético, Indução)'],
    'Física Moderna': ['Noções de Relatividade Restrita', 'Noções de Física Quântica (Efeito Fotoelétrico)'],
  },
  'Química': {
    'Assuntos Mais Cobrados no ENEM': ['Moléculas e Propriedades (8,8%)', 'Separação de Misturas (6,6%)', 'Funções Inorgânicas (6,6%)', 'Hidrocarbonetos (6,6%)', 'Átomos (6,6%)', 'Eletroquímica (6,6%)'],
    'Química Geral': ['Modelos Atômicos e Estrutura', 'Tabela Periódica e Propriedades', 'Ligações Químicas (Iônica, Covalente, Metálica)', 'Funções Inorgânicas (Ácidos, Bases, Sais, Óxidos)', 'Reações Químicas e Balanceamento', 'Grandezas Químicas (Mol, Massa Molar)', 'Estequiometria'],
    'Físico-Química': ['Soluções e Concentrações', 'Propriedades Coligativas', 'Termoquímica', 'Cinética Química', 'Equilíbrio Químico (Iônico e Molecular)', 'Eletroquímica (Pilhas e Eletrólise)', 'Radioatividade'],
    'Química Orgânica': ['Introdução e Hidrocarbonetos', 'Funções Orgânicas Oxigenadas e Nitrogenadas', 'Isomeria (Plana e Espacial)', 'Reações Orgânicas (Adição, Substituição, Eliminação)', 'Polímeros e Biomoléculas'],
  },
  'Filosofia': {
    'Assuntos Mais Cobrados no ENEM': ['Filosofia Antiga (23,3%)', 'Filosofia Moderna (16,7%)', 'Ética e Moral (13,3%)', 'Filosofia Contemporânea (10%)', 'Filosofia Política (6,7%)', 'Existencialismo (6,7%)'],
    'Filosofia Antiga': ['Mito e Filosofia (Pré-socráticos)', 'Sócrates e os Sofistas', 'Platão (Teoria das Ideias)', 'Aristóteles (Lógica, Ética, Política)', 'Filosofia Helenística (Estoicismo, Epicurismo)'],
    'Filosofia Medieval': ['Patrística (Santo Agostinho)', 'Escolástica (São Tomás de Aquino)'],
    'Filosofia Moderna': ['Racionalismo (Descartes, Spinoza, Leibniz)', 'Empirismo (Locke, Berkeley, Hume)', 'Contratualismo (Hobbes, Locke, Rousseau)', 'Iluminismo e Criticismo (Kant)'],
    'Filosofia Contemporânea': ['Idealismo Alemão (Hegel)', 'Utilitarismo (Bentham, Mill)', 'Marxismo', 'Existencialismo (Kierkegaard, Sartre)', 'Escola de Frankfurt', 'Filosofia da Ciência (Popper, Kuhn)'],
  },
  'Sociologia': {
    'Assuntos Mais Cobrados no ENEM': ['Cultura e Sociedade (18,4%)', 'Movimentos Sociais (17,3%)', 'Estado e Cidadania (15,3%)', 'Sociologia Brasileira (14,3%)', 'Sociologia Contemporânea (10,2%)'],
    'Conceitos Sociológicos Fundamentais': ['O que é Sociologia?', 'Fato Social (Durkheim)', 'Ação Social (Weber)', 'Luta de Classes (Marx)'],
    'Cultura, Identidade e Socialização': ['Cultura e Ideologia', 'Indústria Cultural', 'Processo de Socialização', 'Identidade e Diversidade'],
    'Trabalho, Produção e Sociedade': ['Divisão Social do Trabalho', 'Modos de Produção', 'Mundo do Trabalho Contemporâneo'],
    'Poder, Política e Movimentos Sociais': ['Estado, Governo e Sociedade', 'Democracia e Cidadania', 'Movimentos Sociais'],
    'Desigualdade e Estratificação Social': ['Classes Sociais', 'Desigualdades de Gênero e Raça', 'Globalização e Desigualdade'],
  },
  'Literatura': {
    'Assuntos Mais Cobrados no ENEM': ['Literatura Contemporânea (31,9%)', 'Modernismo (21,5%)', 'Artes (20%)'],
    'Teoria Literária': ['Gêneros Literários', 'Figuras de Linguagem', 'Elementos da Narrativa', 'Versificação'],
    'Literatura Portuguesa': ['Trovadorismo', 'Humanismo', 'Classicismo', 'Barroco', 'Arcadismo', 'Romantismo', 'Realismo/Naturalismo', 'Simbolismo', 'Modernismo (Orpheu e Presença)'],
    'Literatura Brasileira': ['Quinhentismo e Barroco', 'Arcadismo', 'Romantismo (Poesia e Prosa)', 'Realismo/Naturalismo e Parnasianismo', 'Simbolismo e Pré-Modernismo', 'Modernismo (1ª, 2ª e 3ª Fases)', 'Literatura Contemporânea'],
  },
  'Inglês': {
    'Assuntos Mais Cobrados no ENEM': ['Gramática e Interpretação (93,6%)', 'Vocabulário (6,4%)'],
    'Grammar': ['Verb Tenses (Simple, Continuous, Perfect)', 'Modal Verbs', 'Prepositions (In, On, At)', 'Conditionals (If Clauses)', 'Reported Speech', 'Passive Voice', 'Gerunds and Infinitives'],
    'Vocabulary': ['Common Idioms and Expressions', 'Phrasal Verbs', 'Connectors and Linking Words', 'False Cognates'],
    'Reading Comprehension': ['Skimming and Scanning', 'Identifying Main Ideas and Details', 'Inference and Context Clues'],
  },
  'Espanhol': {
    'Assuntos Mais Cobrados no ENEM': ['Gramática (90%)', 'Vocabulário (10%)'],
    'Gramática': ['Verbos (Presente, Pretéritos, Futuro)', 'Pronomes', 'Artigos e Contrações', 'Preposições', 'Conjunções'],
    'Vocabulário': ['Falsos Cognatos', 'Sinônimos e Antônimos', 'Expressões Idiomáticas'],
    'Interpretação de Texto': ['Leitura de Notícias e Artigos', 'Análise de Charges e Tiras', 'Compreensão de Textos Literários'],
  },
  'Redação': {
    'Eixos Temáticos': ['Direitos Humanos e Cidadania', 'Meio Ambiente e Sustentabilidade', 'Tecnologia e Sociedade', 'Cultura e Arte', 'Saúde e Bem-estar', 'Educação', 'Segurança Pública e Violência'],
    'Técnicas de Escrita': ['Conectivos', 'Regras de Acentuação', 'Agentes de Intervenção (CIVES)', 'Tipos de Tópico Frasal'],
    'Repertório Sociocultural': ['Repertórios Históricos', 'Repertórios Filosóficos/Sociológicos', 'Repertórios de Cultura Pop', 'Repertórios Literários', 'Dados e Estatísticas Atuais (Brasil 2025)'],
  },
  'Atualidades': {
    'Brasil': ['Política Interna', 'Economia Brasileira', 'Questões Sociais', 'Segurança Pública', 'Meio Ambiente no Brasil'],
    'Mundo': ['Geopolítica Global', 'Conflitos Internacionais', 'Relações Internacionais do Brasil', 'Crises Humanitárias'],
    'Tecnologia e Inovação': ['Inteligência Artificial', 'Transformação Digital', 'Cibersegurança', 'Inovações Científicas'],
    'Meio Ambiente': ['Mudanças Climáticas (COP)', 'Crise Hídrica e Energética', 'Desenvolvimento Sustentável'],
    'Economia': ['Inflação e Juros', 'Mercado de Trabalho', 'Criptomoedas e Moedas Digitais', 'Comércio Internacional'],
    'Sociedade e Cultura': ['Movimentos Sociais', 'Direitos Humanos', 'Cultura Pop e Mídia', 'Saúde Pública Global'],
  },
  'Constituição Federal': {
    'Princípios Fundamentais': ['Art. 1º ao 4º'],
    'Direitos e Garantias Fundamentais': ['Direitos e Deveres Individuais e Coletivos (Art. 5º)', 'Direitos Sociais (Art. 6º ao 11)', 'Nacionalidade (Art. 12 e 13)', 'Direitos Políticos (Art. 14 ao 16)'],
    'Organização do Estado': ['União, Estados, DF e Municípios', 'Intervenção Federal e Estadual', 'Administração Pública (Art. 37 ao 41)'],
    'Organização dos Poderes': ['Poder Legislativo', 'Processo Legislativo', 'Poder Executivo', 'Poder Judiciário'],
    'Defesa do Estado e das Instituições Democráticas': ['Estado de Defesa e Estado de Sítio', 'Forças Armadas', 'Segurança Pública (Art. 144)'],
    'Ordem Social': ['Seguridade Social (Saúde, Previdência, Assistência)', 'Educação, Cultura e Desporto', 'Meio Ambiente (Art. 225)', 'Família, Criança, Adolescente, Jovem e Idoso'],
  },
  'Tecnologia e Sociedade': {
    'Fundamentos da Era Digital': ['Revolução Digital e Sociedade da Informação', 'Internet e World Wide Web', 'Inclusão e Exclusão Digital', 'Hardware, Software e Redes'],
    'Inteligência Artificial e Automação': ['Conceitos de IA (Machine Learning, Deep Learning)', 'Aplicações da IA no cotidiano', 'Ética em IA (Vieses, Transparência)', 'Automação e o Futuro do Trabalho'],
    'Redes Sociais e Comportamento Online': ['Impacto das redes sociais na comunicação', 'Bolhas informacionais e câmaras de eco', 'Fake News e Desinformação', 'Privacidade e Vigilância Digital'],
    'Cibersegurança e Crimes Digitais': ['Tipos de Ameaças (Phishing, Malware, Ransomware)', 'Proteção de Dados Pessoais (LGPD)', 'Cyberbullying e Discurso de Ódio', 'Segurança da Informação'],
    'Inovações e Tendências': ['Internet das Coisas (IoT)', 'Computação em Nuvem (Cloud Computing)', 'Blockchain e Criptomoedas', 'Realidade Virtual e Aumentada'],
  },
  'Artes': {
    'História da Arte': ['Arte na Antiguidade', 'Arte Medieval', 'Renascimento', 'Barroco e Rococó', 'Neoclassicismo e Romantismo'],
    'Arte Moderna e Contemporânea': ['Vanguardas Europeias (Cubismo, Futurismo, etc.)', 'Semana de Arte Moderna de 1922', 'Arte Contemporânea Brasileira', 'Pop Art'],
    'Artes Visuais e Linguagens': ['Elementos da Linguagem Visual', 'Arquitetura e Urbanismo', 'Fotografia e Cinema', 'Artes Digitais'],
    'Patrimônio e Cultura': ['Patrimônio Histórico e Cultural', 'Cultura Popular e Folclore', 'Museus e Centros Culturais']
  },
  'Ciências da Natureza': { 'Assuntos Mais Cobrados no ENEM': [] },
  'Ciências Humanas': { 'Assuntos Mais Cobrados no ENEM': [] },
  'Linguagens e Códigos': { 'Assuntos Mais Cobrados no ENEM': [] },
};

export const defaultTheme = themes['Redação'];
