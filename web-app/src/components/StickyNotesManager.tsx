import { useEffect, useState, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import Draggable from 'react-draggable';
import { Palette, X, GripHorizontal } from 'lucide-react';

interface Note {
  id: string;
  content: string;
  x: number;
  y: number;
  color: string;
  zIndex: number;
}

const COLORS = [
  '#fef08a', // amarelo
  '#fbcfe8', // rosa
  '#bfdbfe', // azul
  '#bbf7d0', // verde
  '#e9d5ff', // roxo
];

// Gerenciador Global que escuta os eventos
export default function StickyNotesManager() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [highestZ, setHighestZ] = useState(100);

  // Ouve eventos para toggle global
  useEffect(() => {
    const handleToggle = () => setIsVisible(prev => !prev);
    const handleAdd = () => handleAddNote();

    window.addEventListener('toggle-notes', handleToggle);
    window.addEventListener('add-note', handleAdd);

    return () => {
      window.removeEventListener('toggle-notes', handleToggle);
      window.removeEventListener('add-note', handleAdd);
    };
  }, [user]);

  // Carrega notas do firebase
  useEffect(() => {
    if (!user) return;
    
    const notesRef = collection(db, 'users', user.uid, 'notes');
    const q = query(notesRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedNotes = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Note[];
      
      setNotes(loadedNotes);
      
      // Atualiza o highest z-index
      const maxZ = Math.max(100, ...loadedNotes.map(n => n.zIndex || 100));
      setHighestZ(maxZ);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddNote = async () => {
    if (!user) return;
    // Se não está visível, torna visível
    if (!isVisible) setIsVisible(true);

    try {
      const newZ = highestZ + 1;
      setHighestZ(newZ);
      
      // Criar no centro aproximado da tela
      const x = Math.max(100, window.innerWidth / 2 - 120 + (Math.random() * 40 - 20));
      const y = Math.max(100, window.innerHeight / 2 - 120 + (Math.random() * 40 - 20));

      await addDoc(collection(db, 'users', user.uid, 'notes'), {
        content: '',
        color: COLORS[0],
        x,
        y,
        zIndex: newZ,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Erro ao adicionar nota:", error);
    }
  };

  const handleUpdateNote = async (id: string, updates: Partial<Note>) => {
    if (!user) return;
    try {
      // Optimistic update locally to avoid dragging lag
      setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
      
      const noteRef = doc(db, 'users', user.uid, 'notes', id);
      await updateDoc(noteRef, updates);
    } catch (error) {
      console.error("Erro ao atualizar nota:", error);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'notes', id));
    } catch (error) {
      console.error("Erro ao excluir nota:", error);
    }
  };

  const bringToFront = (id: string) => {
    const newZ = highestZ + 1;
    setHighestZ(newZ);
    handleUpdateNote(id, { zIndex: newZ });
  };

  if (!user || !isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 9999 }}>
      {notes.map(note => (
        <StickyNoteItem 
          key={note.id} 
          note={note} 
          onUpdate={(updates) => handleUpdateNote(note.id, updates)}
          onDelete={() => handleDeleteNote(note.id)}
          onFocus={() => bringToFront(note.id)}
        />
      ))}
    </div>
  );
}

function StickyNoteItem({ 
  note, 
  onUpdate, 
  onDelete, 
  onFocus 
}: { 
  note: Note; 
  onUpdate: (u: Partial<Note>) => void; 
  onDelete: () => void;
  onFocus: () => void;
}) {
  const [showPalette, setShowPalette] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  
  // Local state for debouncing typing and dragging
  const [content, setContent] = useState(note.content || '');

  // Debounce saving content
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (content !== note.content) {
        onUpdate({ content });
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [content]);

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".drag-handle"
      defaultPosition={{ x: note.x || 0, y: note.y || 0 }}
      onStop={(_e, data) => onUpdate({ x: data.x, y: data.y })}
      onStart={onFocus}
      bounds="parent"
    >
      <div 
        ref={nodeRef}
        className="absolute w-64 rounded-lg shadow-xl overflow-hidden pointer-events-auto border-t-8 flex flex-col group transition-shadow hover:shadow-2xl"
        style={{ 
          backgroundColor: note.color || '#fef08a', 
          borderColor: darkenColor(note.color || '#fef08a', 20),
          zIndex: note.zIndex || 100 
        }}
        onClick={onFocus}
      >
        {/* Header (Drag Handle) */}
        <div className="drag-handle h-8 bg-black/5 flex items-center justify-between px-2 cursor-grab active:cursor-grabbing">
          <GripHorizontal className="w-4 h-4 text-black/30" />
          
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowPalette(!showPalette); }}
              className="p-1 hover:bg-black/10 rounded"
              title="Mudar Cor"
            >
              <Palette className="w-3.5 h-3.5 text-gray-700" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 hover:bg-red-500/20 rounded"
              title="Excluir"
            >
              <X className="w-4 h-4 text-gray-700 hover:text-red-700" />
            </button>
          </div>
        </div>

        {/* Color Palette Popover */}
        {showPalette && (
          <div className="flex gap-1 p-2 bg-white/50 backdrop-blur justify-center border-b border-black/10">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => { onUpdate({ color: c }); setShowPalette(false); }}
                className={`w-6 h-6 rounded-full shadow-inner border-2 ${note.color === c ? 'border-gray-800' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}

        {/* Text Area */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={onFocus}
          placeholder="Escreva algo..."
          className="w-full flex-grow min-h-[160px] p-3 bg-transparent resize-y outline-none placeholder-black/30 text-gray-800 font-medium"
          style={{ fontFamily: "'Comic Sans MS', cursive, sans-serif" }} // Post-it feel
        />
      </div>
    </Draggable>
  );
}

// Simple helper to darken hex color for the top border
function darkenColor(color: string, amount: number) {
  if (!color || typeof color !== 'string') return '#000000';
  return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) - amount)).toString(16)).substr(-2));
}
