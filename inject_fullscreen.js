const fs = require('fs');

function addFullscreenToPostIts() {
  const file = 'mini-app/src/components/PostItsView.tsx';
  let code = fs.readFileSync(file, 'utf8');

  // Add imports
  if (!code.includes('Maximize')) {
    code = code.replace(/import \{([^}]+)\} from 'lucide-react';/, "import {$1, Maximize, Minimize} from 'lucide-react';");
  }

  // Add state
  if (!code.includes('const [fullscreenNote, setFullscreenNote]')) {
    code = code.replace('const [editingNote, setEditingNote] = useState<any | null>(null);', 
      'const [editingNote, setEditingNote] = useState<any | null>(null);\n  const [fullscreenNote, setFullscreenNote] = useState<any | null>(null);');
  }

  code = code.replace(/<button[^>]+onClick=\{\(e\) => \{ e\.stopPropagation\(\); deleteNote\(note\.id\); \}\}[^>]*>[\s]*<Trash2 className="w-3\.5 h-3\.5" \/>[\s]*<\/button>/g, `$&
                      <button 
                        onClick={(e) => { e.stopPropagation(); setFullscreenNote(note); }} 
                        className="p-1 hover:bg-black/10 rounded"
                        title="Tela Cheia"
                      >
                        <Maximize className="w-3.5 h-3.5" />
                      </button>`);
                      
  code = code.replace(/<button[^>]+onClick=\{\(e\) => \{ e\.stopPropagation\(\); deleteNote\(note\.id\); \}\}[^>]*>[\s]*<Trash2 className="w-3 h-3" \/>[\s]*<\/button>/g, `$&
                      <button 
                        onClick={(e) => { e.stopPropagation(); setFullscreenNote(note); }} 
                        className="p-1 hover:bg-black/10 rounded"
                        title="Tela Cheia"
                      >
                        <Maximize className="w-3 h-3" />
                      </button>`);

  const fullscreenRender = `
      {fullscreenNote && (
        <div 
          className="fixed top-[52px] left-0 right-0 bottom-0 z-[15] bg-gray-100/90 dark:bg-gray-900/90 backdrop-blur-sm p-4 flex flex-col items-center justify-center overflow-hidden animate-in fade-in"
          onClick={() => setFullscreenNote(null)}
        >
           <div 
             className="w-full h-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
             style={{ backgroundColor: fullscreenNote.color || '#fef08a' }}
             onClick={(e) => e.stopPropagation()}
           >
             <div 
               className="px-4 py-3 flex justify-between items-center"
               style={{ backgroundColor: darkenColor(fullscreenNote.color || '#fef08a', 20), color: getContrastColor(fullscreenNote.color || '#fef08a') }}
             >
               <span className="font-bold text-lg truncate pr-2">
                 {fullscreenNote.noteNumber && \`#\${fullscreenNote.noteNumber} - \`}{fullscreenNote.title || (fullscreenNote.subjectTag ? \`\${fullscreenNote.subjectTag}\` : 'Nota')}
               </span>
               <button 
                 onClick={() => setFullscreenNote(null)}
                 className="p-2 hover:bg-black/10 rounded-full"
               >
                 <Minimize className="w-6 h-6" />
               </button>
             </div>
             
             {(fullscreenNote.subjectTag || fullscreenNote.subTag) && (
               <div className="px-4 pt-3 flex flex-wrap gap-2">
                 {fullscreenNote.subjectTag && (
                   <span className="text-xs font-bold px-2 py-1 rounded-full bg-black/10" style={{ color: getContrastColor(fullscreenNote.color || '#fef08a') }}>
                     {fullscreenNote.subjectTag}
                   </span>
                 )}
                 {fullscreenNote.subTag && (
                   <span className="text-xs font-medium px-2 py-1 rounded-full bg-black/5" style={{ color: getContrastColor(fullscreenNote.color || '#fef08a') }}>
                     {fullscreenNote.subTag}
                   </span>
                 )}
               </div>
             )}
  
             <div 
               className="p-4 md:p-6 text-base md:text-lg flex-1 overflow-y-auto"
               style={{ color: getContrastColor(fullscreenNote.color || '#fef08a') }}
             >
               <div 
                 className="prose prose-sm md:prose-base max-w-none"
                 style={{ color: 'inherit' }}
                 dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fullscreenNote.content || '') }} 
               />
             </div>
           </div>
        </div>
      )}
  `;

  if (!code.includes('setFullscreenNote(null)')) {
    code = code.replace('{editingNote && (', fullscreenRender + '\n      {editingNote && (');
  }

  fs.writeFileSync(file, code);
}

