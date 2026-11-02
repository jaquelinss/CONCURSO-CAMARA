const fs = require('fs');

const path = 'mini-app/src/components/FlashcardsView.tsx';
const lines = fs.readFileSync(path, 'utf8').split('\r\n');

// Find line 463 (0-indexed: 462) which is {/* VERSO */}
// Replace lines 463-495 with the new color-aware version
const versoCommentLine = lines.findIndex(l => l.trim() === '{/* VERSO */}');
console.log('VERSO comment at line:', versoCommentLine + 1);

if (versoCommentLine === -1) {
  console.log('ERROR: not found');
  process.exit(1);
}

// Find the closing </div> of the VERSO block (the one that closes the outer VERSO div)
// The structure is: the div opening is at versoCommentLine+1
// Count tags to find matching close
let depth = 0;
let endLine = -1;
for (let i = versoCommentLine + 1; i < lines.length; i++) {
  const l = lines[i];
  // Count opening divs
  const opens = (l.match(/<div[\s>]/g) || []).length;
  const closes = (l.match(/<\/div>/g) || []).length;
  depth += opens - closes;
  if (depth <= 0 && i > versoCommentLine + 1) {
    endLine = i;
    break;
  }
}
console.log('VERSO block ends at line:', endLine + 1);
console.log('Lines to replace:', versoCommentLine + 1, 'to', endLine + 1);

// New VERSO block
const newVerso = [
  `               {/* VERSO - cor baseada no post-it */}`,
  `               {(() => {`,
  `                 const fsBackColor = darkenColor(fullscreenNote.color || '#fef08a', 50);`,
  `                 const fsBackText = getContrastColor(fsBackColor);`,
  `                 return (`,
  `                 <div `,
  `                   className="absolute inset-0 backface-hidden flex flex-col rounded-2xl overflow-hidden"`,
  `                   style={{ backgroundColor: fsBackColor, color: fsBackText, transform: 'rotateY(180deg)' }}`,
  `                 >`,
  `                   <div `,
  `                     className="px-4 py-3 flex justify-between items-center"`,
  `                     style={{ backgroundColor: darkenColor(fsBackColor, 20), color: fsBackText }}`,
  `                     onClick={(e) => e.stopPropagation()}`,
  `                   >`,
  `                     <span className="font-bold text-lg pr-2 leading-tight break-words flex-1">`,
  `                       Verso`,
  `                     </span>`,
  `                     <button `,
  `                       onClick={() => setFullscreenNote(null)}`,
  `                       className="p-2 hover:bg-black/10 rounded-full"`,
  `                     >`,
  `                       <Minimize className="w-6 h-6" />`,
  `                     </button>`,
  `                   </div>`,
  `                   <div `,
  `                     className="p-4 md:p-6 text-base md:text-lg flex-1 overflow-y-auto flex items-center justify-center"`,
  `                     style={{ color: fsBackText }}`,
  `                   >`,
  `                     <div `,
  `                       className="prose prose-sm md:prose-base text-center"`,
  `                       style={{ color: 'inherit', whiteSpace: 'pre-wrap' }}`,
  `                       dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fullscreenNote.backContent || '') }} `,
  `                     />`,
  `                   </div>`,
  `                   <div className="px-4 py-2 text-center text-xs font-bold opacity-50" style={{ color: fsBackText }}>`,
  `                     Toque para voltar`,
  `                   </div>`,
  `                 </div>`,
  `                 );`,
  `               })()}`,
];

// Replace lines versoCommentLine to endLine (inclusive)
lines.splice(versoCommentLine, endLine - versoCommentLine + 1, ...newVerso);

fs.writeFileSync(path, lines.join('\r\n'));
console.log('Bug 2 FIXED: flashcard back now uses post-it color');
