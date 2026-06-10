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
  'Matemática', 'Redação',
  'Medicina', 'Português', 'Interpretação Textual', 'Biologia', 'Inglês', 'Espanhol', 'Geografia', 'História', 'Sociologia', 'Filosofia', 'Literatura', 'Química', 'Física', 'Artes',
  'Atualidades', 'Constituição Federal', 'Tecnologia e Sociedade',
  'Raciocínio Lógico-Matemático', 'Noções de Informática', 'Lei Orgânica de Caruaru', 'Legislação Específica', 'Administração Pública', 'Noções de Arquivologia', 'Noções de Direito Constitucional', 'Noções de Direito Administrativo'
];

export const subjectsEnem = [
  'Matemática', 'Redação',
  'Biologia', 'Física', 'Química', 
  'História', 'Geografia', 'Filosofia', 'Sociologia',
  'Português', 'Artes', 'Literatura', 'Inglês', 'Espanhol'
];

export const subjectsConcurso = [
  'Português', 'Raciocínio Lógico-Matemático', 'Matemática', 'Noções de Informática', 'Lei Orgânica de Caruaru', 'Legislação Específica', 'Administração Pública', 'Noções de Arquivologia', 'Noções de Direito Constitucional', 'Noções de Direito Administrativo'
];

export const LAW_SUBJECTS = [
  'Constituição Federal',
  'Lei Orgânica de Caruaru',
  'Legislação Específica',
  'Noções de Direito Constitucional',
  'Noções de Direito Administrativo'
];

export const isLawSubject = (subject: string): boolean => {
  if (!subject) return false;
  return LAW_SUBJECTS.includes(subject) || 
         subject.toLowerCase().includes('direito') || 
         subject.toLowerCase().includes('lei') || 
         subject.toLowerCase().includes('legislação');
};



export const ENEM_TOPICS: Record<string, string[]> = {
  'Matemática': ['Matemática Básica (35%)', 'Estatística (11,7%)', 'Geometria Espacial (11,2%)', 'Funções (11%)', 'Geometria Plana (8,3%)'],
  'Português': ['Gêneros Textuais (44,8%)', 'Introdução à Língua Portuguesa (22,4%)', 'Linguagem Culta e Coloquial (10%)', 'Funções da Linguagem (6,2%)', 'Texto e Contexto (5,8%)'],
  'Biologia': ['Ecologia (25,2%)', 'Botânica (8,2%)', 'Fisiologia Humana (8,2%)', 'Bioenergética (7,5%)', 'Zoologia (6,8%)'],
  'História': ['Brasil Colônia (13%)', 'Idade Moderna (12,3%)', 'Tempo Presente (10,9%)', 'Estado Novo e Populismo (9,4%)', 'Idade Média (8%)'],
  'Geografia': ['Geopolítica (12,3%)', 'Espaço Agrário (11,6%)', 'Espaço Urbano (11%)', 'Geologia (7,1%)', 'Domínios Morfoclimáticos (5,2%)'],
  'Física': ['Eletrodinâmica (20%)', 'Termologia (16,4%)', 'Ondulatória (13,3%)', 'Cinemática (10,9%)', 'Óptica (9,1%)'],
  'Química': ['Moléculas e Propriedades (8,8%)', 'Separação de Misturas (6,6%)', 'Funções Inorgânicas (6,6%)', 'Hidrocarbonetos (6,6%)', 'Átomos (6,6%)', 'Eletroquímica (6,6%)'],
  'Filosofia': ['Filosofia Antiga (23,3%)', 'Filosofia Moderna (16,7%)', 'Ética e Moral (13,3%)', 'Filosofia Contemporânea (10%)', 'Filosofia Política (6,7%)', 'Existencialismo (6,7%)'],
  'Sociologia': ['Cultura e Sociedade (18,4%)', 'Movimentos Sociais (17,3%)', 'Estado e Cidadania (15,3%)', 'Sociologia Brasileira (14,3%)', 'Sociologia Contemporânea (10,2%)'],
  'Literatura': ['Literatura Contemporânea (31,9%)', 'Modernismo (21,5%)', 'Artes (20%)'],
  'Inglês': ['Gramática e Interpretação (93,6%)', 'Vocabulário (6,4%)'],
  'Espanhol': ['Gramática (90%)', 'Vocabulário (10%)'],
};

