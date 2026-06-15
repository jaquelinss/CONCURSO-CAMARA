import { GoogleGenerativeAI } from '@google/generative-ai';
import { ENEM_AREAS, isLawSubject, subjectsGeral } from './constants';

/**
 * Sanitiza uma string JSON mal formatada (com backslashes literais, como LaTeX ou caminhos) antes de fazer o parse.
 * Tenta um parse direto primeiro, e só escapa os backslashes se o primeiro falhar.
 */
export const safeJsonParse = (str: any): any => {
    if (typeof str !== 'string') {
        if (typeof str === 'object' && str !== null) return str;
        throw new Error("Input to safeJsonParse must be a string or object.");
    }
    
    const jsonMatch = str.match(/\[.*\]|\{.*\}/s);
    const stringToParse = jsonMatch ? jsonMatch[0] : str;

    try {
        return JSON.parse(stringToParse);
    } catch (e1) {
        try {
            // Escapa apenas os backslashes (ex: \f de \frac vira \\f) to prevent JSON parse crashes
            const sanitizedString = stringToParse.replace(/\\/g, "\\\\");
            return JSON.parse(sanitizedString);
        } catch (e2) {
            console.error("safeJsonParse failed on e2 (likely literal newlines in string):", e2, "Sanitized string was:", stringToParse.replace(/\\/g, "\\\\"));
            throw e2; 
        }
    }
};

