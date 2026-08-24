import { useState, useEffect } from 'react';
import { FileEdit, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';
import { formatTextToPostIt } from '../lib/gemini';

export default function TextSelectionPopover() {
  const [position, setPosition] = useState<{ x: number, y: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { apiKey } = useAuth();
  const { getContextText } = useKnowledgeBase();

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      
      if (!selection || selection.isCollapsed || selection.toString().trim().length < 5) {
        if (!isLoading) {
          setPosition(null);
          setSelectedText('');
        }
        return;
      }

      const text = selection.toString().trim();
      setSelectedText(text);

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      let isBackwards = false;
      if (selection.anchorNode && selection.focusNode) {
        const position = selection.anchorNode.compareDocumentPosition(selection.focusNode);
        if (
          position === Node.DOCUMENT_POSITION_PRECEDING ||
          (!position && selection.anchorOffset > selection.focusOffset)
        ) {
          isBackwards = true;
        }
      }

      // Show popover near the mouse cursor end (bottom if forward, top if backward)
      setPosition({
        x: rect.left + rect.width / 2,
        y: isBackwards ? Math.max(10, rect.top - 40) : rect.bottom + 15
      });
    };

    const handleMouseUp = () => {
      // Small delay to allow the browser to update the selection
      setTimeout(handleSelectionChange, 10);
    };

    // We listen on document
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keyup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keyup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isLoading]);

  const handleCreatePostIt = async () => {
    if (!apiKey) {
      alert("Por favor, configure sua chave da API do Gemini nas Configurações.");
      return;
    }

    if (!selectedText) return;

    setIsLoading(true);
    try {
      const contextText = await getContextText();
      const contextPromptSuffix = contextText ? `\n\nATENÇÃO: O ALUNO FORNECEU MATERIAIS DE ESTUDO DE BASE. Priorize usá-los para embasar sua resposta:\n${contextText}` : '';
      
      const { title, content } = await formatTextToPostIt(selectedText, apiKey, contextPromptSuffix);
      
      const event = new CustomEvent('add-note', {
        detail: { title, content }
      });
      window.dispatchEvent(event);
      
      // Clear selection
      window.getSelection()?.removeAllRanges();
      setPosition(null);
    } catch (error) {
      console.error("Erro ao gerar post-it:", error);
      alert("Ocorreu um erro ao gerar o post-it. Verifique sua chave da API.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!position) return null;

  return (
    <div 
      className="fixed z-[10010] transform -translate-x-1/2 animate-fade-in"
      style={{ left: position.x, top: position.y }}
    >
      <button
        onClick={handleCreatePostIt}
        onTouchEnd={(e) => { e.preventDefault(); handleCreatePostIt(); }}
        disabled={isLoading}
        className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-yellow-950 font-bold py-1.5 px-3 rounded-full shadow-lg border border-yellow-300 transition-all hover:scale-105"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Gerando...</span>
          </>
        ) : (
          <>
            <FileEdit className="w-4 h-4" />
            <span>Criar Post-it</span>
          </>
        )}
      </button>
    </div>
  );
}
