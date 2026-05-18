import React, { useState } from 'react';
import { themes, defaultTheme } from '../lib/constants';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { generateContentFromGemini } from '../lib/gemini';
import { DownloadIcon, BanIcon, CheckCircleIcon, XCircleIcon } from 'lucide-react';
import { jsPDF } from 'jspdf';
import PracticeQuiz from './PracticeQuiz';
import { getRevisionSuggestions, calculateNextStep } from '../lib/revision.service';

const difficulties = ['Introdutório', 'Médio', 'Difícil'];

const Flashcard = ({ front, back, theme }: { front: string, back: string, theme: any }) => {
  const [isFlipped, setIsFlipped] = React.useState(false);

  React.useEffect(() => {
    setIsFlipped(false);
  }, [front]);

  return (
    <div className="w-full h-80 perspective-1000 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
      <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        <div className={`absolute w-full h-full backface-hidden flex items-center justify-center p-6 rounded-2xl shadow-lg ${theme.cardFront} ${theme.border} border-2`}>
          <p className="text-2xl text-center font-semibold">{front}</p>
        </div>
        <div className={`absolute w-full h-full backface-hidden rotate-y-180 flex items-center justify-center p-6 rounded-2xl shadow-lg ${theme.cardBack} ${theme.border} border-2`}>
          <p className="text-xl text-center">{back}</p>
        </div>
      </div>
    </div>
  );
};

interface QuizScreenProps {
  settings: any;
  onBack: () => void;
  savedData?: any[];
}

