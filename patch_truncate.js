const fs = require('fs');

function fixTruncate(file) {
  let code = fs.readFileSync(file, 'utf8');
  // the exact string is: <span className="font-bold text-lg truncate pr-2">
  code = code.replace(/<span className="font-bold text-lg truncate pr-2">/g, '<span className="font-bold text-lg pr-2 leading-tight break-words flex-1">');
  
  // Need to ensure the title doesn't push the Minimize button out, so the flex container should align items at the start
  // Let's also adjust the parent div which is `className="px-4 py-3 flex justify-between items-center"`
  // If the title wraps, `items-center` is fine, but maybe `items-start` is better.
  code = code.replace(/className="px-4 py-3 flex justify-between items-center"/g, 'className="px-4 py-3 flex justify-between items-start"');
  
  fs.writeFileSync(file, code);
  console.log('Fixed ' + file);
}

fixTruncate('mini-app/src/components/PostItsView.tsx');
fixTruncate('mini-app/src/components/FlashcardsView.tsx');