export const generatePrompt = (settings: any) => {
    const { subject, model: studyModel, difficulty, quantity, topic, subTopic, specificTopic, lessonLevel } = settings;
    
    let subjectDetails = specificTopic || subject;
    if (!specificTopic && topic && topic !== 'Todos' && !Object.keys(ENEM_AREAS).includes(subject)) {
        subjectDetails += `, tópico '${topic}'`;
        if (subTopic !== 'Todos') {
            subjectDetails += `, subtópico '${subTopic}'`;
        }
    }

    if (subject === 'Redação' && studyModel === 'Enem') {
        return `Crie uma proposta de redação completa no modelo ENEM sobre o eixo temático: ${topic === 'Todos' || !topic ? 'qualquer tema relevante para 2025 no Brasil' : topic}. A proposta deve ser relevante para a realidade brasileira. Forneça um título para a proposta, a frase-tema, 3 textos motivadores curtos (cada um com cerca de 50-80 palavras), e 4 sugestões de repertório sociocultural. A resposta DEVE ser um único objeto JSON com as chaves "tema", "frase_tema", "textos_motivadores" (um array de strings), e "repertorios" (um array de objetos, cada um com as chaves "tipo" [ex: "Filme", "Livro", "Citação", "Dado Histórico"] e "sugestao").`;
    }

    if (studyModel === 'Aula Explicativa') {
        return `Você é um professor experiente. Analise o seguinte tema solicitado: "${subjectDetails}". 
1. Identifique a qual disciplina acadêmica oficial (Matéria) ele pertence (ex: Direito Constitucional, Matemática, Raciocínio Lógico, Língua Portuguesa, etc).
2. Identifique o Tópico principal.
3. Crie um material de estudo detalhado e didático sobre o tema, especificamente para um nível de aprofundamento '${lessonLevel}'.

A resposta DEVE ser estritamente um objeto JSON com o seguinte formato exato:
{
  "materia_identificada": "Nome da Matéria Oficial",
  "topico_identificado": "Nome do Tópico",
  "conteudo": {
    "titulo": "Título da Aula",
    "introducao": "Texto de introdução",
    "secoes": [
      { "subtitulo": "Nome da Seção", "conteudo": "Texto da seção com [EXPLICACAO]Termo: Explicação aqui[/EXPLICACAO]${(settings.leiSecaEnabled !== false && isLawSubject(settings.subject)) ? ' e [LEI_SECA]Texto literal da lei aplicável aqui[/LEI_SECA]' : ''}" }
    ]
  }
}`;
    }

    if (studyModel === 'Flashcard') {
        let flashcardFormatInstruction = `Gere ${quantity} flashcards de estudo com dificuldade ${difficulty}.`;
        if (subject === 'Redação' && topic === 'Repertório Sociocultural') {
            flashcardFormatInstruction = `Gere ${quantity} flashcards de estudo com dificuldade ${difficulty}. O formato deve ser um gatilho de memória ou conceito na 'frente' e a informação completa (citação, dado, nome da obra, etc.) no 'verso', como uma ferramenta de memorização. Exemplo: {"frente": "Obra de Michel Foucault sobre vigilância", "verso": "'Vigiar e Punir' (1975)"}. Evite o formato de pergunta e resposta.`;
        }

        return `Analise o tema solicitado: "${subjectDetails}".
1. Identifique a Matéria oficial.
2. Identifique o Tópico.
3. ${flashcardFormatInstruction}

A resposta DEVE ser estritamente um objeto JSON com o seguinte formato exato:
{
  "materia_identificada": "Nome da Matéria Oficial",
  "topico_identificado": "Nome do Tópico",
  "conteudo": [
    { "frente": "pergunta ou conceito", "verso": "resposta ou definição" }
  ]
}`;
    }

    return `Atue como uma banca examinadora rigorosa de concursos públicos. Analise o tema solicitado: "${subjectDetails}".
1. Identifique a Matéria oficial.
2. Identifique o Tópico.
3. Gere ${quantity} questões de múltipla escolha no estilo ${studyModel}.
Nível de dificuldade exigido: ${difficulty}. As questões devem ter um nível de complexidade compatível com a dificuldade informada. Se a dificuldade for "Médio" ou "Difícil", elabore enunciados contextualizados e alternativas que exijam reflexão profunda, evitando respostas óbvias ou dadas pelo próprio enunciado.

REGRAS ABSOLUTAS E INVIOLÁVEIS PARA AS QUESTÕES:
1. Cada questão deve ter exatas 4 opções de resposta.
2. Apenas UMA alternativa deve estar correta. As outras TRÊS devem estar OBJETIVAMENTE e INDISCUTIVELMENTE incorretas.
3. NÃO gere questões onde todas ou várias alternativas possam ser consideradas corretas. Se isso acontecer, a questão é INVÁLIDA.
4. Para distratores (alternativas erradas), use erros CLAROS e VERIFICÁVEIS: dados incorretos, conceitos trocados, definições invertidas, exceções apresentadas como regra, informações inventadas, etc.
5. Verifique a lógica da questão: se pedir a alternativa CORRETA, as outras 3 precisam estar absolutamente ERRADAS. Se pedir a INCORRETA, as outras 3 precisam estar CERTAS.
6. Não inclua as letras "A)", "B)", "C)", "D)" no texto das opções, apenas o conteúdo da resposta.
7. A "explicacao" deve justificar a resposta E APONTAR ESPECIFICAMENTE o erro de cada alternativa incorreta. NUNCA referencie as alternativas por posição (ex: "a primeira alternativa", "a letra A"), referencie sempre pelo conteúdo da opção, pois a ordem será embaralhada.
8. NÃO crie questões que dependam de formatação visual (palavras "sublinhadas", "negritadas" ou "destacadas") nas alternativas. Como o sistema não suporta formatação rica nas opções de resposta, se precisar referenciar uma palavra, escreva-a EXPLICITAMENTE no enunciado (Ex: "Na frase X, a palavra 'Y' exerce a função de..."). NUNCA use a expressão "o termo sublinhado".
${(settings.leiSecaEnabled !== false && isLawSubject(settings.subject)) ? '9. Como este é um assunto de legislação, inclua também a chave "lei_seca" contendo o trecho exato (literal) da lei, artigo, parágrafo ou inciso que fundamenta a resposta correta.' : ''}

AUTO-VALIDAÇÃO OBRIGATÓRIA (faça ANTES de retornar):
- Releia cada questão gerada e pergunte-se: "Algum especialista no assunto poderia argumentar que outra alternativa também está correta?"
- Se a resposta for SIM, DESCARTE essa questão e gere outra no lugar.
- Em questões de gramática/ortografia: verifique CADA palavra de CADA alternativa contra as normas oficiais antes de marcar como certa ou errada.
- Em questões de legislação: verifique artigos e incisos específicos.
- NUNCA gere questões do tipo "qual dessas palavras está grafada corretamente" onde TODAS as palavras listadas estejam corretas. Isso é um erro gravíssimo.

A resposta DEVE ser estritamente um objeto JSON com o seguinte formato exato:
{
  "materia_identificada": "Nome da Matéria Oficial",
  "topico_identificado": "Nome do Tópico",
  "conteudo": [
    {
      "pergunta": "Texto completo do enunciado da pergunta",
      "opcoes": ["Texto da opção 1", "Texto da opção 2", "Texto da opção 3", "Texto da opção 4"],
      "correta": "O texto exato e idêntico da opção que está correta",
      "explicacao": "Explicação detalhada justificando a resposta e apontando o erro específico de cada alternativa incorreta"${(settings.leiSecaEnabled !== false && isLawSubject(settings.subject)) ? ',\n      "lei_seca": "Trecho literal da lei correspondente"' : ''}
    }
  ]
}`;
};

