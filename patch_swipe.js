const fs = require('fs');

function patchPostIts() {
  const file = 'mini-app/src/components/PostItsView.tsx';
  let code = fs.readFileSync(file, 'utf8');

  // Add state if missing
  if (!code.includes('const [touchStartX, setTouchStartX] = useState')) {
    code = code.replace('const [fullscreenNote, setFullscreenNote] = useState<any | null>(null);', 
                        'const [fullscreenNote, setFullscreenNote] = useState<any | null>(null);\n  const [touchStartX, setTouchStartX] = useState<number | null>(null);');
  }

  // Add hidden md:flex to the absolute buttons
  code = code.replace(/className="absolute left-2 md:left-6/g, 'className="hidden md:flex absolute left-2 md:left-6');
  code = code.replace(/className="absolute right-2 md:right-6/g, 'className="hidden md:flex absolute right-2 md:right-6');

  fs.writeFileSync(file, code);
  console.log('Patched PostItsView');
}

function patchFlashcards() {
  const file = 'mini-app/src/components/FlashcardsView.tsx';
  let code = fs.readFileSync(file, 'utf8');

  // Add state if missing
  if (!code.includes('const [touchStartX, setTouchStartX] = useState')) {
    code = code.replace('const [isFlippedFS, setIsFlippedFS] = useState(false);', 
                        'const [isFlippedFS, setIsFlippedFS] = useState(false);\n  const [touchStartX, setTouchStartX] = useState<number | null>(null);');
  }

  // Add touch logic to wrapper
  const wrapperRegex = /className="fixed top-\[52px\] left-0 right-0 bottom-0 z-\[15\] bg-gray-100\/90 dark:bg-gray-900\/90 backdrop-blur-sm p-4 flex flex-col items-center justify-center overflow-hidden animate-in fade-in"\s*onClick=\{\(\) => setFullscreenNote\(null\)\}/;
  
  if (wrapperRegex.test(code) && !code.includes('onTouchStart')) {
    const touchLogic = `
            onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchStartX === null || !fullscreenNote) return;
              const touchEndX = e.changedTouches[0].clientX;
              const diff = touchStartX - touchEndX;
              const currentIndex = filteredPostItFlashcards.findIndex(n => n.id === fullscreenNote.id);
              if (currentIndex === -1) return;
              
              if (Math.abs(diff) > 50) {
                e.stopPropagation();
                if (diff > 0 && currentIndex < filteredPostItFlashcards.length - 1) {
                  setFullscreenNote(filteredPostItFlashcards[currentIndex + 1]);
                  setIsFlippedFS(false);
                } else if (diff < 0 && currentIndex > 0) {
                  setFullscreenNote(filteredPostItFlashcards[currentIndex - 1]);
                  setIsFlippedFS(false);
                }
              }
              setTouchStartX(null);
            }}`;
    
    code = code.replace(wrapperRegex, `$&${touchLogic}`);
  }

  // Add hidden md:flex to the absolute buttons
  code = code.replace(/className="absolute left-2 md:left-6/g, 'className="hidden md:flex absolute left-2 md:left-6');
  code = code.replace(/className="absolute right-2 md:right-6/g, 'className="hidden md:flex absolute right-2 md:right-6');

  fs.writeFileSync(file, code);
  console.log('Patched FlashcardsView');
}

patchPostIts();
patchFlashcards();
