const fs = require('fs');
const file = 'mini-app/src/components/PostItsView.tsx';
const code = fs.readFileSync(file, 'utf8');
const lines = code.split('\r\n');

// Find the navigation buttons div in cascade (the line with "flex items-center gap-4 mt-4")
let navDivLine = -1;
let inCascadeSection = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const note = filteredNotes[Math.min(cascadeIndex')) {
    inCascadeSection = true;
  }
  if (inCascadeSection && lines[i].includes('Grid View')) {
    inCascadeSection = false;
  }
  if (inCascadeSection && lines[i].includes('flex items-center gap-4 mt-4')) {
    navDivLine = i;
    break;
  }
}

console.log('Found nav div at line:', navDivLine + 1, ':', lines[navDivLine]);

if (navDivLine > -1) {
  // Find the closing </div> of the navigation buttons (after the two nav buttons)
  // It's at line navDivLine + ~8 (the </div> that closes the nav row)
  let closingNavLine = -1;
  let depth = 0;
  for (let i = navDivLine; i < Math.min(navDivLine + 20, lines.length); i++) {
    if (lines[i].includes('<div')) depth++;
    if (lines[i].includes('</div>')) {
      depth--;
      if (depth <= 0) {
        closingNavLine = i;
        break;
      }
    }
  }

  console.log('Found closing nav div at line:', closingNavLine + 1, ':', lines[closingNavLine]);

  if (closingNavLine > -1) {
    // We need to also get the current cascade note for the Maximize button
    // We'll inject it by modifying the nav row to include a maximize button
    // Change the nav div className to include justify-center and add a centered Maximize
    
    // Simply insert a Maximize button before the closing </div> of the nav row
    const indent = '            ';
    const maximizeBtn = [
      `${indent}<button`,
      `${indent}  onClick={() => {`,
      `${indent}    const note = filteredNotes[Math.min(cascadeIndex, filteredNotes.length - 1)];`,
      `${indent}    if (note) setFullscreenNote(note);`,
      `${indent}  }}`,
      `${indent}  className="p-3 rounded-full bg-indigo-600 shadow-sm text-white hover:bg-indigo-700 transition-colors"`,
      `${indent}  title="Tela Cheia"`,
      `${indent}>`,
      `${indent}  <Maximize className="w-5 h-5" />`,
      `${indent}</button>`,
    ];

    lines.splice(closingNavLine, 0, ...maximizeBtn);
    fs.writeFileSync(file, lines.join('\r\n'));
    console.log('Inserted fullscreen button in nav row at line', closingNavLine + 1);
  }
} else {
  console.log('ERROR: Could not find nav div!');
}