export const generateContentFromGemini = async (settings: any, apiKey: string, modelName: string = 'gemini-2.5-flash') => {
    if (!apiKey) {
      throw new Error("Chave de API não configurada.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = buildPrompt(settings);

    const needsSearch = settings.subject?.toLowerCase().includes('legislação') 
        || settings.subject?.toLowerCase().includes('lei')
        || settings.subject?.toLowerCase().includes('orgânica');

    if (needsSearch) {
        try {
            return await callGemini(genAI, prompt, true, modelName);
        } catch (firstError: any) {
            console.warn("Tentativa com googleSearch falhou, tentando sem busca:", firstError.message);
            try {
                return await callGemini(genAI, prompt, false, modelName);
            } catch (secondError: any) {
                console.error("Ambas as tentativas falharam:", secondError);
                throw new Error(`Falha técnica ao gerar com IA: ${secondError.message}. Verifique sua chave API.`);
            }
        }
    } else {
        try {
            return await callGemini(genAI, prompt, false, modelName);
        } catch (error: any) {
            console.error("Falha ao gerar conteúdo:", error);
            throw new Error(`Falha técnica ao gerar com IA: ${error.message}. Verifique sua chave API.`);
        }
    }
};

export const correctEssayFromGemini = async (
    proposal: any,
    essayText: string | null,
    essayImageBase64: string | null,
    apiKey: string,
    modelName: string = 'gemini-2.5-flash'
) => {
    if (!apiKey) {
      throw new Error("Chave de API não configurada.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const textPrompt = essayText ? `A redação a ser corrigida é: "${essayText}"` : "A redação a ser corrigida está na imagem a seguir. Transcreva o texto e faça a análise.";
    
    const correctionPrompt = `Você é um corretor de redações especialista no modelo ENEM, baseado na matriz de correção oficial.
Primeiro, se houver uma imagem, transcreva o texto dela com a máxima fidelidade. Preste atenção especial em reconhecer corretamente os acentos (como á, é, ç) e a pontuação. Seja extremamente cuidadoso com a pontuação, especialmente vírgulas. Respeite as vírgulas usadas corretamente pelo usuário e só aponte erro se a vírgula estiver comprovadamente mal empregada (ex: separando sujeito de predicado) ou ausente em um local obrigatório (ex: isolando um aposto). Se uma palavra estiver dividida no final de uma linha com um hífen, junte a palavra sem o hífen na transcrição. Atenção especial à estrutura sintática: Tenha cuidado ao identificar períodos justapostos. Por exemplo, em uma frase como '...continua utilizando termos preconceituosos e ofensivos e, com isso, ele não está mais incentivando...', o pronome 'ele' está corretamente inserido na oração. Evite sugerir um ponto final antes de pronomes que estão dando sequência lógica a uma ideia anterior dentro do mesmo período.
Depois, analise a seguinte redação com base na proposta (Tema: '${proposal.tema || proposal.frase_tema}'). ${textPrompt}.
Forneça uma correção completa e detalhada, estruturada como um objeto JSON. A resposta DEVE ser um objeto JSON válido, minificado em uma única linha, com todos os caracteres especiais dentro dos valores de string devidamente escapados (por exemplo, \\n, \\", \\\\). O objeto DEVE ter as seguintes chaves:
1. "nota_final": um número de 0 a 1000.
2. "analise_competencias": um objeto com chaves "c1" a "c5". Cada chave deve conter um objeto com "nota" (0 a 200) e "justificativa" (string explicando a nota).
3. "texto_corrigido_html": uma string HTML contendo o texto original do usuário. Nesta string, você DEVE marcar os seguintes elementos usando tags <span> com as classes CSS especificadas:
    - Regra de Ouro: NUNCA altere as palavras originais do usuário, apenas adicione as tags <span> ao redor delas. A única exceção é para erros de ortografia óbvios.
    - Erros graves (gramática, ortografia, pontuação incorreta, truncamento): use a classe "erro-vermelho". Crucial: adicione um atributo 'title' a esta tag explicando o erro e sugerindo a forma correta. Exemplo: <span class="erro-vermelho" title="Erro de concordância. O correto seria: 'fazem'">fais</span>.
    - Erros leves ou pontos a melhorar (repetição, clareza): class="erro-amarelo"
    - Acertos notáveis (boa argumentação, uso de repertório): class="acerto-verde"
    - Tese: class="tese"
    - Repertório sociocultural: class="repertorio"
    - Conectivos (operadores argumentativos): class="conectivo"
    - Proposta de intervenção (o parágrafo inteiro): class="intervencao"
    - Dentro da intervenção, marque os 5 elementos: Agente (class="agente"), Ação (class="acao"), Meio/Modo (class="meio"), Finalidade (class="finalidade"), Detalhamento (class="detalhamento").
Seja rigoroso e detalhista como um corretor oficial do ENEM.`;

    const modelConfig: any = {
        model: modelName,
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2, 
            topP: 0.95,
            topK: 40
        }
    };

    const model = genAI.getGenerativeModel(modelConfig);
    const parts: any[] = [{ text: correctionPrompt }];
    if (essayImageBase64) {
        parts.push({
            inlineData: {
                mimeType: 'image/jpeg',
                data: essayImageBase64.split(',')[1]
            }
        });
    }

    const result = await model.generateContent(parts);
    const responseText = result.response.text();
    return safeJsonParse(responseText);
};

function buildPrompt(settings: any): string {
    const basePrompt = generatePrompt(settings);
    
    // Instrução extra para legislação
    const needsSearch = settings.subject?.toLowerCase().includes('legislação') 
        || settings.subject?.toLowerCase().includes('lei')
        || settings.subject?.toLowerCase().includes('orgânica');
    
    if (needsSearch) {
        // Inject search instruction before the JSON format block
        const searchInstruction = "\nREQUISITO OBRIGATÓRIO: Como o tema inclui legislação específica, use a ferramenta de busca do Google para encontrar a lei oficial mais atualizada do município/estado especificado antes de gerar o conteúdo.\n";
        return basePrompt.replace("A resposta DEVE ser estritamente um objeto JSON", searchInstruction + "\nA resposta DEVE ser estritamente um objeto JSON");
    }

    return basePrompt;
}

async function callGemini(genAI: any, prompt: string, useSearch: boolean, modelName: string = 'gemini-2.5-flash') {
    const modelConfig: any = {
        model: modelName,
        generationConfig: {
            temperature: 0.2,
            topP: 0.95,
            topK: 40
        }
    };

    if (useSearch) {
        modelConfig.tools = [{ googleSearch: {} }];
    } else {
        modelConfig.generationConfig.responseMimeType = "application/json";
    }

    const model = genAI.getGenerativeModel(modelConfig);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const sanitizeJSON = (raw: string) => {
        // Remove control characters that break JSON.parse (except actual \n which should be escaped)
        return raw.replace(/[\u0000-\u0019]+/g, "");
    };

    const jsonMatch = responseText.match(/\[.*\]|\{.*\}/s);
    if (jsonMatch) {
        try {
            return safeJsonParse(jsonMatch[0]);
        } catch (e) {
            return safeJsonParse(responseText);
        }
    }
    return safeJsonParse(sanitizeJSON(responseText));
}

export async function extractTopicsFromDoc(text: string, apiKey: string, modelName: string = 'gemini-2.5-flash') {
    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = `Você é um especialista em educação. Analise o seguinte texto que contém um conteúdo programático ou plano de estudos de um concurso/prova:\n\n"${text.substring(0, 15000)}"\n\nExtraia e organize as matérias e seus respectivos tópicos em formato estruturado.\n\nA resposta DEVE ser estritamente um objeto JSON com o formato:\n{\n  "subjects": [\n    { "name": "Nome da Matéria", "topics": ["Tópico 1", "Tópico 2", "Tópico 3"] }\n  ]\n}`;
    return await callGemini(genAI, prompt, false, modelName);
}

export async function generateStudyPlan(config: {
    subjects: { name: string; topics: string[] }[];
    hoursPerDay: number;
    studyDays: string[];
    examDate: string;
    startDate: string;
}, apiKey: string, modelName: string = 'gemini-2.5-flash') {
    const genAI = new GoogleGenerativeAI(apiKey);
    const dayNames: Record<string, string> = { dom: 'Domingo', seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado' };
    const daysStr = config.studyDays.map(d => dayNames[d] || d).join(', ');
    const subjectsStr = config.subjects.map(s => `- ${s.name}: ${s.topics.join(', ')}`).join('\n');

    const prompt = `Você é um planejador educacional especialista. Crie um cronograma de estudos diário detalhado com base nas seguintes informações:

MATÉRIAS E TÓPICOS:
${subjectsStr}

CONFIGURAÇÕES:
- Horas de estudo por dia: ${config.hoursPerDay}h
- Dias de estudo na semana: ${daysStr}
- Data de início: ${config.startDate}
- Data da prova: ${config.examDate}

REGRAS:
1. Distribua os tópicos de forma lógica e progressiva (do básico ao avançado).
2. Alterne entre matérias diferentes no mesmo dia para evitar fadiga.
3. Cada bloco de estudo deve ter no mínimo 0.5h e no máximo 2h.
4. A soma dos blocos de cada dia deve ser exatamente ${config.hoursPerDay}h.
5. Gere APENAS dias que caiam nos dias da semana selecionados.
6. Tópicos mais densos podem se repetir em dias diferentes.
7. Distribua o conteúdo de forma que tudo seja coberto antes da data da prova.

A resposta DEVE ser estritamente um objeto JSON com o formato:
{
  "schedule": [
    {
      "date": "YYYY-MM-DD",
      "blocks": [
        { "subject": "Nome da Matéria", "topic": "Nome do Tópico", "hours": 1.5 }
      ]
    }
  ]
}`;
    return await callGemini(genAI, prompt, false, modelName);
}

export const formatTextToPostIt = async (text: string, apiKey: string, contextPromptSuffix: string = ''): Promise<{ title: string; content: string }> => {
    if (!apiKey) throw new Error("Chave de API não configurada.");
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const prompt = `${contextPromptSuffix ? `Instrução do Sistema: Você é um assistente focado em resumir informações cruciais em formatos curtos para post-its. ${contextPromptSuffix}\n\n` : ''}Atue como um estudante de alta performance. Crie um resumo conciso e VISUALMENTE BONITO (estilo post-it de parede) a partir do seguinte texto:
"${text}"

Regras OBRIGATÓRIAS:
1. PRIMEIRA LINHA: Um título curto e chamativo seguido de um emoji relevante (ex: "Advérbios: O Toque Mágico! ✨"). SEM marcadores no título.
2. LINHAS SEGUINTES: Organize as informações em tópicos usando "•" como marcador.
3. Use emojis temáticos (📍🕐💪✅❌🤔⇒→) para tornar o post-it visualmente rico e fácil de escanear.
4. Destaque PALAVRAS-CHAVE em MAIÚSCULAS quando apropriado.
5. Use "⇒" ou "→" para conectar causa/consequência ou explicações complementares.
6. Se o texto tiver categorias/tipos, organize como subtópicos com "  •" (indentado).
7. Seja EXTREMAMENTE conciso — cada tópico deve ter no máximo 1 linha.
8. PROIBIDO: Markdown (**, *, #, etc). Apenas texto puro com emojis e marcadores "•".

Exemplo de formato ideal:
Tipos de Verbos 📝
• AÇÃO 🏃: Correr, pular, estudar
• ESTADO 😌: Ser, estar, parecer
• LIGAÇÃO 🔗: Conecta sujeito ao predicativo
  ⇒ Ex: "Ela PARECE feliz"

Retorne SOMENTE o post-it. Nada mais.`;
    
    const modelConfig: any = {
        model: 'gemini-2.5-flash',
        generationConfig: {
            temperature: 0.3, 
        }
    };

    const model = genAI.getGenerativeModel(modelConfig);
    
    let textResp = '';
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        textResp = response.text().trim();
        break;
      } catch (retryError: any) {
        const is503 = retryError?.message?.includes('503') || retryError?.status === 503;
        if (is503 && attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
          continue;
        }
        throw retryError;
      }
    }
    
    const lines = textResp.split('\n');
    const title = lines[0].replace(/\*\*/g, '').replace(/#/g, '').trim();
    const content = lines.slice(1).join('\n').trim().replace(/\*\*/g, '');
    
    return { title, content };
};

export const generateNoteTag = async (content: string, title: string, apiKey: string): Promise<{tag: string, subtag: string}> => {
    if (!apiKey) throw new Error("Chave de API não configurada.");
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const prompt = `Analise o seguinte post-it:\n\nTítulo: "${title}"\nConteúdo: "${content}"\n\nRegras:\n1. Identifique a Matéria principal. Você DEVE priorizar dar o match exato com uma das seguintes matérias oficiais do aplicativo: ${subjectsGeral.join(', ')}. Se nenhuma se encaixar perfeitamente, use nomes abrangentes padrão. Se não conseguir identificar, use "Geral".\n2. Identifique o Tópico ou Assunto Específico (ex: "Crase", "Licitações", "Porcentagem"). Seja sucinto.\n\nA resposta DEVE ser estritamente um objeto JSON com o formato:\n{"tag": "Nome da Matéria", "subtag": "Nome do Tópico"}`;
    
    return await callGemini(genAI, prompt, false, 'gemini-2.5-flash');
};

export async function suggestVideoSearches(subject: string, topic: string, apiKey: string, modelName: string = 'gemini-2.5-flash') {
    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = `Você é um curador de conteúdo educacional. Seu objetivo é ajudar um estudante a encontrar as melhores videoaulas no YouTube para um tópico específico de estudo.

Matéria: ${subject}
Tópico do Bloco: ${topic}

Analise o tópico. Se for um tópico único e específico, gere 1 ou 2 buscas otimizadas para o YouTube.
Se o tópico for muito amplo ou composto por vários subtópicos diferentes que dificilmente seriam bem ensinados em um único vídeo, divida em buscas separadas (máximo 3 buscas).

Gere buscas que retornem videoaulas completas e de qualidade (use palavras-chave como "aula", "concurso", "curso completo", etc, se apropriado).

A resposta DEVE ser estritamente um objeto JSON com o formato:
{
  "searches": [
    {
      "query": "texto da busca otimizada para colar no youtube",
      "topicsCovered": "Quais subtópicos esta busca cobre",
      "reason": "Por que esta busca é sugerida"
    }
  ]
}`;
    return await callGemini(genAI, prompt, false, modelName);
}

export async function suggestRescheduleDate(futureSchedule: any[], block: any, apiKey: string, modelName: string = 'gemini-2.5-flash') {
  if (!apiKey) throw new Error("API key is required");
  const genAI = new GoogleGenerativeAI(apiKey);

  // Limitar para não exceder tokens (próximos 21 dias é razoável)
  const contextSchedule = futureSchedule.slice(0, 21).map(day => ({
    date: day.date,
    totalBlocks: day.blocks?.length || 0,
    totalHours: day.blocks?.reduce((acc: number, b: any) => acc + (b.hours || 0), 0) || 0,
    subjects: day.blocks?.map((b: any) => b.subject).join(', ') || 'Nenhuma'
  }));

  const prompt = `Você é um planejador de estudos especialista.
O estudante precisa reagendar a seguinte matéria:
Matéria: ${block.subject}
Tópico: ${block.topic}
Carga horária estimada: ${block.hours}h

Abaixo está o resumo dos próximos dias disponíveis no cronograma do estudante:
${JSON.stringify(contextSchedule, null, 2)}

Seu objetivo é escolher a melhor data (date) para reagendar este bloco.
Regras:
1. Tente não sobrecarregar um dia que já tenha muitas horas (ex: mais de 6h).
2. Tente agrupar a matéria no mesmo dia que outras matérias correlatas, ou se preferir espalhar, escolha um dia mais leve.
3. Se todos os dias estiverem cheios, escolha o primeiro dia possível com menos blocos.
4. Você deve retornar EXATAMENTE um JSON válido com a estrutura abaixo, sem marcações markdown ao redor.

{
  "suggestedDate": "YYYY-MM-DD",
  "reason": "Explicação curta do motivo da escolha desta data"
}`;

  return await callGemini(genAI, prompt, false, modelName);
}
