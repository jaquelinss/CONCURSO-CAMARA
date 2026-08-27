import { useState, useEffect, useRef } from 'react';
import { Highlighter, ChevronUp } from 'lucide-react';
import Draggable from 'react-draggable';
import { createPortal } from 'react-dom';
import { HIGHLIGHT_COLORS } from './HighlightOptionsPopover';

export default function GlobalHighlighter() {
  const [active, setActive] = useState(false);
  const [activeColorId, setActiveColorId] = useState('yellow');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active) {
      document.body.classList.add('global-highlighter-active');
    } else {
      document.body.classList.remove('global-highlighter-active');
    }

    if (!('highlights' in CSS)) {
      console.warn('CSS Custom Highlight API not supported.');
      return;
    }

    if (!active) return;

    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const range = selection.getRangeAt(0);
      
      let matchedColorId: string | null = null;
      let matchedRange: Range | null = null;

      // Check if this range matches any existing highlight
      for (const color of HIGHLIGHT_COLORS) {
        // @ts-ignore
        const highlight = CSS.highlights.get(`global-highlight-${color.id}`);
        if (highlight) {
          // @ts-ignore
          for (const existingRange of highlight) {
            if (
              existingRange.startContainer === range.startContainer &&
              existingRange.endContainer === range.endContainer &&
              existingRange.startOffset === range.startOffset &&
              existingRange.endOffset === range.endOffset
            ) {
              matchedColorId = color.id;
              matchedRange = existingRange as Range;
              break;
            }
          }
        }
        if (matchedColorId) break;
      }

      if (matchedColorId && matchedRange) {
        // Trigger options popover
        window.dispatchEvent(new CustomEvent('show-highlight-options', {
          detail: { range: matchedRange, colorId: matchedColorId }
        }));
      } else {
        // Add new highlight
        // @ts-ignore
        const highlight = CSS.highlights.get(`global-highlight-${activeColorId}`) || new Highlight();
        highlight.add(range);
        // @ts-ignore
        CSS.highlights.set(`global-highlight-${activeColorId}`, highlight);
        selection.removeAllRanges();
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [active, activeColorId]);

  const activeColor = HIGHLIGHT_COLORS.find(c => c.id === activeColorId) || HIGHLIGHT_COLORS[0];

  const button = (
    <>
      <style>{`
        ${HIGHLIGHT_COLORS.map(c => `
          ::highlight(global-highlight-${c.id}) {
            background-color: ${c.hex};
            color: black;
          }
        `).join('\n')}
        
        .global-highlighter-active,
        .global-highlighter-active * {
          cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z'></path><line x1='16' y1='8' x2='2' y2='22'></line><line x1='17.5' y1='15' x2='9' y2='15'></line></svg>") 0 24, text !important;
        }
      `}</style>
      <Draggable bounds="body" nodeRef={nodeRef} cancel=".no-drag">
        <div ref={nodeRef} className="fixed top-32 left-4 z-[10010] flex flex-col items-center gap-2">
          {showColorPicker && (
            <div className="no-drag bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col gap-2 animate-fade-in mb-2">
              {HIGHLIGHT_COLORS.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveColorId(c.id);
                    setShowColorPicker(false);
                    setActive(true); // auto activate when color is chosen
                  }}
                  className={`w-6 h-6 rounded-full ${c.class} border-2 ${activeColorId === c.id ? 'border-gray-800 dark:border-gray-200' : 'border-transparent'} hover:scale-110 transition-transform`}
                  title={`Usar marcador ${c.id}`}
                />
              ))}
            </div>
          )}
          
          <div className="flex bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setActive(!active)}
              className={`p-3 transition-colors ${
                active
                  ? `${activeColor.class} text-gray-900`
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              title={active ? 'Desativar Marca-texto Contínuo' : 'Ativar Marca-texto Contínuo'}
            >
              <Highlighter className="w-5 h-5" />
            </button>
            <div className="w-px bg-gray-200 dark:bg-gray-700" />
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className={`no-drag px-1.5 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ${showColorPicker ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              title="Cores do marcador"
            >
              <ChevronUp className={`w-4 h-4 transition-transform ${showColorPicker ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </Draggable>
    </>
  );

  return createPortal(button, document.body);
}