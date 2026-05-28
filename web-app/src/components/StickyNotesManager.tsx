import { useEffect, useState, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import Draggable from 'react-draggable';
import { Palette, X, GripHorizontal, Tag, PlusCircle, Layers, Eye, EyeOff } from 'lucide-react';
import { generateNoteTag } from '../lib/gemini';

interface Note {
  id: string;
  title?: string;
  content: string;
  x: number;
  y: number;
  color: string;
  zIndex: number;
  isArchived?: boolean;
  subjectTag?: string;
  w?: number;
  h?: number;
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
  const [isCascadeMode, setIsCascadeMode] = useState(false);
  const [cascadePos, setCascadePos] = useState({ x: 100, y: 100 });
  const [cascadeSize, setCascadeSize] = useState({ w: 256, h: 280 });
  const [isDraggingFromSidebar, setIsDraggingFromSidebar] = useState(false);
  const { apiKey } = useAuth();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const NO_TAG = '__no_tag__';
  const processingTagsRef = useRef<Set<string>>(new Set());

  // Get notes filtered by the current tag selection
  const getFilteredNotes = () => {
    if (selectedTag === NO_TAG) return notes.filter(n => !n.subjectTag);
    if (selectedTag) return notes.filter(n => n.subjectTag === selectedTag);
    return notes;
  };

  // Batch show all (un-archive) filtered notes
  const handleShowAll = async () => {
    if (!user) return;
    const filtered = getFilteredNotes().filter(n => n.isArchived);
    for (const note of filtered) {
      try {
        const noteRef = doc(db, 'users', user.uid, 'notes', note.id);
        await updateDoc(noteRef, { isArchived: false });
      } catch (e) { console.error('Erro ao mostrar nota:', e); }
    }
  };

  // Batch hide all (archive) filtered notes
  const handleHideAll = async () => {
    if (!user) return;
    const filtered = getFilteredNotes().filter(n => !n.isArchived);
    for (const note of filtered) {
      try {
        const noteRef = doc(db, 'users', user.uid, 'notes', note.id);
        await updateDoc(noteRef, { isArchived: true });
      } catch (e) { console.error('Erro ao ocultar nota:', e); }
    }
  };

  // Ouve eventos para toggle global
  useEffect(() => {
    const handleAdd = (e: Event) => handleAddNote(e);
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

  // Retrofit old notes without tags and handle new ones that get archived
  useEffect(() => {
    if (!user || !apiKey || notes.length === 0) return;
    
    // Find the first archived note that has content but no tag, and is not currently being processed
    const noteToProcess = notes.find(n => n.isArchived && !n.subjectTag && n.content && !processingTagsRef.current.has(n.id));
    
    if (noteToProcess) {
      processingTagsRef.current.add(noteToProcess.id);
      generateNoteTag(noteToProcess.content, noteToProcess.title || '', apiKey).then(async (tag) => {
        if (tag) {
          const noteRef = doc(db, 'users', user.uid, 'notes', noteToProcess.id);
          await updateDoc(noteRef, { subjectTag: tag });
        }
      }).catch(e => {
        console.error("Erro ao gerar tag:", e);
      });
    }
  }, [notes, user, apiKey]);

  const handleAddNote = async (e?: Event) => {
    if (!user) return;

    try {
      const newZ = highestZ + 1;
      setHighestZ(newZ);
      
      let initialTitle = '';
      let initialContent = '';
      
      if (e instanceof CustomEvent && e.detail) {
        initialTitle = e.detail.title || '';
        initialContent = e.detail.content || '';
      }

      // Tamanho e posições da última nota
      const savedPos = (() => { try { return JSON.parse(localStorage.getItem('last_note_pos') || 'null'); } catch { return null; } })();
      const savedSize = (() => { try { return JSON.parse(localStorage.getItem('last_note_size') || 'null'); } catch { return null; } })();
      
      let x = Math.max(100, window.innerWidth / 2 - 120 + (Math.random() * 40 - 20));
      let y = Math.max(100, window.innerHeight / 2 - 120 + (Math.random() * 40 - 20));
      if (savedPos) {
        x = savedPos.x + (Math.random() * 20 - 10);
        y = savedPos.y + (Math.random() * 20 - 10);
      }

      await addDoc(collection(db, 'users', user.uid, 'notes'), {
        title: initialTitle,
        content: initialContent,
        color: COLORS[0],
        x,
        y,
        w: savedSize?.w || 256,
        h: savedSize?.h || 280,
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

  const sendToBack = (id: string) => {
    const activeZIndexes = notes.filter(n => !n.isArchived).map(n => n.zIndex || 0);
    const lowestZ = activeZIndexes.length > 0 ? Math.min(...activeZIndexes) : 100;
    handleUpdateNote(id, { zIndex: lowestZ - 1 });
  };

  const handleToggleCascade = () => {
    if (!isCascadeMode) {
      const savedPos = (() => { try { return JSON.parse(localStorage.getItem('last_note_pos') || 'null'); } catch { return null; } })();
      const savedSize = (() => { try { return JSON.parse(localStorage.getItem('last_note_size') || 'null'); } catch { return null; } })();
      if (savedPos) setCascadePos(savedPos);
      else setCascadePos({ x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 150 });
      
      if (savedSize) setCascadeSize(savedSize);
    }
    setIsCascadeMode(!isCascadeMode);
  };

  if (!user) return null;

  const activeNotes = notes.filter(n => !n.isArchived);
  const allTags = Array.from(new Set(notes.map(n => n.subjectTag).filter(Boolean))) as string[];

  return (
    <>
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 9999 }}>
        {activeNotes.map(note => (
          <StickyNoteItem 
            key={`${note.id}-${isCascadeMode ? 'cascade' : 'free'}`} 
            note={note} 
            isCascadeMode={isCascadeMode}
            cascadePos={cascadePos}
            cascadeSize={cascadeSize}
            onCascadeResize={(size) => setCascadeSize(size)}
            onCascadeStop={(pos) => {
              setCascadePos(pos);
              localStorage.setItem('last_note_pos', JSON.stringify(pos));
            }}
            onUpdate={(updates) => handleUpdateNote(note.id, updates)}
            onFocus={() => bringToFront(note.id)}
            onSendToBack={() => sendToBack(note.id)}
            onToggleCascade={handleToggleCascade}
            allTags={allTags}
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
              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={handleToggleCascade}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-sm flex items-center gap-2 ${isCascadeMode ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 dark:bg-gray-800 dark:border-indigo-900 dark:hover:bg-gray-700'}`}
                >
                  <Layers className="w-4 h-4" />
                  {isCascadeMode ? 'Modo Cascata Ativo' : 'Modo Cascata'}
                </button>
              </div>
              {notes.length === 0 ? (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                  <p>Nenhum post-it criado ainda.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Tag Filter */}
                  <div className="flex flex-wrap gap-2 mb-1">
                    <button
                      onClick={() => setSelectedTag(null)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        selectedTag === null
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setSelectedTag(NO_TAG)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        selectedTag === NO_TAG
                          ? 'bg-gray-600 text-white shadow-md'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                      }`}
                    >
                      Sem Tags
                    </button>
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(tag)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                          selectedTag === tag
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50'
                        }`}
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </button>
                    ))}
                  </div>

                  {/* Batch Show/Hide Buttons */}
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={handleShowAll}
                      className="flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-900/40"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Mostrar {selectedTag && selectedTag !== NO_TAG ? 'Filtrados' : 'Todos'}
                    </button>
                    <button
                      onClick={handleHideAll}
                      className="flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800 dark:hover:bg-orange-900/40"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      Ocultar {selectedTag && selectedTag !== NO_TAG ? 'Filtrados' : 'Todos'}
                    </button>
                  </div>

                  {getFilteredNotes().map(note => (
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

  const [title, setTitle] = useState(note.title || '');

  // Debounce sidebar title update
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (title !== note.title) {
        onUpdate({ title });
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [title]);

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{x: 0, y: 0}}
      cancel="button, input"
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
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sem título"
          className="w-full bg-transparent outline-none font-bold text-gray-800 mb-1 placeholder-black/30 font-sans"
          onPointerDown={(e) => e.stopPropagation()} // Prevent drag when typing
          onTouchStart={(e) => e.stopPropagation()}
        />
        <p className="text-sm text-gray-800 line-clamp-4 min-h-[60px] font-sans">
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
          
          <div onPointerDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
            {note.isArchived ? (
              <button onClick={() => onUpdate({ isArchived: false })} onTouchEnd={() => onUpdate({ isArchived: false })} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded">
                Mostrar na Tela
              </button>
            ) : (
              <button 
                onClick={() => onUpdate({ isArchived: true })} 
                onTouchEnd={(e) => { e.stopPropagation(); onUpdate({ isArchived: true }); }}
                className="text-xs font-bold text-gray-600 hover:text-gray-800 bg-gray-200 px-2 py-1 rounded"
              >
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
  isCascadeMode,
  cascadePos,
  cascadeSize,
  onCascadeResize,
  onCascadeStop,
  onUpdate, 
  onFocus,
  onSendToBack,
  onToggleCascade,
  allTags
}: { 
  note: Note; 
  isCascadeMode: boolean;
  cascadePos?: {x: number, y: number};
  cascadeSize?: {w: number, h: number};
  onCascadeResize?: (size: {w: number, h: number}) => void;
  onCascadeStop?: (pos: {x: number, y: number}) => void;
  onUpdate: (u: Partial<Note>) => void; 
  onFocus: () => void;
  onSendToBack: () => void;
  onToggleCascade: () => void;
  allTags: string[];
}) {
  const [showPalette, setShowPalette] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
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

  // Custom resize handler (native resize:both doesn't work on mobile)
  const [size, setSize] = useState({ w: note.w || 256, h: note.h || 280 });
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

  const onResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: size.w,
      startH: size.h,
    };
  };

  const onResizeMove = (e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    e.preventDefault();
    const dx = e.clientX - resizeRef.current.startX;
    const dy = e.clientY - resizeRef.current.startY;
    const newW = Math.max(180, resizeRef.current.startW + dx);
    const newH = Math.max(180, resizeRef.current.startH + dy);
    
    if (isCascadeMode && onCascadeResize) {
      onCascadeResize({ w: newW, h: newH });
    } else {
      setSize({ w: newW, h: newH });
    }
  };

  const onResizeEnd = (e: React.PointerEvent) => {
    resizeRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    if (!isCascadeMode) {
      onUpdate({ w: size.w, h: size.h });
      localStorage.setItem('last_note_size', JSON.stringify({ w: size.w, h: size.h }));
    } else if (cascadeSize) {
      localStorage.setItem('last_note_size', JSON.stringify({ w: cascadeSize.w, h: cascadeSize.h }));
    }
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".drag-handle"
      defaultPosition={isCascadeMode && cascadePos ? cascadePos : { x: note.x || 0, y: note.y || 0 }}
      onDrag={(_e, data) => {
        if (isCascadeMode) {
          const elements = document.querySelectorAll('.cascade-mode-item');
          elements.forEach(el => {
            if (el !== nodeRef.current) {
              (el as HTMLElement).style.transform = `translate(${data.x}px, ${data.y}px)`;
            }
          });
        }
      }}
      onStop={(_e, data) => {
        if (isCascadeMode) {
          onCascadeStop?.({x: data.x, y: data.y});
        } else {
          onUpdate({ x: data.x, y: data.y });
          localStorage.setItem('last_note_pos', JSON.stringify({ x: data.x, y: data.y }));
        }
      }}
      onStart={onFocus}
      bounds="parent"
    >
      <div 
        ref={nodeRef}
        className={`sticky-note absolute rounded-lg shadow-xl overflow-hidden pointer-events-auto border-t-8 flex flex-col group transition-shadow hover:shadow-2xl ${isCascadeMode ? 'cascade-mode-item' : ''}`}
        style={{ 
          width: isCascadeMode && cascadeSize ? `${cascadeSize.w}px` : `${size.w}px`,
          height: isCascadeMode && cascadeSize ? `${cascadeSize.h}px` : `${size.h}px`,
          minWidth: '180px',
          minHeight: '180px',
          backgroundColor: note.color || '#fef08a', 
          borderColor: darkenColor(note.color || '#fef08a', 20),
          zIndex: note.zIndex || 100 
        }}
        onClick={isCascadeMode ? undefined : onFocus}
      >
        {/* Header (Drag Handle) */}
        <div 
          className="drag-handle h-8 bg-black/5 flex items-center justify-between px-2 cursor-grab active:cursor-grabbing"
          onClick={(e) => {
            if (isCascadeMode) {
              const target = e.target as HTMLElement;
              if (!target.closest('.color-picker-btn') && !target.closest('.close-btn')) {
                onSendToBack();
              }
            }
          }}
        >
          <GripHorizontal className="w-4 h-4 text-black/30" />
          
          <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleCascade(); }}
              onTouchStart={(e) => { e.stopPropagation(); onToggleCascade(); }}
              onPointerDown={(e) => e.stopPropagation()}
              className={`p-1 hover:bg-black/10 rounded ${isCascadeMode ? 'bg-indigo-100 text-indigo-600' : 'text-gray-700'}`}
              title={isCascadeMode ? "Sair do Modo Cascata" : "Modo Cascata"}
            >
              <Layers className="w-3.5 h-3.5 pointer-events-none" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowPalette(!showPalette); setShowTagPicker(false); }}
              onTouchStart={(e) => { e.stopPropagation(); setShowPalette(!showPalette); setShowTagPicker(false); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="color-picker-btn p-1 hover:bg-black/10 rounded"
              title="Mudar Cor"
            >
              <Palette className="w-3.5 h-3.5 text-gray-700 pointer-events-none" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowTagPicker(!showTagPicker); setShowPalette(false); }}
              onTouchStart={(e) => { e.stopPropagation(); setShowTagPicker(!showTagPicker); setShowPalette(false); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="tag-picker-btn p-1 hover:bg-black/10 rounded"
              title="Atribuir Tag"
            >
              <Tag className="w-3.5 h-3.5 text-gray-700 pointer-events-none" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onUpdate({ isArchived: true }); }}
              onTouchStart={(e) => { e.stopPropagation(); onUpdate({ isArchived: true }); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="close-btn p-1 hover:bg-black/10 rounded"
              title="Fechar (Guardar)"
            >
              <X className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Color Palette Popover */}
        {showPalette && (
          <div className="flex flex-col gap-2 p-2 bg-white dark:bg-gray-800/80 backdrop-blur border-b border-black/10 rounded-b-lg">
            <div className="flex gap-1 justify-center items-center">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={(e) => { e.stopPropagation(); onUpdate({ color: c }); setShowPalette(false); }}
                  className={`w-6 h-6 rounded-full shadow-inner border-2 ${note.color === c ? 'border-gray-800' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  title="Cor predefinida"
                />
              ))}
              {/* Custom Color Picker */}
              <label 
                className="w-6 h-6 rounded-full shadow-inner border-2 border-transparent bg-gradient-to-tr from-red-500 via-green-500 to-blue-500 cursor-pointer flex items-center justify-center hover:scale-110 transition-transform"
                title="Cor personalizada"
                onClick={(e) => e.stopPropagation()}
              >
                <input 
                  type="color" 
                  value={note.color || '#fef08a'} 
                  onChange={(e) => onUpdate({ color: e.target.value })}
                  className="opacity-0 absolute w-0 h-0"
                />
                <PlusCircle className="w-4 h-4 text-white drop-shadow-md" />
              </label>
            </div>
            
            <div className="flex gap-1 justify-center items-center pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={(e) => { e.stopPropagation(); onUpdate({ color: getRandomHexColor('pastel') }); setShowPalette(false); }}
                className="text-[10px] font-bold px-2 py-1 rounded shadow-sm border border-gray-200 bg-[#fdfbf7] hover:bg-white text-gray-600 transition-all"
                title="Cor Pastel Aleatória"
              >
                Pastel
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onUpdate({ color: getRandomHexColor('vibrant') }); setShowPalette(false); }}
                className="text-[10px] font-bold px-2 py-1 rounded shadow-sm border border-transparent bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white hover:opacity-90 transition-opacity"
                title="Cor Vibrante Aleatória"
              >
                Vibrante
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onUpdate({ color: getRandomHexColor('neon') }); setShowPalette(false); }}
                className="text-[10px] font-bold px-2 py-1 rounded shadow-sm border border-transparent bg-gray-900 text-[#39ff14] hover:text-[#0ff] transition-colors"
                title="Cor Neon Aleatória"
                style={{ textShadow: '0 0 4px currentColor' }}
              >
                Neon
              </button>
            </div>
          </div>
        )}

        {/* Tag Picker Popover */}
        {showTagPicker && (
          <div className="flex flex-col gap-2 p-3 bg-white dark:bg-gray-800/95 backdrop-blur border-b border-black/10 rounded-b-lg text-sm max-h-48 overflow-y-auto">
            <div className="flex items-center gap-2">
              <input 
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                placeholder="Nova tag..."
                className="flex-1 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTagInput.trim()) {
                    onUpdate({ subjectTag: newTagInput.trim() });
                    setNewTagInput('');
                    setShowTagPicker(false);
                  }
                }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (newTagInput.trim()) {
                    onUpdate({ subjectTag: newTagInput.trim() });
                    setNewTagInput('');
                    setShowTagPicker(false);
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-1 rounded transition-colors"
                title="Criar Tag"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex flex-wrap gap-1 mt-1">
              {allTags.length > 0 ? allTags.map(tag => (
                <button
                  key={tag}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate({ subjectTag: tag });
                    setShowTagPicker(false);
                  }}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                    note.subjectTag === tag 
                      ? 'bg-indigo-600 text-white border-indigo-600' 
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
                  }`}
                >
                  {tag}
                </button>
              )) : (
                <span className="text-[10px] text-gray-500 italic">Nenhuma tag existente.</span>
              )}
            </div>
            {note.subjectTag && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({ subjectTag: '' }); // or null, depending on DB schema, let's use empty string so it becomes falsy
                  setShowTagPicker(false);
                }}
                className="text-[10px] text-red-500 hover:text-red-700 font-bold self-start mt-1"
              >
                Remover Tag Atual
              </button>
            )}
          </div>
        )}

        {/* Título */}
        <div className="flex flex-col bg-black/5 border-b border-black/10">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={onFocus}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            placeholder="Título..."
            className="w-full px-3 py-1 bg-transparent outline-none font-bold text-gray-800 placeholder-black/40 text-sm font-sans"
          />
        </div>

        {/* Text Area */}
        <textarea
          value={content}
          onChange={(e) => {
            let val = e.target.value;
            // Conversões rápidas para atalhos do teclado
            val = val.replace(/(^|\n)- /g, '$1• ');
            val = val.replace(/->/g, '→');
            val = val.replace(/=>/g, '⇒');
            setContent(val);
          }}
          onFocus={onFocus}
          placeholder="Escreva algo..."
          className="w-full flex-grow min-h-[80px] p-3 bg-transparent resize-none outline-none placeholder-black/30 text-gray-800 font-medium"
          style={{ fontFamily: "'Comic Sans MS', cursive, sans-serif" }} // Post-it feel
        />

        {/* Custom Resize Handle - large touch target */}
        <div
          onPointerDown={onResizeStart}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeEnd}
          onPointerCancel={onResizeEnd}
          className="absolute bottom-0 right-0 w-10 h-10 cursor-se-resize touch-none flex items-end justify-end"
          style={{ zIndex: 10 }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" className="mr-1 mb-1 opacity-40">
            <line x1="14" y1="2" x2="2" y2="14" stroke="currentColor" strokeWidth="1.5" />
            <line x1="14" y1="7" x2="7" y2="14" stroke="currentColor" strokeWidth="1.5" />
            <line x1="14" y1="12" x2="12" y2="14" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      </div>
    </Draggable>
  );
}