function addFullscreenToFlashcards() {
  const file = 'mini-app/src/components/FlashcardsView.tsx';
  let code = fs.readFileSync(file, 'utf8');

  if (!code.includes('Maximize')) {
    code = code.replace(/import \{([^}]+)\} from 'lucide-react';/, "import {$1, Maximize, Minimize} from 'lucide-react';");
  }

  if (!code.includes('const [fullscreenNote, setFullscreenNote]')) {
    code = code.replace('const [editingNote, setEditingNote] = useState<any | null>(null);', 
      'const [editingNote, setEditingNote] = useState<any | null>(null);\n  const [fullscreenNote, setFullscreenNote] = useState<any | null>(null);\n  const [isFlippedFS, setIsFlippedFS] = useState(false);');
  }

  code = code.replace(/<button[^>]+onClick=\{\(e\) => \{ e\.stopPropagation\(\); deleteNote\(note\.id\); \}\}[^>]*>[\s]*<Trash2 className="w-3 h-3" \/>[\s]*<\/button>/g, `$&
                      <button 
                        onClick={(e) => { e.stopPropagation(); setFullscreenNote(note); setIsFlippedFS(false); }} 
                        className="p-1 hover:bg-black/10 rounded"
                        title="Tela Cheia"
                      >
                        <Maximize className="w-3 h-3" />
                      </button>`);

  const fullscreenRender = `
      {fullscreenNote && (
        <div 
          className="fixed top-[52px] left-0 right-0 bottom-0 z-[15] bg-gray-100/90 dark:bg-gray-900/90 backdrop-blur-sm p-4 flex flex-col items-center justify-center overflow-hidden animate-in fade-in"
          onClick={() => setFullscreenNote(null)}
        >
           <div 
             className="w-full h-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 perspective-1000"
           >
             <div 
               className="w-full h-full relative preserve-3d transition-transform duration-500"
               style={{ transform: isFlippedFS ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
               onClick={(e) => { e.stopPropagation(); setIsFlippedFS(!isFlippedFS); }}
             >
               {/* FRENTE */}
               <div 
                 className="absolute inset-0 backface-hidden flex flex-col overflow-hidden rounded-2xl"
                 style={{ backgroundColor: fullscreenNote.color || '#fef08a' }}
               >
                 <div 
                   className="px-4 py-3 flex justify-between items-center"
                   style={{ backgroundColor: darkenColor(fullscreenNote.color || '#fef08a', 20), color: getContrastColor(fullscreenNote.color || '#fef08a') }}
                   onClick={(e) => e.stopPropagation()}
                 >
                   <span className="font-bold text-lg truncate pr-2">
                     {fullscreenNote.title || 'Frente'}
                   </span>
                   <button 
                     onClick={() => setFullscreenNote(null)}
                     className="p-2 hover:bg-black/10 rounded-full"
                   >
                     <Minimize className="w-6 h-6" />
                   </button>
                 </div>
                 
                 <div 
                   className="p-4 md:p-6 text-base md:text-lg flex-1 overflow-y-auto flex items-center justify-center"
                   style={{ color: getContrastColor(fullscreenNote.color || '#fef08a') }}
                 >
                   <div 
                     className="prose prose-sm md:prose-base text-center"
                     style={{ color: 'inherit' }}
                     dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fullscreenNote.content || '') }} 
                   />
                 </div>
                 
                 <div className="px-4 py-2 text-center text-xs font-bold opacity-50" style={{ color: getContrastColor(fullscreenNote.color || '#fef08a') }}>
                   Toque para virar
                 </div>
               </div>

               {/* VERSO */}
               <div 
                 className="absolute inset-0 backface-hidden flex flex-col rounded-2xl overflow-hidden bg-indigo-600 text-white"
                 style={{ transform: 'rotateY(180deg)' }}
               >
                 <div 
                   className="px-4 py-3 flex justify-between items-center bg-indigo-700"
                   onClick={(e) => e.stopPropagation()}
                 >
                   <span className="font-bold text-lg truncate pr-2">
                     Verso
                   </span>
                   <button 
                     onClick={() => setFullscreenNote(null)}
                     className="p-2 hover:bg-white/20 rounded-full"
                   >
                     <Minimize className="w-6 h-6" />
                   </button>
                 </div>
                 
                 <div 
                   className="p-4 md:p-6 text-base md:text-lg flex-1 overflow-y-auto flex items-center justify-center"
                 >
                   <div 
                     className="prose prose-sm md:prose-base prose-invert text-center"
                     dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fullscreenNote.backContent || '') }} 
                   />
                 </div>
                 
                 <div className="px-4 py-2 text-center text-xs font-bold opacity-50 text-white">
                   Toque para voltar
                 </div>
               </div>
             </div>
           </div>
        </div>
      )}
  `;

  if (!code.includes('setFullscreenNote(null)')) {
    code = code.replace('{activeStudyDeck && (', fullscreenRender + '\n      {activeStudyDeck && (');
  }

  fs.writeFileSync(file, code);
}

try {
  addFullscreenToPostIts();
  addFullscreenToFlashcards();
  console.log('Injected successfully');
} catch (e) {
  console.error(e);
}
