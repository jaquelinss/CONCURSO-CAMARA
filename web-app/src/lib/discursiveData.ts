export interface DiscursiveQuestion {
  id: string;
  subject: string;
  topic: string;
  statement: string;
  expectedAnswer: string;
}

export const discursiveQuestionsData: DiscursiveQuestion[] = [
  {
    id: 'd1',
    subject: 'Auditoria',
    topic: 'Ceticismo Profissional e Fraude (NBC TA 240)',
    statement: 'Em um trabalho de auditoria das demonstrações contábeis de uma grande varejista, a equipe de auditoria deparou-se com inconsistências nos registros de estoque e indícios de burla de controles internos pela alta administração. Discorra sobre a importância do ceticismo profissional do auditor neste cenário e quais procedimentos devem ser adotados ao identificar riscos de distorção relevante decorrente de fraude, em conformidade com as normas do Conselho Federal de Contabilidade (CFC).',
    expectedAnswer: 'O candidato deve abordar: 1) Conceito de ceticismo profissional (postura questionadora e alerta a condições que possam indicar possível distorção devida a erro ou fraude, e uma avaliação crítica das evidências). 2) A responsabilidade do auditor de manter o ceticismo em todo o planejamento e execução. 3) Procedimentos previstos na NBC TA 240: discussão com a equipe, indagações à administração, revisão de estimativas contábeis, avaliação do risco de burla de controles. 4) A impossibilidade de o auditor garantir absoluta certeza devido às limitações inerentes da auditoria, mas a exigência de razoável segurança.'
  },
  {
    id: 'd2',
    subject: 'Contabilidade',
    topic: 'Teste de Recuperabilidade (CPC 01) e Ativo Intangível',
    statement: 'A Cia. Gama, atuante no setor de tecnologia, possui registrado em seu balanço patrimonial um ágio derivado de expectativa de rentabilidade futura (goodwill) e um ativo intangível com vida útil indefinida (uma marca consolidada). Ao final do exercício de X1, a empresa não identificou nenhum indício interno ou externo de desvalorização desses ativos. Com base no Pronunciamento Técnico CPC 01 (Redução ao Valor Recuperável de Ativos), explique a obrigatoriedade (ou não) da realização do teste de recuperabilidade (impairment test) para esses ativos específicos em X1, detalhando como deve ser comparado o valor contábil com o valor recuperável.',
    expectedAnswer: 'O candidato deve destacar que: 1) Em regra geral, os ativos são testados quando há indícios de desvalorização. 2) EXCEÇÃO (regra específica do CPC 01): O ágio por expectativa de rentabilidade futura (goodwill) e o ativo intangível com vida útil indefinida (ou ainda não disponíveis para uso) DEVEM ser submetidos ao teste de recuperabilidade anualmente, INDEPENDENTEMENTE de haver ou não indícios de perda. 3) O valor recuperável é o maior entre o valor justo líquido de despesas de venda e o valor em uso. Se o valor contábil for maior que o valor recuperável, a empresa deve reconhecer imediatamente a perda por desvalorização no resultado.'
  },
  {
    id: 'd3',
    subject: 'Legislação Tributária',
    topic: 'Imunidade e Isenção - IPTU e ITBI',
    statement: 'O "Sindicato dos Trabalhadores da Indústria" adquiriu, mediante compra e venda, um terreno urbano com o objetivo exclusivo de construir ali, no futuro, a sua sede administrativa e de lazer para os filiados. Atualmente, o terreno encontra-se vazio e sem uso efetivo. A Prefeitura local lançou a cobrança do IPTU (Imposto Predial e Territorial Urbano) referente ao exercício atual e do ITBI (Imposto sobre a Transmissão de Bens Imóveis) sobre a compra. Com base na jurisprudência do STF e na Constituição Federal, analise a legitimidade da cobrança de cada um dos tributos pela municipalidade.',
    expectedAnswer: 'O candidato deve abordar: 1) IPTU: Sindicatos de trabalhadores (e partidos políticos, instituições de educação/assistência social) gozam de imunidade tributária sobre o patrimônio, renda e serviços relacionados às suas finalidades essenciais (Art. 150, VI, "c" e §4º, da CF/88). O STF (Súmula Vinculante 52) entende que, mesmo o lote vago/sem edificação ou alugado a terceiros, se a renda for revertida para os fins essenciais, está protegido pela imunidade. Logo, a cobrança do IPTU é indevida. 2) ITBI: A imunidade protege o patrimônio, alcançando a aquisição do imóvel pelo sindicato, desde que vinculada a fins essenciais. Como foi comprado para sede/lazer, a cobrança do ITBI também é indevida.'
  },
  {
    id: 'd4',
    subject: 'Legislação Tributária',
    topic: 'ICMS - Apropriação de Crédito sobre Ativo Imobilizado',
    statement: 'A Indústria XYZ S/A, contribuinte regular do ICMS no Estado de Minas Gerais, adquiriu, em 05/01/2023, uma máquina de R$ 480.000,00 (ICMS destacado na nota de R$ 86.400,00) que será utilizada em seu parque industrial para a fabricação de produtos isentos de ICMS, mas com expressa previsão legal de manutenção de crédito, além de produtos normalmente tributados. Discorra sobre as regras para apropriação e o uso do crédito do ICMS incidente sobre bens do ativo imobilizado, apontando as restrições e o formato de cálculo do aproveitamento mensal previsto na legislação.',
    expectedAnswer: 'O candidato deve explicar: 1) O crédito do ICMS sobre ativo imobilizado não é apropriado integralmente no mês da compra, mas sim à razão de 1/48 (um quarenta e oito avos) por mês. 2) O cálculo mensal exige a verificação do coeficiente de saídas tributadas (incluindo as com previsão de manutenção de crédito) sobre o total de saídas no mês. 3) Valor a apropriar no mês = (Valor do crédito / 48) x (Saídas tributadas / Total de Saídas). 4) O saldo não creditado no final de 48 meses é cancelado. 5) Caso a máquina seja alienada antes de 48 meses, o saldo remanescente do crédito não poderá ser mais apropriado.'
  },
  {
    id: 'd5',
    subject: 'Contabilidade de Custos',
    topic: 'Sistemas de Custeio: Variável x Por Absorção',
    statement: 'A Indústria "Alfa" fabricou 10.000 unidades do seu produto único "Beta" e vendeu 8.000 unidades no mesmo período. Os custos fixos totais foram de R$ 50.000,00 e os custos variáveis totais foram de R$ 120.000,00. As despesas (comerciais e administrativas) somaram R$ 30.000,00 (todas fixas). Explique a diferença conceitual e de aplicação entre o custeio por absorção (aceito para fins fiscais) e o custeio variável (gerencial). Além disso, aponte em qual dos métodos o lucro apurado neste período será maior e o porquê dessa diferença.',
    expectedAnswer: 'O candidato deve demonstrar que: 1) Custeio por Absorção (Fisco): Aloca TODOS os custos de produção (fixos e variáveis) aos produtos fabricados. As despesas vão para o resultado. 2) Custeio Variável (Gerencial): Aloca APENAS os custos variáveis aos produtos. Os custos fixos de produção, junto com as despesas, são baixados diretamente no resultado do período como custo de estrutura. 3) Maior Lucro: Como a produção (10.000) foi maior que a venda (8.000), o estoque final ficou com 2.000 unidades. No Custeio por Absorção, parte dos custos fixos (R$ 10.000 = 20%) fica ativada (presa) no estoque final, diminuindo o CMV e, consequentemente, apresentando um LUCRO MAIOR que no custeio variável (onde todo custo fixo abateu o resultado).'
  },
  {
    id: 'd6',
    subject: 'Auditoria',
    topic: 'Relatório do Auditor - Modificação de Opinião',
    statement: 'Durante a auditoria das demonstrações financeiras da empresa "W", o auditor concluiu que as provisões para litígios e contingências passivas (CPC 25) não foram reconhecidas e nem adequadamente divulgadas. Os valores envolvidos, em caso de perda provável identificada pelos advogados, superam o lucro líquido do exercício e reduzem o patrimônio líquido a um terço do seu valor contábil. A distorção, portanto, afeta múltiplos elementos e inviabiliza a análise financeira como um todo. Descreva os tipos de opinião modificada previstos na norma e justifique, com base na NBC TA 705, qual deve ser a opinião emitida pelo auditor neste caso prático.',
    expectedAnswer: 'O candidato deve abordar: 1) Tipos de opinião modificada: Opinião com Ressalva, Opinião Adversa e Abstenção de Opinião. 2) Classificação do caso prático: A distorção é material e, dada a sua magnitude (supera o lucro líquido e compromete fortemente o PL afetando a leitura global das demonstrações), ela é considerada DISSEMINADA (generalizada). Além disso, o auditor obteve evidência suficiente para concluir sobre a existência da distorção (não é um caso de limitação de escopo). 3) Conclusão: Diante de distorções materiais e disseminadas (generalizadas), o auditor deve emitir uma OPINIÃO ADVERSA (afirmando que as demonstrações não apresentam adequadamente a posição patrimonial e financeira da entidade).'
  },
  {
    id: 'd7',
    subject: 'Orçamento Público (AFO)',
    topic: 'Créditos Adicionais (Lei 4.320/64)',
    statement: 'Em 11 de março de 2020, a Organização Mundial de Saúde (OMS) declarou pandemia de Covid-19. Um município, ciente da necessidade de recursos financeiros adicionais urgentes para a área de saúde, solicitou ao Auditor Fiscal que esclarecesse: o que é Crédito Adicional, quais os tipos existentes, qual deles seria aplicável na situação de calamidade pública e quais as fontes de recursos aceitas para abertura de créditos suplementares.',
    expectedAnswer: 'O candidato deve abordar: 1. Definição: Créditos Adicionais são autorizações de despesa não computadas ou insuficientemente dotadas na LOA (Art. 40, Lei 4.320/64). 2. Tipos (Art. 41): Suplementares (reforço de dotação), Especiais (despesas sem dotação específica) e Extraordinários (despesas urgentes e imprevistas). 3. Aplicação na Calamidade: O Crédito Extraordinário é o adequado para calamidade pública. 4. Fontes (Art. 43): superávit financeiro do exercício anterior, excesso de arrecadação, anulação parcial ou total de dotações/créditos, e produto de operações de crédito autorizadas.'
  },
  {
    id: 'd8',
    subject: 'Orçamento Público (AFO)',
    topic: 'Ciclo Orçamentário (PPA, LDO e LOA)',
    statement: 'Aponte a lei que delineou o modelo atual de ciclo de planejamento orçamentário da Administração Pública, instituindo as três leis orçamentárias (PPA, LDO e LOA), e a quem atribui a responsabilidade da iniciativa para proposição dessas leis. Em seguida, caracterize brevemente cada uma dessas três leis e descreva de que forma a Lei de Responsabilidade Fiscal (LRF) contribui para o orçamento.',
    expectedAnswer: 'O candidato deve explicar: 1. A Constituição Federal de 1988 (Art. 165) delineou o modelo atual. 2. A iniciativa das leis orçamentárias é exclusiva do Chefe do Poder Executivo. 3. PPA (Plano Plurianual): estabelece, de forma regionalizada, diretrizes, objetivos e metas para as despesas de capital e programas de duração continuada (vigência de 4 anos). 4. LDO (Lei de Diretrizes Orçamentárias): define metas e prioridades para o exercício seguinte, orienta a elaboração da LOA e dispõe sobre alterações na legislação tributária. 5. LOA (Lei Orçamentária Anual): prevê as receitas e fixa as despesas para um ano, contendo orçamentos fiscal, seguridade e investimento. 6. Contribuição da LRF: A LRF (LC 101/2000) contribui para a eficácia do planejamento atuando como instrumento de transparência, impondo limites, contingenciamentos e garantindo a responsabilidade na gestão fiscal e articulação entre PPA, LDO e LOA.'
  },
  {
    id: 'd9',
    subject: 'Finanças Públicas',
    topic: 'Regra de Ouro e Equilíbrio Fiscal',
    statement: 'Tendo em vista déficits primários, o governo busca recursos para evitar o descumprimento de regras fiscais. Diante disso: 1) Discorra sobre a questão do equilíbrio fiscal na ótica da obrigatoriedade da Regra de Ouro. 2) Julgue a licitude e conveniência da capitalização de empresa estatal "não dependente" para realização de políticas públicas do governo federal, no contexto dessa regra.',
    expectedAnswer: 'O candidato deve destacar que: 1. Regra de Ouro: Prevista na CF/88 (Art. 167, III), veda a realização de operações de crédito (endividamento) em montante superior às despesas de capital (investimentos/amortizações), salvo autorização por maioria absoluta do Legislativo. Ela visa o equilíbrio intergeracional (não endividar o Estado para pagar despesas correntes). 2. Empresa Estatal Não Dependente: Como recebem receitas próprias e não dependem de repasses do tesouro para custeio, não integram os limites orçamentários rígidos da União. Logo, capitalizar uma estatal não dependente (ex: EMGEPRON na área de defesa) com espaço fiscal existente é uma medida lícita e viabiliza investimentos públicos e estruturantes sem violar diretamente o teto de operações de crédito (a regra de ouro).'
  }
];
