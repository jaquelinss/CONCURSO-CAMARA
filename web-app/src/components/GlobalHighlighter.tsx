import { useState, useEffect } from 'react';
import { Highlighter } from 'lucide-react';
import Draggable from 'react-draggable';
import { createPortal } from 'react-dom';

export default function GlobalHighlighter() {
  const [active, setActive] = useState(false);

  useEffect(() => {
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
      highlight.add(range);
      
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
      `}</style>
      <Draggable bounds="body">
        <button
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