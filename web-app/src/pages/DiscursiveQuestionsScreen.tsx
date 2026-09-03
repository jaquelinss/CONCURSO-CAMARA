import { useState } from 'react';
import Navigation from '../components/Navigation';
import { HelpCircle, Loader2, CheckCircle, Search, FileText, Sparkles, Lightbulb } from 'lucide-react';
import { discursiveQuestionsData } from '../lib/discursiveData';
import type { DiscursiveQuestion } from '../lib/discursiveData';
import { useAuth } from '../contexts/AuthContext';
import { analyzeDiscursiveAnswer, generateStudyCards } from '../lib/gemini';

export default function DiscursiveQuestionsScreen() {
  const { apiKey } = useAuth();
  const [selectedQuestion, setSelectedQuestion] = useState<DiscursiveQuestion | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showExpectedAnswer, setShowExpectedAnswer] = useState(false);
  const [studyCards, setStudyCards] = useState<{title: string, content: string}[] | null>(null);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);

  const filteredQuestions = discursiveQuestionsData.filter(q => 
    q.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
    q.topic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEvaluate = async () => {
    if (!apiKey) {
      alert("Configure sua chave da API do Gemini nas configurações para corrigir discursivas.");
      return;
    }
    if (answerText.trim().split(/\s+/).length < 20) {
      alert("Sua resposta está muito curta. Tente desenvolver melhor seus argumentos.");
      return;
    }

    setIsEvaluating(true);
    setFeedback(null);
    try {
      const result = await analyzeDiscursiveAnswer(
        selectedQuestion!.statement,
        selectedQuestion!.expectedAnswer,
        answerText,
        apiKey
      );
      setFeedback(result);
      setShowExpectedAnswer(true);
    } catch (e) {
      console.error(e);
      alert("Erro ao avaliar resposta. Tente novamente.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleGenerateCards = async () => {
    if (!apiKey) {
      alert("Configure sua chave da API do Gemini para gerar dicas.");
      return;
    }
    setIsGeneratingCards(true);
    try {
      const result = await generateStudyCards(selectedQuestion!.subject, selectedQuestion!.topic, apiKey);
      setStudyCards(result.cards || []);
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar dicas.");
    } finally {
      setIsGeneratingCards(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    if (score >= 5) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
    return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-4rem)] flex flex-col md:flex-row gap-6">
        
        {/* Sidebar - Question List */}
        <div className="w-full md:w-1/3 flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-700 overflow-hidden h-full">
          <div className="p-4 border-b border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/50">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-indigo-500" />
              Treino de Discursivas
            </h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar disciplina ou assunto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {filteredQuestions.map((q) => (
              <button
                key={q.id}
                onClick={() => {
                  if (selectedQuestion?.id !== q.id) {
                    setSelectedQuestion(q);
                    setAnswerText('');
                    setFeedback(null);
                    setShowExpectedAnswer(false);
                    setStudyCards(null);
                  }
                }}
                className={`w-full text-left p-3 mb-2 rounded-xl transition-all border ${
                  selectedQuestion?.id === q.id 
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' 
                    : 'bg-white dark:bg-gray-800 border-transparent hover:border-slate-200 dark:hover:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 uppercase tracking-wider mb-2">
                    {q.subject}
                  </span>
                </div>
                <p className="font-semibold text-slate-800 dark:text-gray-100 text-sm leading-tight mb-1">
                  {q.topic}
                </p>
              </button>
            ))}
            {filteredQuestions.length === 0 && (
              <div className="p-4 text-center text-slate-500 text-sm">
                Nenhuma questão encontrada.
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Question & Editor */}
        <div className="w-full md:w-2/3 flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-700 overflow-hidden h-full">
          {selectedQuestion ? (
            <div className="flex flex-col h-full overflow-y-auto">
              {/* Enunciado */}
              <div className="p-6 border-b border-slate-200 dark:border-gray-700 bg-slate-50/30 dark:bg-gray-800/30 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      {selectedQuestion.subject}
                    </span>
                    <span className="text-slate-300 dark:text-gray-600">•</span>
                    <span className="text-xs font-medium text-slate-500 dark:text-gray-400">
                      {selectedQuestion.topic}
                    </span>
                  </div>
                  
                  <button
                    onClick={handleGenerateCards}
                    disabled={isGeneratingCards}
                    className="text-xs font-semibold px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800"
                  >
                    {isGeneratingCards ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Dicas / Revisão IA
                  </button>
                </div>
                
                {/* Mini Cards Display */}
                {studyCards && studyCards.length > 0 && (
                  <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {studyCards.map((card, idx) => (
                      <div key={idx} className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl p-3 shadow-sm">
                        <h4 className="font-bold text-amber-800 dark:text-amber-500 text-sm flex items-center gap-1.5 mb-1.5">
                          <Lightbulb className="w-4 h-4" /> {card.title}
                        </h4>
                        <p className="text-xs text-amber-900/80 dark:text-amber-200/70 leading-relaxed">{card.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-gray-300">
                  <p>{selectedQuestion.statement}</p>
                </div>
              </div>

              {/* Área de Resposta */}
              <div className="p-6 flex-1 flex flex-col">
                <label className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-gray-200">Sua Resposta:</span>
                  <span className="text-xs text-slate-400">{answerText.trim().split(/\s+/).filter(Boolean).length} palavras</span>
                </label>
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Escreva sua resposta aqui. Tente estruturar bem seus parágrafos, sem necessidade de rascunhos..."
                  className="flex-1 w-full p-4 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[200px]"
                />

                <div className="mt-4 flex justify-end gap-3">
                  <button
                    onClick={() => setShowExpectedAnswer(!showExpectedAnswer)}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    {showExpectedAnswer ? 'Ocultar Padrão de Resposta' : 'Ver Padrão de Resposta'}
                  </button>
                  <button
                    onClick={handleEvaluate}
                    disabled={isEvaluating || !answerText.trim()}
                    className="px-5 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors shadow-sm shadow-indigo-200 dark:shadow-none flex items-center gap-2"
                  >
                    {isEvaluating ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Corrigindo...</>
                    ) : (
                      <><CheckCircle className="w-4 h-4" /> Avaliar com IA</>
                    )}
                  </button>
                </div>
              </div>

              {/* Padrão de Resposta */}
              {showExpectedAnswer && (
                <div className="px-6 pb-6">
                  <div className="p-4 bg-slate-100 dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-700">
                    <h4 className="text-sm font-bold text-slate-700 dark:text-gray-200 mb-2 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-slate-400" /> Espelho / Padrão Esperado
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-gray-400 leading-relaxed">
                      {selectedQuestion.expectedAnswer}
                    </p>
                  </div>
                </div>
              )}

              {/* Feedback da IA */}
              {feedback && (
                <div className="mx-6 mb-6">
                  <div className={`p-5 rounded-2xl border ${getScoreColor(feedback.score)}`}>
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-current/10">
                      <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          <CheckCircle className="w-5 h-5" /> Correção da IA
                        </h3>
                        <p className="text-xs opacity-80 mt-1">Foco 100% no conteúdo, aderência ao espelho e estrutura argumentativa.</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-black">{feedback.score.toFixed(1)}<span className="text-lg opacity-60 font-medium">/10</span></div>
                        <span className="text-xs uppercase font-bold tracking-wider opacity-80">Nota</span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-bold text-sm mb-1 uppercase tracking-wider opacity-80">Pontos Fortes</h4>
                        <ul className="list-disc list-inside text-sm space-y-1 opacity-90">
                          {feedback.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm mb-1 uppercase tracking-wider opacity-80">Pontos a Melhorar (O que faltou)</h4>
                        <ul className="list-disc list-inside text-sm space-y-1 opacity-90">
                          {feedback.weaknesses.map((w: string, i: number) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm mb-1 uppercase tracking-wider opacity-80">Avaliação Detalhada</h4>
                        <div className="prose prose-sm prose-p:leading-relaxed prose-p:opacity-90 max-w-none text-current space-y-2">
                          {feedback.detailedAnalysis.split('\n').map((para: string, idx: number) => (
                            para.trim() ? <p key={idx}>{para}</p> : null
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
              <div className="w-16 h-16 bg-slate-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 dark:text-gray-200 mb-2">Selecione uma Questão</h3>
              <p className="text-slate-500 dark:text-gray-400 max-w-sm">
                Escolha uma questão discursiva no menu lateral para começar seu treinamento. Foco no conteúdo!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
