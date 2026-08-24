import { useState, useRef, useEffect } from 'react';
import { X, Check, Palette, Trash2, Bold, Italic, Underline, List, Repeat } from 'lucide-react';
import { updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import DOMPurify from 'dompurify';

interface NoteEditorProps {
  note: any;
  onClose: () => void;
}

const COLORS = [
  '#fef08a', // Amarelo (default)
  '#fbcfe8', // Rosa
  '#bfdbfe', // Azul
  '#bbf7d0', // Verde
  '#e9d5ff', // Roxo
];

function getRandomHexColor(type: 'pastel' | 'vibrant' | 'neon'): string {
  let r, g, b;
  if (type === 'pastel') {
    r = Math.floor((Math.random() * 127) + 127);
    g = Math.floor((Math.random() * 127) + 127);
    b = Math.floor((Math.random() * 127) + 127);
  } else if (type === 'vibrant') {
    r = Math.floor(Math.random() * 256);
    g = Math.floor(Math.random() * 256);
    b = Math.floor(Math.random() * 256);
    const max = Math.max(r, g, b);
    if (max === r) r = 255;
    else if (max === g) g = 255;
    else b = 255;
  } else {
    // Neon
    const colors = [
      '#ff00ff', '#00ffff', '#00ff00', '#ffff00', '#ff00aa', '#00ffaa'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
}

export default function NoteEditor({ note, onClose }: NoteEditorProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(note.title || '');
  const [subjectTag, setSubjectTag] = useState(note.subjectTag || '');
  const [content] = useState(note.content || '');
  const [backContent] = useState(note.backContent || '');
  const [isFlashcard, setIsFlashcard] = useState(!!note.isFlashcard);
  const [color, setColor] = useState(note.color || '#fef08a');
  const [saving, setSaving] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const backContentRef = useRef<HTMLDivElement>(null);

  // Focus effect
  useEffect(() => {
    if (contentRef.current && !content && !isFlipped) {
      contentRef.current.focus();
    }
  }, [isFlipped]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const htmlContent = contentRef.current?.innerHTML || content;
      const htmlBackContent = isFlashcard ? (backContentRef.current?.innerHTML || backContent) : '';
      
      await updateDoc(doc(db, 'users', user.uid, 'notes', note.id), {
        title,
        subjectTag,
        content: htmlContent,
        backContent: htmlBackContent,
        isFlashcard,
        color
      });
      onClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar post-it');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    if (window.confirm("Deseja realmente excluir este post-it?")) {
      setSaving(true);
      await deleteDoc(doc(db, 'users', user.uid, 'notes', note.id));
      onClose();
    }
  };

  const execCommand = (command: string) => {
    document.execCommand(command, false, undefined);
    contentRef.current?.focus();
  };

  // Helper function to darken color for header
  const getDarkenedColor = (hex: string, amount: number = 20) => {
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) cleanHex = cleanHex[0]+cleanHex[0]+cleanHex[1]+cleanHex[1]+cleanHex[2]+cleanHex[2];
    const r = Math.max(0, parseInt(cleanHex.substring(0, 2), 16) - amount);
    const g = Math.max(0, parseInt(cleanHex.substring(2, 4), 16) - amount);
    const b = Math.max(0, parseInt(cleanHex.substring(4, 6), 16) - amount);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };
  
  const topBarColor = getDarkenedColor(color, 20);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm">
      <div 
        className="w-full max-w-lg shadow-2xl rounded-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        style={{ backgroundColor: color }}
      >
        {/* Header bar */}
        <div 
          className="flex justify-between items-center px-4 py-2"
          style={{ backgroundColor: topBarColor }}
        >
          <div className="flex items-center gap-1 font-bold text-black/70 text-sm">
            {note.noteNumber && <span>#{note.noteNumber}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleDelete}
              className="p-1.5 rounded-full hover:bg-black/10 text-black/60 transition-colors"
              title="Excluir"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/10 text-black/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
          <div className="flex flex-col gap-2 border-b border-black/10 pb-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sem título"
              className="w-full bg-transparent text-xl font-bold text-gray-900 placeholder-black/30 outline-none"
            />
            <input
              type="text"
              value={subjectTag}
              onChange={(e) => setSubjectTag(e.target.value)}
              placeholder="Tag (ex: Português)"
              className="w-full bg-transparent text-xs font-semibold text-gray-700 placeholder-black/40 outline-none uppercase tracking-wider"
            />
          </div>
          
          <div className="flex items-center justify-between mb-1 p-1 bg-white/30 rounded-lg">
            <div className="flex items-center gap-1">
              <button onClick={() => execCommand('bold')} className="p-1.5 hover:bg-white/50 rounded" title="Negrito"><Bold className="w-4 h-4 text-black/70"/></button>
              <button onClick={() => execCommand('italic')} className="p-1.5 hover:bg-white/50 rounded" title="Itálico"><Italic className="w-4 h-4 text-black/70"/></button>
              <button onClick={() => execCommand('underline')} className="p-1.5 hover:bg-white/50 rounded" title="Sublinhado"><Underline className="w-4 h-4 text-black/70"/></button>
              <button onClick={() => execCommand('insertUnorderedList')} className="p-1.5 hover:bg-white/50 rounded" title="Lista"><List className="w-4 h-4 text-black/70"/></button>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-black/60 cursor-pointer pr-2">
              <input 
                type="checkbox" 
                checked={isFlashcard}
                onChange={(e) => setIsFlashcard(e.target.checked)}
                className="rounded border-black/30 text-indigo-600 focus:ring-indigo-500"
              />
              Modo Flashcard
            </label>
          </div>

          <div className="flex-1 relative perspective-1000 min-h-[200px]">
            <div 
              className="w-full h-full transition-transform duration-500 preserve-3d relative"
              style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
            >
              {/* Frente */}
              <div className="absolute inset-0 backface-hidden flex flex-col">
                {isFlashcard && <div className="text-xs font-bold text-black/50 mb-2">FRENTE:</div>}
                <div
                  ref={contentRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="w-full flex-1 outline-none text-gray-900 prose prose-sm max-w-none overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.content || '') }}
                />
              </div>

              {/* Verso */}
              <div 
                className="absolute inset-0 backface-hidden flex flex-col"
                style={{ transform: 'rotateY(180deg)' }}
              >
                {isFlashcard && <div className="text-xs font-bold text-indigo-900/50 mb-2">VERSO:</div>}
                <div
                  ref={backContentRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="w-full flex-1 outline-none text-gray-900 prose prose-sm max-w-none overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.backContent || '') }}
                />
              </div>
            </div>
          </div>
          
          {isFlashcard && (
            <button 
              onClick={() => setIsFlipped(!isFlipped)}
              className="self-center flex items-center gap-2 px-4 py-2 mt-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-full text-sm font-bold transition-colors"
            >
              <Repeat className="w-4 h-4" />
              {isFlipped ? 'Ver Frente' : 'Ver Verso'}
            </button>
          )}
        </div>

        <div className="p-4 border-t border-black/10 flex justify-between items-center bg-white/20 backdrop-blur-md">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 items-center">
              <Palette className="w-5 h-5 text-black/50" />
              <div className="flex gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                      color === c ? 'border-black/50 shadow-sm' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
                <input 
                  type="color" 
                  value={color} 
                  onChange={(e) => setColor(e.target.value)}
                  className="w-6 h-6 p-0 border-0 rounded-full cursor-pointer overflow-hidden"
                  title="Cor Personalizada"
                />
                {'EyeDropper' in window && (
                  <button
                    onClick={async () => {
                      try {
                        const eyeDropper = new (window as any).EyeDropper();
                        const result = await eyeDropper.open();
                        setColor(result.sRGBHex);
                      } catch (e) {
                        console.error('EyeDropper cancelado');
                      }
                    }}
                    className="w-6 h-6 rounded-full border border-black/20 bg-white/50 flex items-center justify-center hover:bg-white transition-colors"
                    title="Conta-gotas"
                  >
                    <span role="img" aria-label="conta-gotas" className="text-[10px]">💉</span>
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex gap-2 items-center pl-7">
              <button 
                onClick={() => setColor(getRandomHexColor('pastel'))}
                className="text-[10px] font-bold px-2 py-1 rounded shadow-sm border border-black/10 bg-white/80 hover:bg-white text-gray-600 transition-colors"
              >
                Pastel
              </button>
              <button 
                onClick={() => setColor(getRandomHexColor('vibrant'))}
                className="px-2 py-1 text-[10px] font-bold rounded shadow-sm text-white hover:opacity-90 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #ff4081 0%, #ff9100 100%)' }}
              >
                Vibrante
              </button>
              <button 
                onClick={() => setColor(getRandomHexColor('neon'))}
                className="px-2 py-1 text-[10px] font-black rounded shadow-sm text-[#ccff00] bg-slate-900 border border-slate-700 transition-colors"
                style={{ textShadow: '0 0 5px #ccff00' }}
              >
                Neon
              </button>
            </div>
          </div>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-black/80 hover:bg-black text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 h-fit self-end"
          >
            <Check className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
