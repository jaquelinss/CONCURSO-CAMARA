import React, { useState, useRef, useEffect, useCallback } from 'react';
import { themes, defaultTheme } from '../lib/constants';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { DownloadIcon, ClipboardListIcon } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import PracticeQuiz from './PracticeQuiz';
import { generateContentFromGemini } from '../lib/gemini';
import ReadingLaser from './ReadingLaser';

const renderMarkdownText = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
};

const parseLessonContent = (content: string) => {
  if (typeof content !== 'string') return [];
  
  const regex = /\[EXPLICACAO\](.*?):(.*?)\[\/EXPLICACAO\]/gs;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.substring(lastIndex, match.index) });
    }
    const term = match[1]?.trim();
    const explanation = match[2]?.trim();
    if (term && explanation) {
      parts.push({ type: 'term', term, explanation });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.substring(lastIndex) });
  }
  return parts;
};

const ParsedSectionContent = React.memo(({ content, theme }: { content: string, theme: any }) => {
  return (
    <div>
      {parseLessonContent(content).map((part, i) => 
        part.type === 'term' ? (
          <span 
            key={i} 
            className={`term-highlight cursor-help font-bold underline decoration-dotted underline-offset-4 ${theme.accent}`}
            data-explanation={part.explanation}
          >
            {part.term}
          </span>
        ) : (
          <span key={i}>{renderMarkdownText(part.content!)}</span>
        )
      )}
    </div>
  );
});

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
      onPointerDown={(e) => e.preventDefault()}
    >
      {colors.map(color => (
        <button
          key={color}
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onHighlight(color); }}
          className="w-6 h-6 rounded-full border border-white cursor-pointer hover:scale-110 transition-transform"
          style={{ backgroundColor: color }}
        />
      ))}
      <div className="w-px h-6 bg-gray-600 mx-1"></div>
      <button
        onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onHighlight('clear'); }}
        className="w-6 h-6 rounded-full border border-gray-400 bg-gray-200 cursor-pointer hover:scale-110 transition-transform flex items-center justify-center text-xs font-bold text-gray-600"
        title="Remover marcação"
      >
        ✕
      </button>
      <div className="absolute left-1/2 bottom-[-6px] -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-800"></div>
    </div>
  );
};

