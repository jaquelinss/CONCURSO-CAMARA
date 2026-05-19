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

    return `Analise o tema solicitado: "${subjectDetails}".
1. Identifique a Matéria oficial.
2. Identifique o Tópico.
3. Gere ${quantity} questões de múltipla escolha no estilo ${studyModel}, com dificuldade ${difficulty}. Cada questão deve ter 4 opções.

A resposta DEVE ser estritamente um objeto JSON com o seguinte formato exato:
{
  "materia_identificada": "Nome da Matéria Oficial",
  "topico_identificado": "Nome do Tópico",
  "conteudo": [
    {
      "pergunta": "Texto da pergunta",
      "opcoes": ["A", "B", "C", "D"],
      "correta": "Opção correta exata",
      "explicacao": "Explicação da resposta"
    }
  ]
}`;
};

export const generateContentFromGemini = async (settings: any, apiKey: string) => {
    if (!apiKey) {
      throw new Error("Chave de API não configurada.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = buildPrompt(settings);

    // Estratégia de resiliência:
    // 1º) Tenta com Google Search (melhor para legislação e dados atuais)
    // 2º) Se falhar por qualquer motivo da API, tenta sem a ferramenta de busca
    try {
        return await callGemini(genAI, prompt, true);
    } catch (firstError: any) {
        console.warn("Tentativa com googleSearch falhou, tentando sem busca:", firstError.message);
        try {
            return await callGemini(genAI, prompt, false);
        } catch (secondError: any) {
            console.error("Ambas as tentativas falharam:", secondError);
            throw new Error("Falha ao gerar o conteúdo com a IA. Verifique sua chave de API e tente novamente.");
        }
    }
};

function buildPrompt(settings: any): string {
    const basePrompt = generatePrompt(settings);
    
    // Instrução extra para legislação
    const needsSearch = settings.subject?.toLowerCase().includes('legislação') 
        || settings.subject?.toLowerCase().includes('lei')
        || settings.subject?.toLowerCase().includes('orgânica');
    
    const searchContext = needsSearch
        ? "\nImportante: Como o tema inclui legislação específica, use a ferramenta de busca do Google para encontrar a lei oficial mais atualizada do município/estado especificado antes de gerar o conteúdo."
        : "";

    return basePrompt + searchContext;
}

async function callGemini(genAI: any, prompt: string, useSearch: boolean) {
    const modelConfig: any = {
        model: 'gemini-2.5-flash',
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
            topP: 0.95,
            topK: 40
        }
    };

    if (useSearch) {
        modelConfig.tools = [{ googleSearch: {} }];
    }

    const model = genAI.getGenerativeModel(modelConfig);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const jsonMatch = responseText.match(/\[.*\]|\{.*\}/s);
    if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(responseText);
}

