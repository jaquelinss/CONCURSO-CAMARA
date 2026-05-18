import React, { useState, useRef, useEffect, useCallback } from 'react';
import { themes, defaultTheme } from '../lib/constants';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { DownloadIcon, ClipboardListIcon } from 'lucide-react';
import { jsPDF } from 'jspdf';
import PracticeQuiz from './PracticeQuiz';

interface LessonScreenProps {
  settings: any;
  onBack: () => void;
  savedData?: any;
}

const lessonLevels = ['Introdutória', 'Intermediária', 'Aprofundada'];
const difficulties = ['Introdutório', 'Médio', 'Difícil'];

const HighlighterPalette = ({ top, left, onHighlight }: { top: number, left: number, onHighlight: (color: string) => void }) => {
  const colors = ['#eeb67e', '#fff798', '#a2caf2', '#f2acac', '#a7f2a4'];
  return (
    <div 
      className="absolute bg-gray-800 p-2 rounded-full shadow-xl flex gap-2 z-50 items-center"
      style={{ top, left, transform: 'translate(-50%, -100%)', marginTop: '-12px' }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {colors.map(color => (
        <button
          key={color}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onHighlight(color); }}
          className="w-6 h-6 rounded-full border border-white cursor-pointer hover:scale-110 transition-transform"
          style={{ backgroundColor: color }}
        />
      ))}
      <div className="absolute left-1/2 bottom-[-6px] -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-800"></div>
    </div>
  );
};

