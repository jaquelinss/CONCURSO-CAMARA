const fs = require('fs');
let code = fs.readFileSync('browser-extension/src/popup.tsx', 'utf8');

if(!code.includes('function useDarkMode')) {
  code = code.replace('function Popup() {', `function useDarkMode() {
  const [isDark, setIsDark] = useState(() => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setIsDark(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  return isDark;
}

function Popup() {`);
}

if(!code.includes('const isDark = useDarkMode();')) {
  code = code.replace('function Popup() {', `function Popup() {
  const isDark = useDarkMode();
  const theme = {
    bg: isDark ? '#111827' : '#f9fafb',
    panelBg: isDark ? '#1f2937' : 'white',
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
    soundActiveBg: isDark ? '#064e3b' : '#ecfdf5',
    soundActiveColor: isDark ? '#34d399' : '#047857',
    soundHoverBg: isDark ? '#374151' : 'transparent',
    playBtnBg: isDark ? '#1e3a8a' : '#dbeafe',
    playBtnColor: isDark ? '#bfdbfe' : '#1d4ed8',
    playBtnInactiveBg: isDark ? '#374151' : '#f3f4f6',
    playBtnInactiveColor: isDark ? '#9ca3af' : '#4b5563',
    titleColor: isDark ? '#818cf8' : '#4f46e5',
    successBg: isDark ? '#064e3b' : '#ecfdf5',
    successColor: isDark ? '#34d399' : '#065f46',
    panelHeaderColor: isDark ? '#93c5fd' : '#1e3a8a',
    dangerColor: isDark ? '#f87171' : '#ef4444',
  };`);
}

code = code.replace(/background: '#f9fafb'/g, 'background: theme.bg');
code = code.replace(/background: 'white'/g, 'background: theme.panelBg');
code = code.replace(/color: '#4f46e5'/g, 'color: theme.titleColor');
code = code.replace(/color: '#6b7280'/g, 'color: theme.textMuted');
code = code.replace(/border: '1px solid #d1d5db'/g, "border: '1px solid ' + theme.border");
code = code.replace(/color: '#ef4444'/g, 'color: theme.dangerColor');
code = code.replace(/background: '#ecfdf5'/g, 'background: theme.successBg');
code = code.replace(/color: '#065f46'/g, 'color: theme.successColor');
code = code.replace(/color: '#1e3a8a'/g, 'color: theme.panelHeaderColor');
code = code.replace(/color: '#4b5563'/g, 'color: theme.textMain');
code = code.replace(/background: isPlaying \? '#dbeafe' : '#f3f4f6'/g, 'background: isPlaying ? theme.playBtnBg : theme.playBtnInactiveBg');
code = code.replace(/color: isPlaying \? '#1d4ed8' : '#4b5563'/g, 'color: isPlaying ? theme.playBtnColor : theme.playBtnInactiveColor');
code = code.replace(/background: currentSound === s\.id \? '#ecfdf5' : 'transparent'/g, 'background: currentSound === s.id ? theme.soundActiveBg : theme.soundHoverBg');
code = code.replace(/color: currentSound === s\.id \? '#047857' : '#4b5563'/g, 'color: currentSound === s.id ? theme.soundActiveColor : theme.textMain');

code = code.replace(/background: '#fef08a'/g, 'background: theme.postitBtnBg');
code = code.replace(/color: '#78350f'/g, 'color: theme.postitBtnColor');
code = code.replace(/border: '1px solid #fde047'/g, "border: '1px solid ' + theme.postitBtnBorder");

code = code.replace(/background: '#dbeafe'/g, 'background: theme.flashcardBtnBg');
code = code.replace(/color: '#1e40af'/g, 'color: theme.flashcardBtnColor');
code = code.replace(/border: '1px solid #93c5fd'/g, "border: '1px solid ' + theme.flashcardBtnBorder");

code = code.replace(/padding: '8px', borderRadius: '6px', border: '1px solid ' \+ theme\.border, fontSize: '13px'/g, "padding: '8px', borderRadius: '6px', border: '1px solid ' + theme.border, fontSize: '13px', background: theme.inputBg, color: theme.textMain");
code = code.replace(/padding: '8px', borderRadius: '8px',\\s*border: '1px solid ' \\+ theme\.border/g, "padding: '8px', borderRadius: '8px', border: '1px solid ' + theme.border, background: theme.inputBg, color: theme.textMain");
code = code.replace(/border: '1px solid #e5e7eb'/g, "border: '1px solid ' + theme.border");
code = code.replace(/color: '#1e40af'/g, "color: theme.flashcardBtnColor");

if (!code.includes("if (loading) return <div style={{ padding: 20, fontFamily: 'sans-serif', background: theme.bg")) {
  code = code.replace(
    /if \(loading\) return <div style={{ padding: 20, fontFamily: 'sans-serif' }}>Carregando\.\.\.<\/div>;/g,
    "if (loading) return <div style={{ padding: 20, fontFamily: 'sans-serif', background: theme.bg, color: theme.textMain, minHeight: '100%' }}>Carregando...</div>;"
  );
}

// Ensure outer div handles textMain
code = code.replace(/<div style={{ padding: '20px', background: theme\.bg, minHeight: '100%', boxSizing: 'border-box', fontFamily: 'sans-serif' }}>/g, "<div style={{ padding: '20px', background: theme.bg, color: theme.textMain, minHeight: '100%', boxSizing: 'border-box', fontFamily: 'sans-serif' }}>");

fs.writeFileSync('browser-extension/src/popup.tsx', code);
console.log('popup.tsx updated');
