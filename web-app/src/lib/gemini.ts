import { GoogleGenerativeAI } from '@google/generative-ai';
import { ENEM_AREAS } from './constants';

export const generatePrompt = (settings: any) => {
    const { subject, model: studyModel, difficulty, quantity, topic, subTopic, specificTopic, lessonLevel } = settings;
    
    let subjectDetails = specificTopic || subject;
    if (!specificTopic && topic && topic !== 'Todos' && !Object.keys(ENEM_AREAS).includes(subject)) {
        subjectDetails += `, tópico '${topic}'`;
        if (subTopic !== 'Todos') {
            subjectDetails += `, subtópico '${subTopic}'`;
        }
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
      { "subtitulo": "Nome da Seção", "conteudo": "Texto da seção com [EXPLICACAO]Termo: Explicação aqui[/EXPLICACAO]" }
    ]
  }
}`;
    }

    if (studyModel === 'Flashcard') {
        return `Analise o tema solicitado: "${subjectDetails}".
1. Identifique a Matéria oficial.
2. Identifique o Tópico.
3. Gere ${quantity} flashcards de estudo com dificuldade ${difficulty}.

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
7. A "explicacao" deve justificar a resposta E APONTAR ESPECIFICAMENTE o erro de cada alternativa incorreta.

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
      "explicacao": "Explicação detalhada justificando a resposta e apontando o erro específico de cada alternativa incorreta"
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
        // If responseMimeType is used, this is rarely needed.
        return raw.replace(/[\u0000-\u0019]+/g, "");
    };

    const jsonMatch = responseText.match(/\[.*\]|\{.*\}/s);
    if (jsonMatch) {
        try {
            return JSON.parse(sanitizeJSON(jsonMatch[0]));
        } catch (e) {
            return JSON.parse(jsonMatch[0]);
        }
    }
    return JSON.parse(sanitizeJSON(responseText));
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
