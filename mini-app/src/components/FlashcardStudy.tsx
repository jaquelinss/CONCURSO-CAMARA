import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Repeat, CheckCircle } from 'lucide-react';
import DOMPurify from 'dompurify';

interface FlashcardStudyProps {
  deck: any;
  onClose: () => void;
}

export default function FlashcardStudy({ deck, onClose }: FlashcardStudyProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  const cards = deck.data || [];
  const currentCard = cards[currentIndex];

  if (cards.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-6 text-center shadow-xl w-full max-w-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Deck Vazio</h2>
          <p className="text-gray-500 mb-4">Este conjunto de flashcards não possui nenhuma carta ainda.</p>
          <button 
            onClick={onClose}
            className="w-full py-2 bg-indigo-600 text-white rounded-xl font-bold"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev - 1), 150);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 shadow-sm flex items-center justify-between sticky top-0 z-10">
        <div className="flex-1">
          <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-0.5">
            {deck.subject || 'Flashcards'}
          </div>
          <h2 className="text-sm font-bold text-gray-900 truncate">
            {deck.customTitle || deck.topic}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            {currentIndex + 1} / {cards.length}
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main content - Card Area */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 perspective-1000">
        <div 
          className="w-full max-w-sm aspect-[3/4] relative preserve-3d transition-transform duration-500 shadow-xl rounded-2xl"
          style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* Frente */}
          <div className="absolute inset-0 backface-hidden bg-white rounded-2xl border-2 border-indigo-100 p-6 flex flex-col">
            <div className="text-xs font-bold text-indigo-400 mb-4 flex justify-between">
              <span>FRENTE</span>
              <span className="opacity-50">Toque para virar</span>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-y-auto">
              <div 
                className="prose prose-sm text-center font-medium text-gray-800"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentCard?.frente || currentCard?.front || '') }}
              />
            </div>
          </div>

          {/* Verso */}
          <div 
            className="absolute inset-0 backface-hidden bg-indigo-600 rounded-2xl border-2 border-indigo-700 p-6 flex flex-col text-white"
            style={{ transform: 'rotateY(180deg)' }}
          >
            <div className="text-xs font-bold text-indigo-300 mb-4 flex justify-between">
              <span>VERSO</span>
              <span className="opacity-50">Toque para voltar</span>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-y-auto">
              <div 
                className="prose prose-sm prose-invert text-center font-medium"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentCard?.verso || currentCard?.back || '') }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between pb-safe">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="p-3 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-700 rounded-xl font-bold hover:bg-indigo-100 transition-colors"
        >
          <Repeat className="w-5 h-5" />
          Virar
        </button>
        
        <button
          onClick={handleNext}
          disabled={currentIndex === cards.length - 1}
          className={`p-3 rounded-full transition-colors ${
            currentIndex === cards.length - 1 
              ? 'bg-green-100 text-green-700' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {currentIndex === cards.length - 1 ? (
            <CheckCircle className="w-6 h-6" />
          ) : (
            <ChevronRight className="w-6 h-6" />
          )}
        </button>
      </div>
    </div>
  );
}
