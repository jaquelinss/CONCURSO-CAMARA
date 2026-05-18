import { useEffect, useState, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import Draggable from 'react-draggable';
import { Palette, X, GripHorizontal } from 'lucide-react';

interface Note {
  id: string;
  title?: string;
  content: string;
  x: number;
  y: number;
  color: string;
  zIndex: number;
  isArchived?: boolean;
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
  const [highestZ, setHighestZ] = useState(100);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isDraggingFromSidebar, setIsDraggingFromSidebar] = useState(false);

  // Ouve eventos para toggle global
  useEffect(() => {
    const handleAdd = () => handleAddNote();
    const handleToggleArchive = () => setIsArchiveOpen(prev => !prev);

    window.addEventListener('add-note', handleAdd);
    window.addEventListener('toggle-archive', handleToggleArchive);

    return () => {
      window.removeEventListener('add-note', handleAdd);
      window.removeEventListener('toggle-archive', handleToggleArchive);
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

    try {
      const newZ = highestZ + 1;
      setHighestZ(newZ);
      
      // Criar no centro aproximado da tela
      const x = Math.max(100, window.innerWidth / 2 - 120 + (Math.random() * 40 - 20));
      const y = Math.max(100, window.innerHeight / 2 - 120 + (Math.random() * 40 - 20));

      await addDoc(collection(db, 'users', user.uid, 'notes'), {
        title: '',
        content: '',
        color: COLORS[0],
        x,
        y,
        zIndex: newZ,
        isArchived: false,
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

  if (!user) return null;

  const activeNotes = notes.filter(n => !n.isArchived);

  return (
    <>
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 9999 }}>
        {activeNotes.map(note => (
          <StickyNoteItem 
            key={note.id} 
            note={note} 
            onUpdate={(updates) => handleUpdateNote(note.id, updates)}
            onFocus={() => bringToFront(note.id)}
          />
        ))}
      </div>

      {isArchiveOpen && (
        <div className="fixed inset-0 pointer-events-none flex justify-end z-[10000]">
          <div className={`bg-white dark:bg-gray-800 shadow-2xl h-full w-[90%] sm:w-96 flex flex-col pointer-events-auto border-l border-gray-200 dark:border-gray-700 transition-all ${isDraggingFromSidebar ? 'overflow-visible' : 'overflow-hidden'}`}>
            <div className="p-4 border-b bg-yellow-50 dark:bg-yellow-900/30 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                Meus Post-its
              </h2>
              <button onClick={() => setIsArchiveOpen(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className={`p-6 flex-1 bg-gray-50 dark:bg-gray-900 ${isDraggingFromSidebar ? 'overflow-visible' : 'overflow-y-auto'}`}>
              {notes.length === 0 ? (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                  <p>Nenhum post-it criado ainda.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {notes.map(note => (
                    <SidebarNoteItem
                      key={note.id}
                      note={note}
                      onUpdate={(updates) => handleUpdateNote(note.id, updates)}
                      onDelete={() => handleDeleteNote(note.id)}
                      onDragStart={() => setIsDraggingFromSidebar(true)}
                      onDragEnd={() => setIsDraggingFromSidebar(false)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SidebarNoteItem({
  note,
  onUpdate,
  onDelete,
  onDragStart,
  onDragEnd
}: {
  note: Note;
  onUpdate: (u: Partial<Note>) => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{x: 0, y: 0}}
      onStart={onDragStart}
      onStop={(e, data) => {
        onDragEnd();
        if (data.x < -100) {
          const clientX = 'clientX' in e ? (e as MouseEvent).clientX : (e as TouchEvent).changedTouches?.[0]?.clientX || 100;
          const clientY = 'clientY' in e ? (e as MouseEvent).clientY : (e as TouchEvent).changedTouches?.[0]?.clientY || 100;
          
          onUpdate({ 
            isArchived: false, 
            x: clientX - 100, 
            y: clientY - 50 
          });
        }
      }}
    >
      <div ref={nodeRef} className="rounded-lg shadow-md p-4 relative cursor-move border border-black/5" style={{ backgroundColor: note.color || '#fef08a' }}>
        {note.title && <h4 className="font-bold text-gray-800 mb-1" style={{ fontFamily: "'Comic Sans MS', cursive, sans-serif" }}>{note.title}</h4>}
        <p className="text-sm text-gray-800 line-clamp-4 min-h-[60px]" style={{ fontFamily: "'Comic Sans MS', cursive, sans-serif" }}>
          {note.content || <span className="italic opacity-50">Nota vazia</span>}
        </p>
        <div className="flex gap-2 mt-4 justify-between border-t border-black/10 pt-2 items-center">
          <button 
            onPointerDown={(e) => e.stopPropagation()} 
            onClick={onDelete} 
            className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 px-2 py-1 rounded"
          >
            Excluir
          </button>
          
          <div onPointerDown={(e) => e.stopPropagation()}>
            {note.isArchived ? (
              <button onClick={() => onUpdate({ isArchived: false })} className="md:hidden text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded">
                Mostrar na Tela
              </button>
            ) : (
              <button onClick={() => onUpdate({ isArchived: true })} className="text-xs font-bold text-gray-600 hover:text-gray-800 bg-gray-200 px-2 py-1 rounded">
                Ocultar
              </button>
            )}
          </div>
        </div>
        {note.isArchived && (
          <div className="absolute top-0 right-0 left-0 h-4 bg-black/5 rounded-t-lg hidden md:flex items-center justify-center opacity-50">
            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">Arraste para fixar</span>
          </div>
        )}
      </div>
    </Draggable>
  );
}

function StickyNoteItem({ 
  note, 
  onUpdate, 
  onFocus 
}: { 
  note: Note; 
  onUpdate: (u: Partial<Note>) => void; 
  onFocus: () => void;
}) {
  const [showPalette, setShowPalette] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  
  // Local state for debouncing typing and dragging
  const [title, setTitle] = useState(note.title || '');
  const [content, setContent] = useState(note.content || '');

  // Debounce saving content
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (content !== note.content || title !== note.title) {
        onUpdate({ content, title });
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [content, title]);

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
        className="absolute rounded-lg shadow-xl overflow-hidden pointer-events-auto border-t-8 flex flex-col group transition-shadow hover:shadow-2xl"
        style={{ 
          width: '256px',
          minWidth: '200px',
          minHeight: '200px',
          resize: 'both',
          backgroundColor: note.color || '#fef08a', 
          borderColor: darkenColor(note.color || '#fef08a', 20),
          zIndex: note.zIndex || 100 
        }}
        onClick={onFocus}
      >
        {/* Header (Drag Handle) */}
        <div className="drag-handle h-8 bg-black/5 flex items-center justify-between px-2 cursor-grab active:cursor-grabbing">
          <GripHorizontal className="w-4 h-4 text-black/30" />
          
          <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowPalette(!showPalette); }}
              className="p-1 hover:bg-black/10 rounded"
              title="Mudar Cor"
            >
              <Palette className="w-3.5 h-3.5 text-gray-700" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onUpdate({ isArchived: true }); }}
              className="p-1 hover:bg-black/10 rounded"
              title="Fechar (Guardar)"
            >
              <X className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Color Palette Popover */}
        {showPalette && (
          <div className="flex gap-1 p-2 bg-white dark:bg-gray-800/50 backdrop-blur justify-center border-b border-black/10">
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

        {/* Título */}
        <div className="flex flex-col bg-black/5 border-b border-black/10">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={onFocus}
            placeholder="Título..."
            className="w-full px-3 py-1 bg-transparent outline-none font-bold text-gray-800 placeholder-black/40 text-sm"
            style={{ fontFamily: "'Comic Sans MS', cursive, sans-serif" }}
          />
        </div>

        {/* Text Area */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={onFocus}
          placeholder="Escreva algo..."
          className="w-full flex-grow min-h-[160px] p-3 bg-transparent resize-none outline-none placeholder-black/30 text-gray-800 font-medium"
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