export default function LessonScreen({ settings, onBack, savedData }: LessonScreenProps) {
  const { user, apiKey } = useAuth();
  const theme = themes[settings.subject] || defaultTheme;
  const isSavedMode = !!savedData;
  
  const [currentLevel, setCurrentLevel] = useState(savedData ? (settings.lessonLevel || 'Introdutória') : settings.lessonLevel);
  const [lessonData, setLessonData] = useState<Record<string, any>>(savedData ? { [settings.lessonLevel || 'Introdutória']: savedData } : {});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(isSavedMode);
  const [error, setError] = useState<string | null>(null);

  // Tools
  const [quizDifficulty, setQuizDifficulty] = useState('Médio');
  const [practiceQuiz, setPracticeQuiz] = useState<any[] | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);

  // Tutor Chat States
  const [doubt, setDoubt] = useState("");
  const [doubtResponse, setDoubtResponse] = useState("");
  const [isAsking, setIsAsking] = useState(false);

  // Sub-quiz States
  const [subQuestions, setSubQuestions] = useState<any[]>([]);
  const [isGeneratingSubQuestions, setIsGeneratingSubQuestions] = useState(false);
  const [subQuestionCount, setSubQuestionCount] = useState<number>(3);
  const [subQuestionDifficulty, setSubQuestionDifficulty] = useState<string>('Médio');
  const [subQuestionError, setSubQuestionError] = useState<string | null>(null);

  // Save doubt response state
  const [savingDoubt, setSavingDoubt] = useState(false);
  const [doubtSaved, setDoubtSaved] = useState(false);

  // Highlighter and Tooltip Refs and States
  const contentRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  const [tooltip, setTooltip] = useState({ visible: false, content: '', top: 0, left: 0 });
  const [highlighter, setHighlighter] = useState({ visible: false, top: 0, left: 0 });

  const showTooltip = (e: React.MouseEvent, explanation: string) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const contentRect = contentRef.current?.getBoundingClientRect();
    if (contentRect) {
      setTooltip({
        visible: true,
        content: explanation,
        top: rect.top - contentRect.top,
        left: rect.left - contentRect.left + rect.width / 2,
      });
    }
  };

  const hideTooltip = () => setTooltip(prev => ({ ...prev, visible: false }));
  
  const toggleTooltip = (e: React.MouseEvent, explanation: string) => {
    if (tooltip.visible && tooltip.content === explanation) hideTooltip();
    else showTooltip(e, explanation);
  };

  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && contentRef.current?.contains(selection.anchorNode)) {
      selectionRef.current = selection.getRangeAt(0).cloneRange();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const contentRect = contentRef.current.getBoundingClientRect();
      setHighlighter({ 
        visible: true, 
        top: rect.top - contentRect.top, 
        left: rect.left - contentRect.left + rect.width / 2 
      });
    } else {
      setHighlighter({ visible: false, top: 0, left: 0 });
    }
  }, []);

  const applyHighlight = (color: string) => {
    if (selectionRef.current) {
      const range = selectionRef.current;
      const span = document.createElement('span');
      span.className = 'highlighted-text rounded px-1';
      span.style.backgroundColor = color;
      try {
        range.surroundContents(span);
      } catch (e) {
        span.appendChild(range.extractContents());
        range.insertNode(span);
      }
      window.getSelection()?.removeAllRanges();
      setHighlighter({ visible: false, top: 0, left: 0 });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node) && !(event.target as HTMLElement).classList?.contains('term-highlight')) {
        hideTooltip();
      }
    };
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('touchend', handleSelection);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('touchend', handleSelection);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleSelection]);


  const generateLessonForLevel = async (level: string) => {
    if (!apiKey) {
      setError("Chave de API não configurada.");
      return;
    }
    if (lessonData[level]) {
      setCurrentLevel(level);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const prompt = `Crie um material de estudo detalhado e didático sobre ${settings.subject} - ${settings.topic}, especificamente para um nível de aprofundamento '${level}'. Estruture a resposta como um objeto JSON com as chaves: "titulo", "introducao", e "secoes" (um array de objetos, cada um com "subtitulo" e "conteudo"). No "conteudo", identifique termos-chave que merecem uma explicação extra e os envolva na tag [EXPLICACAO]Termo: Explicação aqui[/EXPLICACAO].`;
      
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      
      if (!response.ok) throw new Error("A API falhou.");
      const result = await response.json();
      const text = result.candidates[0].content.parts[0].text;
      const jsonMatch = text.match(/\[.*\]|\{.*\}/s);
      let parsedData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);

      setLessonData(prev => ({ ...prev, [level]: parsedData }));
      setCurrentLevel(level);
    } catch (err: any) {
      setError("Falha ao gerar aula: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentLesson = lessonData[currentLevel];

  const saveLesson = async () => {
    if (!user || !currentLesson) return;
    setSaving(true);
    try {
      const lessonsRef = collection(db, 'users', user.uid, 'lessons');
      await addDoc(lessonsRef, {
        subject: settings.subject,
        topic: settings.topic,
        lessonLevel: currentLevel,
        data: currentLesson,
        userComment: '',
        createdAt: serverTimestamp(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar aula.');
    } finally {
      setSaving(false);
    }
  };

  const saveDoubtResponse = async () => {
    if (!user || !doubtResponse || !doubt) return;
    setSavingDoubt(true);
    try {
      const lessonsRef = collection(db, 'users', user.uid, 'lessons');
      await addDoc(lessonsRef, {
        subject: settings.subject,
        topic: settings.topic,
        lessonLevel: 'Dúvida',
        data: {
          titulo: `Dúvida: ${doubt.substring(0, 80)}${doubt.length > 80 ? '...' : ''}`,
          introducao: `Pergunta: ${doubt}`,
          secoes: [{ subtitulo: 'Resposta da IA', conteudo: doubtResponse.replace(/<[^>]*>?/gm, '') }],
        },
        userComment: `Dúvida sobre ${settings.subject} - ${settings.topic}`,
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

  const sanitizeFilename = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '_');

  const onSavePdf = () => {
    if (!currentLesson) return;
    const doc = new jsPDF();
    let yPos = 20;
    const lineHeight = 10;
    const margin = 20;
    const maxLineWidth = 170;

    doc.setFontSize(20);
    const titleLines = doc.splitTextToSize(currentLesson.titulo, maxLineWidth);
    doc.text(titleLines, margin, yPos);
    yPos += titleLines.length * lineHeight + 5;

    doc.setFontSize(12);
    const introLines = doc.splitTextToSize(currentLesson.introducao, maxLineWidth);
    doc.text(introLines, margin, yPos);
    yPos += introLines.length * lineHeight + lineHeight;

    currentLesson.secoes.forEach((sec: any) => {
      if (yPos > 260) { doc.addPage(); yPos = 20; }
      
      doc.setFontSize(16);
      const subLines = doc.splitTextToSize(sec.subtitulo, maxLineWidth);
      doc.text(subLines, margin, yPos);
      yPos += subLines.length * lineHeight + 5;

      doc.setFontSize(12);
      const cleanContent = sec.conteudo.replace(/\[EXPLICACAO\].*?:.*?\[\/EXPLICACAO\]/g, (match: string) => match.replace(/\[\/?EXPLICACAO\]/g, ''));
      const contentLines = doc.splitTextToSize(cleanContent, maxLineWidth);
      
      contentLines.forEach((line: string) => {
        if (yPos > 280) { doc.addPage(); yPos = 20; }
        doc.text(line, margin, yPos);
        yPos += lineHeight;
      });
      yPos += lineHeight;
    });

    const safeSubject = sanitizeFilename(settings.subject);
    const safeLevel = sanitizeFilename(currentLevel);
    doc.save(`Aula_${safeSubject}_${safeLevel}.pdf`);
  };

  const handleGeneratePracticeQuiz = async () => {
    if (!apiKey || !currentLesson) return;
    setIsGeneratingQuiz(true);
    setQuizError(null);
    setPracticeQuiz(null);

    const prompt = `Gere 5 questões de múltipla escolha de dificuldade '${quizDifficulty}' sobre o tópico "${currentLesson.titulo}". A resposta DEVE ser um array de objetos JSON, cada um com as chaves "pergunta", "opcoes" (um array de 4 strings), "correta" (a string exata da resposta correta) e "explicacao".`;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      if (!response.ok) throw new Error("A API falhou.");
      const result = await response.json();
      const text = result.candidates[0].content.parts[0].text;
      const jsonMatch = text.match(/\[.*\]|\{.*\}/s);
      let parsedData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
      setPracticeQuiz(parsedData);
    } catch (err: any) {
      setQuizError(err.message);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleAskLessonDoubt = async () => {
    if (!doubt || !apiKey || !currentLesson) return;
    setIsAsking(true);
    setDoubtResponse("");
    setSubQuestions([]);
    
    const lessonContext = currentLesson.secoes.map((s: any) => `${s.subtitulo}: ${s.conteudo}`).join('\n');
    const doubtPrompt = `Com base no seguinte material de estudo sobre "${currentLesson.titulo}":\n${lessonContext}\n\nResponda a seguinte dúvida do aluno: "${doubt}". Formate sua resposta usando HTML. Use tags <p>, <strong>, e <ul>/<li>. Não inclua <html>, <head>, ou <body>.`;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: doubtPrompt }] }] })
      });
      if (!response.ok) throw new Error("A API de dúvidas falhou em responder.");
      const result = await response.json();
      setDoubtResponse(result.candidates?.[0]?.content?.parts?.[0]?.text || "<p>Não foi possível obter uma resposta.</p>");
    } catch (error) {
      setDoubtResponse("<p>Ocorreu um erro ao processar sua dúvida.</p>");
    } finally {
      setIsAsking(false);
    }
  };

  const handleGenerateSubQuestions = async () => {
    if (!apiKey) return;
    setIsGeneratingSubQuestions(true);
    setSubQuestionError(null);
    setSubQuestions([]);

    const prompt = `Com base no contexto da seguinte dúvida de um aluno sobre a aula de "${currentLesson.titulo}": "${doubt}", e a resposta fornecida: "${doubtResponse.replace(/<[^>]*>?/gm, '')}", gere ${subQuestionCount} questões de múltipla escolha com dificuldade '${subQuestionDifficulty}'. A resposta DEVE ser um array de objetos JSON, cada um com as chaves "pergunta", "opcoes" (um array de 4 strings), "correta" (a string exata da resposta correta) e "explicacao".`;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      if (!response.ok) throw new Error("A API falhou.");
      const result = await response.json();
      const text = result.candidates[0].content.parts[0].text;
      const jsonMatch = text.match(/\[.*\]|\{.*\}/s);
      let parsedData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
      setSubQuestions(parsedData);
    } catch (error: any) {
      setSubQuestionError(error.message);
    } finally {
      setIsGeneratingSubQuestions(false);
    }
  };

  const parseLessonContent = (content: string) => {
    if (typeof content !== 'string') return [];
    
    let processedContent = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processedContent = processedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    const regex = /\[EXPLICACAO\](.*?):(.*?)\[\/EXPLICACAO\]/gs;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(processedContent)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: processedContent.substring(lastIndex, match.index) });
      }
      const term = match[1]?.trim();
      const explanation = match[2]?.trim();
      if (term && explanation) {
        parts.push({ type: 'term', term, explanation });
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < processedContent.length) {
      parts.push({ type: 'text', content: processedContent.substring(lastIndex) });
    }
    return parts;
  };

  // Se for o início, mostrar tela "Pronto para gerar?"
  if (!currentLesson && !loading && Object.keys(lessonData).length === 0) {
    if (!apiKey) {
      return (
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-2xl mx-auto border-l-4 border-yellow-500">
          <h2 className="text-2xl font-bold mb-4 text-yellow-700">Chave da API Necessária</h2>
          <p className="mb-6 text-gray-700 dark:text-gray-300">Para que o conteúdo possa ser gerado, configure sua chave Gemini.</p>
          <div className="flex gap-4 justify-center">
            <button onClick={onBack} className="px-6 py-2 bg-gray-200 text-gray-800 dark:text-gray-200 rounded font-semibold">Voltar</button>
            <a href="/config" className={`px-6 py-2 text-white rounded font-bold ${theme.button}`}>Ir para Configurações</a>
          </div>
        </div>
      );
    }
    return (
      <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Pronto para gerar a aula?</h2>
        <p className="mb-6 text-gray-600 dark:text-gray-400">Você selecionou <strong>{settings.subject}</strong> no nível <strong>{settings.lessonLevel}</strong>.</p>
        {error && <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200 rounded-lg">{error}</div>}
        <div className="flex gap-4 justify-center">
          <button onClick={onBack} className="px-6 py-2 bg-gray-200 text-gray-800 dark:text-gray-200 rounded font-semibold">Voltar</button>
          <button onClick={() => generateLessonForLevel(currentLevel)} className={`px-6 py-2 text-white rounded font-bold ${theme.button}`}>Gerar Agora</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto p-4 md:p-8 relative`}>
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className="text-sm bg-black/5 p-2 rounded-lg hover:bg-black/10 transition-colors">
          Voltar
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new Event('toggle-archive'))}
            className="text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-600 p-2 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800/50 transition-colors flex items-center gap-2 font-bold"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
            Meus Post-its
          </button>
        </div>
      </div>

      <div className="flex justify-center mb-6 p-1 bg-gray-200 rounded-lg">
        {lessonLevels.map(level => (
          <button 
            key={level}
            onClick={() => generateLessonForLevel(level)}
            className={`flex-1 py-2 px-4 text-sm font-semibold rounded-md transition-colors ${currentLevel === level ? `${theme.button} text-white shadow` : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300'}`}
          >
            {level}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center space-y-4 my-16">
          <div className={`w-16 h-16 border-4 border-dashed rounded-full animate-spin ${theme.border}`}></div>
          <p className={`text-lg ${theme.text}`}>Carregando aula {currentLevel.toLowerCase()}...</p>
        </div>
      ) : currentLesson ? (
        <div ref={contentRef} className={`${theme.cardFront} p-6 rounded-xl shadow-lg relative`}>
          
          {highlighter.visible && (
            <HighlighterPalette top={highlighter.top} left={highlighter.left} onHighlight={applyHighlight} />
          )}
          
          {tooltip.visible && (
            <div 
              ref={tooltipRef}
              className="absolute bg-gray-800 text-white p-3 rounded shadow-lg text-sm z-50 max-w-xs"
              style={{ top: tooltip.top, left: tooltip.left, transform: 'translate(-50%, -100%)', marginTop: '-8px' }}
            >
              {tooltip.content}
              <div className="absolute left-1/2 bottom-[-6px] -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-800"></div>
            </div>
          )}

          <h2 className={`text-4xl font-bold mb-4 ${theme.accent}`}>{currentLesson.titulo}</h2>
          <p className="text-lg italic mb-6">{currentLesson.introducao}</p>
          
          <div className="space-y-6">
            {currentLesson.secoes?.map((section: any, index: number) => (
              <div key={index} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                <h3 className="text-2xl font-semibold mb-2">{section.subtitulo}</h3>
                <div className="text-base leading-relaxed whitespace-pre-wrap">
                  {parseLessonContent(section.conteudo).map((part, i) => 
                    part.type === 'term' ? (
                      <span 
                        key={i} 
                        className="term-highlight bg-yellow-100 dark:bg-yellow-900/30 border border-dashed border-yellow-400 dark:border-yellow-600 text-yellow-900 dark:text-yellow-200 rounded px-1 cursor-pointer"
                        onClick={(e) => toggleTooltip(e, part.explanation || '')}
                      >
                        {part.term}
                      </span>
                    ) : (
                      <span key={i} dangerouslySetInnerHTML={{ __html: part.content?.replace(/\\n/g, '<br />') || '' }} />
                    )
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t-2 pt-6 space-y-4">
            <h3 className="text-2xl font-semibold text-yellow-800">Ferramentas de Estudo</h3>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Nível do Quiz</label>
                <div className="flex p-1 bg-gray-200 rounded-lg">
                  {difficulties.map(level => (
                    <button 
                      key={level}
                      onClick={() => setQuizDifficulty(level)}
                      className={`flex-1 py-1 px-2 text-xs font-semibold rounded-md transition-colors ${quizDifficulty === level ? `bg-yellow-500 text-white` : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300'}`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleGeneratePracticeQuiz} disabled={isGeneratingQuiz} className={`flex-1 flex items-center justify-center gap-3 py-3 font-bold rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white disabled:opacity-50`}>
                <ClipboardListIcon />
                {practiceQuiz ? 'Gerar Novo Quiz' : 'Gerar Quiz de Treino'}
              </button>
              <button onClick={onSavePdf} className="flex-1 py-3 font-bold rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2">
                <DownloadIcon />
                Salvar Aula em PDF
              </button>
            </div>
            {isGeneratingQuiz && (
              <div className="flex items-center justify-center mt-4">
                <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-yellow-500"></div>
              </div>
            )}
            {quizError && <p className="text-red-500">Erro: {quizError}</p>}
            {practiceQuiz && <PracticeQuiz questions={practiceQuiz} theme={theme} onClose={() => setPracticeQuiz(null)} quizTitle={`Quiz ${quizDifficulty}`} />}
          </div>

          <div className="mt-8 border-t-2 pt-6">
            <h3 className="text-2xl font-semibold mb-4 text-yellow-800">Ainda com dúvidas? Pergunte à IA</h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={doubt} 
                onChange={(e) => setDoubt(e.target.value)} 
                placeholder="Digite sua pergunta sobre a aula aqui..." 
                className={`flex-grow p-2 rounded-lg ${theme.border} border-2 focus:outline-none focus:ring-2`} 
              />
              <button onClick={handleAskLessonDoubt} disabled={isAsking || !doubt} className={`py-2 px-6 font-bold rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white disabled:opacity-50`}>
                {isAsking ? "..." : "Perguntar"}
              </button>
            </div>
            {doubtResponse && (
              <div className="mt-4 p-4 bg-blue-100 border-l-4 border-blue-400 dark:bg-blue-900/30 dark:border-blue-500 rounded-r-lg">
                <div className="prose prose-blue dark:prose-invert max-w-none text-blue-900 dark:text-blue-100" dangerouslySetInnerHTML={{ __html: doubtResponse }} />
                
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={saveDoubtResponse}
                    disabled={savingDoubt || doubtSaved}
                    className={`text-sm px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${doubtSaved ? 'bg-green-500 text-white' : 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-gray-700'}`}
                  >
                    {savingDoubt ? 'Salvando...' : doubtSaved ? '✓ Salvo em Meus Salvamentos!' : '💾 Salvar Explicação'}
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200">Quer aprofundar o conhecimento?</h4>
                  <div className="flex flex-col sm:flex-row gap-4 mt-2 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Nº de Questões</label>
                      <input type="number" value={subQuestionCount} onChange={(e) => setSubQuestionCount(Number(e.target.value))} className="w-full p-2 rounded-lg border-2 bg-white dark:bg-gray-800" min="1" max="10"/>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Dificuldade</label>
                      <select value={subQuestionDifficulty} onChange={(e) => setSubQuestionDifficulty(e.target.value)} className="w-full p-2 rounded-lg border-2 bg-white dark:bg-gray-800">
                        {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <button onClick={handleGenerateSubQuestions} disabled={isGeneratingSubQuestions} className={`py-2.5 px-5 font-bold rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50 whitespace-nowrap`}>
                      Gerar Questões
                    </button>
                  </div>
                  {isGeneratingSubQuestions && (
                    <div className="flex items-center justify-center mt-4">
                      <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-yellow-500"></div>
                    </div>
                  )}
                  {subQuestionError && <p className="text-red-500 mt-2">Erro: {subQuestionError}</p>}
                  {subQuestions.length > 0 && <PracticeQuiz key={doubt} questions={subQuestions} theme={theme} onClose={() => setSubQuestions([])} quizTitle="Quiz da Dúvida" />}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-end">
            {isSavedMode ? (
              <span className="px-8 py-3 rounded-lg font-bold text-white bg-green-500 shadow-md">Já Salvo na Conta</span>
            ) : (
              <button onClick={saveLesson} disabled={saving || saved} className={`px-8 py-3 rounded-lg font-bold text-white shadow-md transform hover:scale-105 transition-all duration-300 ${saved ? 'bg-green-500' : theme.button}`}>
                {saving ? 'Salvando...' : (saved ? 'Salvo na Conta!' : 'Salvar na Minha Conta')}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
