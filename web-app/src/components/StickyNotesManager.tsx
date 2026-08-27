import { useEffect, useState, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useReward } from '../contexts/RewardContext';
import Draggable from 'react-draggable';
import { Palette, X, GripHorizontal, Tag, PlusCircle, Layers, Eye, EyeOff, Pipette, ChevronRight, ChevronUp, ChevronDown, History, AlignLeft, AlignCenter } from 'lucide-react';
import { generateNoteTag } from '../lib/gemini';

interface Note {
  id: string;
  noteNumber?: number;
  title?: string;
  content: string;
  x: number;
  y: number;
  color: string;
  zIndex: number;
  isArchived?: boolean;
  subjectTag?: string;
  subTag?: string;
  w?: number;
  h?: number;
  isMinimized?: boolean;
  createdAt?: any;
  isFlashcard?: boolean;
  backContent?: string;
  stickers?: { id: string; stickerId: string; x: number; y: number }[];
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
  const { user, apiKey } = useAuth();
  const { awardPoints } = useReward();
  const [notes, setNotes] = useState<Note[]>([]);
  const [highestZ, setHighestZ] = useState(100);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'postits' | 'flashcards'>('postits');
  const [isCascadeMode, setIsCascadeMode] = useState(() => {
    try {
      const saved = localStorage.getItem('isCascadeMode');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  
  useEffect(() => {
    localStorage.setItem('isCascadeMode', JSON.stringify(isCascadeMode));
  }, [isCascadeMode]);

  const [cascadePos, setCascadePos] = useState({ x: 100, y: 100 });
  const [cascadeSize, setCascadeSize] = useState({ w: 256, h: 280 });

  const [isFlashcardCascadeMode, setIsFlashcardCascadeMode] = useState(() => {
    try {
      const saved = localStorage.getItem('isFlashcardCascadeMode');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  
  useEffect(() => {
    localStorage.setItem('isFlashcardCascadeMode', JSON.stringify(isFlashcardCascadeMode));
  }, [isFlashcardCascadeMode]);

  const [flashcardCascadePos, setFlashcardCascadePos] = useState({ x: 150, y: 150 });
  const [flashcardCascadeSize, setFlashcardCascadeSize] = useState({ w: 320, h: 220 });
  const [isDraggingFromSidebar, setIsDraggingFromSidebar] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedSubTag, setSelectedSubTag] = useState<string | null>(null);
  const NO_TAG = '__no_tag__';
  const processingTagsRef = useRef<Set<string>>(new Set());

  const [showTagsFilter, setShowTagsFilter] = useState(() => {
    try {
      const saved = localStorage.getItem('showTagsFilter');
      return saved ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  useEffect(() => {
    localStorage.setItem('showTagsFilter', JSON.stringify(showTagsFilter));
  }, [showTagsFilter]);

  // Load preferences from firestore
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid, 'settings', 'stickyNotes')).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.isCascadeMode !== undefined) setIsCascadeMode(data.isCascadeMode);
        if (data.cascadePos) setCascadePos(data.cascadePos);
        if (data.cascadeSize) setCascadeSize(data.cascadeSize);
        if (data.isFlashcardCascadeMode !== undefined) setIsFlashcardCascadeMode(data.isFlashcardCascadeMode);
        if (data.flashcardCascadePos) setFlashcardCascadePos(data.flashcardCascadePos);
        if (data.flashcardCascadeSize) setFlashcardCascadeSize(data.flashcardCascadeSize);
      }
    }).catch(console.error);
  }, [user]);

