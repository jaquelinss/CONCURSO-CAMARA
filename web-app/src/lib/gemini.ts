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
        return `Crie um material de estudo detalhado e didático sobre ${subjectDetails}, especificamente para um nível de aprofundamento '${lessonLevel}'. Estruture a resposta como um objeto JSON com as chaves: "titulo", "introducao", e "secoes" (um array de objetos, cada um com "subtitulo" e "conteudo"). No "conteudo", identifique termos-chave que merecem uma explicação extra e os envolva na tag [EXPLICACAO]Termo: Explicação aqui[/EXPLICACAO].`;
    }

    if (studyModel === 'Flashcard') {
        return `Gere ${quantity} flashcards de estudo sobre ${subjectDetails}, com dificuldade ${difficulty}. A resposta DEVE ser estritamente um array de objetos JSON, onde cada objeto representa um flashcard e contém apenas duas chaves: "frente" (a pergunta, termo ou conceito de forma clara) e "verso" (a resposta, definição ou explicação direta e concisa).`;
    }

    return `Gere ${quantity} questões de múltipla escolha sobre ${subjectDetails}, no estilo ${studyModel}, com dificuldade ${difficulty}. Cada questão deve ter 4 opções de resposta. A resposta DEVE ser um array de objetos JSON, cada um com as chaves "pergunta", "opcoes" (um array de 4 strings), "correta" (a string exata da resposta correta) e "explicacao" (uma breve justificativa da resposta correta).`;
};

export const generateContentFromGemini = async (settings: any, apiKey: string) => {
    if (!apiKey) {
      throw new Error("Chave de API não configurada.");
    }
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          tools: [{ googleSearchRetrieval: {} } as any],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2, 
            topP: 0.95,
            topK: 40
          }
        });

        // Adiciona uma instrução extra de contexto ao prompt principal
        const searchContext = settings.subject.toLowerCase().includes('legislação') || settings.subject.toLowerCase().includes('lei') 
            ? "\nImportante: Como o tema inclui legislação específica, use a ferramenta de busca do Google para encontrar a lei oficial mais atualizada do município/estado especificado antes de gerar o conteúdo." 
            : "";

        const prompt = generatePrompt(settings) + searchContext;
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // Parse the JSON securely, finding arrays or objects if there is markdown markdown wrapping
        const jsonMatch = responseText.match(/\[.*\]|\{.*\}/s);
        let parsedData;
        
        if (jsonMatch) {
            parsedData = JSON.parse(jsonMatch[0]);
        } else {
            parsedData = JSON.parse(responseText);
        }
        
        return parsedData;
    } catch (error) {
        console.error("Error generating content from Gemini:", error);
        throw new Error("Falha ao gerar o conteúdo com a IA. Tente novamente.");
    }
};