export default function LessonScreen({ settings, onBack, savedData }: LessonScreenProps) {
  const { user, apiKey, selectedBanca } = useAuth();
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
  const activeHighlightNodeRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  const [tooltip, setTooltip] = useState({ visible: false, content: '', top: 0, left: 0 });
  const [highlighter, setHighlighter] = useState({ visible: false, top: 0, left: 0 });
  const highlighterPaletteRef = useRef<HTMLDivElement>(null);

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

  const handleSelection = useCallback((e?: Event) => {
    // Ignorar se o evento veio de dentro da paleta de marcação
    if (e && highlighterPaletteRef.current && highlighterPaletteRef.current.contains(e.target as Node)) {
      return;
    }
    const selection = window.getSelection();
    if (selection && contentRef.current?.contains(selection.anchorNode)) {
      const node = selection.anchorNode;
      const parentElement = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement;
      const highlightNode = parentElement?.closest('.highlighted-text') as HTMLElement | null;

      if (!selection.isCollapsed) {
        selectionRef.current = selection.getRangeAt(0).cloneRange();
        activeHighlightNodeRef.current = highlightNode;
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const contentRect = contentRef.current.getBoundingClientRect();
        setHighlighter({ 
          visible: true, 
          top: rect.top - contentRect.top, 
          left: rect.left - contentRect.left + rect.width / 2 
        });
      } else if (highlightNode) {
        selectionRef.current = null;
        activeHighlightNodeRef.current = highlightNode;
        const rect = highlightNode.getBoundingClientRect();
        const contentRect = contentRef.current.getBoundingClientRect();
        setHighlighter({ 
          visible: true, 
          top: rect.top - contentRect.top, 
          left: rect.left - contentRect.left + rect.width / 2 
        });
      } else {
        setHighlighter({ visible: false, top: 0, left: 0 });
        activeHighlightNodeRef.current = null;
      }
    } else {
      setHighlighter({ visible: false, top: 0, left: 0 });
      activeHighlightNodeRef.current = null;
    }
  }, []);

  const applyHighlight = (color: string) => {
    if (color === 'clear') {
      const nodeToClear = activeHighlightNodeRef.current;
      if (nodeToClear) {
        const text = document.createTextNode(nodeToClear.textContent || '');
        nodeToClear.parentNode?.replaceChild(text, nodeToClear);
      }
      window.getSelection()?.removeAllRanges();
      setHighlighter({ visible: false, top: 0, left: 0 });
      return;
    }

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
    document.addEventListener('mouseup', handleSelection as EventListener);
    document.addEventListener('touchend', handleSelection as EventListener);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mouseup', handleSelection as EventListener);
      document.removeEventListener('touchend', handleSelection as EventListener);
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
      const lessonSettings = { ...settings, lessonLevel: level, model: 'Aula Explicativa', banca: selectedBanca };
      const result = await generateContentFromGemini(lessonSettings, apiKey);
      
      let parsedLesson = result;
      if (result.materia_identificada) {
        settings.subject = result.materia_identificada;
        settings.topic = result.topico_identificado || settings.topic;
        parsedLesson = result.conteudo;
      }

      setLessonData(prev => ({ ...prev, [level]: parsedLesson }));
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
      const savedHtml = contentRef.current?.querySelector('.lesson-content-container')?.innerHTML || null;
      const lessonsRef = collection(db, 'users', user.uid, 'lessons');
      await addDoc(lessonsRef, {
        subject: settings.subject,
        topic: settings.specificTopic || settings.topic,
        lessonLevel: currentLevel,
        data: {
            ...currentLesson,
            savedHtml: savedHtml
        },
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
        topic: settings.specificTopic || settings.topic,
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

  const onSavePdf = async () => {
    if (!currentLesson) return;
    try {
      const getSubjectColor = () => {
        switch (settings.subject) {
          case 'Matemática':
          case 'Raciocínio Lógico-Matemático':
            return { accent: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' };
          case 'Português':
          case 'Língua Portuguesa':
            return { accent: '#eab308', bg: '#fef9c3', border: '#fef08a', text: '#854d0e' };
          case 'Redação':
            return { accent: '#64748b', bg: '#f1f5f9', border: '#cbd5e1', text: '#334155' };
          case 'Ciências da Natureza':
          case 'Biologia':
            return { accent: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46' };
          case 'Química':
            return { accent: '#06b6d4', bg: '#ecfeff', border: '#c5f2f7', text: '#155e75' };
          case 'Física':
            return { accent: '#f43f5e', bg: '#fff1f2', border: '#fecdd3', text: '#9f1239' };
          case 'Constituição Federal':
          case 'Noções de Direito Constitucional':
          case 'Noções de Direito Administrativo':
          case 'Lei Orgânica de Caruaru':
          case 'Legislação Específica':
            return { accent: '#f59e0b', bg: '#fef3c7', border: '#fde68a', text: '#92400e' };
          default:
            return { accent: '#6366f1', bg: '#e0e7ff', border: '#c7d2fe', text: '#3730a3' };
        }
      };

      const colors = getSubjectColor();

      const formatSectionContentForPdf = (content: string) => {
        if (typeof content !== 'string') return '';
        let formatted = content;
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        formatted = formatted.replace(/\n/g, '<br />');
        formatted = formatted.replace(/\[EXPLICACAO\](.*?):(.*?)\[\/EXPLICACAO\]/gs, 
          `<span style="border-bottom: 1.5px dotted ${colors.accent}; color: ${colors.text}; font-weight: 600; padding: 0 2px;">$1</span>`
        );
        return formatted;
      };

      // Extract Glossary Terms
      const termsMap = new Map<string, string>();
      const regex = /\[EXPLICACAO\](.*?):(.*?)\[\/EXPLICACAO\]/gs;
      currentLesson.secoes.forEach((sec: any) => {
        let match;
        regex.lastIndex = 0;
        while ((match = regex.exec(sec.conteudo)) !== null) {
          const term = match[1]?.trim();
          const explanation = match[2]?.trim();
          if (term && explanation) {
            termsMap.set(term, explanation);
          }
        }
      });
      const glossaryTerms = Array.from(termsMap.entries()).map(([term, explanation]) => ({ term, explanation }));

      // Prepare blocks
      const blocks: string[] = [];

      // Cover Page / Header Block
      const coverHtml = `
        <div style="padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background-color: #ffffff; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
            <span style="font-size: 9pt; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em;">EduGenius AI</span>
            <span style="font-size: 9pt; font-weight: 600; color: #94a3b8;">Material de Aula</span>
          </div>
          <div style="display: inline-block; padding: 4px 12px; background-color: ${colors.bg}; color: ${colors.text}; font-size: 10pt; font-weight: 700; border-radius: 9999px; text-transform: uppercase; margin-bottom: 16px; letter-spacing: 0.05em;">
            ${settings.subject} • Nível ${currentLevel}
          </div>
          <h1 style="font-size: 26pt; font-weight: 800; line-height: 1.2; margin: 0 0 16px 0; color: #0f172a;">
            ${currentLesson.titulo}
          </h1>
          <div style="border-left: 4px solid ${colors.accent}; padding: 14px 20px; background-color: #f8fafc; border-radius: 0 8px 8px 0; margin-bottom: 24px; font-style: italic; font-size: 12pt; line-height: 1.6; color: #475569;">
            ${currentLesson.introducao}
          </div>
        </div>
      `;
      blocks.push(coverHtml);

      // Section Blocks
      currentLesson.secoes.forEach((sec: any) => {
        const secHtml = `
          <div style="padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background-color: #ffffff; border-radius: 8px;">
            <h2 style="font-size: 18pt; font-weight: 700; margin: 0 0 16px 0; color: #0f172a; border-left: 4px solid ${colors.accent}; padding-left: 10px; line-height: 1.2;">
              ${sec.subtitulo}
            </h2>
            <div style="font-size: 11pt; line-height: 1.6; color: #334155; text-align: justify; white-space: pre-wrap;">
              ${formatSectionContentForPdf(sec.conteudo)}
            </div>
          </div>
        `;
        blocks.push(secHtml);
      });

      // Glossary Block
      if (glossaryTerms.length > 0) {
        const glossaryHtml = `
          <div style="padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background-color: #ffffff; border-radius: 8px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
              <div style="width: 8px; height: 24px; background-color: ${colors.accent}; border-radius: 4px;"></div>
              <h2 style="font-size: 20pt; font-weight: 800; margin: 0; color: #0f172a;">
                Glossário de Termos
              </h2>
            </div>
            <p style="font-size: 10pt; color: #64748b; margin: 0 0 20px 0; font-style: italic;">
              Definições e explicações contextualizadas para termos e conceitos-chave da aula.
            </p>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${glossaryTerms.map(item => `
                <div style="padding: 12px 16px; border-left: 4px solid ${colors.accent}; background-color: ${colors.bg}; border-radius: 0 8px 8px 0;">
                  <strong style="color: ${colors.text}; font-size: 11.5pt; display: block; margin-bottom: 4px; text-transform: capitalize;">
                    ${item.term}
                  </strong>
                  <div style="color: #475569; font-size: 10.5pt; line-height: 1.5;">
                    ${item.explanation}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        blocks.push(glossaryHtml);
      }

      // Convert blocks to PDF using html2canvas & jspdf
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

          // If the block overflows the current page
          if (cursorY + imgHeightInPdf > pdfHeight - margin) {
            // If it's not the first element, we push to a new page
            if (i > 0) {
              pdf.addPage();
              cursorY = margin;
            }
          }

          pdf.addImage(imgData, 'PNG', margin, cursorY, pdfWidth - 2 * margin, imgHeightInPdf);
          cursorY += imgHeightInPdf + 8;
        } catch (e) {
          console.error("Erro ao renderizar bloco para PDF:", e);
        } finally {
          if (document.body.contains(tempDiv)) {
            document.body.removeChild(tempDiv);
          }
        }
      }

      const safeSubject = sanitizeFilename(settings.subject);
      const safeLevel = sanitizeFilename(currentLevel);
      pdf.save(`Aula_${safeSubject}_${safeLevel}.pdf`);
    } catch (err: any) {
      console.error(err);
      alert("Falha ao exportar PDF: " + err.message);
    }
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
    const doubtPrompt = `Você é um professor extremamente rigoroso. Com base no seguinte material de estudo sobre "${currentLesson.titulo}":\n${lessonContext}\n\nResponda a seguinte dúvida do aluno: "${doubt}".\n\nREGRAS RÍGIDAS:\n1. NUNCA invente ou alucine regras (ex: gramática, ortografia, matemática, leis). Siga ESTRITAMENTE as normas oficiais.\n2. Se a dúvida do aluno apontar um erro real, reconheça o erro com honestidade intelectual.\n3. Formate sua resposta usando HTML. Use tags <p>, <strong>, e <ul>/<li>. Não inclua <html>, <head>, ou <body>.`;
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

  // Removed parseLessonContent (moved to top of file)

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
          <p className={`text-lg ${theme.text}`}>Gerando aula de {settings.specificTopic || settings.topic || settings.subject}...</p>
        </div>
      ) : currentLesson ? (
        <div ref={contentRef} className={`${theme.cardFront} p-6 rounded-xl shadow-lg relative overflow-hidden text-gray-900 dark:text-gray-100`}>
          <ReadingLaser containerRef={contentRef} />
          {highlighter.visible && (
            <div ref={highlighterPaletteRef}>
              <HighlighterPalette top={highlighter.top} left={highlighter.left} onHighlight={applyHighlight} />
            </div>
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

          <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
            <h2 className={`text-4xl font-bold ${theme.accent}`}>{currentLesson.titulo}</h2>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={onSavePdf} className="px-3 py-2 rounded-lg font-bold text-white text-sm shadow-md transition-all bg-green-600 hover:bg-green-700 hover:scale-105 flex items-center gap-1.5">
                <DownloadIcon className="w-4 h-4" /> PDF
              </button>
              {!isSavedMode && (
                <button onClick={saveLesson} disabled={saving || saved} className={`px-3 py-2 rounded-lg font-bold text-white text-sm shadow-md transition-all ${saved ? 'bg-green-500' : theme.button} hover:scale-105 flex items-center gap-1.5`}>
                  {saving ? 'Salvando...' : (saved ? '✓ Salvo!' : '💾 Salvar')}
                </button>
              )}
              {isSavedMode && (
                <span className="px-3 py-2 rounded-lg font-bold text-white text-sm bg-green-500 shadow-md">✓ Salvo</span>
              )}
            </div>
          </div>
          <p className="text-lg italic mb-6 text-gray-700 dark:text-gray-300">{currentLesson.introducao}</p>
          
          <div 
            className="space-y-6 lesson-content-container"
            onPointerDown={(e) => {
              const target = e.target as HTMLElement;
              if (target.classList.contains('term-highlight')) {
                const explanation = target.getAttribute('data-explanation');
                if (explanation) {
                  toggleTooltip(e as any, explanation);
                }
              }
            }}
          >
            <div className="text-base leading-relaxed whitespace-pre-wrap text-gray-800 dark:text-gray-200">
              {currentLesson.savedHtml ? (
                <div dangerouslySetInnerHTML={{ __html: currentLesson.savedHtml }} />
              ) : (
                currentLesson.secoes?.map((section: any, index: number) => (
                  <div key={index} className="mb-6 last:mb-0">
                    <h3 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-gray-100">{section.subtitulo}</h3>
                    <ParsedSectionContent content={section.conteudo} theme={theme} />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-8 border-t-2 pt-6 space-y-4">
            <h3 className="text-2xl font-semibold text-yellow-800 dark:text-yellow-300">Ferramentas de Estudo</h3>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Nível do Quiz</label>
                <div className="flex p-1 bg-gray-200 dark:bg-gray-700 rounded-lg">
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
            <h3 className="text-2xl font-semibold mb-4 text-yellow-800 dark:text-yellow-300">Ainda com dúvidas? Pergunte à IA</h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={doubt} 
                onChange={(e) => setDoubt(e.target.value)} 
                placeholder="Digite sua pergunta sobre a aula aqui..." 
                className={`flex-grow p-2 rounded-lg ${theme.border} border-2 focus:outline-none focus:ring-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`} 
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
