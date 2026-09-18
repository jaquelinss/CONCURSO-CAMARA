const fs = require('fs');
let code = fs.readFileSync('browser-extension/src/content.tsx', 'utf8');

if (!code.includes('function useDarkMode()')) {
  code = code.replace(
    'function FloatingTracker() {',
    `function useDarkMode() {
  const [isDark, setIsDark] = useState(() => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  // Add useEffect to listen for changes if React allows inside this context.
  // Actually, since content.tsx doesn't import useEffect, we should either import it or just use state on mount.
  // Let's check if useEffect is imported.
  return isDark;
}

function FloatingTracker() {`
  );
  
  if (!code.includes('useEffect')) {
     code = code.replace("import { useState, useCallback } from 'react';", "import { useState, useCallback, useEffect } from 'react';");
     
     // add useEffect to hook
     code = code.replace(
       'return isDark;\n}',
       `useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setIsDark(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  return isDark;
}`
     );
  }
}

if (!code.includes('const theme = {')) {
  code = code.replace('function FloatingTracker() {', `function FloatingTracker() {
  const isDark = useDarkMode();
  const theme = {
    bg: isDark ? '#111827' : 'white',
    textMain: isDark ? '#f9fafb' : '#111827',
    textMuted: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    inputBg: isDark ? '#374151' : 'white',
    postitBtnBg: isDark ? '#854d0e' : '#fef08a',
    postitBtnColor: isDark ? '#fef08a' : '#78350f',
    postitBtnBorder: isDark ? '#713f12' : '#fde047',
    flashcardBtnBg: isDark ? '#1e3a8a' : '#dbeafe',
    flashcardBtnColor: isDark ? '#bfdbfe' : '#1e40af',
    flashcardBtnBorder: isDark ? '#1e3a8a' : '#93c5fd',
    submitBtnBg: isDark ? '#3730a3' : '#4f46e5',
    cancelBtnBg: isDark ? '#374151' : '#f3f4f6',
    widgetBubbleBg: isDark ? '#3730a3' : '#4f46e5',
    headerBg: isDark ? 'linear-gradient(135deg, #3730a3, #5b21b6)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
  };`);
}

// Widget Minimized Bubble
code = code.replace(/background: '#4f46e5', color: 'white', width: '48px'/g, "background: theme.widgetBubbleBg, color: 'white', width: '48px'");

// Main Container
code = code.replace(/background: 'white', borderRadius: '16px'/g, "background: theme.bg, borderRadius: '16px'");
code = code.replace(/border: '1px solid #e5e7eb'/g, "border: '1px solid ' + theme.border");
// Header
code = code.replace(/background: 'linear-gradient\(135deg, #4f46e5, #7c3aed\)'/g, "background: theme.headerBg");

// Buttons (Post-it / Flashcard)
code = code.replace(/background: '#fef08a', color: '#78350f'/g, "background: theme.postitBtnBg, color: theme.postitBtnColor");
code = code.replace(/border: '1px solid #fde047'/g, "border: '1px solid ' + theme.postitBtnBorder");

code = code.replace(/background: '#dbeafe', color: '#1e40af'/g, "background: theme.flashcardBtnBg, color: theme.flashcardBtnColor");
code = code.replace(/border: '1px solid #93c5fd'/g, "border: '1px solid ' + theme.flashcardBtnBorder");

code = code.replace(/background: '#f3f4f6', color: '#6b7280'/g, "background: theme.cancelBtnBg, color: theme.textMuted");
code = code.replace(/background: '#4f46e5', color: 'white'/g, "background: theme.submitBtnBg, color: 'white'");

// Text Muted (small hints)
code = code.replace(/color: '#6b7280'/g, "color: theme.textMuted");

// Inputs / Textarea
code = code.replace(/border: '1px solid #d1d5db'/g, "border: '1px solid ' + theme.border, background: theme.inputBg, color: theme.textMain");

// Make sure input borders aren't replaced twice and add color to text
code = code.replace(/border: '1px solid ' \+ theme\.border, background: theme\.inputBg, color: theme\.textMain, fontSize: '12px'/g, "border: '1px solid ' + theme.border, background: theme.inputBg, color: theme.textMain, fontSize: '12px'");

fs.writeFileSync('browser-extension/src/content.tsx', code);
console.log('content.tsx updated');
