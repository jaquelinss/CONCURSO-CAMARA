const fs = require('fs');

function fixCascadeTruncate(file) {
  let code = fs.readFileSync(file, 'utf8');

  // For PostItsView.tsx cascade card:
  // <span className="text-xs font-bold truncate pr-2">
  code = code.replace(/<span className="text-xs font-bold truncate pr-2">/g, '<span className="text-xs font-bold pr-2 leading-tight break-words flex-1">');
  
  // For FlashcardsView.tsx cascade card:
  // <span className="text-xs font-bold truncate">
  code = code.replace(/<span className="text-xs font-bold truncate">/g, '<span className="text-xs font-bold pr-2 leading-tight break-words flex-1">');

  // We should also ensure the header div uses items-start instead of items-center
  // In PostItsView: <div className="px-3 py-2 flex justify-between items-center" style={{ backgroundColor: topBarColor, color: textColor }}>
  // In FlashcardsView: <div className="px-3 py-2 flex justify-between items-center" style={{ backgroundColor: darkenColor(baseColor, 20) }}
  
  // Let's replace `className="px-3 py-2 flex justify-between items-center"` with `items-start` only if it's the header.
  // Actually, replacing all of them in the file that match this specific string is probably safe since it's used for card headers.
  code = code.replace(/className="px-3 py-2 flex justify-between items-center"/g, 'className="px-3 py-2 flex justify-between items-start"');

  fs.writeFileSync(file, code);
  console.log('Fixed cascade truncate in ' + file);
}

fixCascadeTruncate('mini-app/src/components/PostItsView.tsx');
fixCascadeTruncate('mini-app/src/components/FlashcardsView.tsx');
