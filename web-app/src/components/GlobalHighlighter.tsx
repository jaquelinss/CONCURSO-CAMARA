import { useState, useEffect, useRef } from 'react';
import { Highlighter } from 'lucide-react';
import Draggable from 'react-draggable';
import { createPortal } from 'react-dom';

export default function GlobalHighlighter() {
  const [active, setActive] = useState(false);
  const nodeRef = useRef<HTMLButtonElement>(null);

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
      
      // @ts-ignore
      const highlight = CSS.highlights.get('global-highlight') || new Highlight();
      
      let removed = false;
      // @ts-ignore
      for (const existingRange of highlight) {
        if (
          existingRange.startContainer === range.startContainer &&
          existingRange.endContainer === range.endContainer &&
          existingRange.startOffset === range.startOffset &&
          existingRange.endOffset === range.endOffset
        ) {
          highlight.delete(existingRange);
          removed = true;
          break;
        }
      }

      if (!removed) {
        highlight.add(range);
      }
      
      // @ts-ignore
      CSS.highlights.set('global-highlight', highlight);
      
      selection.removeAllRanges();
    };

    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [active]);

  const button = (
    <>
      <style>{`
        ::highlight(global-highlight) {
          background-color: #fef08a;
          color: black;
        }
        
        .global-highlighter-active,
        .global-highlighter-active * {
          cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23eab308' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z'></path><line x1='16' y1='8' x2='2' y2='22'></line><line x1='17.5' y1='15' x2='9' y2='15'></line></svg>") 0 24, text !important;
        }
      `}</style>
      <Draggable bounds="body" nodeRef={nodeRef}>
        <button
          ref={nodeRef}
          onClick={() => setActive(!active)}
          className={`fixed top-32 left-4 z-[10010] p-3 rounded-full shadow-lg transition-all hover:scale-110 flex items-center justify-center ${
            active
              ? 'bg-yellow-400 text-yellow-900 ring-2 ring-yellow-300'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
          }`}
          title={active ? 'Desativar Marca-texto Contínuo (Todo o site)' : 'Ativar Marca-texto Contínuo (Todo o site)'}
        >
          <Highlighter className="w-5 h-5" />
        </button>
      </Draggable>
    </>
  );

  return createPortal(button, document.body);
}