export const BANCAS_TOPICS: Record<string, Record<string, string[]>> = {
  'FGV': {
    'Português': ['Interpretação e Compreensão de Texto (45%)', 'Morfossemântica e Classes de Palavras (15%)', 'Sintaxe de Período Simples e Composto (10%)', 'Concordância, Regência e Crase (15%)', 'Pontuação e Reescrita de Frases (15%)'],
    'Raciocínio Lógico-Matemático': ['Lógica Proposicional e Equivalências (15%)'],
    'Matemática': ['Porcentagem e Regra de Três (25%)', 'Análise Combinatória e Probabilidade (30%)', 'Matemática Financeira (15%)', 'Equações, Funções e Geometria Básica (15%)'],
    'Noções de Informática': ['Planilhas Eletrônicas (Excel e Calc) (35%)', 'Segurança da Informação e Malwares (20%)', 'Redes de Computadores e Internet (15%)', 'Sistemas Operacionais (Windows e Linux) (15%)', 'Editores de Texto (Word e Writer) (15%)'],
    'Noções de Direito Constitucional': ['Direitos e Garantias Fundamentais (Art. 5º) (25%)', 'Administração Pública na CF (Art. 37-41) (20%)'],
    'Noções de Direito Administrativo': ['Administração Pública na CF (Art. 37-41) (20%)', 'Atos e Poderes Administrativos (25%)', 'Licitações e Contratos (Lei 14.133) (20%)', 'Improbidade Administrativa (10%)'],
    'Administração Pública': ['Evolução e Modelos de Gestão Pública (35%)'],
    'Noções de Arquivologia': ['Ciclo Vital dos Documentos (Teoria das 3 Idades) (25%)', 'Princípios Arquivísticos e Temporalidade (40%)'],
    'Lei Orgânica de Caruaru': ['Regime Disciplinar, Proibições e PAD (Estatuto do Servidor) (40%)', 'Competências do Município e Atribuições da Câmara Municipal (35%)', 'Processo Legislativo e Trâmite de Leis Locais (25%)'],
    'Legislação Específica': ['Regime Disciplinar, Proibições e PAD (Estatuto do Servidor) (40%)', 'Competências do Município e Atribuições da Câmara Municipal (35%)', 'Processo Legislativo e Trâmite de Leis Locais (25%)']
  },
  'CESPE': {
    'Português': ['Interpretação e Compreensão de Texto (35%)', 'Morfossemântica e Classes de Palavras (10%)', 'Sintaxe de Período Simples e Composto (20%)', 'Concordância, Regência e Crase (15%)', 'Pontuação e Reescrita de Frases (20%)'],
    'Raciocínio Lógico-Matemático': ['Lógica Proposicional e Equivalências (40%)'],
    'Matemática': ['Porcentagem e Regra de Três (15%)', 'Análise Combinatória e Probabilidade (15%)', 'Matemática Financeira (20%)', 'Equações, Funções e Geometria Básica (10%)'],
    'Noções de Informática': ['Planilhas Eletrônicas (Excel e Calc) (15%)', 'Segurança da Informação e Malwares (35%)', 'Redes de Computadores e Internet (25%)', 'Sistemas Operacionais (Windows e Linux) (15%)', 'Editores de Texto (Word e Writer) (10%)'],
    'Noções de Direito Constitucional': ['Direitos e Garantias Fundamentais (Art. 5º) (30%)', 'Administração Pública na CF (Art. 37-41) (20%)'],
    'Noções de Direito Administrativo': ['Administração Pública na CF (Art. 37-41) (20%)', 'Atos e Poderes Administrativos (20%)', 'Licitações e Contratos (Lei 14.133) (20%)', 'Improbidade Administrativa (10%)'],
    'Administração Pública': ['Evolução e Modelos de Gestão Pública (40%)'],
    'Noções de Arquivologia': ['Ciclo Vital dos Documentos (Teoria das 3 Idades) (20%)', 'Princípios Arquivísticos e Temporalidade (40%)'],
    'Lei Orgânica de Caruaru': ['Regime Disciplinar, Proibições e PAD (Estatuto do Servidor) (40%)', 'Competências do Município e Atribuições da Câmara Municipal (35%)', 'Processo Legislativo e Trâmite de Leis Locais (25%)'],
    'Legislação Específica': ['Regime Disciplinar, Proibições e PAD (Estatuto do Servidor) (40%)', 'Competências do Município e Atribuições da Câmara Municipal (35%)', 'Processo Legislativo e Trâmite de Leis Locais (25%)']
  },
  'CESGRANRIO': {
    'Português': ['Interpretação e Compreensão de Texto (30%)', 'Morfossemântica e Classes de Palavras (15%)', 'Sintaxe de Período Simples e Composto (15%)', 'Concordância, Regência e Crase (25%)', 'Pontuação e Reescrita de Frases (15%)'],
    'Raciocínio Lógico-Matemático': ['Lógica Proposicional e Equivalências (15%)'],
    'Matemática': ['Porcentagem e Regra de Três (25%)', 'Análise Combinatória e Probabilidade (20%)', 'Matemática Financeira (25%)', 'Equações, Funções e Geometria Básica (15%)'],
    'Noções de Informática': ['Planilhas Eletrônicas (Excel e Calc) (25%)', 'Segurança da Informação e Malwares (25%)', 'Redes de Computadores e Internet (20%)', 'Sistemas Operacionais (Windows e Linux) (15%)', 'Editores de Texto (Word e Writer) (15%)'],
    'Noções de Direito Constitucional': ['Direitos e Garantias Fundamentais (Art. 5º) (35%)', 'Administração Pública na CF (Art. 37-41) (25%)'],
    'Noções de Direito Administrativo': ['Administração Pública na CF (Art. 37-41) (25%)', 'Atos e Poderes Administrativos (15%)', 'Licitações e Contratos (Lei 14.133) (15%)', 'Improbidade Administrativa (10%)'],
    'Administração Pública': ['Evolução e Modelos de Gestão Pública (25%)'],
    'Noções de Arquivologia': ['Ciclo Vital dos Documentos (Teoria das 3 Idades) (30%)', 'Princípios Arquivísticos e Temporalidade (45%)'],
    'Lei Orgânica de Caruaru': ['Regime Disciplinar, Proibições e PAD (Estatuto do Servidor) (40%)', 'Competências do Município e Atribuições da Câmara Municipal (35%)', 'Processo Legislativo e Trâmite de Leis Locais (25%)'],
    'Legislação Específica': ['Regime Disciplinar, Proibições e PAD (Estatuto do Servidor) (40%)', 'Competências do Município e Atribuições da Câmara Municipal (35%)', 'Processo Legislativo e Trâmite de Leis Locais (25%)']
  },
  'IBAM': {
    'Português': ['Interpretação e Compreensão de Texto (25%)', 'Morfossemântica e Classes de Palavras (25%)', 'Sintaxe de Período Simples e Composto (20%)', 'Concordância, Regência e Crase (15%)', 'Pontuação e Reescrita de Frases (15%)'],
    'Raciocínio Lógico-Matemático': ['Lógica Proposicional e Equivalências (20%)'],
    'Matemática': ['Porcentagem e Regra de Três (35%)', 'Análise Combinatória e Probabilidade (10%)', 'Matemática Financeira (10%)', 'Equações, Funções e Geometria Básica (25%)'],
    'Noções de Informática': ['Planilhas Eletrônicas (Excel e Calc) (20%)', 'Segurança da Informação e Malwares (15%)', 'Redes de Computadores e Internet (15%)', 'Sistemas Operacionais (Windows e Linux) (25%)', 'Editores de Texto (Word e Writer) (25%)', 'Hardware e Arquitetura de Computadores (10%)', 'Algoritmos e Lógica de Programação'],
    'Noções de Direito Constitucional': ['Direitos e Garantias Fundamentais (Art. 5º) (40%)', 'Administração Pública na CF (Art. 37-41) (25%)'],
    'Noções de Direito Administrativo': ['Administração Pública na CF (Art. 37-41) (25%)', 'Atos e Poderes Administrativos (15%)', 'Licitações e Contratos (Lei 14.133) (15%)', 'Improbidade Administrativa (5%)'],
    'Administração Pública': ['Evolução e Modelos de Gestão Pública (20%)'],
    'Noções de Arquivologia': ['Ciclo Vital dos Documentos (Teoria das 3 Idades) (35%)', 'Princípios Arquivísticos e Temporalidade (45%)'],
    'Lei Orgânica de Caruaru': ['Regime Disciplinar, Proibições e PAD (Estatuto do Servidor) (40%)', 'Competências do Município e Atribuições da Câmara Municipal (35%)', 'Processo Legislativo e Trâmite de Leis Locais (25%)'],
    'Legislação Específica': ['Regime Disciplinar, Proibições e PAD (Estatuto do Servidor) (40%)', 'Competências do Município e Atribuições da Câmara Municipal (35%)', 'Processo Legislativo e Trâmite de Leis Locais (25%)']
  }
};

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
  'Medicina': { bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-900 dark:text-teal-100', accent: 'text-teal-600 dark:text-teal-400', border: 'border-teal-300 dark:border-teal-700/50', ring: 'ring-teal-400 dark:ring-teal-500/50', button: 'bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-teal-100 dark:hover:bg-teal-900/40', cardFront: 'bg-teal-100 dark:bg-teal-900/40', cardBack: 'bg-teal-200 dark:bg-teal-800/40' },
  'Matemática': { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-900 dark:text-blue-100', accent: 'text-blue-600 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-700/50', ring: 'ring-blue-400 dark:ring-blue-500/50', button: 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900/40', cardFront: 'bg-blue-100 dark:bg-blue-900/40', cardBack: 'bg-blue-200 dark:bg-blue-800/40' },
  'Português': { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-900 dark:text-yellow-100', accent: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-300 dark:border-yellow-700/50', ring: 'ring-yellow-400 dark:ring-yellow-500/50', button: 'bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/40', cardFront: 'bg-yellow-100 dark:bg-yellow-900/40', cardBack: 'bg-yellow-200 dark:bg-yellow-800/40' },
  'Biologia': { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-900 dark:text-green-100', accent: 'text-green-600 dark:text-green-400', border: 'border-green-300 dark:border-green-700/50', ring: 'ring-green-400 dark:ring-green-500/50', button: 'bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-green-100 dark:hover:bg-green-900/40', cardFront: 'bg-green-100 dark:bg-green-900/40', cardBack: 'bg-green-200 dark:bg-green-800/40' },
  'Inglês': { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-900 dark:text-red-100', accent: 'text-red-600 dark:text-red-400', border: 'border-red-300 dark:border-red-700/50', ring: 'ring-red-400 dark:ring-red-500/50', button: 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/40', cardFront: 'bg-red-100 dark:bg-red-900/40', cardBack: 'bg-red-200 dark:bg-red-800/40' },
  'Espanhol': { bg: 'bg-lime-50 dark:bg-lime-900/20', text: 'text-lime-900 dark:text-lime-100', accent: 'text-lime-600 dark:text-lime-400', border: 'border-lime-300 dark:border-lime-700/50', ring: 'ring-lime-400 dark:ring-lime-500/50', button: 'bg-lime-500 hover:bg-lime-600 dark:bg-lime-600 dark:hover:bg-lime-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-lime-100 dark:hover:bg-lime-900/40', cardFront: 'bg-lime-100 dark:bg-lime-900/40', cardBack: 'bg-lime-200 dark:bg-lime-800/40' },
  'Geografia': { bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-900 dark:text-teal-100', accent: 'text-teal-600 dark:text-teal-400', border: 'border-teal-300 dark:border-teal-700/50', ring: 'ring-teal-400 dark:ring-teal-500/50', button: 'bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-teal-100 dark:hover:bg-teal-900/40', cardFront: 'bg-teal-100 dark:bg-teal-900/40', cardBack: 'bg-teal-200 dark:bg-teal-800/40' },
  'História': { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-900 dark:text-orange-100', accent: 'text-orange-600 dark:text-orange-400', border: 'border-orange-300 dark:border-orange-700/50', ring: 'ring-orange-400 dark:ring-orange-500/50', button: 'bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-orange-100 dark:hover:bg-orange-900/40', cardFront: 'bg-orange-100 dark:bg-orange-900/40', cardBack: 'bg-orange-200 dark:bg-orange-800/40' },
  'Sociologia': { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-900 dark:text-purple-100', accent: 'text-purple-600 dark:text-purple-400', border: 'border-purple-300 dark:border-purple-700/50', ring: 'ring-purple-400 dark:ring-purple-500/50', button: 'bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-purple-900/40', cardFront: 'bg-purple-100 dark:bg-purple-900/40', cardBack: 'bg-purple-200 dark:bg-purple-800/40' },
  'Filosofia': { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-900 dark:text-indigo-100', accent: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-300 dark:border-indigo-700/50', ring: 'ring-indigo-400 dark:ring-indigo-500/50', button: 'bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40', cardFront: 'bg-indigo-100 dark:bg-indigo-900/40', cardBack: 'bg-indigo-200 dark:bg-indigo-800/40' },
  'Redação': { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-900 dark:text-gray-100', accent: 'text-gray-600 dark:text-gray-400', border: 'border-gray-300 dark:border-gray-700/50', ring: 'ring-gray-400 dark:ring-gray-500/50', button: 'bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700', cardFront: 'bg-white dark:bg-gray-800', cardBack: 'bg-gray-100 dark:bg-gray-700' },
  'Literatura': { bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-900 dark:text-pink-100', accent: 'text-pink-600 dark:text-pink-400', border: 'border-pink-300 dark:border-pink-700/50', ring: 'ring-pink-400 dark:ring-pink-500/50', button: 'bg-pink-500 hover:bg-pink-600 dark:bg-pink-600 dark:hover:bg-pink-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-pink-100 dark:hover:bg-pink-900/40', cardFront: 'bg-pink-100 dark:bg-pink-900/40', cardBack: 'bg-pink-200 dark:bg-pink-800/40' },
  'Química': { bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-900 dark:text-cyan-100', accent: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-300 dark:border-cyan-700/50', ring: 'ring-cyan-400 dark:ring-cyan-500/50', button: 'bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-cyan-100 dark:hover:bg-cyan-900/40', cardFront: 'bg-cyan-100 dark:bg-cyan-900/40', cardBack: 'bg-cyan-200 dark:bg-cyan-800/40' },
  'Física': { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-900 dark:text-rose-100', accent: 'text-rose-600 dark:text-rose-400', border: 'border-rose-300 dark:border-rose-700/50', ring: 'ring-rose-400 dark:ring-rose-500/50', button: 'bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-rose-100 dark:hover:bg-rose-900/40', cardFront: 'bg-rose-100 dark:bg-rose-900/40', cardBack: 'bg-rose-200 dark:bg-rose-800/40' },
  'Atualidades': { bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/20', text: 'text-fuchsia-900 dark:text-fuchsia-100', accent: 'text-fuchsia-600 dark:text-fuchsia-400', border: 'border-fuchsia-300 dark:border-fuchsia-700/50', ring: 'ring-fuchsia-400 dark:ring-fuchsia-500/50', button: 'bg-fuchsia-500 hover:bg-fuchsia-600 dark:bg-fuchsia-600 dark:hover:bg-fuchsia-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/40', cardFront: 'bg-fuchsia-100 dark:bg-fuchsia-900/40', cardBack: 'bg-fuchsia-200 dark:bg-fuchsia-800/40' },
  'Constituição Federal': { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-900 dark:text-amber-100', accent: 'text-amber-600 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700/50', ring: 'ring-amber-400 dark:ring-amber-500/50', button: 'bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-amber-100 dark:hover:bg-amber-900/40', cardFront: 'bg-amber-100 dark:bg-amber-900/40', cardBack: 'bg-amber-200 dark:bg-amber-800/40' },
  'Interpretação Textual': { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-900 dark:text-emerald-100', accent: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-300 dark:border-emerald-700/50', ring: 'ring-emerald-400 dark:ring-emerald-500/50', button: 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40', cardFront: 'bg-emerald-100 dark:bg-emerald-900/40', cardBack: 'bg-emerald-200 dark:bg-emerald-800/40' },
  'Tecnologia e Sociedade': { bg: 'bg-sky-50 dark:bg-sky-900/20', text: 'text-sky-900 dark:text-sky-100', accent: 'text-sky-600 dark:text-sky-400', border: 'border-sky-300 dark:border-sky-700/50', ring: 'ring-sky-400 dark:ring-sky-500/50', button: 'bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-sky-100 dark:hover:bg-sky-900/40', cardFront: 'bg-sky-100 dark:bg-sky-900/40', cardBack: 'bg-sky-200 dark:bg-sky-800/40' },

  'Raciocínio Lógico-Matemático': { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-900 dark:text-blue-100', accent: 'text-blue-600 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-700/50', ring: 'ring-blue-400 dark:ring-blue-500/50', button: 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900/40', cardFront: 'bg-blue-100 dark:bg-blue-900/40', cardBack: 'bg-blue-200 dark:bg-blue-800/40' },
  'Noções de Informática': { bg: 'bg-sky-50 dark:bg-sky-900/20', text: 'text-sky-900 dark:text-sky-100', accent: 'text-sky-600 dark:text-sky-400', border: 'border-sky-300 dark:border-sky-700/50', ring: 'ring-sky-400 dark:ring-sky-500/50', button: 'bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-sky-100 dark:hover:bg-sky-900/40', cardFront: 'bg-sky-100 dark:bg-sky-900/40', cardBack: 'bg-sky-200 dark:bg-sky-800/40' },
  'Legislação Específica': { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-900 dark:text-amber-100', accent: 'text-amber-600 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700/50', ring: 'ring-amber-400 dark:ring-amber-500/50', button: 'bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-amber-100 dark:hover:bg-amber-900/40', cardFront: 'bg-amber-100 dark:bg-amber-900/40', cardBack: 'bg-amber-200 dark:bg-amber-800/40' },
  'Administração Pública': { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-900 dark:text-emerald-100', accent: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-300 dark:border-emerald-700/50', ring: 'ring-emerald-400 dark:ring-emerald-500/50', button: 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40', cardFront: 'bg-emerald-100 dark:bg-emerald-900/40', cardBack: 'bg-emerald-200 dark:bg-emerald-800/40' },
  'Noções de Arquivologia': { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-900 dark:text-orange-100', accent: 'text-orange-600 dark:text-orange-400', border: 'border-orange-300 dark:border-orange-700/50', ring: 'ring-orange-400 dark:ring-orange-500/50', button: 'bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-orange-100 dark:hover:bg-orange-900/40', cardFront: 'bg-orange-100 dark:bg-orange-900/40', cardBack: 'bg-orange-200 dark:bg-orange-800/40' },
  'Noções de Direito Constitucional': { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-900 dark:text-amber-100', accent: 'text-amber-600 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700/50', ring: 'ring-amber-400 dark:ring-amber-500/50', button: 'bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-amber-100 dark:hover:bg-amber-900/40', cardFront: 'bg-amber-100 dark:bg-amber-900/40', cardBack: 'bg-amber-200 dark:bg-amber-800/40' },
  'Noções de Direito Administrativo': { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-900 dark:text-emerald-100', accent: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-300 dark:border-emerald-700/50', ring: 'ring-emerald-400 dark:ring-emerald-500/50', button: 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40', cardFront: 'bg-emerald-100 dark:bg-emerald-900/40', cardBack: 'bg-emerald-200 dark:bg-emerald-800/40' },
  'Lei Orgânica de Caruaru': { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-900 dark:text-amber-100', accent: 'text-amber-600 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700/50', ring: 'ring-amber-400 dark:ring-amber-500/50', button: 'bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-amber-100 dark:hover:bg-amber-900/40', cardFront: 'bg-amber-100 dark:bg-amber-900/40', cardBack: 'bg-amber-200 dark:bg-amber-800/40' },
  'Artes': { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-900 dark:text-rose-100', accent: 'text-rose-600 dark:text-rose-400', border: 'border-rose-300 dark:border-rose-700/50', ring: 'ring-rose-400 dark:ring-rose-500/50', button: 'bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white', option: 'bg-white dark:bg-gray-800 hover:bg-rose-100 dark:hover:bg-rose-900/40', cardFront: 'bg-rose-100 dark:bg-rose-900/40', cardBack: 'bg-rose-200 dark:bg-rose-800/40' },
};

export const topicsBySubject: Record<string, any> = {
  // --- Matérias de Concurso ---
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
    'Gramática': ['Fonologia e Ortografia', 'Acentuação Gráfica', 'Morfologia (Classes de Palavras)', 'Sintaxe (Período Simples e Composto)', 'Pontuação', 'Crase', 'Concordância Verbal e Nominal', 'Regência Verbal e Nominal'],
    'Semântica': ['Sinonímia e Antonímia', 'Homonímia e Paronímia', 'Polissemia e Ambiguidade', 'Denotação e Conotação'],
    'Interpretação e Estrutura (Concurso)': ['Compreensão de textos literários', 'Mecanismos de coesão textual'],
    'Gramática e Sintaxe (Concurso)': ['Classes gramaticais', 'Flexão', 'Concordância nominal e verbal', 'Regência', 'Colocação pronominal'],
    'Regras Oficiais e Estilo (Concurso)': ['Ortografia', 'Acentuação', 'Crase', 'Figuras de linguagem']
  },
  'Interpretação Textual': {
    'Fundamentos da Interpretação': ['Leitura Atenta (Scanning e Skimming)', 'Identificação da Ideia Central', 'Localização de Informações Explícitas', 'Inferência e Pressuposição'],
    'Gêneros e Tipologias': ['Textos Narrativos (Conto, Crônica)', 'Textos Descritivos', 'Textos Dissertativo-Argumentativos (Artigo de Opinião)', 'Textos Expositivos (Notícia, Verbete)', 'Textos Injuntivos (Receita, Manual)', 'Textos Híbridos (Charges, Tiras, Publicidade)'],
    'Recursos Linguísticos': ['Coesão e Coerência', 'Funções da Linguagem', 'Variações Linguísticas (Norma Padrão e Coloquial)', 'Figuras de Linguagem (Metáfora, Ironia, etc.)'],
    'Análise do Discurso': ['Polissemia e Ambiguidade', 'Denotação e Conotação', 'Intertextualidade (Paráfrase, Paródia)', 'Argumentação e Persuasão'],
  },
  'Biologia': {
    'Citologia e Histologia': ['Membrana Plasmática e Transportes', 'Citoplasma e Organelas', 'Núcleo e Divisão Celular', 'Tecidos Animais'],
    'Bioquímica': ['Água e Sais Minerais', 'Carboidratos, Lipídios e Proteínas', 'Vitamina', 'Enzimas', 'Ácidos Nucleicos (DNA e RNA)'],
    'Genética e Evolução': ['Leis de Mendel', 'Heredogramas', 'Sistema ABO e Rh', 'Engenharia Genética', 'Teorias Evolutivas (Lamarck, Darwin, Neodarwinismo)', 'Especiação'],
    'Ecologia': ['Conceitos Fundamentais', 'Cadeias e Teias Alimentares', 'Relações Ecológicas', 'Ciclos Biogeoquímicos', 'Biomas', 'Impactos Ambientais e Desequilíbrios'],
    'Fisiologia Humana': ['Sistema Digestório', 'Sistema Respiratório', 'Sistema Circulatório', 'Sistema Excretor', 'Sistema Nervoso', 'Sistema Endócrino', 'Sistema Imunológico'],
    'Reinos e Seres Vivos': ['Vírus', 'Reino Monera', 'Reino Protoctista (Algas e Protozoários)', 'Reino Fungi', 'Reino Plantae (Botânica)', 'Reino Animalia (Zoologia)'],
  },
  'História': {
    'História do Brasil': ['Brasil Pré-Colonial e Colonial', 'Período Joanino e Independência', 'Primeiro e Segundo Reinado', 'República Velha', 'Era Vargas', 'República Populista (1945-1964)', 'Ditadura Militar (1945-1985)', 'Nova República'],
    'História Geral': ['Pré-História e Antiguidade Oriental', 'Antiguidade Clássica (Grécia e Roma)', 'Idade Média (Alta e Baixa)', 'Idade Moderna (Absolutismo, Mercantilismo, Renascimento, Reformas)', 'Revoluções Burguesas (Inglesa, Industrial, Francesa)', 'Era Napoleônica e Século XIX', 'Primeira e Segunda Guerra Mundial', 'Guerra Fria e Mundo Contemporâneo'],
  },
  'Geografia': {
    'Geografia Geral': ['Cartografia e Orientação', 'Geologia e Relevo', 'Clima e Vegetação', 'Hidrografia', 'Geopolítica e Globalização', 'População Mundial e Migrações', 'Fontes de Energia e Questões Ambientais'],
    'Geografia do Brasil': ['Formação Territorial', 'Domínios Morfoclimáticos', 'Bacias Hidrográficas', 'População Brasileira (Formação, Distribuição, Estrutura)', 'Urbanização e Industrialização', 'Agropecuária', 'Regionalização do Espaço Brasileiro'],
  },
  'Física': {
    'Mecânica': ['Cinemática Escalar e Vetorial', 'Leis de Newton e Aplicações', 'Trabalho, Potência e Energia', 'Impulso, Quantidade de Movimento e Colisões', 'Estática e Hidrostática', 'Gravitação Universal'],
    'Termologia': ['Termometria', 'Calorimetria e Propagação de Calor', 'Estudo dos Gases', 'Termodinâmica'],
    'Óptica': ['Princípios da Óptica Geométrica', 'Reflexão da Luz (Espelhos Planos e Esféricos)', 'Refração da Luz (Lentes e Dioptros)'],
    'Ondulatória': ['Fenômenos Ondulatórios', 'Acústica', 'Ondas Eletromagnéticas'],
    'Eletricidade': ['Eletrostática (Força, Campo, Potencial)', 'Eletrodinâmica (Corrente, Resistores, Geradores, Receptores)', 'Eletromagnetismo (Campo Magnético, Indução)'],
    'Física Moderna': ['Noções de Relatividade Restrita', 'Noções de Física Quântica (Efeito Fotoelétrico)'],
  },
  'Química': {
    'Química Geral': ['Modelos Atômicos e Estrutura', 'Tabela Periódica e Propriedades', 'Ligações Químicas (Iônica, Covalente, Metálica)', 'Funções Inorgânicas (Ácidos, Bases, Sais, Óxidos)', 'Reações Químicas e Balanceamento', 'Grandezas Químicas (Mol, Massa Molar)', 'Estequiometria'],
    'Físico-Química': ['Soluções e Concentrações', 'Propriedades Coligativas', 'Termoquímica', 'Cinética Química', 'Equilíbrio Químico (Iônico e Molecular)', 'Eletroquímica (Pilhas e Eletrólise)', 'Radioatividade'],
    'Química Orgânica': ['Introdução e Hidrocarbonetos', 'Funções Orgânicas Oxigenadas e Nitrogenadas', 'Isomeria (Plana e Espacial)', 'Reações Orgânicas (Adição, Substituição, Eliminação)', 'Polímeros e Biomoléculas'],
  },
  'Filosofia': {
    'Filosofia Antiga': ['Mito e Filosofia (Pré-socráticos)', 'Sócrates e os Sofistas', 'Platão (Teoria das Ideias)', 'Aristóteles (Lógica, Ética, Política)', 'Filosofia Helenística (Estoicismo, Epicurismo)'],
    'Filosofia Medieval': ['Patrística (Santo Agostinho)', 'Escolástica (São Tomás de Aquino)'],
    'Filosofia Moderna': ['Racionalismo (Descartes, Spinoza, Leibniz)', 'Empirismo (Locke, Berkeley, Hume)', 'Contratualismo (Hobbes, Locke, Rousseau)', 'Iluminismo e Criticismo (Kant)'],
    'Filosofia Contemporânea': ['Idealismo Alemão (Hegel)', 'Utilitarismo (Bentham, Mill)', 'Marxismo', 'Existencialismo (Kierkegaard, Sartre)', 'Escola de Frankfurt', 'Filosofia da Ciência (Popper, Kuhn)'],
  },
  'Sociologia': {
    'Conceitos Sociológicos Fundamentais': ['O que é Sociologia?', 'Fato Social (Durkheim)', 'Ação Social (Weber)', 'Luta de Classes (Marx)'],
    'Cultura, Identidade e Socialização': ['Cultura e Ideologia', 'Indústria Cultural', 'Processo de Socialização', 'Identidade e Diversidade'],
    'Trabalho, Produção e Sociedade': ['Divisão Social do Trabalho', 'Modos de Produção', 'Mundo do Trabalho Contemporâneo'],
    'Poder, Política e Movimentos Sociais': ['Estado, Governo e Sociedade', 'Democracia e Cidadania', 'Movimentos Sociais'],
    'Desigualdade e Estratificação Social': ['Classes Sociais', 'Desigualdades de Gênero e Raça', 'Globalização e Desigualdade'],
  },
  'Literatura': {
    'Teoria Literária': ['Gêneros Literários', 'Figuras de Linguagem', 'Elementos da Narrativa', 'Versificação'],
    'Literatura Portuguesa': ['Trovadorismo', 'Humanismo', 'Classicismo', 'Barroco', 'Arcadismo', 'Romantismo', 'Realismo/Naturalismo', 'Simbolismo', 'Modernismo (Orpheu e Presença)'],
    'Literatura Brasileira': ['Quinhentismo e Barroco', 'Arcadismo', 'Romantismo (Poesia e Prosa)', 'Realismo/Naturalismo e Parnasianismo', 'Simbolismo e Pré-Modernismo', 'Modernismo (1ª, 2ª e 3ª Fases)', 'Literatura Contemporânea'],
  },
  'Inglês': {
    'Grammar': ['Verb Tenses (Simple, Continuous, Perfect)', 'Modal Verbs', 'Prepositions (In, On, At)', 'Conditionals (If Clauses)', 'Reported Speech', 'Passive Voice', 'Gerunds and Infinitives'],
    'Vocabulary': ['Common Idioms and Expressions', 'Phrasal Verbs', 'Connectors and Linking Words', 'False Cognates'],
    'Reading Comprehension': ['Skimming and Scanning', 'Identifying Main Ideas and Details', 'Inference and Context Clues'],
  },
  'Espanhol': {
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
};

export const defaultTheme = themes['Redação'];