  const getFilteredNotes = () => {
    let filtered = sidebarTab === 'flashcards' 
      ? notes.filter(n => n.isFlashcard) 
      : notes.filter(n => !n.isFlashcard);
    if (selectedTag === NO_TAG) {
      filtered = filtered.filter(n => !n.subjectTag);
    } else if (selectedTag && selectedSubTag) {
      filtered = filtered.filter(n => n.subjectTag === selectedTag && n.subTag === selectedSubTag);
    } else if (selectedTag) {
      filtered = filtered.filter(n => n.subjectTag === selectedTag);
    }

    return filtered.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      if (sortOrder === 'newest') return timeB - timeA;
      return timeA - timeB;
    });
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
    const handleArchiveAll = () => {
      if (!user) return;
      const activeNotes = notes.filter(n => !n.isArchived);
      activeNotes.forEach(async (note) => {
        const noteRef = doc(db, 'users', user.uid, 'notes', note.id);
        await updateDoc(noteRef, { isArchived: true }).catch(console.error);
      });
    };

    const handleOpenPostit = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const postitNumber = customEvent.detail;
      const noteToOpen = notes.find(n => n.noteNumber === postitNumber);
      if (noteToOpen) {
        if (!user) return;
        const noteRef = doc(db, 'users', user.uid, 'notes', noteToOpen.id);
        const newZ = highestZ + 1;
        setHighestZ(newZ);
        await updateDoc(noteRef, { isArchived: false, isMinimized: false, zIndex: newZ });
      } else {
        console.warn(`Post-it #${postitNumber} não encontrado.`);
      }
    };

    const handleAddFC = (e: Event) => handleAddFlashcard(e);

    window.addEventListener('add-note', handleAdd);
    window.addEventListener('add-flashcard', handleAddFC);
    window.addEventListener('toggle-archive', handleToggleArchive);
    window.addEventListener('archive-all-notes', handleArchiveAll);
    window.addEventListener('open-postit', handleOpenPostit);

    const handleRemoveSticker = async (e: Event) => {
      const customEvent = e as CustomEvent<{ instanceId: string }>;
      const { instanceId } = customEvent.detail;
      
      if (!user) return;
      
      // Find which note has this sticker
      const noteToUpdate = notes.find(n => n.stickers?.some(s => s.id === instanceId));
      if (!noteToUpdate || !noteToUpdate.stickers) return;

      const newStickers = noteToUpdate.stickers.filter(s => s.id !== instanceId);
      
      const noteRef = doc(db, 'users', user.uid, 'notes', noteToUpdate.id);
      await updateDoc(noteRef, { stickers: newStickers });
    };
    
    window.addEventListener('remove-sticker', handleRemoveSticker);

    return () => {
      window.removeEventListener('add-note', handleAdd);
      window.removeEventListener('add-flashcard', handleAddFC);
      window.removeEventListener('toggle-archive', handleToggleArchive);
      window.removeEventListener('archive-all-notes', handleArchiveAll);
      window.removeEventListener('open-postit', handleOpenPostit);
      window.removeEventListener('remove-sticker', handleRemoveSticker);
    };
  }, [user, notes, highestZ]);

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

  // Retrofit old notes without noteNumber
  useEffect(() => {
    if (!user || notes.length === 0) return;
    
    const notesWithoutNumber = notes.filter(n => typeof n.noteNumber === 'undefined');
    if (notesWithoutNumber.length === 0) return;

    const assignNumbers = async () => {
      const sortedByOldest = [...notesWithoutNumber].sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeA - timeB;
      });

      let currentMax = Math.max(0, ...notes.filter(n => n.noteNumber).map(n => n.noteNumber!));
      
      for (const note of sortedByOldest) {
        currentMax++;
        try {
          const noteRef = doc(db, 'users', user.uid, 'notes', note.id);
          await updateDoc(noteRef, { noteNumber: currentMax });
        } catch (e) {
          console.error('Erro ao atribuir número à nota antiga:', e);
        }
      }
    };

    assignNumbers();
  }, [user, notes]);

  // Retrofit old notes without tags and handle new ones that get archived
  useEffect(() => {
    if (!user || !apiKey || notes.length === 0) return;
    
    // Find the first archived note that has content but no tag/subtag, and is not currently being processed
    const noteToProcess = notes.find(n => n.isArchived && (!n.subjectTag || n.subTag === undefined) && n.content && !processingTagsRef.current.has(n.id));
    
    if (noteToProcess) {
      processingTagsRef.current.add(noteToProcess.id);
      generateNoteTag(noteToProcess.content, noteToProcess.title || '', apiKey).then(async (result) => {
        if (result && result.tag) {
          const noteRef = doc(db, 'users', user.uid, 'notes', noteToProcess.id);
          await updateDoc(noteRef, { subjectTag: result.tag, subTag: result.subtag || '' });
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

      const nextNoteNumber = notes.length > 0 ? Math.max(0, ...notes.filter(n => n.noteNumber).map(n => n.noteNumber!)) + 1 : 1;

      await addDoc(collection(db, 'users', user.uid, 'notes'), {
        noteNumber: nextNoteNumber,
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
      
      awardPoints(2, 'create_note');
    } catch (error) {
      console.error("Erro ao adicionar nota:", error);
    }
  };

  const handleAddFlashcard = async (e?: Event) => {
    if (!user) return;
    try {
      const newZ = highestZ + 1;
      setHighestZ(newZ);

      let initialTitle = '';
      let initialContent = '';
      let initialBackContent = '';

      if (e instanceof CustomEvent && e.detail) {
        initialTitle = e.detail.title || '';
        initialContent = e.detail.content || '';
        initialBackContent = e.detail.backContent || '';
      }

      const savedPos = (() => { try { return JSON.parse(localStorage.getItem('last_note_pos') || 'null'); } catch { return null; } })();
      const savedSize = (() => { try { return JSON.parse(localStorage.getItem('last_note_size') || 'null'); } catch { return null; } })();

      let x = Math.max(100, window.innerWidth / 2 - 120 + (Math.random() * 40 - 20));
      let y = Math.max(100, window.innerHeight / 2 - 120 + (Math.random() * 40 - 20));
      if (savedPos) {
        x = savedPos.x + (Math.random() * 20 - 10);
        y = savedPos.y + (Math.random() * 20 - 10);
      }

      const nextNoteNumber = notes.length > 0 ? Math.max(0, ...notes.filter(n => n.noteNumber).map(n => n.noteNumber!)) + 1 : 1;

      await addDoc(collection(db, 'users', user.uid, 'notes'), {
        noteNumber: nextNoteNumber,
        title: initialTitle,
        content: initialContent,
        backContent: initialBackContent,
        isFlashcard: true,
        color: COLORS[0],
        x,
        y,
        w: savedSize?.w || 256,
        h: savedSize?.h || 280,
        zIndex: newZ,
        isArchived: false,
        createdAt: serverTimestamp()
      });

      awardPoints(2, 'create_note');
    } catch (error) {
      console.error("Erro ao adicionar flashcard:", error);
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

  const handleToggleCascade = (forceFlashcard?: boolean) => {
    const isFlashcard = forceFlashcard !== undefined ? forceFlashcard : sidebarTab === 'flashcards';
    
    if (isFlashcard) {
      if (!isFlashcardCascadeMode) {
        const savedPos = (() => { try { return JSON.parse(localStorage.getItem('last_flashcard_pos') || 'null'); } catch { return null; } })();
        const savedSize = (() => { try { return JSON.parse(localStorage.getItem('last_flashcard_size') || 'null'); } catch { return null; } })();
        if (savedPos) setFlashcardCascadePos(savedPos);
        else setFlashcardCascadePos({ x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 150 });
        if (savedSize) setFlashcardCascadeSize(savedSize);
      }
      const newMode = !isFlashcardCascadeMode;
      setIsFlashcardCascadeMode(newMode);
      if (user) {
        setDoc(doc(db, 'users', user.uid, 'settings', 'stickyNotes'), { isFlashcardCascadeMode: newMode }, { merge: true }).catch(console.error);
      }
    } else {
      if (!isCascadeMode) {
        const savedPos = (() => { try { return JSON.parse(localStorage.getItem('last_note_pos') || 'null'); } catch { return null; } })();
        const savedSize = (() => { try { return JSON.parse(localStorage.getItem('last_note_size') || 'null'); } catch { return null; } })();
        if (savedPos) setCascadePos(savedPos);
        else setCascadePos({ x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 150 });
        if (savedSize) setCascadeSize(savedSize);
      }
      const newMode = !isCascadeMode;
      setIsCascadeMode(newMode);
      if (user) {
        setDoc(doc(db, 'users', user.uid, 'settings', 'stickyNotes'), { isCascadeMode: newMode }, { merge: true }).catch(console.error);
      }
    }
  };

  if (!user) return null;

  const activeNotes = notes.filter(n => !n.isArchived);
  
  const tagsHierarchy = notes.reduce((acc, note) => {
    if (note.subjectTag) {
      if (!acc[note.subjectTag]) acc[note.subjectTag] = new Set<string>();
      if (note.subTag) acc[note.subjectTag].add(note.subTag);
    }
    return acc;
  }, {} as Record<string, Set<string>>);
  
  const allTags = Object.keys(tagsHierarchy);

  return (
    <>
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 9999 }}>
        {activeNotes.filter(n => !n.isFlashcard).map(note => (
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
              if (user) {
                setDoc(doc(db, 'users', user.uid, 'settings', 'stickyNotes'), { cascadePos: pos }, { merge: true }).catch(console.error);
              }
            }}
            onUpdate={(updates) => handleUpdateNote(note.id, updates)}
            onMinimizeAll={(minimize) => {
              const activeNotes = notes.filter(n => !n.isArchived);
              activeNotes.forEach(an => handleUpdateNote(an.id, { isMinimized: minimize }));
            }}
            onFocus={() => bringToFront(note.id)}
            onSendToBack={() => sendToBack(note.id)}
            onToggleCascade={() => handleToggleCascade(false)}
            allTags={allTags}
            tagsHierarchy={tagsHierarchy}
          />
        ))}
        {activeNotes.filter(n => n.isFlashcard).map(note => (
          <FlashcardItem 
            key={`${note.id}-${isFlashcardCascadeMode ? 'cascade' : 'free'}`} 
            note={note} 
            isCascadeMode={isFlashcardCascadeMode}
            cascadePos={flashcardCascadePos}
            cascadeSize={flashcardCascadeSize}
            onCascadeResize={(size) => {
              setFlashcardCascadeSize(size);
              if (user) {
                setDoc(doc(db, 'users', user.uid, 'settings', 'stickyNotes'), { flashcardCascadeSize: size }, { merge: true }).catch(console.error);
              }
            }}
            onCascadeStop={(pos) => {
              setFlashcardCascadePos(pos);
              if (user) {
                setDoc(doc(db, 'users', user.uid, 'settings', 'stickyNotes'), { flashcardCascadePos: pos }, { merge: true }).catch(console.error);
              }
            }}
            onUpdate={(u) => handleUpdateNote(note.id, u)}
            onFocus={() => bringToFront(note.id)}
            onSendToBack={() => sendToBack(note.id)}
          />
        ))}
      </div>

      {isArchiveOpen && (
        <div className="fixed inset-0 pointer-events-none flex justify-end z-[10000]">
          <div className={`bg-white dark:bg-gray-800 shadow-2xl h-full w-[90%] sm:w-96 flex flex-col pointer-events-auto border-l border-gray-200 dark:border-gray-700 transition-all ${isDraggingFromSidebar ? 'overflow-visible' : 'overflow-hidden'}`}>
            <div className="p-4 border-b bg-yellow-50 dark:bg-yellow-900/30 flex flex-col gap-2 z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                  {sidebarTab === 'postits' ? 'Meus Post-its' : 'Meus Flashcards'}
                </h2>
              <button onClick={() => setIsArchiveOpen(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400">
                <X className="w-6 h-6" />
              </button>
              </div>
              {/* Tabs */}
              <div className="flex gap-1">
                <button
                  onClick={() => setSidebarTab('postits')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sidebarTab === 'postits' ? 'bg-yellow-500 text-yellow-950 shadow-sm' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300'}`}
                >
                  📝 Post-its
                </button>
                <button
                  onClick={() => setSidebarTab('flashcards')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sidebarTab === 'flashcards' ? 'bg-indigo-500 text-white shadow-sm' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300'}`}
                >
                  🔄 Flashcards
                </button>
                <button
                  onClick={() => sidebarTab === 'flashcards' ? handleAddFlashcard() : handleAddNote()}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-sm"
                  title={sidebarTab === 'flashcards' ? 'Novo Flashcard' : 'Novo Post-it'}
                >
                  + Novo
                </button>
              </div>
            </div>
            <div className={`p-6 flex-1 bg-gray-50 dark:bg-gray-900 ${isDraggingFromSidebar ? 'overflow-visible' : 'overflow-y-auto'}`}>
              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={() => handleToggleCascade()}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-sm flex items-center gap-2 ${(sidebarTab === 'flashcards' ? isFlashcardCascadeMode : isCascadeMode) ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 dark:bg-gray-800 dark:border-indigo-900 dark:hover:bg-gray-700'}`}
                >
                  <Layers size={18} />
                  {(sidebarTab === 'flashcards' ? isFlashcardCascadeMode : isCascadeMode) ? 'Modo Cascata Ativo' : 'Modo Cascata'}
                </button>
                <button
                  onClick={() => {
                     const isFlashcardTab = sidebarTab === 'flashcards';
                     const archivedNotes = notes.filter(n => n.isArchived && (isFlashcardTab ? n.isFlashcard : !n.isFlashcard));
                     const recent = archivedNotes.slice(-3);
                     recent.forEach(n => handleUpdateNote(n.id, { isArchived: false, isMinimized: false }));
                     if (!(isFlashcardTab ? isFlashcardCascadeMode : isCascadeMode)) handleToggleCascade();
                     setIsArchiveOpen(false); // fechar sidebar após abrir
                  }}
                  className="px-4 py-2 rounded-lg font-bold text-sm bg-yellow-500 text-yellow-950 hover:bg-yellow-400 transition-all shadow-sm flex items-center gap-2"
                  title={sidebarTab === 'flashcards' ? "Reabrir últimos flashcards fechados em modo cascata" : "Reabrir últimos post-its fechados em modo cascata"}
                >
                  <History className="w-4 h-4" /> Reabrir Últimos
                </button>
              </div>
              {notes.length === 0 ? (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                  <p>Nenhum post-it criado ainda.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Actions Header: Sort and Toggle Tags */}
                  <div className="flex justify-between items-center mb-1 gap-2">
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                      className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-sm"
                    >
                      <option value="newest">Mais recentes</option>
                      <option value="oldest">Mais antigos</option>
                    </select>

                    <button
                      onClick={() => setShowTagsFilter(!showTagsFilter)}
                      className="text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 transition-colors"
                    >
                      {showTagsFilter ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showTagsFilter ? 'Ocultar Tags' : 'Mostrar Tags'}
                    </button>
                  </div>

                  {/* Tag Filter */}
                  {showTagsFilter && (
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
                      <div key={tag} className="flex flex-col gap-1 items-start">
                        <button
                          onClick={() => {
                            setSelectedTag(tag);
                            setSelectedSubTag(null);
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                            selectedTag === tag
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50'
                          }`}
                        >
                          <Tag className="w-3 h-3" />
                          {tag}
                        </button>
                        
                        {/* Subtags */}
                        {selectedTag === tag && Array.from(tagsHierarchy[tag]).length > 0 && (
                          <div className="flex flex-wrap gap-1 ml-4 mt-1 border-l-2 border-indigo-200 dark:border-indigo-800 pl-2">
                            {Array.from(tagsHierarchy[tag]).map(subtag => (
                              <button
                                key={subtag}
                                onClick={() => setSelectedSubTag(subtag)}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all ${
                                  selectedSubTag === subtag
                                    ? 'bg-indigo-500 text-white shadow-sm'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'
                                }`}
                              >
                                {subtag}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    </div>
                  )}

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
  onDragStart: (e: any) => void;
  onDragEnd: () => void;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(note.title || '');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content || '');
  const [editBackContent, setEditBackContent] = useState(note.backContent || '');

  // Debounce sidebar title update
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (title !== note.title) {
        onUpdate({ title });
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [title]);

  const handleSaveEdit = () => {
    onUpdate({ content: editContent, backContent: editBackContent });
    setIsEditing(false);
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{x: 0, y: 0}}
      cancel="button, input, textarea"
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
      <div ref={nodeRef} className={`rounded-lg shadow-md p-4 relative cursor-move border ${note.isFlashcard ? 'border-indigo-400 border-t-4' : 'border-black/5'}`} style={{ backgroundColor: note.color || '#fef08a' }}>
        {note.noteNumber && (
          <div className={`absolute -top-2 -right-2 ${note.isFlashcard ? 'bg-indigo-100 border-indigo-400 text-indigo-900' : 'bg-yellow-100 border-yellow-400 text-yellow-900'} font-bold text-[10px] px-1.5 py-0.5 rounded shadow-sm z-10 flex items-center gap-0.5`}>
            {note.isFlashcard ? '🔄' : '📌'} #{note.noteNumber}
          </div>
        )}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={note.isFlashcard ? "Flashcard sem título" : "Sem título"}
          className="w-full bg-transparent outline-none font-bold text-gray-800 mb-2 placeholder-black/30 font-sans"
          onPointerDown={(e) => e.stopPropagation()} // Prevent drag when typing
          onTouchStart={(e) => e.stopPropagation()}
        />
        
        {isEditing ? (
          <div className="flex flex-col gap-2" onPointerDown={e => e.stopPropagation()}>
            <RichTextToolbar />
            <div>
              <label className="text-xs font-bold opacity-60">FRENTE:</label>
              <div 
                contentEditable
                suppressContentEditableWarning
                onInput={e => setEditContent((e.target as HTMLDivElement).innerHTML)} 
                className="w-full bg-white/50 rounded p-2 text-sm outline-none overflow-y-auto h-20 font-sans cursor-text border border-transparent focus:border-indigo-300"
                dangerouslySetInnerHTML={{ __html: editContent }}
              />
            </div>
            {note.isFlashcard && (
              <div>
                <label className="text-xs font-bold text-indigo-800 opacity-60">VERSO:</label>
                <div 
                  contentEditable
                  suppressContentEditableWarning
                  onInput={e => setEditBackContent((e.target as HTMLDivElement).innerHTML)} 
                  className="w-full bg-indigo-50/50 rounded p-2 text-sm outline-none overflow-y-auto h-20 font-sans border border-indigo-100 focus:border-indigo-300 cursor-text"
                  dangerouslySetInnerHTML={{ __html: editBackContent }}
                />
              </div>
            )}
            <div className="flex gap-2 justify-end mt-1">
              <button onClick={() => setIsEditing(false)} className="text-xs px-2 py-1 bg-gray-200 rounded">Cancelar</button>
              <button onClick={handleSaveEdit} className="text-xs px-2 py-1 bg-green-500 text-white rounded font-bold">Salvar</button>
            </div>
          </div>
        ) : (
          <div onDoubleClick={() => setIsEditing(true)}>
            {note.content ? (
              <div 
                className="text-sm text-gray-800 line-clamp-4 min-h-[40px] font-sans"
                dangerouslySetInnerHTML={{ __html: note.content }}
              />
            ) : (
              <p className="text-sm text-gray-800 line-clamp-4 min-h-[40px] font-sans italic opacity-50">
                {note.isFlashcard ? 'Flashcard vazio' : 'Nota vazia'}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-4 justify-between border-t border-black/10 pt-2 items-center">
          <div className="flex gap-2">
            <button 
              onPointerDown={(e) => e.stopPropagation()} 
              onClick={onDelete} 
              className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 px-2 py-1 rounded"
            >
              Excluir
            </button>
            {!isEditing && (
              <button 
                onPointerDown={(e) => e.stopPropagation()} 
                onClick={() => setIsEditing(true)} 
                className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded"
              >
                Editar
              </button>
            )}
          </div>
          
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
          <div className="absolute top-0 right-0 left-0 h-4 bg-black/5 rounded-t-lg hidden md:flex items-center justify-center opacity-50 pointer-events-none">
            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">Arraste para fixar</span>
          </div>
        )}
      </div>
    </Draggable>
  );
}

function FlashcardItem({ 
  note, 
  isCascadeMode,
  cascadePos,
  cascadeSize,
  onCascadeResize,
  onCascadeStop,
  onUpdate,
  onFocus,
  onSendToBack
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
}) {
  const [flipped, setFlipped] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  
  const [size, setSize] = useState({ w: note.w || 250, h: note.h || 300 });
  
  const [showPalette, setShowPalette] = useState(false);
  const [savedColors, setSavedColors] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('sticky_saved_colors') || '[]'); } catch { return []; }
  });

  const handleSaveCustomColor = (color: string) => {
    setSavedColors(prev => {
      const next = Array.from(new Set([color, ...prev])).slice(0, 6);
      localStorage.setItem('sticky_saved_colors', JSON.stringify(next));
      return next;
    });
  };

  const handleEyedropper = async () => {
    if ('EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        onUpdate({ color: result.sRGBHex });
        handleSaveCustomColor(result.sRGBHex);
        setShowPalette(false);
      } catch (err) {
        // user canceled
      }
    } else {
      alert('O seu navegador não suporta a ferramenta de conta-gotas.');
    }
  };

  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

  const onResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const currentW = isCascadeMode && cascadeSize ? cascadeSize.w : size.w;
    const currentH = isCascadeMode && cascadeSize ? cascadeSize.h : size.h;

    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: currentW,
      startH: currentH,
    };
    
    // Disable iframe pointer events globally during resize
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      iframe.style.pointerEvents = 'none';
    });
  };

  const onResizeMove = (e: React.PointerEvent) => {
    if (!resizeRef.current || !nodeRef.current) return;
    e.preventDefault();
    
    const scale = nodeRef.current.getBoundingClientRect().width / (nodeRef.current.offsetWidth || 1);
    
    const dx = (e.clientX - resizeRef.current.startX) / scale;
    const dy = (e.clientY - resizeRef.current.startY) / scale;
    
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
    
    // Restore iframe pointer events
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      iframe.style.pointerEvents = 'auto';
    });

    if (!isCascadeMode) {
      onUpdate({ w: size.w, h: size.h });
      localStorage.setItem('last_flashcard_size', JSON.stringify({ w: size.w, h: size.h }));
    } else if (cascadeSize) {
      localStorage.setItem('last_flashcard_size', JSON.stringify({ w: cascadeSize.w, h: cascadeSize.h }));
    }
  };

  const baseColor = note.color || '#6366f1'; // indigo-500
  const backColor = darkenColor(baseColor, 30);
  const frontTextColor = getContrastColor(baseColor);
  const backTextColor = getContrastColor(backColor);

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".drag-handle"
      defaultPosition={isCascadeMode && cascadePos ? cascadePos : { x: note.x || 0, y: note.y || 0 }}
      onDrag={(_e, data) => {
        if (isCascadeMode) {
          const elements = document.querySelectorAll('.flashcard-cascade-item');
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
          localStorage.setItem('last_flashcard_pos', JSON.stringify({ x: data.x, y: data.y }));
        }
      }}
      onStart={onFocus}
      bounds="parent"
      cancel="button,.flip-content,.palette-popover"
    >
      <div 
        ref={nodeRef}
        className={`absolute perspective-1000 pointer-events-auto ${isCascadeMode ? 'flashcard-cascade-item' : ''}`}
        style={{ 
          width: isCascadeMode && cascadeSize ? `${cascadeSize.w}px` : `${size.w}px`,
          height: isCascadeMode && cascadeSize ? `${cascadeSize.h}px` : `${size.h}px`,
          zIndex: note.zIndex || 100 
        }}
        onMouseDown={onFocus}
      >
        <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${flipped ? 'rotate-y-180' : ''}`}>
          
          {/* FRENTE */}
          <div className="absolute w-full h-full backface-hidden rounded-xl shadow-xl flex flex-col" style={{ backgroundColor: baseColor, color: frontTextColor }}>
            <div className="drag-handle h-8 bg-black/10 flex items-center justify-between px-2 cursor-grab active:cursor-grabbing rounded-t-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <GripHorizontal className="w-4 h-4 opacity-50" />
                {note.noteNumber && <span className="text-xs font-semibold opacity-50">#{note.noteNumber}</span>}
              </div>
              <div className="flex gap-1">
                {isCascadeMode && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onSendToBack(); }}
                    className="p-1 flex items-center justify-center gap-1 text-xs font-bold text-white/80 bg-black/10 hover:bg-black/20 rounded px-2 transition-colors"
                    title="Próximo flashcard"
                  >
                    Próximo
                    <ChevronRight className="w-3.5 h-3.5 pointer-events-none" />
                  </button>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowPalette(!showPalette); }}
                  className="p-1 hover:bg-black/20 rounded"
                  title="Mudar Cor"
                >
                  <Palette className="w-3.5 h-3.5 opacity-80 pointer-events-none" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onUpdate({ isArchived: true }); }}
                  className="p-1 hover:bg-black/20 rounded"
                  title="Fechar"
                >
                  <X className="w-4 h-4 opacity-80 pointer-events-none" />
                </button>
              </div>
            </div>
            
            {showPalette && (
              <div className="palette-popover flex flex-col gap-2 p-2 bg-white/95 backdrop-blur border-b border-black/10 text-black">
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
                </div>
                {savedColors.length > 0 && (
                  <div className="flex gap-1 justify-center items-center flex-wrap pt-1 border-t border-gray-200">
                    {savedColors.map(c => (
                      <button
                        key={c}
                        onClick={(e) => { e.stopPropagation(); onUpdate({ color: c }); setShowPalette(false); }}
                        className={`w-5 h-5 rounded-full shadow-inner border border-black/20 ${note.color === c ? 'ring-2 ring-indigo-500' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                )}
                <div className="flex gap-1 justify-center items-center pt-2 border-t border-gray-200">
                  <button onClick={handleEyedropper} className="w-7 h-7 rounded-full shadow-sm border border-gray-300 bg-gray-50 flex items-center justify-center hover:bg-gray-200">
                    <Pipette className="w-3.5 h-3.5 text-gray-700" />
                  </button>
                  <label className="w-7 h-7 rounded-full shadow-inner border-2 border-transparent bg-gradient-to-tr from-red-500 via-green-500 to-blue-500 cursor-pointer flex items-center justify-center">
                    <input type="color" value={note.color || '#6366f1'} onChange={(e) => onUpdate({ color: e.target.value })} onBlur={(e) => handleSaveCustomColor(e.target.value)} className="opacity-0 absolute w-0 h-0" />
                    <PlusCircle className="w-4 h-4 text-white drop-shadow-md" />
                  </label>
                </div>
                <div className="flex gap-1 justify-center items-center pt-2 border-t border-gray-200">
                  <button onClick={(e) => { e.stopPropagation(); onUpdate({ color: getRandomHexColor('pastel') }); }} className="text-[10px] font-bold px-2 py-1 rounded shadow-sm border border-gray-200 bg-[#fdfbf7] hover:bg-white text-gray-600">Pastel</button>
                  <button onClick={(e) => { e.stopPropagation(); onUpdate({ color: getRandomHexColor('vibrant') }); }} className="px-3 py-1.5 text-xs font-bold rounded-md text-white shadow-sm hover:opacity-90" style={{ background: 'linear-gradient(135deg, #ff4081 0%, #ff9100 100%)' }}>Vibrante</button>
                  <button onClick={(e) => { e.stopPropagation(); onUpdate({ color: getRandomHexColor('neon') }); }} className="px-3 py-1.5 text-xs font-black rounded-md text-[#ccff00] bg-slate-900 shadow-sm border border-slate-700" style={{ textShadow: '0 0 5px #ccff00, 0 0 10px #ccff00' }}>Neon</button>
                </div>
              </div>
            )}

            <div 
              className="flip-content flex-grow flex items-center justify-center p-6 cursor-pointer overflow-auto text-center"
              onClick={(e) => { e.stopPropagation(); setFlipped(true); }}
            >
              <div 
                className="font-bold whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: note.content || "Frente do flashcard" }}
              />
            </div>
            <div
              onPointerDown={onResizeStart}
              onPointerMove={onResizeMove}
              onPointerUp={onResizeEnd}
              onPointerCancel={onResizeEnd}
              className="absolute bottom-0 right-0 w-10 h-10 cursor-se-resize touch-none flex items-end justify-end"
              style={{ zIndex: 10 }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" className="mr-1 mb-1 opacity-40" style={{ color: frontTextColor }}>
                <line x1="14" y1="2" x2="2" y2="14" stroke="currentColor" strokeWidth="1.5" />
                <line x1="14" y1="7" x2="7" y2="14" stroke="currentColor" strokeWidth="1.5" />
                <line x1="14" y1="12" x2="12" y2="14" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
          </div>

          {/* VERSO */}
          <div className="absolute w-full h-full backface-hidden rounded-xl shadow-xl flex flex-col rotate-y-180" style={{ backgroundColor: backColor, color: backTextColor }}>
            <div className="drag-handle h-8 bg-black/10 flex items-center justify-between px-2 cursor-grab active:cursor-grabbing rounded-t-xl" onClick={(e) => e.stopPropagation()}>
               <div className="flex items-center gap-2">
                 <GripHorizontal className="w-4 h-4 opacity-50" />
               </div>
               <div className="flex gap-1">
                 <button 
                   onClick={(e) => { e.stopPropagation(); onUpdate({ isArchived: true }); }}
                   className="p-1 hover:bg-black/20 rounded"
                   title="Fechar"
                 >
                   <X className="w-4 h-4 opacity-80 pointer-events-none" />
                 </button>
               </div>
            </div>
            <div 
              className="flip-content flex-grow flex items-center justify-center p-6 cursor-pointer overflow-auto text-center"
              onClick={(e) => { e.stopPropagation(); setFlipped(false); }}
            >
              <div 
                className="font-bold whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: note.backContent || "Verso do flashcard" }}
              />
            </div>
          </div>
        </div>

        {/* Global Resize Handle (Never Flips) */}
        <div
          onPointerDown={onResizeStart}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeEnd}
          onPointerCancel={onResizeEnd}
          className="absolute bottom-0 right-0 w-10 h-10 cursor-se-resize touch-none flex items-end justify-end"
          style={{ zIndex: 20 }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" className="mr-1 mb-1 opacity-50 text-white mix-blend-overlay pointer-events-none">
            <line x1="14" y1="2" x2="2" y2="14" stroke="currentColor" strokeWidth="1.5" />
            <line x1="14" y1="7" x2="7" y2="14" stroke="currentColor" strokeWidth="1.5" />
            <line x1="14" y1="12" x2="12" y2="14" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
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
  onMinimizeAll,
  onFocus,
  onSendToBack,
  onToggleCascade,
  allTags,
  tagsHierarchy
}: { 
  note: Note; 
  isCascadeMode: boolean;
  cascadePos?: {x: number, y: number};
  cascadeSize?: {w: number, h: number};
  onCascadeResize?: (size: {w: number, h: number}) => void;
  onCascadeStop?: (pos: {x: number, y: number}) => void;
  onUpdate: (u: Partial<Note>) => void;
  onMinimizeAll?: (minimize: boolean) => void;
  onFocus: () => void;
  onSendToBack: () => void;
  onToggleCascade: () => void;
  allTags: string[];
  tagsHierarchy?: Record<string, Set<string>>;
}) {
  // const { awardPoints } = useReward();
  const [showPalette, setShowPalette] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [newTagInput, setNewTagInput] = useState(note.subjectTag || '');
  const [newSubTagInput, setNewSubTagInput] = useState(note.subTag || '');
  
  const [savedColors, setSavedColors] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('sticky_saved_colors') || '[]'); } catch { return []; }
  });

  const handleSaveCustomColor = (color: string) => {
    setSavedColors(prev => {
      const next = Array.from(new Set([color, ...prev])).slice(0, 6);
      localStorage.setItem('sticky_saved_colors', JSON.stringify(next));
      return next;
    });
    onUpdate({ color });
  };

  const handleEyedropper = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if ('EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        handleSaveCustomColor(result.sRGBHex);
        setShowPalette(false);
      } catch (err) {
        // User canceled or error
      }
    } else {
      alert('O seu navegador não suporta a ferramenta de conta-gotas.');
    }
  };

  const nodeRef = useRef<HTMLDivElement>(null);
  
  // Local state for debouncing typing and dragging
  const [title, setTitle] = useState(note.title || '');
  const [content, setContent] = useState(note.content || '');
  
  const editableRef = useRef<HTMLDivElement>(null);

  // Set initial content once
  useEffect(() => {
    if (editableRef.current && !editableRef.current.innerHTML && note.content) {
      editableRef.current.innerHTML = note.content;
    }
  }, [note.content]);

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
    const currentW = isCascadeMode && cascadeSize ? cascadeSize.w : size.w;
    const currentH = isCascadeMode && cascadeSize ? cascadeSize.h : size.h;

    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: currentW,
      startH: currentH,
    };
  };

  const onResizeMove = (e: React.PointerEvent) => {
    if (!resizeRef.current || !nodeRef.current) return;
    e.preventDefault();
    
    const scale = nodeRef.current.getBoundingClientRect().width / (nodeRef.current.offsetWidth || 1);
    
    const dx = (e.clientX - resizeRef.current.startX) / scale;
    const dy = (e.clientY - resizeRef.current.startY) / scale;
    
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
      onStart={() => {
        onFocus();
      }}
      bounds="parent"
      cancel="button"
    >
      <div 
        ref={nodeRef}
        className={`sticky-note absolute rounded-lg shadow-xl overflow-hidden pointer-events-auto border-t-8 flex flex-col group transition-shadow hover:shadow-2xl ${isCascadeMode ? 'cascade-mode-item' : ''}`}
        style={{ 
          width: isCascadeMode && cascadeSize ? `${cascadeSize.w}px` : `${size.w}px`,
          height: note.isMinimized ? '32px' : (isCascadeMode && cascadeSize ? `${cascadeSize.h}px` : `${size.h}px`),
          minWidth: '180px',
          minHeight: note.isMinimized ? '32px' : '180px',
          backgroundColor: note.color || '#fef08a', 
          borderColor: darkenColor(note.color || '#fef08a', 20),
          zIndex: note.zIndex || 100 
        }}
        onClick={isCascadeMode ? undefined : onFocus}
        onDoubleClick={() => {
          if (isCascadeMode) {
            onSendToBack();
          }
        }}
      >
        {/* Header (Drag Handle) */}
        <div 
          className="drag-handle h-8 bg-black/5 flex items-center justify-between px-2 cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-4 h-4 text-black/30" />
            {note.noteNumber && (
              <span className="text-xs font-semibold text-black/30">
                #{note.noteNumber}
              </span>
            )}
          </div>
          
          <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            {isCascadeMode && (
              <button 
                onClick={(e) => { e.stopPropagation(); onSendToBack(); }}
                className="cascade-next-btn p-1 flex items-center justify-center gap-1 text-xs font-bold text-gray-700 bg-black/5 hover:bg-black/10 rounded px-2 transition-colors"
                title="Próximo post-it"
              >
                Próximo
                <ChevronRight className="w-3.5 h-3.5 pointer-events-none" />
              </button>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleCascade(); }}
              className={`p-1 hover:bg-black/10 rounded transition-colors ${isCascadeMode ? 'bg-black/10 text-gray-900' : 'text-gray-700'}`}
              title={isCascadeMode ? "Sair do Modo Cascata" : "Modo Cascata"}
            >
              <Layers className="w-3.5 h-3.5 pointer-events-none" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowPalette(!showPalette); setShowTagPicker(false); }}
              className="color-picker-btn p-1 hover:bg-black/10 rounded"
              title="Mudar Cor"
            >
              <Palette className="w-3.5 h-3.5 text-gray-700 pointer-events-none" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowTagPicker(!showTagPicker); setShowPalette(false); }}
              className="tag-picker-btn p-1 hover:bg-black/10 rounded"
              title="Atribuir Tag"
            >
              <Tag className="w-3.5 h-3.5 text-gray-700 pointer-events-none" />
            </button>
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                if (isCascadeMode && onMinimizeAll) {
                  onMinimizeAll(!note.isMinimized);
                } else {
                  onUpdate({ isMinimized: !note.isMinimized });
                }
              }}
              className="minimize-btn p-1 hover:bg-black/10 rounded"
              title={note.isMinimized ? "Maximizar" : "Minimizar"}
            >
              {note.isMinimized ? (
                <ChevronDown className="w-4 h-4 text-gray-700 pointer-events-none" />
              ) : (
                <ChevronUp className="w-4 h-4 text-gray-700 pointer-events-none" />
              )}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onUpdate({ isArchived: true }); }}
              className="close-btn p-2 -mr-1 hover:bg-black/10 rounded"
              title="Fechar (Guardar)"
            >
              <X className="w-4 h-4 text-gray-700 pointer-events-none" />
            </button>
          </div>
        </div>

        {!note.isMinimized && (
          <>
            {/* Color Palette Popover */}
            {showPalette && (
          <div className="flex flex-col gap-2 p-2 bg-white dark:bg-gray-800/95 backdrop-blur border-b border-black/10 rounded-b-lg">
            <div className="flex gap-1 justify-center items-center">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={(e) => { e.stopPropagation(); onUpdate({ color: c }); setShowPalette(false); }}
                  className={`w-6 h-6 rounded-full shadow-inner border-2 ${note.color === c ? 'border-gray-800 dark:border-gray-300' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  title="Cor predefinida"
                />
              ))}
            </div>

            {/* Saved Custom Colors */}
            {savedColors.length > 0 && (
              <div className="flex gap-1 justify-center items-center flex-wrap pt-1 border-t border-gray-200 dark:border-gray-700">
                {savedColors.map(c => (
                  <button
                    key={c}
                    onClick={(e) => { e.stopPropagation(); onUpdate({ color: c }); setShowPalette(false); }}
                    className={`w-5 h-5 rounded-full shadow-inner border border-black/20 ${note.color === c ? 'ring-2 ring-indigo-500' : ''}`}
                    style={{ backgroundColor: c }}
                    title="Cor Salva"
                  />
                ))}
              </div>
            )}

            <div className="flex gap-1 justify-center items-center pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleEyedropper}
                className="w-7 h-7 rounded-full shadow-sm border border-gray-300 bg-gray-50 flex items-center justify-center hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 transition-colors"
                title="Conta-gotas (Copiar cor da tela)"
              >
                <Pipette className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
              </button>
              <label 
                className="w-7 h-7 rounded-full shadow-inner border-2 border-transparent bg-gradient-to-tr from-red-500 via-green-500 to-blue-500 cursor-pointer flex items-center justify-center hover:scale-110 transition-transform"
                title="Cor personalizada (Paleta do Sistema)"
                onClick={(e) => e.stopPropagation()}
              >
                <input 
                  type="color" 
                  value={note.color || '#fef08a'} 
                  onChange={(e) => onUpdate({ color: e.target.value })}
                  onBlur={(e) => handleSaveCustomColor(e.target.value)}
                  className="opacity-0 absolute w-0 h-0"
                />
                <PlusCircle className="w-4 h-4 text-white drop-shadow-md" />
              </label>
            </div>
            
            <div className="flex gap-1 justify-center items-center pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={(e) => { e.stopPropagation(); onUpdate({ color: getRandomHexColor('pastel') }); }}
                className="text-[10px] font-bold px-2 py-1 rounded shadow-sm border border-gray-200 bg-[#fdfbf7] hover:bg-white text-gray-600 transition-all"
                title="Cor Pastel Aleatória"
              >
                Pastel
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-bold rounded-md text-white shadow-sm hover:opacity-90 flex items-center justify-center transition-all"
                style={{ background: 'linear-gradient(135deg, #ff4081 0%, #ff9100 100%)' }}
                onClick={(e) => { e.stopPropagation(); onUpdate({ color: getRandomHexColor('vibrant') }); }}
              >
                Vibrante
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-black rounded-md text-[#ccff00] bg-slate-900 shadow-sm hover:bg-black flex items-center justify-center transition-colors border border-slate-700"
                style={{ textShadow: '0 0 5px #ccff00, 0 0 10px #ccff00' }}
                onClick={(e) => { e.stopPropagation(); onUpdate({ color: getRandomHexColor('neon') }); }}
              >
                Neon
              </button>
            </div>
          </div>
        )}

        {/* Tag Picker Popover */}
        {showTagPicker && (
          <div className="flex flex-col gap-3 p-3 bg-white dark:bg-gray-800/95 backdrop-blur border-b border-black/10 rounded-b-lg text-sm z-50 shadow-xl">
            <div className="flex flex-col gap-2">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Matéria (Tag Principal)</label>
                <input 
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  placeholder="Ex: Português"
                  className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                  onPointerDown={(e) => e.stopPropagation()}
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Assunto (Subtag)</label>
                <input 
                  type="text"
                  value={newSubTagInput}
                  onChange={(e) => setNewSubTagInput(e.target.value)}
                  placeholder="Ex: Gramática"
                  className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                  onPointerDown={(e) => e.stopPropagation()}
                />
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({ 
                    subjectTag: newTagInput.trim() || '',
                    subTag: newSubTagInput.trim() || ''
                  });
                  setShowTagPicker(false);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 rounded transition-colors font-bold text-xs mt-1 shadow-sm"
              >
                Salvar Tags
              </button>
            </div>
            
            <div className="flex flex-col gap-1 mt-1 max-h-32 overflow-y-auto">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Tags Existentes</span>
              {allTags.length > 0 ? allTags.map(tag => (
                <div key={tag} className="flex flex-col gap-1 items-start">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setNewTagInput(tag);
                    }}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                      newTagInput === tag 
                        ? 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-300' 
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
                    }`}
                  >
                    {tag}
                  </button>
                  {tagsHierarchy && tagsHierarchy[tag] && newTagInput === tag && Array.from<string>(tagsHierarchy[tag]).map((subtag: string) => (
                    <button
                      key={subtag}
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewSubTagInput(subtag);
                      }}
                      className={`ml-3 px-2 py-0.5 rounded-md text-[9px] font-semibold border transition-colors ${
                        newSubTagInput === subtag
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                      }`}
                    >
                      {subtag}
                    </button>
                  ))}
                </div>
              )) : (
                <span className="text-[10px] text-gray-500 italic">Nenhuma tag existente.</span>
              )}
            </div>
            {(note.subjectTag || note.subTag) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({ subjectTag: '', subTag: '' });
                  setNewTagInput('');
                  setNewSubTagInput('');
                  setShowTagPicker(false);
                }}
                className="text-[10px] text-red-500 hover:text-red-700 font-bold self-start mt-1"
              >
                Remover Tags Atuais
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

        {/* Rich Text Toolbar */}
        <RichTextToolbar />

        {/* Editable Content */}
        <div
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          data-placeholder="Escreva algo..."
          className="note-editable w-full flex-grow p-3 text-gray-800 font-medium overflow-y-auto"
          style={{
            fontFamily: "'Comic Sans MS', cursive, sans-serif",
            outline: 'none',
            '--note-scroll-thumb': darkenColor(note.color || '#fef08a', 40),
            '--note-scroll-thumb-hover': darkenColor(note.color || '#fef08a', 70),
          } as React.CSSProperties}
          onInput={(e) => {
            const html = (e.target as HTMLDivElement).innerHTML;
            setContent(html);
          }}
          onFocus={onFocus}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
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
          </>
        )}
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

