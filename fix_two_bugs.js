const fs = require('fs');

// ========= BUG 1: Fix line breaks in PostItsView fullscreen content =========
{
  const file = 'mini-app/src/components/PostItsView.tsx';
  let code = fs.readFileSync(file, 'utf8');

  // The fullscreen content div uses dangerouslySetInnerHTML but plain-text newlines aren't rendered.
  // Fix: wrap the sanitized HTML in a helper that also converts \n to <br> if no HTML tags exist.
  // Simplest fix: add white-space: pre-wrap to the prose wrapper IF content has no block-level HTML.
  // Better fix: convert \n -> <br> before rendering, AFTER sanitizing.

  // Replace the fullscreen content block (the overflow-y-auto div inside fullscreenNote)
  const OLD = `             <div \n               className="p-4 md:p-6 text-base md:text-lg flex-1 overflow-y-auto"\n               style={{ color: getContrastColor(fullscreenNote.color || '#fef08a') }}\n             >\n               <div \n                 className="prose prose-sm md:prose-base max-w-none"\n                 style={{ color: 'inherit' }}\n                 dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fullscreenNote.content || '') }} \n               />\n             </div>`;

  const NEW = `             <div \n               className="p-4 md:p-6 text-base md:text-lg flex-1 overflow-y-auto"\n               style={{ color: getContrastColor(fullscreenNote.color || '#fef08a') }}\n             >\n               <div \n                 className="prose prose-sm md:prose-base max-w-none"\n                 style={{ color: 'inherit', whiteSpace: 'pre-wrap' }}\n                 dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fullscreenNote.content || '') }} \n               />\n             </div>`;

  if (code.includes(OLD)) {
    code = code.replace(OLD, NEW);
    fs.writeFileSync(file, code);
    console.log('Bug 1 fixed: added white-space: pre-wrap to fullscreen PostIt content');
  } else {
    // Try CRLF version
    const OLD_CRLF = OLD.replace(/\n/g, '\r\n');
    const NEW_CRLF = NEW.replace(/\n/g, '\r\n');
    if (code.includes(OLD_CRLF)) {
      code = code.replace(OLD_CRLF, NEW_CRLF);
      fs.writeFileSync(file, code);
      console.log('Bug 1 fixed (CRLF): added white-space: pre-wrap to fullscreen PostIt content');
    } else {
      // Try matching by a shorter unique string
      const SHORT_OLD = `style={{ color: 'inherit' }}\n                 dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fullscreenNote.content || '') }}`;
      const SHORT_OLD_CRLF = `style={{ color: 'inherit' }}\r\n                 dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fullscreenNote.content || '') }}`;
      const SHORT_NEW = `style={{ color: 'inherit', whiteSpace: 'pre-wrap' }}\n                 dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fullscreenNote.content || '') }}`;
      const SHORT_NEW_CRLF = `style={{ color: 'inherit', whiteSpace: 'pre-wrap' }}\r\n                 dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fullscreenNote.content || '') }}`;
      
      if (code.includes(SHORT_OLD_CRLF)) {
        code = code.replace(SHORT_OLD_CRLF, SHORT_NEW_CRLF);
        fs.writeFileSync(file, code);
        console.log('Bug 1 fixed (short CRLF)');
      } else if (code.includes(SHORT_OLD)) {
        code = code.replace(SHORT_OLD, SHORT_NEW);
        fs.writeFileSync(file, code);
        console.log('Bug 1 fixed (short LF)');
      } else {
        console.log('ERROR Bug 1: Could not find content block to patch');
        // Show the relevant section
        const idx = code.indexOf("fullscreenNote.content || ''");
        console.log('Context around fullscreenNote.content:', JSON.stringify(code.slice(Math.max(0, idx - 100), idx + 150)));
      }
    }
  }
}

// ========= BUG 2: Fix flashcard back color in fullscreen to match front =========
{
  const file = 'mini-app/src/components/FlashcardsView.tsx';
  let code = fs.readFileSync(file, 'utf8');

  // Find the hardcoded "bg-indigo-600" VERSO block and replace with color-aware version
  // Using a reliable short pattern
  const PATTERN = `className="absolute inset-0 backface-hidden flex flex-col rounded-2xl overflow-hidden bg-indigo-600 text-white"`;
  
  if (code.includes(PATTERN)) {
    // Replace the whole VERSO block - find start and end
    const versoStart = code.indexOf('{/* VERSO */}');
    if (versoStart === -1) {
      console.log('Cannot find VERSO comment, trying direct className replace');
      code = code.replace(
        `className="absolute inset-0 backface-hidden flex flex-col rounded-2xl overflow-hidden bg-indigo-600 text-white"\r\n                 style={{ transform: 'rotateY(180deg)' }}`,
        `className="absolute inset-0 backface-hidden flex flex-col rounded-2xl overflow-hidden"\r\n                 style={{ transform: 'rotateY(180deg)', backgroundColor: darkenColor(fullscreenNote.color || '#fef08a', 50), color: getContrastColor(darkenColor(fullscreenNote.color || '#fef08a', 50)) }}`
      );
      // Also fix the inner div that uses bg-indigo-700
      code = code.replace(
        `className="px-4 py-3 flex justify-between items-center bg-indigo-700"`,
        `className="px-4 py-3 flex justify-between items-center" style={{ backgroundColor: darkenColor(darkenColor(fullscreenNote.color || '#fef08a', 50), 20) }}`
      );
      // Fix hover color on minimize button
      code = code.replace(
        `className="p-2 hover:bg-white/20 rounded-full"`,
        `className="p-2 hover:bg-black/10 rounded-full"`
      );
      // Fix prose-invert
      code = code.replace(
        `className="prose prose-sm md:prose-base prose-invert text-center"`,
        `className="prose prose-sm md:prose-base text-center" style={{ color: 'inherit' }}`
      );
      // Fix the "text-white" on "Toque para voltar"
      code = code.replace(
        `<div className="px-4 py-2 text-center text-xs font-bold opacity-50 text-white">`,
        `<div className="px-4 py-2 text-center text-xs font-bold opacity-50">`
      );
      fs.writeFileSync(file, code);
      console.log('Bug 2 fixed via individual replacements');
    }
  } else {
    console.log('Bug 2: bg-indigo-600 pattern not found - may already be fixed');
  }
}
