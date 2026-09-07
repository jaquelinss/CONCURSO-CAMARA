import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useReward } from '../contexts/RewardContext';
import { db } from '../lib/firebase';
import { fetchLeiOrganicaText } from '../lib/gemini';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Bot, Sparkles } from 'lucide-react';

interface QuestionTutorChatProps {
  question: {
    pergunta: string;
    opcoes: string[];
    correta: string;
    explicacao: string;
  };
  subject: string;
  topic: string;
}

export default function QuestionTutorChat({ question, subject, topic }: QuestionTutorChatProps) {
  const { user, activeApiKey: apiKey } = useAuth();
  const { awardPoints } = useReward();
  
  const [doubt, setDoubt] = useState("");
  const [doubtResponse, setDoubtResponse] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [savingDoubt, setSavingDoubt] = useState(false);
  const [doubtSaved, setDoubtSaved] = useState(false);

  const handleAskDoubt = async () => {
    if (!doubt || !apiKey) return;
    setIsAsking(true);
    awardPoints(2, 'ask_doubt');
    setDoubtResponse("");
    
    const formatOpcoes = (opcoes?: string[]) => opcoes ? opcoes.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join(' | ') : 'N/A';
    
    // Load Lei Orgânica text if subject matches
    let leiOrganicaContext = '';
    const subjectStr = String(subject || '').toLowerCase();
    const isLeiOrganica = subjectStr.includes('orgânica') || subjectStr.includes('organica');

    if (isLeiOrganica || subject === 'Lei Orgânica de Caruaru') {
      const leiText = await fetchLeiOrganicaText();
      if (leiText) {
        leiOrganicaContext = `\n\nFONTE OFICIAL OBRIGATÓRIA — LEI ORGÂNICA DO MUNICÍPIO DE CARUARU (compilada até Dezembro de 2024):\nO texto abaixo é o texto OFICIAL da Lei Orgânica do Município de Caruaru. Use EXCLUSIVAMENTE este texto como base para responder. NÃO invente artigos ou incisos que não existam neste texto. Se o aluno questionar a veracidade de um artigo citado na questão, verifique no texto abaixo se ele realmente existe.\n\n--- INÍCIO DO TEXTO OFICIAL ---\n${leiText}\n--- FIM DO TEXTO OFICIAL ---\n`;
      }
    }
    
    const doubtPrompt = `Você é um professor extremamente rigoroso e preciso. Com base na seguinte questão: "${question.pergunta}", nas alternativas: "${formatOpcoes(question.opcoes)}", na resposta correta: "${question.correta}" e na sua explicação: "${question.explicacao}", responda a seguinte dúvida do aluno: "${doubt}". ${leiOrganicaContext}\n\nREGRAS RÍGIDAS:\n1. NUNCA invente ou alucine regras de gramática, ortografia, matemática ou leis. Siga ESTRITAMENTE as normas oficiais.\n2. Se a dúvida do aluno apontar um erro real na questão original, reconheça o erro com honestidade intelectual.${isLeiOrganica ? '\n3. Se o aluno questionar um artigo ou inciso citado na questão, verifique no TEXTO OFICIAL DA LEI fornecido acima se ele realmente existe. Se NÃO existir, reconheça que a questão contém um erro e indique o conteúdo real do artigo conforme o texto oficial.' : ''}\n4. Formate sua resposta usando HTML para melhor legibilidade (<p>, <strong>, <ul>, <li>). Não inclua <html>, <head>, ou <body>.`;
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: doubtPrompt }] }],
          tools: [{ googleSearch: {} }] 
        })
      });
      if (!response.ok) throw new Error("A API de dúvidas falhou em responder.");
      const result = await response.json();
      
      let answerText = result.candidates?.[0]?.content?.parts?.[0]?.text || "Não foi possível gerar uma resposta. Tente novamente.";
      
      const searchChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (searchChunks && searchChunks.length > 0) {
        answerText += `<br><br><div style="font-size: 0.85em; color: #666; border-top: 1px solid #ccc; padding-top: 8px;"><strong>Fontes Pesquisadas:</strong><ul>`;
        searchChunks.forEach((chunk: any) => {
           if (chunk.web?.uri && chunk.web?.title) {
             answerText += `<li><a href="${chunk.web.uri}" target="_blank" rel="noopener noreferrer" style="color: #4f46e5; text-decoration: underline;">${chunk.web.title}</a></li>`;
           }
        });
        answerText += `</ul></div>`;
      }
      
      setDoubtResponse(answerText);
      setDoubt("");
    } catch (err: any) {
      console.error(err);
      setDoubtResponse(`<p style="color: red;">Erro ao processar dúvida: ${err.message}</p>`);
    } finally {
      setIsAsking(false);
    }
  };

  const saveDoubtResponse = async () => {
    if (!user || !doubtResponse || !doubt) return;
    setSavingDoubt(true);
    try {
      const lessonsRef = collection(db, 'users', user.uid, 'lessons');
      await addDoc(lessonsRef, {
        subject,
        topic,
        lessonLevel: 'Dúvida',
        data: {
          titulo: `Dúvida: ${doubt.substring(0, 80)}${doubt.length > 80 ? '...' : ''}`,
          introducao: `Pergunta: ${doubt}`,
          secoes: [{ subtitulo: 'Resposta da IA', conteudo: doubtResponse.replace(/<[^>]*>?/gm, '') }],
        },
        userComment: `Dúvida sobre ${subject} - ${topic}`,
        createdAt: serverTimestamp(),
      });
      setDoubtSaved(true);
      setTimeout(() => setDoubtSaved(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar explicação.');
    } finally {
      setSavingDoubt(false);
    }
  };

  return (
    <div className="w-full mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
      <div className="flex items-center gap-2 mb-3">
        <Bot className="w-4 h-4 text-indigo-500" />
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Professor IA: Tirar Dúvida</h4>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input 
            type="text" 
            value={doubt} 
            onChange={(e) => setDoubt(e.target.value)} 
            placeholder="Ficou com dúvida? Pergunte à IA..." 
            className="flex-grow p-2 text-sm rounded-lg border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAskDoubt();
            }}
          />
          <button 
            onClick={handleAskDoubt} 
            disabled={isAsking || !doubt || !apiKey} 
            className="py-2 px-4 text-sm font-bold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
          >
            {isAsking ? (
              <span className="animate-pulse">Pensando...</span>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Perguntar
              </>
            )}
          </button>
        </div>
        
        {!apiKey && (
           <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Configurar a chave Gemini em Configurações para usar a IA.</p>
        )}

        {doubtResponse && (
          <div className="mt-3 p-4 bg-indigo-50 border-l-4 border-indigo-400 dark:bg-indigo-900/20 dark:border-indigo-500 rounded-r-lg">
            <div className="prose prose-indigo dark:prose-invert prose-sm max-w-none text-indigo-900 dark:text-indigo-100" dangerouslySetInnerHTML={{ __html: doubtResponse }} />
            
            <div className="mt-3 flex justify-end">
              <button
                onClick={saveDoubtResponse}
                disabled={savingDoubt || doubtSaved}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${doubtSaved ? 'bg-green-500 text-white' : 'bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-gray-700'}`}
              >
                {savingDoubt ? 'Salvando...' : doubtSaved ? '✓ Salvo em Meus Salvamentos!' : '💾 Salvar Explicação'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
