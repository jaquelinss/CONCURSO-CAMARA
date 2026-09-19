const fs = require('fs');
const file = 'mini-app/src/components/PostItsView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Use a line number approach: inject after line 329 (the Edit2 button close tag)
// The file has CRLF line endings
const lines = code.split('\r\n');

// Find the line with <Edit2 className="w-3.5 h-3.5" /> inside the cascade header
// This appears around line 328 in the cascade view header (the first Edit2 occurrence)
let cascadeEdit2Line = -1;
let inCascadeSection = false;

for (let i = 0; i < lines.length; i++) {
  // Look for the cascade section start
  if (lines[i].includes('const note = filteredNotes[Math.min(cascadeIndex')) {
    inCascadeSection = true;
  }
  // Reset when we leave cascade section (grid view)
  if (inCascadeSection && lines[i].includes('Grid View')) {
    inCascadeSection = false;
  }
  // Find the Edit2 w-3.5 in the cascade section
  if (inCascadeSection && lines[i].includes('Edit2') && lines[i].includes('3.5 h-3.5')) {
    cascadeEdit2Line = i;
    break;
  }
}

console.log('Found cascade Edit2 at line:', cascadeEdit2Line + 1);

if (cascadeEdit2Line > -1) {
  // The structure is:
  // line: <Edit2 className="w-3.5 h-3.5" />
  // line: </button>
  // line: </div>  <- we need to insert before this

  const closingButtonLine = cascadeEdit2Line + 1; // </button>
  const closingDivLine = cascadeEdit2Line + 2; // </div>

  const indent = '                    ';
  const newButtons = [
    `${indent}<button `,
    `${indent}  onClick={() => setFullscreenNote(note)}`,
    `${indent}  className="p-1 hover:bg-black/10 rounded"`,
    `${indent}  title="Tela Cheia"`,
    `${indent}>`,
    `${indent}  <Maximize className="w-3.5 h-3.5" />`,
    `${indent}</button>`,
  ];

  // Insert the new buttons before the closing </div>
  lines.splice(closingDivLine, 0, ...newButtons);

  fs.writeFileSync(file, lines.join('\r\n'));
  console.log('Inserted Maximize button at line', closingDivLine + 1);
} else {
  console.log('ERROR: Could not find cascade Edit2 line!');
}
