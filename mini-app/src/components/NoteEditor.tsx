import { useState, useRef, useEffect } from 'react';
import { X, Check, Palette, Trash2, Bold, Italic, Underline, List } from 'lucide-react';
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

export default function NoteEditor({ note, onClose }: NoteEditorProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(note.title || '');
  const [content] = useState(note.content || '');
  const [color, setColor] = useState(note.color || '#fef08a');
  const [saving, setSaving] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);

  // Focus effect
  useEffect(() => {
    if (contentRef.current && !content) {
      contentRef.current.focus();
    }
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const htmlContent = contentRef.current?.innerHTML || content;
      await updateDoc(doc(db, 'users', user.uid, 'notes', note.id), {
        title,
        content: htmlContent,
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
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sem título"
            className="w-full bg-transparent text-xl font-bold text-gray-900 placeholder-black/30 outline-none border-b border-black/10 pb-2"
          />
          
          <div className="flex items-center gap-1 mb-1 p-1 bg-white/30 rounded-lg w-fit">
            <button onClick={() => execCommand('bold')} className="p-1.5 hover:bg-white/50 rounded" title="Negrito"><Bold className="w-4 h-4 text-black/70"/></button>
            <button onClick={() => execCommand('italic')} className="p-1.5 hover:bg-white/50 rounded" title="Itálico"><Italic className="w-4 h-4 text-black/70"/></button>
            <button onClick={() => execCommand('underline')} className="p-1.5 hover:bg-white/50 rounded" title="Sublinhado"><Underline className="w-4 h-4 text-black/70"/></button>
            <button onClick={() => execCommand('insertUnorderedList')} className="p-1.5 hover:bg-white/50 rounded" title="Lista"><List className="w-4 h-4 text-black/70"/></button>
          </div>

          <div
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            className="w-full flex-1 min-h-[150px] outline-none text-gray-900 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.content || '') }}
          />
        </div>

        <div className="p-4 border-t border-black/10 flex justify-between items-center bg-white/20 backdrop-blur-md">
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
              />
            </div>
          </div>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-black/80 hover:bg-black text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