export default function QuizScreen({ settings, onBack, savedData }: QuizScreenProps) {
  const { user, apiKey } = useAuth();
  const theme = themes[settings.subject] || defaultTheme;
  const isSavedMode = !!savedData;
  const [questions, setQuestions] = useState<any[]>(savedData || []);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(isSavedMode);
  const [error, setError] = useState<string | null>(null);

  const storageKey = settings.id ? `quiz_progress_${settings.id}` : null;

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) return Number(JSON.parse(saved).currentIndex) || 0;
    }
    return 0;
  });
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState<number>(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) return Number(JSON.parse(saved).score) || 0;
    }
    return 0;
  });

  React.useEffect(() => {
    if (storageKey && questions.length > 0) {
      if (currentIndex >= questions.length) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, JSON.stringify({ currentIndex, score }));
      }
    }
  }, [currentIndex, score, storageKey, questions.length]);

  const [eliminatedAnswers, setEliminatedAnswers] = useState<Set<string>>(new Set());

  // Tutor Chat States
  const [doubt, setDoubt] = useState("");
  const [doubtResponse, setDoubtResponse] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  
  const [flashcardDoubt, setFlashcardDoubt] = useState("");
  const [flashcardDoubtResponse, setFlashcardDoubtResponse] = useState("");
  const [isAskingFlashcardDoubt, setIsAskingFlashcardDoubt] = useState(false);

  // Sub-quiz States
  const [subQuestions, setSubQuestions] = useState<any[]>([]);
  const [isGeneratingSubQuestions, setIsGeneratingSubQuestions] = useState(false);
  const [subQuestionCount, setSubQuestionCount] = useState<number>(3);
  const [subQuestionDifficulty, setSubQuestionDifficulty] = useState<string>('Médio');
  const [subQuestionError, setSubQuestionError] = useState<string | null>(null);

  // Save doubt response state
  const [savingDoubt, setSavingDoubt] = useState(false);
  const [doubtSaved, setDoubtSaved] = useState(false);

  const generateQuiz = async () => {
    if (!apiKey) {
      setError("Chave de API não configurada.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const generatedQuestions = await generateContentFromGemini(settings, apiKey);
      setQuestions(generatedQuestions);
    } catch (err: any) {
      setError("Falha ao gerar conteúdo: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveQuiz = async () => {
    if (!user || questions.length === 0) return;
    setSaving(true);
    try {
      const isFlashcard = settings.model === 'Flashcard';
      const collectionName = isFlashcard ? 'flashcards' : 'quizzes';
      const quizzesRef = collection(db, 'users', user.uid, collectionName);
      await addDoc(quizzesRef, {
        subject: settings.subject,
        topic: settings.topic,
        difficulty: settings.difficulty,
        model: settings.model,
        data: questions,
        userComment: '',
        createdAt: serverTimestamp(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar conteúdo.');
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

  const updateRevisionPerformance = async (finalScore: number) => {
    if (!user || !settings.id) return;
    const revisionId = `${settings.subject}_${settings.topic}`.replace(/[^a-zA-Z0-9]/g, '_');
    const revisionRef = doc(db, 'users', user.uid, 'revisions', revisionId);
    
    try {
      const revSnap = await getDoc(revisionRef);
      if (!revSnap.exists()) return;
      
      const revData = revSnap.data();
      const isFlashcardType = settings.model === 'Flashcard';
      const completedKey = isFlashcardType ? 'flashcardIds' : 'quizIds';

      // Adiciona este item à lista de completados
      const completedItems = revData.completedItems || { lessonIds: [], quizIds: [], flashcardIds: [] };
      if (!completedItems[completedKey]) completedItems[completedKey] = [];
      if (!completedItems[completedKey].includes(settings.id)) {
        completedItems[completedKey].push(settings.id);
      }

      // Verifica se TODOS os itens vinculados foram completados
      const links = revData.contentLinks || {};
      const allLinkedLessons = links.lessonIds || (links.lessonId ? [links.lessonId] : []);
      const allLinkedQuizzes = links.quizIds || (links.quizId ? [links.quizId] : []);
      const allLinkedFlashcards = links.flashcardIds || (links.flashcardId ? [links.flashcardId] : []);

      const lessonsComplete = allLinkedLessons.length === 0 || allLinkedLessons.every((id: string) => (completedItems.lessonIds || []).includes(id));
      const quizzesComplete = allLinkedQuizzes.length === 0 || allLinkedQuizzes.every((id: string) => (completedItems.quizIds || []).includes(id));
      const flashcardsComplete = allLinkedFlashcards.length === 0 || allLinkedFlashcards.every((id: string) => (completedItems.flashcardIds || []).includes(id));

      const allComplete = lessonsComplete && quizzesComplete && flashcardsComplete;

      let performance = revData.performance || 0;
      if (!isFlashcardType && finalScore >= 0 && questions.length > 0) {
        performance = Math.round((finalScore / questions.length) * 100);
      }

      const updateData: any = {
        performance,
        lastReviewedAt: serverTimestamp(),
        completedItems,
      };

      // Se TODOS concluídos → reagenda automaticamente
      if (allComplete) {
        const currentStep = revData.cycleStep || 0;
        const nextStep = calculateNextStep(performance, currentStep);
        const nextDate = getRevisionSuggestions(performance, nextStep)[0].date;
        
        updateData.cycleStep = nextStep;
        updateData.scheduledDate = Timestamp.fromDate(nextDate);
        updateData.reviewCount = (revData.reviewCount || 0) + 1;
        // Limpa completedItems para o próximo ciclo
        updateData.completedItems = { lessonIds: [], quizIds: [], flashcardIds: [] };
      }

      await setDoc(revisionRef, updateData, { merge: true });
    } catch (e) {
      console.error("Erro ao atualizar performance da revisão:", e);
    }
  };

  // Função apenas para o nome do arquivo, pois caracteres especiais quebram o download no Chrome
  const sanitizeFilename = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '_');

  const onSavePdf = (type: 'questions' | 'answers' | 'flashcards') => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let y = margin;

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    
    let title = `Conteúdo: ${settings.subject} - ${settings.topic}`;
    if (type === 'questions') title = `Questões: ${settings.subject}`;
    if (type === 'answers') title = `Gabarito: ${settings.subject}`;
    if (type === 'flashcards') title = `Flashcards: ${settings.subject}`;

    // Split title to fit
    const titleLines = doc.splitTextToSize(title, contentWidth);
    doc.text(titleLines, pageWidth / 2, y, { align: 'center' });
    y += (titleLines.length * 8) + 10;

    if (type === 'flashcards') {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      questions.forEach((q, index) => {
        const text = `Card ${index + 1}:\nFrente: ${q.frente || ''}\nVerso: ${q.verso || ''}`;
        const lines = doc.splitTextToSize(text, contentWidth);
        const blockHeight = lines.length * 6 + 10;
        
        if (y + blockHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        
        doc.text(lines, margin, y);
        y += blockHeight;
      });
    } else if (type === 'questions') {
      doc.setFontSize(12);
      questions.forEach((q, index) => {
        // Altura da Questão
        const qNum = `${index + 1}. `;
        const qTextLines = doc.splitTextToSize(qNum + q.pergunta, contentWidth);
        const qTextHeight = qTextLines.length * 6;

        // Altura das Opções
        let optionsHeight = 0;
        const optionsLines: string[][] = [];
        q.opcoes.forEach((opt: string, i: number) => {
           const label = String.fromCharCode(65 + i) + ') ';
           const optLines = doc.splitTextToSize(label + opt, contentWidth - 5);
           optionsLines.push(optLines);
           optionsHeight += optLines.length * 6;
        });

        // Rascunho
        const scratchPadHeight = 30; 
        const totalBlockHeight = qTextHeight + optionsHeight + scratchPadHeight + 10;

        if (y + totalBlockHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }

        // Renderiza Questão
        doc.setFont('helvetica', 'bold');
        doc.text(qTextLines, margin, y);
        y += qTextHeight + 2;

        // Renderiza Opções
        doc.setFont('helvetica', 'normal');
        optionsLines.forEach((lines) => {
          doc.text(lines, margin + 5, y);
          y += (lines.length * 6);
        });

        // Renderiza Rascunho
        y += 5;
        doc.setDrawColor(200);
        doc.rect(margin, y, contentWidth, scratchPadHeight);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("Rascunho / Resolução", margin + 2, y + 5);
        doc.setTextColor(0);
        doc.setFontSize(12);
        
        y += scratchPadHeight + 10;
      });
    } else if (type === 'answers') {
      questions.forEach((q, index) => {
        const header = `${index + 1}. Resposta: ${q.correta}`;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const headerLines = doc.splitTextToSize(header, contentWidth);
        const headerHeight = headerLines.length * 6;

        doc.setFont('helvetica', 'normal');
        const explLines = doc.splitTextToSize(`Explicação: ${q.explicacao}`, contentWidth);
        const explHeight = explLines.length * 6;

        const totalHeight = headerHeight + explHeight + 8;

        if (y + totalHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }

        // Renderiza Header (Verde)
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 100, 0);
        doc.text(headerLines, margin, y);
        y += headerHeight;

        // Renderiza Explicação
        doc.setTextColor(0);
        doc.setFont('helvetica', 'normal');
        doc.text(explLines, margin, y);
        y += explHeight + 8;
      });
    }
    
    const safeFilename = sanitizeFilename(settings.subject);
    doc.save(`${safeFilename}_${type}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 my-16">
        <div className={`w-16 h-16 border-4 border-dashed rounded-full animate-spin ${theme.border}`}></div>
        <p className={`text-lg ${theme.text}`}>
          {settings.model === 'Flashcard' ? 'Gerando seus flashcards...' : 'Gerando suas questões...'}
        </p>
      </div>
    );
  }

  if (questions.length === 0) {
    if (!apiKey) {
      return (
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-2xl mx-auto border-l-4 border-yellow-500">
          <h2 className="text-2xl font-bold mb-4 text-yellow-700">Chave da API Necessária</h2>
          <p className="mb-6 text-gray-700 dark:text-gray-300">
            Para que o conteúdo possa ser gerado pela Inteligência Artificial, você precisa configurar sua chave do Gemini.
          </p>
          <div className="flex gap-4 justify-center">
            <button onClick={onBack} className="px-6 py-2 bg-gray-200 text-gray-800 dark:text-gray-200 rounded font-semibold hover:bg-gray-300">Voltar</button>
            <a href="/config" className={`px-6 py-2 text-white rounded font-bold ${theme.button}`}>Ir para Configurações</a>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Pronto para treinar?</h2>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Você selecionou <strong>{settings.subject}</strong> no nível <strong>{settings.difficulty}</strong>.
        </p>
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg border border-red-200 whitespace-pre-wrap">
            {error}
          </div>
        )}
        <div className="flex gap-4 justify-center">
          <button onClick={onBack} className="px-6 py-2 bg-gray-200 text-gray-800 dark:text-gray-200 rounded font-semibold hover:bg-gray-300">Voltar</button>
          <button onClick={generateQuiz} className={`px-6 py-2 text-white rounded font-bold ${theme.button}`}>Gerar Conteúdo</button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const isFinished = currentIndex >= questions.length;
  const isFlashcard = settings.model === 'Flashcard';

  if (isFinished) {
    return (
      <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold mb-4">{isFlashcard ? 'Flashcards Finalizados!' : 'Quiz Finalizado!'}</h2>
        {!isFlashcard && (
          <p className="text-xl mb-8">Sua pontuação: <span className={`font-bold ${theme.accent}`}>{score}</span> de {questions.length}</p>
        )}
        <div className="flex justify-center gap-4 mt-8">
          <button onClick={onBack} className="px-6 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded font-semibold hover:bg-gray-300 dark:hover:bg-gray-600">{isSavedMode ? 'Voltar aos Salvamentos' : 'Novo Quiz'}</button>
          {!isSavedMode && (
            <button onClick={saveQuiz} disabled={saving || saved} className={`px-6 py-2 text-white rounded font-bold ${saved ? 'bg-green-500' : theme.button}`}>
              {saving ? 'Salvando...' : (saved ? 'Salvo!' : (isFlashcard ? 'Salvar Flashcards' : 'Salvar Questões'))}
            </button>
          )}
        </div>
      </div>
    );
  }

  const handleAnswer = (option: string) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(option);
    if (option === currentQ.correta) {
      const newScore = score + 1;
      setScore(newScore);
      if (currentIndex === questions.length - 1) {
        updateRevisionPerformance(newScore);
      }
    } else {
      if (currentIndex === questions.length - 1) {
        updateRevisionPerformance(score);
      }
    }
  };

  const handleNext = () => {
    if (isFlashcard && currentIndex === questions.length - 1) {
      updateRevisionPerformance(-1);
    }
    setSelectedAnswer(null);
    setCurrentIndex(i => i + 1);
    setEliminatedAnswers(new Set());
    setDoubt("");
    setDoubtResponse("");
    setFlashcardDoubt("");
    setFlashcardDoubtResponse("");
    setSubQuestions([]);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setSelectedAnswer(null);
      setEliminatedAnswers(new Set());
      setDoubt("");
      setDoubtResponse("");
      setFlashcardDoubt("");
      setFlashcardDoubtResponse("");
      setSubQuestions([]);
    }
  };

  const handleEliminateAnswer = (option: string) => {
    setEliminatedAnswers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(option)) newSet.delete(option);
      else newSet.add(option);
      return newSet;
    });
  };

  const handleAskDoubt = async () => {
    if (!doubt || !currentQ || !apiKey) return;
    setIsAsking(true);
    setDoubtResponse("");
    setSubQuestions([]);
    
    const doubtPrompt = `Com base na seguinte questão do quiz: "${currentQ.pergunta}" e sua explicação: "${currentQ.explicacao}", responda a seguinte dúvida do aluno: "${doubt}". Formate sua resposta usando HTML para melhor legibilidade. Use tags <p> para parágrafos, <strong> para destacar termos importantes, e <ul>/<li> para listas, se necessário. Não inclua <html>, <head>, ou <body> tags.`;
    
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

    const prompt = `Com base no contexto da questão de quiz: "${currentQ.pergunta}", a explicação da resposta: "${currentQ.explicacao}", a dúvida do aluno: "${doubt}", e a resposta fornecida: "${doubtResponse.replace(/<[^>]*>?/gm, '')}", gere ${subQuestionCount} questões de múltipla escolha com dificuldade '${subQuestionDifficulty}'. O objetivo é testar o entendimento do aluno sobre o tópico da dúvida. A resposta DEVE ser um array de objetos JSON, cada um com as chaves "pergunta", "opcoes" (um array de 4 strings), "correta" (a string exata da resposta correta) e "explicacao".`;
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

  const handleAskFlashcardDoubt = async () => {
    if (!flashcardDoubt || !currentQ || !apiKey) return;
    setIsAskingFlashcardDoubt(true);
    setFlashcardDoubtResponse("");

    const doubtPrompt = `Com base no seguinte flashcard de estudos (Frente: "${currentQ.frente}", Verso: "${currentQ.verso}"), responda a seguinte dúvida do aluno: "${flashcardDoubt}". Seja direto e didático. Formate sua resposta usando HTML para melhor legibilidade (<p>, <strong>, <ul>, <li>). Não inclua <html>, <head>, ou <body>.`;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: doubtPrompt }] }] })
      });
      if (!response.ok) throw new Error("A API falhou.");
      const result = await response.json();
      setFlashcardDoubtResponse(result.candidates?.[0]?.content?.parts?.[0]?.text || "<p>Não foi possível obter uma resposta.</p>");
    } catch (error) {
      setFlashcardDoubtResponse("<p>Ocorreu um erro ao processar sua dúvida.</p>");
    } finally {
      setIsAskingFlashcardDoubt(false);
    }
  };

  return (
    <div className={`max-w-4xl mx-auto p-4 md:p-8 relative`}>
      <div className="w-full flex justify-between items-center mb-6">
        <button onClick={onBack} className="text-sm bg-black/5 p-2 rounded-lg hover:bg-black/10 transition-colors">
          Voltar
        </button>
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <button
              onClick={() => window.dispatchEvent(new Event('toggle-archive'))}
              className="text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-600 p-2 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800/50 transition-colors flex items-center gap-2 font-bold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
              Meus Post-its
            </button>
          </div>
          {!isSavedMode && (
            <button
              onClick={saveQuiz}
              disabled={saving || saved}
              className={`text-sm p-2 rounded-lg transition-colors flex items-center gap-2 font-semibold ${saved ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-800/50'}`}
            >
              {saving ? 'Salvando...' : (saved ? '✓ Salvo!' : (isFlashcard ? '💾 Salvar Flashcards' : '💾 Salvar Questões'))}
            </button>
          )}
          {isFlashcard ? (
            <button
              onClick={() => onSavePdf('flashcards')}
              className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 p-2 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors flex items-center gap-2"
            >
              <DownloadIcon className="w-4 h-4" /> Baixar Flashcards
            </button>
          ) : (
            <>
              <button
                onClick={() => onSavePdf('questions')}
                className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 p-2 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors flex items-center gap-2"
              >
                <DownloadIcon className="w-4 h-4" /> Baixar Questões
              </button>
              <button
                onClick={() => onSavePdf('answers')}
                className="text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 p-2 rounded-lg hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors flex items-center gap-2"
              >
                <DownloadIcon className="w-4 h-4" /> Baixar Gabarito
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className={`${theme.cardFront} backdrop-blur-sm p-6 rounded-2xl shadow-lg`}>
        <p className="text-sm font-semibold mb-2 opacity-70">{isFlashcard ? 'Flashcard' : 'Questão'} {currentIndex + 1} de {questions.length}</p>

        {isFlashcard ? (
          <div className="flex flex-col items-center">
            <Flashcard front={currentQ.frente} back={currentQ.verso} theme={theme} />
            <div className="flex justify-between w-full mt-8 gap-4 items-center">
              <button onClick={handlePrevious} disabled={currentIndex === 0} className={`py-2 px-4 font-bold rounded-lg ${theme.button} disabled:bg-gray-400 disabled:cursor-not-allowed`}>
                Anterior
              </button>
              <p className="font-semibold">{currentIndex + 1} / {questions.length}</p>
              <button onClick={handleNext} className={`py-2 px-4 font-bold rounded-lg text-white ${theme.button}`}>
                {currentIndex < questions.length - 1 ? 'Próximo' : 'Finalizar Estudo'}
              </button>
            </div>

            <div className="w-full mt-8 border-t-2 pt-6">
              <h3 className="text-2xl font-semibold mb-4 text-center">Ainda com dúvidas sobre o card?</h3>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={flashcardDoubt} 
                  onChange={(e) => setFlashcardDoubt(e.target.value)} 
                  placeholder="Digite sua pergunta sobre o flashcard..." 
                  className={`flex-grow p-2 rounded-lg ${theme.border} border-2`} 
                />
                <button 
                  onClick={handleAskFlashcardDoubt} 
                  disabled={isAskingFlashcardDoubt || !flashcardDoubt} 
                  className={`py-2 px-4 font-bold rounded-lg ${theme.button} disabled:opacity-50`}
                >
                  {isAskingFlashcardDoubt ? "Pensando..." : "Perguntar"}
                </button>
              </div>
              {flashcardDoubtResponse && (
                <div className="mt-4 p-4 bg-blue-100 border-l-4 border-blue-400 dark:bg-blue-900/30 dark:border-blue-500 rounded-r-lg">
                  <div className="prose prose-blue dark:prose-invert max-w-none text-blue-900 dark:text-blue-100" dangerouslySetInnerHTML={{ __html: flashcardDoubtResponse }} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <h3 className="text-xl md:text-2xl font-semibold mt-4 mb-6 min-h-[6rem]">{currentQ.pergunta}</h3>
            
            <div className="space-y-4">
              {currentQ.opcoes.map((option: string, idx: number) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = option === currentQ.correta;
                const isEliminated = eliminatedAnswers.has(option);
                let btnClass = theme.option;

                if (selectedAnswer !== null) {
                  if (isCorrect) btnClass = 'bg-green-500 text-white';
                  else if (isSelected) btnClass = 'bg-red-500 text-white';
                }

                return (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      onClick={() => handleAnswer(option)}
                      disabled={selectedAnswer !== null}
                      className={`w-full text-left p-4 rounded-lg transition-all duration-300 border-2 ${theme.border} ${btnClass} disabled:cursor-not-allowed ${isEliminated ? 'line-through opacity-60' : ''}`}
                    >
                      {option}
                    </button>
                    {selectedAnswer === null && (
                      <button
                        onClick={() => handleEliminateAnswer(option)}
                        className={`p-2 rounded-full transition-colors ${isEliminated ? 'bg-gray-400 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                      >
                        <BanIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {selectedAnswer && (
              <div className="mt-6">
                <div className={`p-4 rounded-lg border ${selectedAnswer === currentQ.correta ? 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-800' : 'bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-800'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    {selectedAnswer === currentQ.correta ? <CheckCircleIcon className="text-green-600 dark:text-green-400" /> : <XCircleIcon className="text-red-600 dark:text-red-400" />}
                    <h4 className={`text-lg font-bold ${selectedAnswer === currentQ.correta ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                      {selectedAnswer === currentQ.correta ? 'Resposta Correta!' : 'Resposta Incorreta!'}
                    </h4>
                  </div>
                  <p className={`mt-2 text-sm ${selectedAnswer === currentQ.correta ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>{currentQ.explicacao}</p>
                </div>
                
                <div className="mt-6 border-t-2 border-dashed pt-4 border-gray-300">
                  <input 
                    type="text"
                    value={doubt}
                    onChange={(e) => setDoubt(e.target.value)}
                    placeholder="Ainda com dúvidas? Pergunte à IA"
                    className={`w-full p-2 rounded-lg ${theme.border} border-2 focus:outline-none focus:ring-2 ${theme.ring}`}
                  />
                  <button
                    onClick={handleAskDoubt}
                    disabled={isAsking || !doubt}
                    className={`w-full mt-2 py-2 font-bold rounded-lg text-white ${theme.button} disabled:opacity-50`}
                  >
                    {isAsking ? "Pensando..." : "Perguntar"}
                  </button>
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

                      <div className="mt-6 pt-4 border-t border-blue-200 dark:border-blue-800">
                        <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">Quer aprofundar o conhecimento?</h4>
                        <div className="flex flex-col sm:flex-row gap-4 items-end">
                          <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Nº de Questões</label>
                            <input 
                              type="number" 
                              value={subQuestionCount} 
                              onChange={(e) => setSubQuestionCount(Number(e.target.value))} 
                              className={`w-full p-2 rounded-lg border-2 ${theme.border}`}
                              min="1" max="10"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Dificuldade</label>
                            <select 
                              value={subQuestionDifficulty} 
                              onChange={(e) => setSubQuestionDifficulty(e.target.value)}
                              className={`w-full p-2 rounded-lg border-2 ${theme.border} bg-white dark:bg-gray-800`}
                            >
                              {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>
                          <button 
                            onClick={handleGenerateSubQuestions} 
                            disabled={isGeneratingSubQuestions} 
                            className={`py-2.5 px-5 font-bold rounded-lg text-white ${theme.button} disabled:opacity-50 whitespace-nowrap`}
                          >
                            Gerar Questões
                          </button>
                        </div>
                        {isGeneratingSubQuestions && (
                          <div className="flex flex-col items-center justify-center space-y-2 my-4">
                            <div className={`w-8 h-8 border-4 border-dashed rounded-full animate-spin ${theme.border}`}></div>
                            <p className="text-sm">Gerando sub-questões...</p>
                          </div>
                        )}
                        {subQuestionError && <p className="text-red-500 mt-2">Erro: {subQuestionError}</p>}
                        {subQuestions.length > 0 && <PracticeQuiz key={doubt} questions={subQuestions} theme={theme} onClose={() => setSubQuestions([])} quizTitle="Quiz da Dúvida" />}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between mt-6 gap-4">
                  <button onClick={handlePrevious} disabled={currentIndex === 0} className={`px-6 py-2 bg-gray-400 text-white rounded font-bold hover:bg-gray-50 dark:bg-gray-9000 disabled:opacity-50`}>
                    Anterior
                  </button>
                  <button onClick={handleNext} className={`px-6 py-2 font-bold rounded-lg text-white ${theme.button}`}>
                    {currentIndex < questions.length - 1 ? 'Próxima Questão' : 'Ver Resultados'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
