const fs = require('fs');

const file = 'mini-app/src/components/FlashcardsView.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /<button[^>]+onClick=\{\(\) => setEditingNote\(note\)\}[^>]*>[\s]*<Edit2 className="w-3 h-3" \/>[\s]*<\/button>/g;

const replacement = `<button 
                              onClick={(e) => { e.stopPropagation(); setFullscreenNote(note); setIsFlippedFS(false); }} 
                              className="p-1 hover:bg-black/10 rounded"
                              title="Tela Cheia"
                            >
                              <Maximize className="w-3 h-3" />
                            </button>
                            $&`;

code = code.replace(regex, replacement);
fs.writeFileSync(file, code);
console.log('Fixed FlashcardsView');
