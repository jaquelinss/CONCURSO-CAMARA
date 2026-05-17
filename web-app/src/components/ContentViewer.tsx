import React, { useState, useRef, useEffect } from 'react';
import { themes, defaultTheme } from '../lib/constants';

interface ContentViewerProps {
  type: 'lesson' | 'quiz' | 'flashcard';
  content: any;
  onBack: () => void;
}

const Flashcard = ({ front, back, theme }: { front: string, back: string, theme: any }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="w-full h-80 perspective-1000 cursor-pointer mb-6" onClick={() => setIsFlipped(!isFlipped)}>
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

export default function ContentViewer({ type, content, onBack }: ContentViewerProps) {
  const theme = themes[content.subject] || defaultTheme;
  const data = content.data;

  // Tooltip and Highlighter States
  const contentRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState({ visible: false, content: '', top: 0, left: 0 });

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node) && !(event.target as HTMLElement).classList?.contains('term-highlight')) {
        hideTooltip();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const parseLessonContent = (contentString: string) => {
    if (typeof contentString !== 'string') return [];
    
    // Convert Markdown bold to HTML
    let processedContent = contentString.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
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

  return (
    <div ref={contentRef} className={`max-w-4xl mx-auto p-6 rounded-xl shadow-lg relative ${theme.cardFront}`}>
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

      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className="text-sm bg-black/5 p-2 rounded-lg hover:bg-black/10 transition-colors">
          ← Voltar para Meus Salvamentos
        </button>
        <div className="text-sm opacity-70">
          {content.subject} - {content.topic}
        </div>
      </div>

      {type === 'lesson' && data && (
        <>
          <h2 className={`text-4xl font-bold mb-4 ${theme.accent}`}>{data.titulo}</h2>
          <p className="text-lg italic mb-6">{data.introducao}</p>
          <div className="space-y-6">
            {data.secoes?.map((sec: any, idx: number) => (
              <div key={idx} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                <h3 className="text-2xl font-semibold mb-2">{sec.subtitulo}</h3>
                <div className="text-base leading-relaxed whitespace-pre-wrap">
                  {parseLessonContent(sec.conteudo).map((part, i) => 
                    part.type === 'term' ? (
                      <span 
                        key={i} 
                        className="term-highlight bg-yellow-100 border border-dashed border-yellow-400 rounded px-1 cursor-pointer"
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
        </>
      )}

      {type === 'quiz' && data && Array.isArray(data) && (
        <div className="space-y-8">
          <h2 className={`text-3xl font-bold mb-6 ${theme.accent}`}>Revisão de Questões</h2>
          {data.map((q: any, idx: number) => (
            <div key={idx} className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-4">{idx + 1}. {q.pergunta}</h3>
              <div className="space-y-2 mb-4">
                {q.opcoes.map((opt: string, optIdx: number) => (
                  <div key={optIdx} className={`p-3 rounded-lg border-2 ${opt === q.correta ? 'bg-green-100 border-green-400 font-bold' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'}`}>
                    {opt}
                  </div>
                ))}
              </div>
              <div className="p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-200 text-sm">
                <strong>Explicação:</strong> {q.explicacao}
              </div>
            </div>
          ))}
        </div>
      )}

      {type === 'flashcard' && data && Array.isArray(data) && (
        <div className="space-y-8">
          <h2 className={`text-3xl font-bold mb-6 ${theme.accent}`}>Meus Flashcards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.map((card: any, idx: number) => (
              <Flashcard key={idx} front={card.frente} back={card.verso} theme={theme} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
