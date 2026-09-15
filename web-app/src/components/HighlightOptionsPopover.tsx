import { useState, useEffect } from 'react';
import { Eraser, Palette } from 'lucide-react';

export const HIGHLIGHT_COLORS = [
  { id: 'yellow', hex: '#fef08a', class: 'bg-yellow-200' },
  { id: 'green', hex: '#bbf7d0', class: 'bg-green-200' },
  { id: 'blue', hex: '#bfdbfe', class: 'bg-blue-200' },
  { id: 'pink', hex: '#fbcfe8', class: 'bg-pink-200' },
];

export default function HighlightOptionsPopover() {
  const [position, setPosition] = useState<{ x: number, y: number } | null>(null);
  const [currentRange, setCurrentRange] = useState<Range | null>(null);
  const [currentColorId, setCurrentColorId] = useState<string | null>(null);
  const [showColors, setShowColors] = useState(false);

  useEffect(() => {
    const handleShow = (e: CustomEvent) => {
      const { range, colorId } = e.detail;
      setCurrentRange(range);
      setCurrentColorId(colorId);
      setShowColors(false);

      const rect = range.getBoundingClientRect();
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 10
      });
    };

    const handleHide = () => {
      setPosition(null);
      setCurrentRange(null);
    };

    window.addEventListener('show-highlight-options', handleShow as EventListener);
    document.addEventListener('mousedown', () => {
      // Small timeout to allow button clicks to process
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          handleHide();
        }
      }, 100);
    });

    return () => {
      window.removeEventListener('show-highlight-options', handleShow as EventListener);
    };
  }, []);

  const handleRemove = () => {
    if (!currentRange || !currentColorId) return;
    
    // @ts-ignore
    const highlight = CSS.highlights.get(`global-highlight-${currentColorId}`);
    if (highlight) {
      highlight.delete(currentRange);
    }
    
    window.getSelection()?.removeAllRanges();
    setPosition(null);
    window.dispatchEvent(new Event('highlights-updated'));
  };

  const handleChangeColor = (newColorId: string) => {
    if (!currentRange || !currentColorId) return;
    
    // Remove from old
    // @ts-ignore
    const oldHighlight = CSS.highlights.get(`global-highlight-${currentColorId}`);
    if (oldHighlight) oldHighlight.delete(currentRange);

    // Add to new
    // @ts-ignore
    const newHighlight = CSS.highlights.get(`global-highlight-${newColorId}`) || new Highlight();
    newHighlight.add(currentRange);
    // @ts-ignore
    CSS.highlights.set(`global-highlight-${newColorId}`, newHighlight);

    window.getSelection()?.removeAllRanges();
    setPosition(null);
    window.dispatchEvent(new Event('highlights-updated'));
  };

  if (!position) return null;

  return (
    <div 
      className="fixed z-[10020] transform -translate-x-1/2 flex gap-2 animate-fade-in"
      style={{ left: position.x, top: position.y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {!showColors ? (
        <>
          <button
            onClick={() => setShowColors(true)}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-1.5 px-3 rounded-full shadow-lg border border-gray-200 dark:border-gray-600 transition-all"
          >
            <Palette className="w-4 h-4" />
            <span>Mudar Cor</span>
          </button>
          <button
            onClick={handleRemove}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-bold py-1.5 px-3 rounded-full shadow-lg border border-gray-200 dark:border-gray-600 transition-all"
          >
            <Eraser className="w-4 h-4" />
            <span>Desmarcar</span>
          </button>
        </>
      ) : (
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-600">
          {HIGHLIGHT_COLORS.map(c => (
            <button
              key={c.id}
              onClick={() => handleChangeColor(c.id)}
              className={`w-6 h-6 rounded-full ${c.class} border-2 ${currentColorId === c.id ? 'border-gray-800 dark:border-gray-200' : 'border-transparent'}`}
              title="Trocar cor"
            />
          ))}
          <button 
            onClick={() => setShowColors(false)}
            className="ml-2 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}