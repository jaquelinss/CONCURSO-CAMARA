import React, { useState } from 'react';
import { Upload, AlertCircle, Play } from 'lucide-react';

interface TxtQuizImporterProps {
  onQuizReady: (quizData: any) => void;
  onCancel: () => void;
}

export default function TxtQuizImporter({ onQuizReady, onCancel }: TxtQuizImporterProps) {
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [questionsText, setQuestionsText] = useState('');
  const [answersText, setAnswersText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setter((event.target?.result as string) || '');
    };
    reader.onerror = () => {
      setError('Erro ao ler o arquivo.');
    };
    reader.readAsText(file);
  };

  const parseQuiz = () => {
    setError(null);
    if (!subject.trim() || !topic.trim()) {
      setError('Por favor, defina a Matéria e o Tópico.');
      return;
    }
    if (!questionsText.trim() || !answersText.trim()) {
      setError('Por favor, forneça os textos de questões e gabarito (via arquivo ou cole abaixo).');
      return;
    }

    setParsing(true);

    try {
      // 1. Parse Questions
      const questionBlocks = questionsText.split(/\n(?=\d+\.)/);
      
      const parsedQuestions = questionBlocks.map((block) => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length === 0) return null;

        // The first line(s) before A) are the question
        const optionStartIndex = lines.findIndex(l => /^[a-eA-E][).]\s/.test(l));
        if (optionStartIndex === -1) return null;

        const pergunta = lines.slice(0, optionStartIndex).join('\n').replace(/^\d+\.\s*/, '').trim();
        const rawOptions = lines.slice(optionStartIndex);
        
        // Extract option letter and text
        const opcoesMap: Record<string, string> = {};
        rawOptions.forEach(optLine => {
          const match = optLine.match(/^([a-eA-E])[).]\s+(.*)$/);
          if (match) {
            opcoesMap[match[1].toUpperCase()] = match[2].trim();
          }
        });

        return {
          originalNumber: block.match(/^(\d+)\./)?.[1],
          pergunta,
          opcoesMap,
          opcoesArray: Object.values(opcoesMap)
        };
      }).filter(Boolean) as any[];

      // 2. Parse Answers
      const answerBlocks = answersText.split(/\n(?=\d+\.)/);
      const parsedAnswers = answerBlocks.map(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length === 0) return null;

        // Format expected: "1. B" or "1. Resposta: B"
        const headerMatch = lines[0].match(/^(\d+)\.\s*(?:Resposta:?\s*)?([a-eA-E])/i);
        if (!headerMatch) return null;

        const number = headerMatch[1];
        const correctLetter = headerMatch[2].toUpperCase();
        
        // Everything else is explanation
        const explicacao = lines.slice(1)
          .join('\n')
          .replace(/^(Explica[cç][aã]o|Justificativa):?\s*/i, '')
          .trim();

        return {
          number,
          correctLetter,
          explicacao: explicacao || 'Sem explicação.'
        };
      }).filter(Boolean) as any[];

      // 3. Merge them
      const finalQuestions = parsedQuestions.map(q => {
        const ans = parsedAnswers.find(a => a.number === q.originalNumber);
        if (!ans) {
          throw new Error(`Gabarito não encontrado para a questão ${q.originalNumber}`);
        }

        const correctText = q.opcoesMap[ans.correctLetter];
        if (!correctText) {
          throw new Error(`Alternativa '${ans.correctLetter}' não encontrada na questão ${q.originalNumber}`);
        }

        return {
          pergunta: q.pergunta,
          opcoes: q.opcoesArray,
          correta: correctText, // Needs to be the EXACT string of the option
          explicacao: ans.explicacao
        };
      });

      if (finalQuestions.length === 0) {
        throw new Error("Não foi possível extrair nenhuma questão. Verifique a formatação.");
      }

      const finalQuizData = {
        subject,
        topic,
        difficulty: 'Médio', // Default
        model: 'Questões',
        data: finalQuestions
      };

      onQuizReady(finalQuizData);

    } catch (err: any) {
      setError(err.message || 'Erro desconhecido ao processar os arquivos.');
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-[9999] overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
          <Upload className="w-6 h-6" />
          Importar Quiz de Arquivos TXT
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Não gaste seus tokens! Importe questões e gabaritos em formato de texto.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded text-red-700 dark:text-red-400 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Matéria</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: Direito Administrativo"
              className="w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Tópico</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: Atos Administrativos"
              className="w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Questões */}
          <div className="flex flex-col gap-2">
            <label className="font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span>1. Arquivo de Questões</span>
              <label className="cursor-pointer text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 px-3 py-1 rounded hover:bg-indigo-200 transition-colors">
                <input type="file" accept=".txt" className="hidden" onChange={(e) => handleFileUpload(e, setQuestionsText)} />
                Carregar .TXT
              </label>
            </label>
            <textarea
              value={questionsText}
              onChange={(e) => setQuestionsText(e.target.value)}
              placeholder={`Cole o texto aqui...\n\nFormato esperado:\n1. Qual a capital do Brasil?\nA) Rio de Janeiro\nB) Brasília\nC) São Paulo\nD) Salvador`}
              className="w-full h-64 p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm resize-none"
            />
          </div>

          {/* Gabarito */}
          <div className="flex flex-col gap-2">
            <label className="font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span>2. Arquivo de Gabarito</span>
              <label className="cursor-pointer text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-3 py-1 rounded hover:bg-emerald-200 transition-colors">
                <input type="file" accept=".txt" className="hidden" onChange={(e) => handleFileUpload(e, setAnswersText)} />
                Carregar .TXT
              </label>
            </label>
            <textarea
              value={answersText}
              onChange={(e) => setAnswersText(e.target.value)}
              placeholder={`Cole o texto aqui...\n\nFormato esperado:\n1. B\nExplicação: Brasília foi inaugurada em 1960 e é a atual capital.`}
              className="w-full h-64 p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 rounded-lg font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={parseQuiz}
            disabled={parsing}
            className="px-6 py-2.5 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2 shadow-md transition-colors disabled:opacity-50"
          >
            <Play className="w-5 h-5" />
            {parsing ? 'Processando...' : 'Montar e Iniciar Quiz'}
          </button>
        </div>
      </div>
    </div>
  );
}