function getContrastColor(hexColor: string) {
  if (!hexColor || typeof hexColor !== 'string' || !hexColor.startsWith('#')) return '#ffffff';
  try {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 140) ? '#1f2937' : '#ffffff'; // gray-800 or white
  } catch (e) {
    return '#ffffff';
  }
}

// Helper to generate random hex colors by category
function getRandomHexColor(type: 'pastel' | 'vibrant' | 'neon'): string {
  if (type === 'pastel') {
    const pastels = [
      '#5b5efd', '#37d0fd', '#ffe699', '#90ffca', '#ff7878', // neon pastel
      '#ecff9b', '#f5ffcd', // soft yellows
      '#d1b9ff', '#a7dff4', '#8fdffd', // soft pink to blue
      '#fecaca', '#fef08a', '#bbf7d0', '#bfdbfe', '#e9d5ff', // extra standard pastels
      '#fcc8ff', '#f9fedc', '#c9aeff', '#d9ffd8', // light neon pastel
      '#ffb5dc', '#f5e075', '#d9f79d', '#86e3f5', '#da8ee9', // mild neon galaxy
      '#b067f5', '#8aff9a', '#ff9aee', '#8afff5', '#fdff80', // pastel de neon
      '#fcfffe', '#e5fffa', '#b5fff0', '#85ffe7', '#55ffdd', // neon aquamarine
      '#74f6c9', '#cc82e3', '#8876ec', '#71b0ec', '#94dff3', // neon fever dream
      '#ffcece', '#b0ffb5', '#a2bbff', '#f4bcff', '#fffdd1', // neon pastels
      '#fbd4af', '#f7c6c3', '#edd4d9', '#c2e5ea', '#bcdbca', // muted earthy pastels
      '#db96b9', '#e4a8b9', '#c8a8d5', '#d2ccf2', '#e4eeff', // cool mauve pastels
      '#a7f8ef', '#f7fa6d', '#d5b3ff', '#ffd000', '#f086be', // mixed pastel 1
      '#8b8cff', '#ff88fb', '#ffbefe', '#ffbd7a', '#fffb81', // mixed pastel 2
      '#ffcbe1', '#d6e5bd', '#f9e1a8', '#bcd8ec', '#dcccec', '#ffdab4', // gelato days
      '#f0d9ef', '#fcdce1', '#ffe6bb', '#e9ecce', '#cde9dc', '#c4dfe5', // pale pastels
      '#c8ceee', '#cbd3ad', '#ffc697', '#f7e5b7', '#f9c5c7', '#ddc3e3', // muted pastels 2
      '#ffd4d9', '#deb499', '#f9ede1', '#ffcabe', '#fce0d2', '#f7c5ad', // warm neutral pastels
      '#ffcbcb', '#ffa7a7', '#c9fdff', '#dffeff', '#fff4f4', // soft pinks and cyans
      '#ffc6e9', '#ebb1ff', '#d1f2ff', '#ffe0e0', '#dadaff', // sweet pastels
      '#b8e8ff', '#fff0ff', '#efc3ff', '#e1b6ff', '#d190ff', // cool pastels
      '#a8e6cf', '#dcedc1', '#ffd3b6', '#ffaaa5', '#ff8b94', // mint and peach pastels
      '#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff', // classic soft pastels
      '#feff9c', '#ffcf85', '#b6d1ff', '#c386ee', '#9885ec' // bright pastels
    ];
    return pastels[Math.floor(Math.random() * pastels.length)];
  }
  
  if (type === 'vibrant') {
    const vibrants = [
      '#ef65a3', '#ffad64', '#fee63b', '#d2de40', '#37d2d8', // palette 1
      '#fb923c', '#f472b6', '#38bdf8', '#4ade80', '#fbbf24', // extra standard vibrants
      '#2b90f5', // from light neon pastel (it's vibrant)
      '#ffec01', '#51d0e5', '#fe9d01', '#e0ab28', '#7aca6f', // aqua marine neon
      '#ff7eb9', '#ff65a3', '#7afcff', '#feff9c', '#fff740', // bright pinks/cyan/yellow
      '#ffec53', '#008dcb', '#f47d4a', '#00cffa', '#ffce38', // vibrant bold
      '#cffc5b', '#f61ca6', '#fe8f71', '#fd90a3', '#f5646b', // vibrant neon coral
      '#23f0c7', '#ff8cc6', '#8447ff', '#fffd82', '#3083dc' // vibrant neonish
    ];
    return vibrants[Math.floor(Math.random() * vibrants.length)];
  }
  
  if (type === 'neon') {
    const neons = [
      '#cfff04', '#d9ff36', '#e2ff68', // neon yellow
      '#ff54d5', '#ff8de3', // neon pink
      '#009fff', '#00c5ff', '#00dfff', '#00ffdf', '#7dfffc', // neon blues
      '#e9ff42', '#75ffb0', '#4dffff', '#ff66cc', '#33ffcc', // other neons
      '#00aaff', '#aa00ff', '#ff00aa', '#ffaa00', '#aaff00', // neon candy pop
      '#ff71ce', '#d871ff', '#71ffec', '#b7ff71', '#fbff71', // neon night sky
      '#9afdff', '#ff38cd', '#ff7cd5', '#ffb8d2', '#ffdbdf', // neon roses
      '#d9ffb0', '#9bffcc', '#00ffcb', '#00d9ff', '#0096ff' // too neon
    ];
    return neons[Math.floor(Math.random() * neons.length)];
  }
  
  return '#fef08a';
}

// Rich Text Mini-Toolbar Component
function RichTextToolbar() {
  const exec = (cmd: string) => {
    document.execCommand(cmd, false);
  };
  return (
    <div className="rich-toolbar" onPointerDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
      <button onClick={() => exec('bold')} title="Negrito (Ctrl+B)"><b>B</b></button>
      <button onClick={() => exec('italic')} title="Itálico (Ctrl+I)"><i>I</i></button>
      <button onClick={() => exec('underline')} title="Sublinhado (Ctrl+U)"><u>U</u></button>
      <button onClick={() => exec('strikeThrough')} title="Tachado"><s>S</s></button>
      <div className="w-[1px] h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
      <button onClick={() => exec('justifyLeft')} title="Alinhar à Esquerda"><AlignLeft size={14} /></button>
      <button onClick={() => exec('justifyCenter')} title="Centralizar"><AlignCenter size={14} /></button>
    </div>
  );
}


