import { Calendar, FileText, AlertCircle, CheckCircle } from 'lucide-react';

export interface ConcursoData {
  id: string;
  title: string;
  shortName: string;
  examDate: string;
  banca: string;
  cargo: string;
  vacancies: { ampla: number; cotas: number; pcd: number; total: number };
  salary: string;
  jobDescription: string;
  examStructure: {
    objective: { total: number; subjects: { name: string; questions: number; weight?: number }[] };
    discursive?: { description: string; weight?: number };
    minScore: string;
  };
  importantDates: { label: string; date: string; icon: any; status: 'past' | 'current' | 'future' }[];
  registrationFee: string;
  registrationUrl?: string;
  themeColor: string;
  syllabus?: { subject: string; topics: string }[];
}

export const concursosData: ConcursoData[] = [
  {
    id: 'auditor-fiscal-caruaru',
    title: 'Auditor Fiscal Municipal – Prefeitura de Caruaru',
    shortName: 'Auditor Fiscal',
    examDate: '2026-11-29T08:00:00-03:00',
    banca: 'IBAM',
    cargo: 'Auditor Fiscal Municipal',
    vacancies: { ampla: 7, cotas: 2, pcd: 1, total: 10 },
    salary: 'R$ 6.000,00 + GPF (podendo passar de R$ 9.000,00)',
    jobDescription: 'Planejar e executar a ação fiscal pertinente aos tributos municipais. Lavrar autos de infração e notificações. Examinar escrituração contábil e sistemas eletrônicos. Orientar contribuintes. Exercer poder de polícia administrativa.',
    examStructure: {
      objective: {
        total: 40,
        subjects: [
          { name: 'Conhecimentos Específicos', questions: 20, weight: 3.0 },
          { name: 'Língua Portuguesa', questions: 10, weight: 2.0 },
          { name: 'Raciocínio Lógico', questions: 5, weight: 1.0 },
          { name: 'Informática', questions: 5, weight: 1.0 }
        ]
      },
      discursive: { description: '1 questão técnica sobre Conhecimentos Específicos (25 a 30 linhas)', weight: 40.0 },
      minScore: 'Não zerar nenhuma disciplina e atingir mínimo exigido em todas (total mín. 46/90 na objetiva e 20/40 na discursiva)'
    },
    importantDates: [
      { label: 'Período de Inscrição', date: '10/08 a 08/10/2026', icon: FileText, status: 'current' },
      { label: 'Isenção de Taxa', date: '10/08 a 14/08/2026', icon: AlertCircle, status: 'current' },
      { label: 'Cartão de Confirmação', date: 'Novembro/2026', icon: Calendar, status: 'future' },
      { label: 'Aplicação das Provas', date: '29/11/2026', icon: CheckCircle, status: 'future' },
      { label: 'Gabarito Preliminar', date: '30/11/2026', icon: CheckCircle, status: 'future' }
    ],
    registrationFee: 'R$ 97,00',
    registrationUrl: 'https://www.ibam-concursos.org.br',
    themeColor: 'from-blue-600 to-indigo-700',
    syllabus: [
      {
        subject: 'Conhecimentos Específicos',
        topics: 'SISTEMA TRIBUTÁRIO BRASILEIRO: 1. O Sistema Tributário Brasileiro. Os princípios constitucionais tributários. Normas orçamentárias. Limitações ao poder de tributar. A repartição das receitas tributárias. Orçamento público – PPA, LDO e LOA. Normas gerais de direito financeiro (Lei nº 4.320/64) 2. Código Tributário Nacional. Tributos e suas espécies. Características. 3. Normas gerais de Direito Tributário. Vigência e aplicação da legislação tributária municipal. Interpretação e integração da legislação tributária. 4. Obrigação tributária. Fato gerador, sujeito ativo e sujeito passivo. Solidariedade e capacidade tributária. Domicílio tributário. Responsabilidade tributária. 5. Crédito tributário. Lançamento. Suspensão, extinção e exclusão do crédito tributário. Renúncia fiscal. Garantias e privilégios. 6. Administração tributária. Fiscalização, dívida ativa e penalidades tributárias. 7. Código Tributário Municipal. Normas gerais. Características dos tributos municipais. Administração tributária municipal. Processo administrativo fiscal. 8. Ações de Combate à sonegação fiscal. Crimes contra a ordem tributária (Lei nº 8.137/90). 9. Auditoria Tributária (técnicas de auditoria fiscal, procedimentos de fiscalização, cruzamento de dados, indícios de fraude, planejamento fiscal e malha fiscal). 10. Plano Anual de Fiscalização. 11. Notificação e Intimação de Atividade Fiscalizatória. 12. Fiscalização junto a contribuintes específicos. Fiscalização eletrônica e digital, Nota Fiscal Eletrônica, escrituração digital, uso de dados bancários e financeiros. 13. Legislação atualizada: Código Tributário Nacional; Lei de Responsabilidade Fiscal; Lei Orgânica do Município; Lei de Estrutura da Administração Pública Municipal; Código Tributário Municipal e legislação complementar.\n\nNOÇÕES DE CONTABILIDADE APLICADA AO SETOR PÚBLICO: 1. Sistema Contábil, Subsistemas de Contas: Orçamentário, Patrimonial, Custos e Compensado. 2. Variações Patrimoniais: qualitativas e quantitativas. 3. Reconhecimento da receita e da despesa orçamentária, procedimentos contábeis referentes à receita e à despesa orçamentária, 4. Controle da execução da despesa orçamentária, restos a pagar, despesas de exercícios anteriores, suprimentos de fundos. Plano de Contas Aplicado ao Setor Público (PCASP): conceito, estrutura e composição. 5. Escrituração dos principais fatos da administração pública: arrecadação das receitas correntes e de capital, arrecadação da receita de dívida ativa, realização das despesas correntes e de capital, restos a pagar, operações de crédito por antecipação de receita orçamentária, inscrição de dívida ativa tributária e não tributária, incorporação de bens, reconhecimento da valorização de bens, baixa por cancelamento de dívidas passivas de créditos fiscais inscritos, registro da depreciação acumulada de bens móveis e imóveis, restituições a pagar; cauções recebidas e devolvidas, fianças recebidas e devolvidas e consignações em folha de pagamento e lançamentos de encerramento do exercício financeiro. 6. Demonstrações Contábeis aplicadas ao Setor Público (de acordo com o Manual de Contabilidade Aplicada ao Setor Público - MCASP da STN): Balanço Orçamentário, Balanço Financeiro, Balanço Patrimonial, Demonstração das Variações Patrimoniais, Demonstração dos Fluxos de Caixa (conceitos, estrutura, composição, análise e técnica de elaboração).\n\nNOÇÕES DE DIREITO ADMINISTRATIVO: 1. Administração pública. 1.1. Princípios do Direito Administrativo. 1.2. Administração Pública Direta e Indireta. 1.3. Entidades da administração pública indireta: autarquias, fundações públicas, empresas públicas e sociedades de economia mista. 2. Poderes administrativos. 2.1. Poder vinculado. 2.2. Poder discricionário. 2.3. Poder vinculado. 2.4. Poder hierárquico. 2.5. Poder disciplinar. 2.6. Poder regulamentar. 2.7. Poder de polícia. 2.8. Abuso de poder. 3. Serviços Públicos. 3.1. Conceito de serviço público. 3.2. Princípios do serviço público. 3.3. Classificação dos serviços públicos. 3.4. Permissão e concessão de serviços públicos. 4. Atos administrativos. 4.1. Conceito e atributos do ato administrativo. 4.2. Anulação, revogação e convalidação dos atos administrativos. 4.3. Classificação dos atos administrativos. 4.4. Controle dos atos administrativos. Processo Administrativo (Lei 14.133/2021). Servidores públicos. 5. Licitações públicas e contratos administrativos. 6. Improbidade administrativa. Jurisprudência do STF, STJ e TCU.\n\nNOÇÕES DE DIREITO CONSTITUCIONAL: 1. Constituição da República Federativa do Brasil de 1988. 1.1. Classificação das constituições. 2. Direitos e garantias fundamentais. 2.1. Direitos e deveres individuais e coletivos. 2.2. Direitos sociais. 2.3. Direito políticos. 2.4. Nacionalidade e cidadania, direitos políticos. 3. Organização político-administrativa. 3.1. União, estados, Distrito Federal e municípios. 4. Poder Executivo. 4.1. Atribuições do presidente da República. 4.2. Atribuições dos Ministros de Estado. 5. Poder Legislativo. 5.1. Congresso Nacional: Câmara dos Deputados, Senado Federal, deputados e senadores. 5.2. Processo legislativo. 6. Poder Judiciário. 6.1. Órgãos do Poder Judiciário e suas competências. 6.2. Conselho Nacional de Justiça: composição e competências. 7. Funções essenciais à Justiça. 7.1. Ministério Público. 7.2. Advocacia Pública e Defensoria públicas. 8. Sistema tributário nacional. 8.1. Princípios gerais do sistema tributário nacional. 8.2. Limitações ao Poder de Tributar. 9. Ordem econômica e financeira. 10. Ordem social. 11. Controle de constitucionalidade. 12. Jurisprudência do STF e do STJ.'
      },
      {
        subject: 'Língua Portuguesa',
        topics: '1. Leitura e compreensão de textos variados. 2. Modos de organização do discurso: descritivo, narrativo, argumentativo, injuntivo, expositivo e dissertativo. 3. Gêneros do discurso: definição, reconhecimento dos elementos básicos. 4. Coesão e coerência: mecanismos, efeitos de sentido no texto. 5. Relação entre as partes do texto: causa, consequência, comparação, conclusão, exemplificação, generalização, particularização. 6. Conectivos: classificação, uso, efeitos de sentido. 7. Verbos: pessoa, número, tempo e modo. Vozes verbais. Transitividade verbal e nominal. Estrutura, classificação e formação de palavras. Funções e classes de palavras. Flexão nominal e verbal. Regência verbal e nominal. 8. Pronomes: emprego, formas de tratamento e colocação. 9. Figuras de linguagem. 10. Funções da linguagem. 11. Sinônimos, antônimos, parônimos e homônimos. 12. Acentuação gráfica. 13. Pontuação: regras e efeitos de sentido. 14. Recursos gráficos: regras, efeitos de sentido. Sintaxe do Período Simples. 15. Coordenação e subordinação. 16. Crase. 17. Ortografia.'
      },
      {
        subject: 'Raciocínio Lógico',
        topics: '1. Operações com conjuntos. 2. Raciocínio lógico numérico: problemas envolvendo operações com números reais e raciocínio sequencial. 3. Conceito de proposição: valores lógicos das proposições; conectivos, negação e tabela-verdade. Tautologias. Condição necessária e suficiente. 4. Argumentação lógica, estruturas lógicas e diagramas lógicos. 5. Equivalências e implicações lógicas. 6. Quantificadores universal e existencial. 7. Problemas de Contagem: Princípio Aditivo e Princípio Multiplicativo. Arranjos, combinações e permutações. 8. Noções de Probabilidade.'
      },
      {
        subject: 'Informática',
        topics: 'Modalidades de processamento. Organização e Arquitetura de computadores: conceitos, tipos, características, componentes de hardware e funcionamento, principais periféricos e dispositivos de entrada e saída, unidades de armazenamento, memória, conexão e conectores, operação. Software: Software Livre, software básico e aplicativo, utilitários, sistemas operacionais: conceitos, características, teclas de função, ícones e atalhos de teclado, uso dos recursos. Ambientes Windows 10BR / 11BR e Linux: conceitos, características, “distribuições Linux” versões de 32 e 64 bits, instalação, pastas e diretórios, configuração e utilização dos recursos, utilitários padrão, principais comandos e funções, teclas de função, ícones e atalhos de teclado, uso dos recursos. Sistemas de arquivos, Operações com arquivos, permissões e segurança de arquivos. Editores, Processadores de Textos, Planilhas, Softwares de Apresentação e Bancos de Dados: conceitos, características, teclas de função, ícones e atalhos de teclado, uso dos recursos. Pacotes MS Office BR em suas últimas versões (Word, Excel, PowerPoint, Access) e LibreOffice 24.8.2.1 versão em português ou superior (Writer, Calc, Impress, Base), nas versões de 32 e 64 bits. Edição e formatação de textos. Criação e uso de planilhas de cálculos. Criação e exibição de Apresentações de slides. Noções básicas de bancos de dados. Microsoft 365 em português: conceitos, características, componentes, instalação, configuração, teclas de função, ícones e atalhos de teclado, uso dos recursos. Segurança da Informação, de equipamentos, de sistemas, em redes, na internet e na nuvem: conceitos, características, pilares, vírus x antivírus, backup, firewall, criptografia, cuidados. Lei Geral de Proteção aos Dados (LGPD). Redes de computadores: conceitos, características, meios de transmissão, conexão, cabos e conectores, protocolos, topologias, tecnologias, padrões, redes cabeadas e wireless/wi-fi, Modelo de Referência OSI/ISO, arquitetura TCP/IP, utilitários básicos para configuração e verificação de redes, máscara de rede/sub-rede. Internet X Web: conceitos, características, internet x intranet x extranet, utilização de ferramentas e recursos, browsers Edge x Google Chrome X Mozilla Firefox nas versões atuais de 32 e 64 bit, navegação, correio eletrônico, webmail, softwares Mozilla Thunderbird e Outlook nas versões atuais de 32 e 64 bits, sítios e ferramentas de busca e pesquisa na internet. Redes Sociais e Computação em nuvem: conceitos, características, principais redes e serviços, uso dos recursos. Ferramentas Google: Gmail; Google Meet; Google Documentos; Google Planilhas; Google Drive; Google Agenda: conceitos e características, uso dos recursos. Microsoft Teams: conceitos e características, uso dos recursos.'
      }
    ]
  },
  {
    id: 'assistente-ufpe',
    title: 'Assistente em Administração – UFPE',
    shortName: 'Assistente UFPE',
    examDate: '2027-01-17T08:00:00-03:00',
    banca: 'FADE/UFPE',
    cargo: 'Assistente em Administração',
    vacancies: { ampla: 35, cotas: 17, pcd: 3, total: 55 },
    salary: 'R$ 4.373,39 (Vencimento + Auxílio-Alimentação)',
    jobDescription: 'Executar serviços de apoio nas áreas de recursos humanos, administração, finanças e logística. Atender usuários. Tratar de documentos variados. Preparar relatórios e planilhas. Assessorar atividades de ensino, pesquisa e extensão.',
    examStructure: {
      objective: {
        total: 60,
        subjects: [
          { name: 'Conhecimentos Específicos', questions: 25, weight: 1.66 },
          { name: 'Língua Portuguesa', questions: 20, weight: 1.66 },
          { name: 'Legislação Aplicada', questions: 10, weight: 1.66 },
          { name: 'Raciocínio Lógico', questions: 5, weight: 1.66 }
        ]
      },
      discursive: { description: 'Produção de texto da esfera administrativa (15 a 20 linhas)', weight: 100.0 },
      minScore: 'Mínimo de 60,00 pontos na Prova Objetiva e 40,00 pontos na Prova Discursiva.'
    },
    importantDates: [
      { label: 'Período de Inscrição', date: '11/08 a 08/09/2026', icon: FileText, status: 'current' },
      { label: 'Isenção de Taxa', date: '11/08 a 17/08/2026', icon: AlertCircle, status: 'current' },
      { label: 'Pagamento da Taxa', date: 'até 09/09/2026', icon: Calendar, status: 'current' },
      { label: 'Cartão de Inscrição', date: '13/01 a 16/01/2027', icon: Calendar, status: 'future' },
      { label: 'Aplicação das Provas', date: '17/01/2027', icon: CheckCircle, status: 'future' },
      { label: 'Resultado Preliminar', date: '17/02/2027', icon: CheckCircle, status: 'future' },
      { label: 'Resultado Final', date: '23/04/2027', icon: CheckCircle, status: 'future' }
    ],
    registrationFee: 'R$ 120,00',
    registrationUrl: 'https://www.fadeconcursos.org.br/concursoufpe2026',
    themeColor: 'from-emerald-600 to-teal-700'
  }
];