// Simple helper to darken hex color for the top border
function darkenColor(color: string, amount: number) {
  if (!color || typeof color !== 'string' || !color.startsWith('#')) return '#000000';
  try {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) - amount)).toString(16)).substr(-2));
  } catch (e) {
    return '#000000';
  }
}

// Helper to generate random hex colors by category
function getRandomHexColor(type: 'pastel' | 'vibrant' | 'neon'): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  
  if (type === 'pastel') {
    // High RGB values for soft pastel colors
    const r = Math.floor(Math.random() * 56) + 200; // 200-255
    const g = Math.floor(Math.random() * 56) + 200;
    const b = Math.floor(Math.random() * 56) + 200;
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  
  if (type === 'vibrant') {
    // Fully saturated colors (one channel 255, one 0, one random)
    const channels = [255, 0, Math.floor(Math.random() * 256)];
    // Shuffle channels
    for (let i = channels.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [channels[i], channels[j]] = [channels[j], channels[i]];
    }
    return `#${toHex(channels[0])}${toHex(channels[1])}${toHex(channels[2])}`;
  }
  
  if (type === 'neon') {
    // Specific neon hex codes for best effect
    const neons = [
      '#39ff14', // Neon Green
      '#0ff0fc', // Neon Blue/Cyan
      '#ff00ff', // Neon Magenta
      '#ffea00', // Neon Yellow
      '#ff073a', // Neon Red
      '#ff0055', // Neon Pink
      '#bc13fe'  // Neon Purple
    ];
    return neons[Math.floor(Math.random() * neons.length)];
  }
  
  return '#fef08a';
}
