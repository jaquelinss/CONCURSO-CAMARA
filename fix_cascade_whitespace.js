const fs = require('fs');

const path = 'mini-app/src/components/PostItsView.tsx';
const lines = fs.readFileSync(path, 'utf8').split('\r\n');

let fixCount = 0;

for (let i = 0; i < lines.length; i++) {
  // Find any prose div with dangerouslySetInnerHTML for note.content that doesn't have whiteSpace
  if (
    lines[i].includes("dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.content || '')") &&
    lines[i - 1] && lines[i - 1].includes("style={{ color: 'inherit' }}") &&
    !lines[i - 1].includes("whiteSpace")
  ) {
    lines[i - 1] = lines[i - 1].replace(
      "style={{ color: 'inherit' }}",
      "style={{ color: 'inherit', whiteSpace: 'pre-wrap' }}"
    );
    fixCount++;
    console.log(`Fixed at line ${i} (style line ${i - 1 + 1})`);
  }
}

fs.writeFileSync(path, lines.join('\r\n'));
console.log(`Total fixes: ${fixCount}`);
