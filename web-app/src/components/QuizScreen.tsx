import React, { useState, useRef } from 'react';
import DockableWrapper, { DockMenuButton } from './DockableWrapper';
import { themes, defaultTheme } from '../lib/constants';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useReward } from '../contexts/RewardContext';
import { generateContentFromGemini, correctEssayFromGemini } from '../lib/gemini';
import { DownloadIcon, BanIcon, CheckCircleIcon, XCircleIcon, UploadCloud, FileText, Bot, Sparkles, AlertCircle, Flag, AlertTriangle, Brain, CheckCircle, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import mammoth from 'mammoth';
import PracticeQuiz from './PracticeQuiz';
import { getRevisionSuggestions, calculateNextStep } from '../lib/revision.service';
import ReadingLaser from './ReadingLaser';
import { findMatchingFolder } from '../lib/folderUtils';

const difficulties = ['Introdutório', 'Médio', 'Difícil'];

const sanitize = (str: string) => {
  if (typeof str !== 'string') return '';
  const map: any = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return str.replace(/[&<>"']/g, (m) => map[m]);
};

const generateFlashcardsHtml = (flashcards: any[], settings: any) => {
  const styles = `
    <style>
      @page {
        margin: 10mm;
      }
      body {
        font-family: Helvetica, Arial, sans-serif;
      }
      .page-title {
        text-align: center;
        border-bottom: 1px solid #ccc;
        padding-bottom: 10px;
        margin-bottom: 10px;
      }
      .instructions {
        text-align: center;
        font-style: italic;
        color: #555;
        margin-bottom: 20px;
      }
      .card-row {
        display: flex;
        border: 1px dashed #aaa;
        margin-bottom: 5mm;
        page-break-inside: avoid !important;
        height: 65mm;
        box-sizing: border-box;
      }
      .card-cell {
        box-sizing: border-box;
        padding: 15px;
        width: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
      }
      .card-front {
        background-color: #e9f7ff !important;
        border-right: 1px dashed #aaa;
        -webkit-print-color-adjust: exact;
        color-adjust: exact;
      }
      .card-back {
        background-color: #fff8e1 !important;
        -webkit-print-color-adjust: exact;
        color-adjust: exact;
      }
    </style>
  `;

  const cardsHtml = flashcards.map(card => `
    <div class="card-row">
      <div class="card-cell card-front">
        <p>${sanitize(card.frente)}</p>
      </div>
      <div class="card-cell card-back">
        <p>${sanitize(card.verso)}</p>
      </div>
    </div>
  `).join('');

  return `
    ${styles}
    <h1 class="page-title">Flashcards de ${sanitize(settings.subject)}</h1>
    <p class="instructions">Instruções: Imprima, recorte nas linhas pontilhadas e dobre ao meio para criar seus cartões de estudo.</p>
    <div>
      ${cardsHtml}
    </div>
  `;
};

const generateCorrectionHtml = (correction: any, proposal: any) => {
  const correctionStyles = `
    <style>
      body { font-family: Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
      .erro-vermelho { background-color: #f8d7da; color: #721c24; padding: 1px 3px; border-radius: 3px; border-bottom: 1px dotted #b22222; }
      .erro-amarelo { background-color: #fff3cd; color: #856404; padding: 1px 3px; border-radius: 3px; }
      .acerto-verde { background-color: #d4edda; color: #155724; padding: 1px 3px; border-radius: 3px; }
      .tese { border-bottom: 2px solid #007bff; }
      .repertorio { border-bottom: 2px solid #6f42c1; }
      .conectivo { border-bottom: 2px solid #fd7e14; font-weight: bold; }
      .intervencao { display: block; background-color: rgba(32, 201, 151, 0.1); border-left: 3px solid #20c997; padding: 10px; margin: 5px 0; }
      .agente { font-weight: bold; color: #17a2b8; }
      .acao { font-weight: bold; color: #007bff; }
      .meio { font-weight: bold; color: #28a745; }
      .finalidade { font-weight: bold; color: #ffc107; }
      .detalhamento { font-weight: bold; color: #6f42c1; }
      .competency-card { border: 1px solid #eee; border-left: 5px solid #007bff; padding: 15px; margin-bottom: 10px; border-radius: 5px; page-break-inside: avoid; }
      .competency-header { display: flex; justify-content: space-between; align-items: center; font-weight: bold; }
      .competency-score { background-color: #e7f3ff; color: #004085; padding: 5px 10px; border-radius: 15px; }
      .whitespace-pre-wrap { white-space: pre-wrap; word-wrap: break-word; }
    </style>
  `;

  let competenciesHtml = Object.entries(correction.analise_competencias).map(([key, value]: any) => `
    <div class="competency-card">
      <div class="competency-header">
        <span>${key.toUpperCase().replace('C', 'Competência ')}</span>
        <span class="competency-score">${value.nota}</span>
      </div>
      <p>${sanitize(value.justificativa)}</p>
    </div>
  `).join('');

  return `
    ${correctionStyles}
    <h1 style="text-align: center;">Relatório de Correção de Redação</h1>
    <p><strong>Tema:</strong> ${sanitize(proposal.tema || proposal.frase_tema)}</p>
    <div style="text-align: center; margin: 20px 0; padding: 20px; background-color: #f0f8ff; border-radius: 8px;">
      <h2 style="margin:0;">Nota Final Estimada</h2>
      <p style="font-size: 3em; font-weight: bold; margin: 0; color: #0056b3;">${correction.nota_final}</p>
    </div>
    
    <h2>Análise por Competências</h2>
    ${competenciesHtml}
    
    <h2 style="margin-top: 30px;">Texto Corrigido e Comentado</h2>
    <div class="whitespace-pre-wrap" style="border: 1px solid #ccc; padding: 15px; border-radius: 5px; background-color: #fff;">
      ${correction.texto_corrigido_html}
    </div>
  `;
};

const CorrectionLegend = () => (
  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4 text-sm border dark:border-gray-700">
    <h5 className="font-bold text-md mb-2">Legenda da Correção:</h5>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      <div className="flex items-center"><span className="erro-vermelho h-4 w-4 mr-2 inline-block rounded"></span> Erro Grave</div>
      <div className="flex items-center"><span className="erro-amarelo h-4 w-4 mr-2 inline-block rounded"></span> Ponto a Melhorar</div>
      <div className="flex items-center"><span className="acerto-verde h-4 w-4 mr-2 inline-block rounded"></span> Acerto Notável</div>
      <div className="flex items-center"><span className="tese border-b-2 border-blue-500 h-1 w-4 mr-2 inline-block"></span> Tese</div>
      <div className="flex items-center"><span className="repertorio border-b-2 border-purple-500 h-1 w-4 mr-2 inline-block"></span> Repertório</div>
      <div className="flex items-center"><span className="conectivo border-b-2 border-orange-500 font-bold h-1 w-4 mr-2 inline-block"></span> Conectivo</div>
      <div className="flex items-center"><span className="intervencao h-4 w-4 mr-2 inline-block rounded-l-md border-l-4 border-emerald-500 bg-emerald-500/10"></span> Intervenção</div>
      <div className="flex items-center"><span className="agente text-cyan-500 font-bold h-4 mr-2 inline-block">Agente</span></div>
      <div className="flex items-center"><span className="acao text-blue-500 font-bold h-4 mr-2 inline-block">Ação</span></div>
      <div className="flex items-center"><span className="meio text-green-500 font-bold h-4 mr-2 inline-block">Meio/Modo</span></div>
      <div className="flex items-center"><span className="finalidade text-amber-500 font-bold h-4 mr-2 inline-block">Finalidade</span></div>
      <div className="flex items-center"><span className="detalhamento text-purple-500 font-bold h-4 mr-2 inline-block">Detalhamento</span></div>
    </div>
  </div>
);

const Flashcard = ({ front, back, theme }: { front: string, back: string, theme: any }) => {
  const [isFlipped, setIsFlipped] = React.useState(false);

  React.useEffect(() => {
    setIsFlipped(false);
  }, [front]);

  return (
    <div className="w-full h-80 perspective-1000 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
      <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        <div className={`absolute w-full h-full backface-hidden flex items-center justify-center p-6 rounded-2xl shadow-lg ${theme.cardFront} ${theme.border} border-2 text-gray-900 dark:text-gray-100`}>
          <p className="text-2xl text-center font-semibold">{front}</p>
        </div>
        <div className={`absolute w-full h-full backface-hidden rotate-y-180 flex items-center justify-center p-6 rounded-2xl shadow-lg ${theme.cardBack} ${theme.border} border-2 text-gray-900 dark:text-gray-100`}>
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
  const { user, apiKey, selectedBanca } = useAuth();
  const { awardPoints } = useReward();
  const theme = themes[settings.subject] || defaultTheme;
  const isSavedMode = !!savedData;
  const [questions, setQuestions] = useState<any[]>(savedData || []);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(isSavedMode);
  const [error, setError] = useState<string | null>(null);

  // Question Report states
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const storageKey = settings.id ? `quiz_progress_${settings.id}` : null;

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) return Number(JSON.parse(saved).currentIndex) || 0;
    }
    return 0;
  });
  const [score, setScore] = useState<number>(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) return Number(JSON.parse(saved).score) || 0;
    }
    return 0;
  });
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [eliminatedAnswers, setEliminatedAnswers] = useState<Set<string>>(new Set());
  const [answersRecord, setAnswersRecord] = useState<Record<number, string>>({});
  const contentRef = useRef<HTMLDivElement>(null);

  // Redação-specific states
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [correction, setCorrection] = useState<any>(null);
  const [essayText, setEssayText] = useState("");
  const [essayImage, setEssayImage] = useState<string | null>(null);
  const [textFileName, setTextFileName] = useState("");
  const [userEssayTheme, setUserEssayTheme] = useState("");
  const [tooltip, setTooltip] = useState<any>(null);
  const correctedTextRef = React.useRef<HTMLDivElement>(null);
  const [essayDoubt, setEssayDoubt] = useState("");
  const [essayDoubtResponse, setEssayDoubtResponse] = useState("");
  const [isAskingEssayDoubt, setIsAskingEssayDoubt] = useState(false);

  // Auto-initialize Redação module if mode is ready essay correction
  React.useEffect(() => {
    if (settings.subject === 'Redação' && settings.model === 'Corrigir Redação Pronta' && questions.length === 0) {
      setQuestions([{}]);
    }
  }, [settings.subject, settings.model, questions.length]);

  React.useEffect(() => {
    if (storageKey && questions.length > 0) {
      if (currentIndex >= questions.length) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, JSON.stringify({ currentIndex, score }));
      }
    }
  }, [currentIndex, score, storageKey, questions.length]);



  // Tutor Chat States
  const [doubt, setDoubt] = useState("");
  const [doubtResponse, setDoubtResponse] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  
  const [flashcardDoubt, setFlashcardDoubt] = useState("");
  const [flashcardDoubtResponse, setFlashcardDoubtResponse] = useState("");
  const [isAskingFlashcardDoubt, setIsAskingFlashcardDoubt] = useState(false);
  const [savingFlashcardDoubt, setSavingFlashcardDoubt] = useState(false);
  const [flashcardDoubtSaved, setFlashcardDoubtSaved] = useState(false);

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
      const result = await generateContentFromGemini({ ...settings, banca: selectedBanca }, apiKey);
      if (result.materia_identificada) settings.subject = result.materia_identificada;
      if (result.topico_identificado) settings.topic = result.topico_identificado;
      
      if (settings.subject === 'Redação' && settings.model === 'Enem') {
        setQuestions([result]);
      } else {
        const processedContent = result.conteudo.map((q: any) => {
          if (q.opcoes && Array.isArray(q.opcoes)) {
            // Fisher-Yates shuffle
            const shuffledOptions = [...q.opcoes];
            for (let i = shuffledOptions.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
            }
            return { ...q, opcoes: shuffledOptions };
          }
          return q;
        });
        setQuestions(processedContent);
      }
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
      
      const matchedFolderId = await findMatchingFolder(db, user.uid, settings.subject);

      await addDoc(quizzesRef, {
        subject: settings.subject,
        topic: settings.specificTopic || settings.topic,
        difficulty: settings.difficulty,
        model: settings.model,
        data: questions,
        userComment: '',
        folderId: matchedFolderId || null,
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
      const matchedFolderId = await findMatchingFolder(db, user.uid, settings.subject);
      await addDoc(lessonsRef, {
        subject: settings.subject,
        topic: settings.specificTopic || settings.topic,
        lessonLevel: 'Dúvida',
        data: {
          titulo: `Dúvida: ${doubt.substring(0, 80)}${doubt.length > 80 ? '...' : ''}`,
          introducao: `Pergunta: ${doubt}`,
          secoes: [{ subtitulo: 'Resposta da IA', conteudo: doubtResponse.replace(/<[^>]*>?/gm, '') }],
        },
        userComment: `Dúvida sobre ${settings.subject} - ${settings.topic}`,
        folderId: matchedFolderId || null,
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

  const saveFlashcardDoubtResponse = async () => {
    if (!user || !flashcardDoubtResponse || !flashcardDoubt) return;
    setSavingFlashcardDoubt(true);
    try {
      const lessonsRef = collection(db, 'users', user.uid, 'lessons');
      const matchedFolderId = await findMatchingFolder(db, user.uid, settings.subject);
      await addDoc(lessonsRef, {
        subject: settings.subject,
        topic: settings.specificTopic || settings.topic,
        lessonLevel: 'Dúvida',
        data: {
          titulo: `Dúvida (Flashcard): ${flashcardDoubt.substring(0, 80)}${flashcardDoubt.length > 80 ? '...' : ''}`,
          introducao: `Pergunta: ${flashcardDoubt}`,
          secoes: [{ subtitulo: 'Resposta da IA', conteudo: flashcardDoubtResponse.replace(/<[^>]*>?/gm, '') }],
        },
        userComment: `Dúvida sobre flashcard - ${settings.subject} - ${settings.topic}`,
        folderId: matchedFolderId || null,
        createdAt: serverTimestamp(),
      });
      setFlashcardDoubtSaved(true);
      setTimeout(() => setFlashcardDoubtSaved(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar explicação.');
    } finally {
      setSavingFlashcardDoubt(false);
    }
  };

  const updateRevisionPerformance = async (finalScore: number) => {
    if (!user || !settings.id || !settings.revisionId) return;
    const revisionRef = doc(db, 'users', user.uid, 'revisions', settings.revisionId);
    
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

  const exportHtmlToPdf = async (blocks: string[], fileName: string) => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidthPx = (pdfWidth - 2 * margin) * (96 / 25.4); 

    let cursorY = margin;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      let tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0px';
      tempDiv.style.width = `${contentWidthPx}px`;
      tempDiv.style.padding = '0';
      tempDiv.style.fontFamily = 'Helvetica, Arial, sans-serif';
      tempDiv.style.fontSize = '12pt';
      tempDiv.style.color = '#000000';
      tempDiv.style.backgroundColor = '#ffffff';
      tempDiv.innerHTML = block;
      document.body.appendChild(tempDiv);

      await new Promise(resolve => setTimeout(resolve, 150));

      try {
        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / (pdfWidth - 2 * margin);
        const imgHeightInPdf = imgHeight / ratio;

        if (cursorY + imgHeightInPdf > pdfHeight - margin && i > 0) {
          pdf.addPage();
          cursorY = margin;
        }

        pdf.addImage(imgData, 'PNG', margin, cursorY, pdfWidth - 2 * margin, imgHeightInPdf);
        cursorY += imgHeightInPdf + 5;
      } catch (e) {
        console.error("Erro ao renderizar bloco para PDF:", e);
      } finally {
        if (document.body.contains(tempDiv)) {
          document.body.removeChild(tempDiv);
        }
      }
    }
    
    pdf.save(fileName);
  };

  const handleSavePdf = async (type: 'questions' | 'answers' | 'flashcards' | 'correction') => {
    setError(null);
    if (type === 'flashcards') {
      try {
        const flashcardHtml = generateFlashcardsHtml(questions, settings);
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '0px';
        tempDiv.style.width = '800px';
        tempDiv.innerHTML = flashcardHtml;
        document.body.appendChild(tempDiv);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const canvas = await html2canvas(tempDiv, { scale: 2, useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / pdfWidth;
        const canvasHeightInPdf = imgHeight / ratio;
        let position = 0;

        while (position < canvasHeightInPdf) {
          if (position > 0) pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, -position, pdfWidth, canvasHeightInPdf);
          position += pdfHeight;
        }
        
        const safeFilename = sanitizeFilename(settings.subject);
        pdf.save(`Flashcards_${safeFilename}.pdf`);
        document.body.removeChild(tempDiv);
      } catch (e) {
        console.error("Erro ao gerar PDF de flashcards:", e);
        setError("Ocorreu um erro ao gerar o PDF dos flashcards.");
      }
      return;
    }

    if (type === 'correction' && correction) {
      try {
        const isCorrectionMode = settings.model === 'Corrigir Redação Pronta';
        const proposal = isCorrectionMode ? { tema: userEssayTheme, frase_tema: 'Fornecida pelo usuário' } : questions[0];
        const correctionHtml = generateCorrectionHtml(correction, proposal);
        await exportHtmlToPdf([correctionHtml], `Correcao_${sanitizeFilename(proposal.tema || 'Redacao')}.pdf`);
      } catch (e) {
        console.error("Erro ao gerar PDF de correção:", e);
        setError("Ocorreu um erro ao gerar o PDF da correção.");
      }
      return;
    }

    // Fallback to manual standard PDF writer
    onSavePdf(type as any);
  };

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

  const handleCorrectEssay = async () => {
    if (!apiKey) {
      setError("Chave de API não configurada.");
      return;
    }
    const isCorrectionMode = settings.model === 'Corrigir Redação Pronta';
    const proposal = isCorrectionMode ? { tema: userEssayTheme, frase_tema: 'Fornecida pelo usuário' } : questions[0];

    if (isCorrectionMode && !userEssayTheme.trim()) {
      setError("Por favor, digite o tema da redação.");
      return;
    }

    if (!essayText && !essayImage) {
      setError("Por favor, digite o texto da redação ou envie um arquivo/imagem.");
      return;
    }

    setIsCorrecting(true);
    setCorrection(null);
    setError(null);

    try {
      const result = await correctEssayFromGemini(proposal, essayText || null, essayImage || null, apiKey);
      if (!result.nota_final || !result.analise_competencias || !result.texto_corrigido_html) {
        throw new Error("A IA retornou uma correção em formato inesperado. Não foi possível exibir o feedback.");
      }
      setCorrection(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Falha técnica ao corrigir redação com IA.");
    } finally {
      setIsCorrecting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
        setError("O arquivo de imagem é muito grande. O limite é de 4MB.");
        return;
      }
      setEssayText("");
      setTextFileName("");
      const reader = new FileReader();
      reader.onloadend = () => {
        setEssayImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTextFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) { // 1MB limit
      setError("O arquivo de texto é muito grande. O limite é de 1MB.");
      return;
    }

    setEssayImage(null);
    setTextFileName(file.name);
    const reader = new FileReader();

    if (file.name.endsWith('.docx')) {
      reader.onload = (event) => {
        if (event.target?.result) {
          mammoth.extractRawText({ arrayBuffer: event.target.result as ArrayBuffer })
            .then((result: any) => {
              setEssayText(result.value);
            })
            .catch((err: any) => {
              console.error("Error reading .docx file:", err);
              setError("Não foi possível ler o arquivo .docx. Tente salvar como .txt e enviar novamente.");
              setTextFileName("");
            });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (event) => {
        if (event.target?.result) {
          setEssayText(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleAskEssayDoubt = async (proposal: any) => {
    if (!essayDoubt || !proposal || !apiKey) return;
    setIsAskingEssayDoubt(true);
    awardPoints(2, 'ask_doubt');
    setEssayDoubtResponse("");

    const doubtPrompt = `Você é um professor de redação especialista no modelo ENEM. Com base na proposta de redação (Tema: "${proposal.tema || proposal.frase_tema}"), responda à seguinte dúvida do aluno de forma clara e didática: "${essayDoubt}". Formate sua resposta usando HTML para melhor legibilidade (<p>, <strong>, <ul>, <li>). Não inclua tags <html>, <head> ou <body>.`;
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
      setEssayDoubtResponse(result.candidates?.[0]?.content?.parts?.[0]?.text || "<p>Não foi possível obter uma resposta.</p>");
    } catch (error) {
      console.error(error);
      setEssayDoubtResponse("<p>Ocorreu um erro ao processar sua dúvida.</p>");
    } finally {
      setIsAskingEssayDoubt(false);
    }
  };

  const handleCorrectedTextClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('erro-vermelho') && target.title) {
      const rect = target.getBoundingClientRect();
      const containerRect = correctedTextRef.current?.getBoundingClientRect();
      if (containerRect) {
        setTooltip({
          content: target.title,
          top: rect.top - containerRect.top - 10,
          left: rect.left - containerRect.left + rect.width / 2,
        });
      }
    } else {
      setTooltip(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 my-16">
        <div className={`w-16 h-16 border-4 border-dashed rounded-full animate-spin ${theme.border}`}></div>
        <p className={`text-lg ${theme.text}`}>
          Gerando {
            settings.model === 'Flashcard' ? 'flashcards' 
            : settings.subject === 'Redação' && settings.model !== 'Questões' ? 'propostas de redação'
            : 'questões'
          } de {settings.specificTopic || settings.topic || settings.subject}...
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

  // INTERCEPT FOR REDAÇÃO MODULE
  if (settings.subject === 'Redação' && settings.model !== 'Flashcard') {
    const isCorrectionMode = settings.model === 'Corrigir Redação Pronta';
    const proposal = isCorrectionMode ? { tema: userEssayTheme, frase_tema: 'Fornecida pelo usuário' } : questions[0];

    return (
      <DockableWrapper>
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        <div className="w-full flex justify-between items-center mb-6">
          <button onClick={onBack} className="text-sm bg-black/5 p-2 rounded-lg hover:bg-black/10 transition-colors">
            Voltar
          </button>
          <DockMenuButton />
          {correction && (
            <button
              onClick={() => handleSavePdf('correction')}
              className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 p-2 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors flex items-center gap-2"
            >
              <DownloadIcon className="w-4 h-4" /> Baixar PDF da Correção
            </button>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg border border-red-300 dark:border-red-800 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {isCorrecting && (
          <div className="flex flex-col items-center justify-center space-y-4 my-16">
            <div className={`w-16 h-16 border-4 border-dashed rounded-full animate-spin ${theme.border}`}></div>
            <p className="text-lg">Analisando e corrigindo sua redação com IA...</p>
          </div>
        )}

        {!isCorrecting && !correction && (
          <>
            {!isCorrectionMode && proposal && (
              <div className={`${theme.cardFront} backdrop-blur-sm p-6 rounded-2xl shadow-lg border-2 ${theme.border} space-y-6 text-gray-900 dark:text-gray-100`}>
                <h2 className="text-3xl font-bold mb-2 text-center">{proposal.tema}</h2>
                <p className="text-xl mb-6 text-center italic opacity-95">"{proposal.frase_tema}"</p>
                
                <h3 className="text-2xl font-semibold border-b-2 pb-2 border-dashed">Textos Motivadores</h3>
                {proposal.textos_motivadores?.map((texto: string, index: number) => (
                  <div key={index} className="bg-black/5 p-4 rounded-lg">
                     <p className="text-justify whitespace-pre-wrap leading-relaxed text-sm"><strong>Texto {index + 1}:</strong> {texto}</p>
                  </div>
                ))}

                {proposal.repertorios && proposal.repertorios.length > 0 && (
                  <>
                    <h3 className="text-2xl font-semibold border-b-2 pb-2 border-dashed mt-6">Dicas de Repertório</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {proposal.repertorios.map((rep: any, index: number) => (
                        <div key={index} className="bg-black/5 p-4 rounded-lg flex flex-col justify-between">
                          <div>
                            <span className={`inline-block px-3 py-1 text-xs text-white font-semibold rounded-full mb-2 ${theme.button}`}>{rep.tipo}</span>
                            <p className="text-sm leading-relaxed">{rep.sugestao}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-2 border-gray-100 dark:border-gray-700 space-y-6">
              {isCorrectionMode && (
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold border-b-2 pb-2 border-dashed">Corrigir Redação Pronta</h3>
                  <label className="block text-sm font-medium">Tema da Redação</label>
                  <input 
                    type="text"
                    value={userEssayTheme}
                    onChange={(e) => setUserEssayTheme(e.target.value)}
                    placeholder="Digite o tema da sua redação aqui..."
                    className={`w-full p-3 rounded-lg bg-white dark:bg-gray-700 ${theme.text} ${theme.border} border-2 focus:outline-none focus:ring-2 ${theme.ring}`}
                  />
                </div>
              )}
              
              <h3 className="text-2xl font-semibold border-b-2 pb-2 border-dashed">Escreva ou Envie sua Redação</h3>
              <textarea 
                value={essayText}
                onChange={(e) => { setEssayText(e.target.value); setTextFileName(""); setEssayImage(null); }}
                className="w-full h-96 p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm leading-relaxed" 
                placeholder="Escreva ou cole seu texto aqui, ou envie uma foto/documento abaixo..."
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center justify-center gap-3 p-3 rounded-lg border-2 border-dashed cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-gray-300 dark:border-gray-600">
                  <UploadCloud className="h-6 w-6 text-gray-500" />
                  <span>{essayImage ? "Foto Carregada! ✓" : "Carregar Foto (Manuscrita)"}</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>

                <label className="flex items-center justify-center gap-3 p-3 rounded-lg border-2 border-dashed cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-gray-300 dark:border-gray-600">
                  <FileText className="h-6 w-6 text-gray-500" />
                  <span>{textFileName ? `${textFileName} ✓` : "Carregar Arquivo (.txt, .docx)"}</span>
                  <input type="file" className="hidden" accept=".txt,.docx" onChange={handleTextFileUpload} />
                </label>
              </div>

              <div className="text-xs text-justify text-yellow-800 dark:text-yellow-200 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <strong>Aviso Multimodal:</strong> A leitura por imagem/arquivo é experimental. Certifique-se de que a caligrafia está nítida ou prefira digitar o texto diretamente na área acima.
              </div>

              {/* Doubt asking regarding Redação */}
              <div className="space-y-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500" />
                  Precisa de ajuda com o tema?
                </h4>
                <p className="text-sm opacity-70">Pergunte à IA algo rápido sobre a proposta ou o repertório sugerido.</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={essayDoubt}
                    onChange={(e) => setEssayDoubt(e.target.value)}
                    placeholder="Digite sua dúvida sobre o tema da redação..."
                    className={`flex-grow p-3 rounded-lg border-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:outline-none`}
                  />
                  <button
                    onClick={() => handleAskEssayDoubt(proposal)}
                    disabled={isAskingEssayDoubt || !essayDoubt}
                    className={`py-3 px-6 font-bold rounded-lg text-white ${theme.button} disabled:opacity-50`}
                  >
                    {isAskingEssayDoubt ? "Pensando..." : "Perguntar"}
                  </button>
                </div>
                {essayDoubtResponse && (
                  <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 dark:bg-blue-900/20 dark:border-blue-700 rounded-r-lg">
                    <div className="prose prose-blue dark:prose-invert max-w-none text-sm text-blue-900 dark:text-blue-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: essayDoubtResponse }} />
                  </div>
                )}
              </div>

              <button 
                onClick={handleCorrectEssay}
                disabled={isCorrecting || (!essayText && !essayImage)}
                className={`w-full py-4 text-lg font-bold rounded-lg text-white ${theme.button} disabled:opacity-50 flex items-center justify-center gap-3 shadow-md hover:opacity-90 transition-opacity`}
              >
                <Bot className="w-6 h-6" />
                {isCorrecting ? 'Corrigindo redação...' : 'Corrigir Redação com IA'}
              </button>
            </div>
          </>
        )}

        {correction && !isCorrecting && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-2 border-gray-100 dark:border-gray-700 space-y-6">
            <h3 className="text-3xl font-bold border-b-2 pb-2 text-center text-gray-900 dark:text-gray-100">Feedback da Correção</h3>
            
            <div className="text-center bg-indigo-50 dark:bg-indigo-950/30 p-6 rounded-2xl max-w-sm mx-auto border border-indigo-100 dark:border-indigo-900">
              <p className="text-lg text-gray-600 dark:text-gray-400">Nota Final Estimada</p>
              <p className={`text-6xl font-extrabold ${theme.accent} mt-1`}>{correction.nota_final}</p>
            </div>

            <div className="text-xs text-justify text-amber-800 dark:text-amber-200 mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <strong>Simulação ENEM:</strong> Esta nota simula os critérios reais C1-C5 da matriz oficial. Lembre-se de utilizar as sugestões de marcação e justificativa para ajustar a sua escrita.
            </div>

            <div className="space-y-4">
              <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">Análise detalhada por Competências</h4>
              <div className="grid grid-cols-1 gap-4">
                {correction.analise_competencias && Object.entries(correction.analise_competencias).map(([key, value]: any) => (
                  <div key={key} className="bg-black/5 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                      <strong className="uppercase font-bold text-sm tracking-wide text-indigo-600 dark:text-indigo-400">
                        {key.toUpperCase().replace('C', 'Competência ')}
                      </strong>
                      <span className={`font-bold text-sm px-3 py-1 rounded-full ${value.nota >= 160 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : value.nota >= 120 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'}`}>{value.nota} pts</span>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{value.justificativa}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative pt-6 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-xl font-bold mb-3 text-gray-900 dark:text-gray-100">Texto Marcado e Comentado</h4>
              <CorrectionLegend />
              
              <div 
                ref={correctedTextRef}
                className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 leading-relaxed text-sm font-sans text-gray-800 dark:text-gray-200"
                dangerouslySetInnerHTML={{ __html: correction.texto_corrigido_html }}
                onClick={handleCorrectedTextClick}
              ></div>

              {tooltip && (
                <div 
                  className="absolute bg-gray-900 dark:bg-black text-white text-xs rounded-lg p-3 z-10 shadow-xl max-w-xs border border-gray-700 pointer-events-none transform -translate-x-1/2 -translate-y-full"
                  style={{ 
                    top: `${tooltip.top}px`, 
                    left: `${tooltip.left}px`
                  }}
                >
                  {tooltip.content}
                </div>
              )}
            </div>

            <div className="flex justify-center gap-4 mt-8 pt-6 border-t">
              <button
                onClick={() => { setCorrection(null); setEssayText(""); setEssayImage(null); }}
                className="px-6 py-3 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Escrever Nova Redação
              </button>
              <button
                onClick={() => handleSavePdf('correction')}
                className={`px-6 py-3 text-white rounded-lg font-bold ${theme.button} hover:opacity-90 transition-opacity`}
              >
                Salvar PDF de Feedback
              </button>
            </div>
          </div>
        )}
      </div>
      </DockableWrapper>
    );
  }

  const currentQ = questions[currentIndex];
  const isFinished = currentIndex >= questions.length;
  const isFlashcard = settings.model === 'Flashcard';

  if (isFinished) {
    return (
      <DockableWrapper>
      <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold mb-4">{isFlashcard ? 'Flashcards Finalizados!' : 'Quiz Finalizado!'}</h2>
        {!isFlashcard && (() => {
          const finalScore = questions.reduce((acc, q, idx) => acc + (answersRecord[idx] === q.correta ? 1 : 0), 0);
          return <p className="text-xl mb-8">Sua pontuação: <span className={`font-bold ${theme.accent}`}>{finalScore}</span> de {questions.length}</p>;
        })()}
        <div className="flex justify-center gap-4 mt-8">
          <button onClick={onBack} className="px-6 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded font-semibold hover:bg-gray-300 dark:hover:bg-gray-600">{isSavedMode ? 'Voltar aos Salvamentos' : 'Novo Quiz'}</button>
          {!isSavedMode && (
            <button onClick={saveQuiz} disabled={saving || saved} className={`px-6 py-2 text-white rounded font-bold ${saved ? 'bg-green-500' : theme.button}`}>
              {saving ? 'Salvando...' : (saved ? 'Salvo!' : (isFlashcard ? 'Salvar Flashcards' : 'Salvar Questões'))}
            </button>
          )}
        </div>
      </div>
      </DockableWrapper>
    );
  }

  const handleAnswer = (option: string) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(option);
    setAnswersRecord(prev => ({ ...prev, [currentIndex]: option }));
    if (option === currentQ.correta) {
      const newScore = score + 1;
      setScore(newScore);
      if (currentIndex === questions.length - 1) {
        awardPoints(questions.length * 2, 'finish_quiz');
        updateRevisionPerformance(newScore);
      }
    } else {
      if (currentIndex === questions.length - 1) {
        awardPoints(questions.length * 2, 'finish_quiz');
        updateRevisionPerformance(score);
      }
    }
  };

  const handleNext = () => {
    if (isFlashcard && currentIndex === questions.length - 1) {
      awardPoints(questions.length * 1, 'finish_flashcards');
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
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setSelectedAnswer(answersRecord[prevIndex] || null);
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
    awardPoints(2, 'ask_doubt');
    setDoubtResponse("");
    setSubQuestions([]);
    
    const formatOpcoes = (opcoes?: string[]) => opcoes ? opcoes.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join(' | ') : 'N/A';
    const doubtPrompt = `Você é um professor extremamente rigoroso e preciso. Com base na seguinte questão do quiz: "${currentQ.pergunta}", nas alternativas: "${formatOpcoes(currentQ.opcoes)}", na resposta correta: "${currentQ.correta}" e na sua explicação: "${currentQ.explicacao}", responda a seguinte dúvida do aluno: "${doubt}". \n\nREGRAS RÍGIDAS:\n1. NUNCA invente ou alucine regras de gramática, ortografia, matemática ou leis. Siga ESTRITAMENTE as normas oficiais (ex: Novo Acordo Ortográfico da Língua Portuguesa).\n2. Se a dúvida do aluno apontar um erro real na questão original, reconheça o erro com honestidade intelectual.\n3. Formate sua resposta usando HTML para melhor legibilidade (<p>, <strong>, <ul>, <li>). Não inclua <html>, <head>, ou <body>.`;
    
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

    const prompt = `Com base no contexto da questão de quiz: "${currentQ.pergunta}", a explicação da resposta: "${currentQ.explicacao}", a dúvida do aluno: "${doubt}", e a resposta fornecida: "${doubtResponse.replace(/<[^>]*>?/gm, '')}", gere ${subQuestionCount} questões de múltipla escolha com dificuldade '${subQuestionDifficulty}'. O objetivo é testar o entendimento do aluno sobre o tópico da dúvida. NÃO crie questões que dependam de formatação visual (palavras "sublinhadas" ou "negritadas"). A resposta DEVE ser um array de objetos JSON, cada um com as chaves "pergunta", "opcoes" (um array de 4 strings), "correta" (a string exata da resposta correta) e "explicacao".`;
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

    const doubtPrompt = `Você é um professor rigoroso. Com base no seguinte flashcard de estudos (Frente: "${currentQ.frente}", Verso: "${currentQ.verso}"), responda a seguinte dúvida do aluno: "${flashcardDoubt}".\n\nREGRAS:\n1. NÃO alucine fatos ou regras. Seja 100% preciso com regras gramaticais e acadêmicas oficiais.\n2. Formate sua resposta usando HTML para melhor legibilidade (<p>, <strong>, <ul>, <li>). Não inclua <html>, <head>, ou <body>.`;
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
      if (!response.ok) throw new Error("A API falhou.");
      const result = await response.json();
      setFlashcardDoubtResponse(result.candidates?.[0]?.content?.parts?.[0]?.text || "<p>Não foi possível obter uma resposta.</p>");
    } catch (error) {
      setFlashcardDoubtResponse("<p>Erro ao processar sua dúvida.</p>");
    } finally {
      setIsAskingFlashcardDoubt(false);
    }
  };

  const handleGenerateFlashcardSubQuestions = async () => {
    if (!apiKey || !flashcardDoubtResponse) return;
    setIsGeneratingSubQuestions(true);
    setSubQuestionError(null);
    setSubQuestions([]);

    const prompt = `Com base no flashcard: (Frente: "${currentQ.frente}", Verso: "${currentQ.verso}"), na dúvida do aluno: "${flashcardDoubt}", e na resposta fornecida pela IA: "${flashcardDoubtResponse.replace(/<[^>]*>?/gm, '')}", gere ${subQuestionCount} questões de múltipla escolha com dificuldade '${subQuestionDifficulty}'. O objetivo é testar o entendimento do aluno sobre o tópico da dúvida. NÃO crie questões que dependam de formatação visual (palavras "sublinhadas" ou "negritadas"). A resposta DEVE ser um array de objetos JSON, cada um com as chaves "pergunta", "opcoes" (um array de 4 strings), "correta" (a string exata da resposta correta) e "explicacao".`;
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

  const handleReportQuestion = async () => {
    if (!reportText.trim() || !user?.email || !currentQ) {
      alert("Por favor, preencha a descrição do erro.");
      return;
    }
    
    setIsSubmittingReport(true);
    try {
      await addDoc(collection(db, 'question_reports'), {
        questionId: currentQ.id || 'N/A',
        subject: settings.subject,
        topic: settings.model,
        questionText: currentQ.pergunta || currentQ.frente || 'N/A',
        userDescription: reportText,
        userEmail: user.email,
        status: 'new',
        createdAt: serverTimestamp()
      });
      alert("Relatório enviado com sucesso! Obrigado por ajudar a melhorar o banco de questões.");
      setIsReportModalOpen(false);
      setReportText("");
    } catch (err) {
      console.error("Erro ao enviar relatório:", err);
      alert("Erro ao enviar o relatório. Tente novamente mais tarde.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <DockableWrapper>
    <div className={`max-w-4xl mx-auto p-4 md:p-8 relative`}>
      <div className="w-full flex justify-between items-center mb-6">
        <button onClick={onBack} className="text-sm bg-black/5 p-2 rounded-lg hover:bg-black/10 transition-colors">
          Voltar
        </button>
        <div className="flex gap-2 flex-wrap">
          <DockMenuButton />
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
              onClick={() => handleSavePdf('flashcards')}
              className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 p-2 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors flex items-center gap-2"
            >
              <DownloadIcon className="w-4 h-4" /> Baixar Flashcards
            </button>
          ) : (
            <>
              <button
                onClick={() => handleSavePdf('questions')}
                className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 p-2 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors flex items-center gap-2"
              >
                <DownloadIcon className="w-4 h-4" /> Baixar Questões
              </button>
              <button
                onClick={() => handleSavePdf('answers')}
                className="text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 p-2 rounded-lg hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors flex items-center gap-2"
              >
                <DownloadIcon className="w-4 h-4" /> Baixar Gabarito
              </button>
            </>
          )}
        </div>
      </div>
      
      <div ref={contentRef} className={`${theme.cardFront} backdrop-blur-sm p-6 rounded-2xl shadow-lg relative overflow-hidden text-gray-900 dark:text-gray-100`}>
        <ReadingLaser containerRef={contentRef} />
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
                  className={`flex-grow p-2 rounded-lg ${theme.border} border-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`} 
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
                  
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={saveFlashcardDoubtResponse}
                      disabled={savingFlashcardDoubt || flashcardDoubtSaved}
                      className={`text-sm px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${flashcardDoubtSaved ? 'bg-green-500 text-white' : 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-gray-700'}`}
                    >
                      {savingFlashcardDoubt ? 'Salvando...' : flashcardDoubtSaved ? '✓ Salvo em Meus Salvamentos!' : '💾 Salvar Explicação'}
                    </button>
                  </div>
                </div>
              )}
              
              {flashcardDoubtResponse && (
                <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6 animate-fade-in">
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border-2 border-indigo-100 dark:border-indigo-900 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/20 rounded-bl-full -z-10"></div>
                    
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
                        <Brain className="w-6 h-6" />
                      </div>
                      
                      <div className="flex-grow">
                        <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">Gere um Quiz sobre sua dúvida</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Teste seu entendimento gerando questões inéditas focadas na explicação acima.</p>
                        
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 p-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                            <span className="text-xs font-semibold text-gray-500 pl-2">Quantidade:</span>
                            <select 
                              value={subQuestionCount} 
                              onChange={(e) => setSubQuestionCount(Number(e.target.value))}
                              className="text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-1 px-2 focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value={1}>1 Questão</option>
                              <option value={3}>3 Questões</option>
                              <option value={5}>5 Questões</option>
                            </select>
                          </div>
                          
                          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 p-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                            <span className="text-xs font-semibold text-gray-500 pl-2">Dificuldade:</span>
                            <select 
                              value={subQuestionDifficulty} 
                              onChange={(e) => setSubQuestionDifficulty(e.target.value)}
                              className="text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-1 px-2 focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="Fácil">Fácil</option>
                              <option value="Médio">Médio</option>
                              <option value="Difícil">Difícil</option>
                            </select>
                          </div>
                        </div>

                        <button 
                          onClick={handleGenerateFlashcardSubQuestions} 
                          disabled={isGeneratingSubQuestions || !apiKey} 
                          className="flex items-center gap-2 py-2.5 px-5 font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isGeneratingSubQuestions ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Gerando Quiz...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              Gerar Quiz de Fixação
                            </>
                          )}
                        </button>
                        
                        {subQuestionError && (
                          <div className="mt-3 text-red-500 text-sm bg-red-50 dark:bg-red-900/30 p-2 rounded-lg border border-red-200 dark:border-red-800">
                            <strong>Erro:</strong> {subQuestionError}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* PracticeQuiz Component gets rendered below inside subQuestions array handler */}
                  {subQuestions.length > 0 && (
                    <div className="mt-6 border border-indigo-200 dark:border-indigo-800 rounded-xl overflow-hidden shadow-lg animate-slide-up relative">
                      <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 flex justify-between items-center border-b border-indigo-100 dark:border-indigo-800">
                        <h4 className="font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-indigo-500" />
                          Quiz da Dúvida
                        </h4>
                        <button onClick={() => setSubQuestions([])} className="text-gray-500 hover:bg-white dark:hover:bg-gray-800 p-1.5 rounded-lg transition-colors shadow-sm bg-white/50 dark:bg-black/20">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <PracticeQuiz 
                        key={flashcardDoubt} 
                        questions={subQuestions} 
                        theme={theme} 
                        onClose={() => setSubQuestions([])} 
                        quizTitle="Quiz de Fixação da Dúvida" 
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start gap-4 mt-4 mb-6 min-h-[6rem]">
              <h3 className="text-xl md:text-2xl font-semibold">{currentQ.pergunta}</h3>
              <button 
                onClick={() => setIsReportModalOpen(true)} 
                title="Reportar erro na questão" 
                className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 flex-shrink-0"
              >
                <Flag className="w-5 h-5" />
              </button>
            </div>
            
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
                      <span className="font-bold mr-2">{String.fromCharCode(65 + idx)})</span>
                      <span>{option}</span>
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
                  
                  {currentQ.lei_seca && (
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 rounded-r-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-4 h-4 text-amber-700 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                        <span className="font-bold text-amber-900 dark:text-amber-100 text-sm">Lei Seca</span>
                      </div>
                      <p className="text-sm italic text-amber-800 dark:text-amber-200">"{currentQ.lei_seca}"</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 border-t-2 border-dashed pt-4 border-gray-300">
                  <input 
                    type="text"
                    value={doubt}
                    onChange={(e) => setDoubt(e.target.value)}
                    placeholder="Ainda com dúvidas? Pergunte à IA"
                    className={`w-full p-2 rounded-lg ${theme.border} border-2 focus:outline-none focus:ring-2 ${theme.ring} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
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
                              className={`w-full p-2 rounded-lg border-2 ${theme.border} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
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
                  <button onClick={handlePrevious} disabled={currentIndex === 0} className={`px-6 py-2 bg-gray-400 text-white rounded font-bold hover:bg-gray-50 dark:bg-gray-900 disabled:opacity-50`}>
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

      {/* Modal de Reportar Erro */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-200 border border-red-100 dark:border-red-900/30">
            <button
              onClick={() => setIsReportModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XCircleIcon className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="w-8 h-8" />
              <h2 className="text-2xl font-bold">Reportar Problema</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Encontrou algum erro na questão (ex: gráfico faltando, gabarito incorreto, erro de digitação)? Descreva abaixo para que possamos corrigir.
            </p>
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Descreva o problema encontrado com detalhes..."
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 resize-none h-32 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReportQuestion}
                disabled={isSubmittingReport || !reportText.trim()}
                className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 transition-colors shadow-md"
              >
                {isSubmittingReport ? 'Enviando...' : 'Enviar Reporte'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </DockableWrapper>
  );
}
