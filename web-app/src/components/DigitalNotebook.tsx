import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Draggable from 'react-draggable';
import { useAuth } from '../contexts/AuthContext';
import { useReward } from '../contexts/RewardContext';
import { db } from '../lib/firebase';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, Timestamp
} from 'firebase/firestore';
import {
  X, Minus, Maximize2, Plus, Search, Tag, Trash2, Pin, PinOff,
  Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2,
  Pipette, PlusCircle, StickyNote, ChevronDown, FileText, NotebookPen,
  Eraser, Palette, Highlighter
} from 'lucide-react';

// ─── Color system (same as StickyNotesManager) ────────────────────
const COLORS = [
  '#fef08a', // amarelo
  '#fbcfe8', // rosa
  '#bfdbfe', // azul
  '#bbf7d0', // verde
  '#e9d5ff', // roxo
];

function getRandomHexColor(type: 'pastel' | 'vibrant' | 'neon'): string {
  if (type === 'pastel') {
    const pastels = [
      '#fdfbf7','#fff1e6','#fde2e4','#fad2e1','#e2ece9','#dfe7fd','#cddafd',
      '#bee1e6','#f0efeb','#ccd5ae','#e9edc9','#fefae0','#faedcd','#d6ccc2',
      '#f5ebe0','#edede9','#d5c6e0','#aac4ff','#b8c0ff','#bbd0ff',
    ];
    return pastels[Math.floor(Math.random() * pastels.length)];
  }
  if (type === 'vibrant') {
    const vibrants = [
      '#ef65a3','#ffad64','#fee63b','#d2de40','#37d2d8',
      '#fb923c','#f472b6','#38bdf8','#4ade80','#fbbf24',
      '#ff7eb9','#ff65a3','#7afcff','#feff9c','#fff740',
    ];
    return vibrants[Math.floor(Math.random() * vibrants.length)];
  }
  const neons = [
    '#cfff04','#d9ff36','#e2ff68','#ff54d5','#ff8de3',
    '#009fff','#00c5ff','#00dfff','#00ffdf','#7dfffc',
    '#e9ff42','#75ffb0','#4dffff','#ff66cc','#33ffcc',
  ];
  return neons[Math.floor(Math.random() * neons.length)];
}

// ─── Background patterns (CSS) ────────────────────────────────────
const BACKGROUNDS: Record<string, { label: string; style: React.CSSProperties }> = {
  plain: { label: '⬜ Branco', style: {} },
  lined: {
    label: '═══ Linhas',
    style: {
      backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #d1d5db 27px, #d1d5db 28px)',
      backgroundSize: '100% 28px',
    },
  },
  dotted: {
    label: '··· Pontos',
    style: {
      backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
      backgroundSize: '20px 20px',
    },
  },
};

// ─── Types ─────────────────────────────────────────────────────────
interface DigitalNote {
  id: string;
  title: string;
  content: string;
  background: 'plain' | 'lined' | 'dotted';
  color: string;
  tags: string[];
  linkedPostIts: number[];
  stickers: Array<{ id: string; stickerId: string; x: number; y: number }>;
  isPinned: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

// ─── Component ─────────────────────────────────────────────────────
export default function DigitalNotebook() {
  const { user } = useAuth();
  const { activeStamper, setActiveStamper, markStickerAsUsed } = useReward();

  // Overlay state
  const [active, setActive] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [windowSize, setWindowSize] = useState(() => {
    try { const s = localStorage.getItem('dn_size'); return s ? JSON.parse(s) : { w: 900, h: 620 }; }
    catch { return { w: 900, h: 620 }; }
  });
  const [windowPos, setWindowPos] = useState(() => {
    try { const p = localStorage.getItem('dn_pos'); return p ? JSON.parse(p) : { x: 80, y: 80 }; }
    catch { return { x: 80, y: 80 }; }
  });

  // Notes data
  const [notes, setNotes] = useState<DigitalNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Editor state
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [showPostItLinker, setShowPostItLinker] = useState(false);
  const [postItNumber, setPostItNumber] = useState('');
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const [showSidebarTags, setShowSidebarTags] = useState(true);
  const [highlightModeColor, setHighlightModeColor] = useState('#fef08a');
  const [showHighlighterColors, setShowHighlighterColors] = useState(false);
  const [savedColors, setSavedColors] = useState<string[]>(() => {
    try { const s = localStorage.getItem('dn_saved_colors'); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });
  
  const [activeSpan, setActiveSpan] = useState<HTMLElement | null>(null);
  const [spanOptionsPos, setSpanOptionsPos] = useState<{ x: number, y: number } | null>(null);
  const [showSpanColors, setShowSpanColors] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nodeRef = useRef<HTMLDivElement>(null!);
  const resizeRef = useRef<HTMLDivElement>(null);

  const selectedNote = useMemo(() => notes.find(n => n.id === selectedNoteId) || null, [notes, selectedNoteId]);

  // ─── Listen for toggle event ───────────────────────────────────
  useEffect(() => {
    console.log('[DigitalNotebook] mounted, listening for toggle-digital-notebook');
    const handleToggle = () => {
      console.log('[DigitalNotebook] toggle event received!');
      setActive(prev => !prev);
    };
    window.addEventListener('toggle-digital-notebook', handleToggle);
    return () => window.removeEventListener('toggle-digital-notebook', handleToggle);
  }, []);

  // ─── Escape to close ──────────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active]);

  // ─── Toggle body class for highlighter mode ────────────────────
  useEffect(() => {
    if (active && isHighlightMode) {
      document.body.classList.add('digital-notebook-highlighter-active');
    } else {
      document.body.classList.remove('digital-notebook-highlighter-active');
    }
    return () => document.body.classList.remove('digital-notebook-highlighter-active');
  }, [active, isHighlightMode]);

  // ─── Firestore real-time sync ──────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'digitalNotes'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const loaded: DigitalNote[] = snap.docs.map(d => ({
        id: d.id,
        title: d.data().title || '',
        content: d.data().content || '',
        background: d.data().background || 'plain',
        color: d.data().color || '#fef08a',
        tags: d.data().tags || [],
        linkedPostIts: d.data().linkedPostIts || [],
        stickers: d.data().stickers || [],
        isPinned: d.data().isPinned || false,
        createdAt: d.data().createdAt,
        updatedAt: d.data().updatedAt,
      }));
      setNotes(loaded);
    });
    return () => unsub();
  }, [user]);

  // ─── Save window position/size ─────────────────────────────────
  useEffect(() => { localStorage.setItem('dn_pos', JSON.stringify(windowPos)); }, [windowPos]);
  useEffect(() => { localStorage.setItem('dn_size', JSON.stringify(windowSize)); }, [windowSize]);

  // ─── Resize handler ────────────────────────────────────────────
  useEffect(() => {
    if (!active || isMinimized) return;
    const el = resizeRef.current;
    if (!el) return;
    let startX = 0, startY = 0, startW = 0, startH = 0;
    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      startX = e.clientX; startY = e.clientY;
      startW = windowSize.w; startH = windowSize.h;
      const onMouseMove = (ev: MouseEvent) => {
        setWindowSize({ w: Math.max(480, startW + ev.clientX - startX), h: Math.max(400, startH + ev.clientY - startY) });
      };
      const onMouseUp = () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };
    el.addEventListener('mousedown', onMouseDown);
    return () => el.removeEventListener('mousedown', onMouseDown);
  }, [active, isMinimized, windowSize]);

  // ─── Auto-save with debounce ───────────────────────────────────
  const saveNote = useCallback((noteId: string, updates: Partial<DigitalNote>) => {
    if (!user) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await updateDoc(doc(db, 'users', user.uid, 'digitalNotes', noteId), {
          ...updates,
          updatedAt: serverTimestamp(),
        });
      } catch (e) { console.error('Erro ao salvar nota:', e); }
    }, 800);
  }, [user]);

  // ─── Create note ───────────────────────────────────────────────
  const createNote = async () => {
    if (!user) return;
    const ref = await addDoc(collection(db, 'users', user.uid, 'digitalNotes'), {
      title: 'Nova Anotação',
      content: '',
      background: 'plain',
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      tags: activeTag ? [activeTag] : [],
      linkedPostIts: [],
      stickers: [],
      isPinned: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setSelectedNoteId(ref.id);
    setTimeout(() => titleRef.current?.focus(), 100);
  };

  // ─── Delete note ───────────────────────────────────────────────
  const deleteNote = async (noteId: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'digitalNotes', noteId));
    if (selectedNoteId === noteId) setSelectedNoteId(null);
  };

  // ─── Exec command (rich text) ──────────────────────────────────
  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    if (selectedNote) {
      saveNote(selectedNote.id, { content: editorRef.current?.innerHTML || '' });
    }
  };

  // ─── Update note field ────────────────────────────────────────
  const updateField = (field: string, value: any) => {
    if (!selectedNote) return;
    setNotes(prev => prev.map(n => n.id === selectedNote.id ? { ...n, [field]: value } : n));
    saveNote(selectedNote.id, { [field]: value });
  };

  // ─── Tag management ────────────────────────────────────────────
  const addTag = () => {
    if (!selectedNote || !newTag.trim()) return;
    const updated = [...new Set([...selectedNote.tags, newTag.trim()])];
    updateField('tags', updated);
    setNewTag('');
    setShowTagInput(false);
  };

  const removeTag = (tag: string) => {
    if (!selectedNote) return;
    updateField('tags', selectedNote.tags.filter(t => t !== tag));
  };

  // ─── Link post-it ─────────────────────────────────────────────
  const linkPostIt = () => {
    if (!selectedNote || !postItNumber.trim()) return;
    const num = parseInt(postItNumber.trim());
    if (isNaN(num)) return;
    const updated = [...new Set([...selectedNote.linkedPostIts, num])];
    updateField('linkedPostIts', updated);
    setPostItNumber('');
    setShowPostItLinker(false);
  };

  const unlinkPostIt = (num: number) => {
    if (!selectedNote) return;
    updateField('linkedPostIts', selectedNote.linkedPostIts.filter(n => n !== num));
  };

  const openPostIt = (num: number) => {
    window.dispatchEvent(new CustomEvent('open-postit', { detail: num }));
  };
  // ─── Span Highlight Handlers ─────────────────────────────────────
  const handleEditorClick = (e: React.MouseEvent) => {
    let spanNode: HTMLElement | null = null;
    const target = e.target as HTMLElement;
    const selection = window.getSelection();

    if (selection && selection.toString().length > 0) {
      // Se o usuário selecionou texto, verifica se a seleção está totalmente
      // dentro de um span já marcado (highlighted)
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const commonAncestor = range.commonAncestorContainer;
        const ancestorElement = commonAncestor.nodeType === Node.TEXT_NODE 
          ? commonAncestor.parentElement 
          : (commonAncestor as HTMLElement);
        spanNode = ancestorElement?.closest('span') || null;
      }
      // Se a seleção não estiver dentro de um span marcado, apenas ignoramos (comportamento normal de seleção)
      if (!spanNode || !spanNode.style.backgroundColor) {
        return;
      }
    } else {
      spanNode = target.closest('span');
    }
    
    if (spanNode && spanNode.style.backgroundColor) {
      const rect = spanNode.getBoundingClientRect();
      setSpanOptionsPos({ x: rect.left + rect.width / 2, y: rect.bottom + 10 });
      setActiveSpan(spanNode);
      setShowSpanColors(false);
    } else {
      setSpanOptionsPos(null);
      setActiveSpan(null);
    }
  };

  useEffect(() => {
    if (!spanOptionsPos) return;
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const spanNode = target.closest('span');
      // Se clicou no próprio menu (popover) ou se clicou em uma marcação (span),
      // não fechamos o menu aqui (o clique no span já é tratado por handleEditorClick).
      if (target.closest('.dn-span-popover') || (spanNode && spanNode.style.backgroundColor)) {
        return;
      }
      setSpanOptionsPos(null);
      setActiveSpan(null);
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, [spanOptionsPos]);

  const changeSpanColor = (colorHex: string) => {
    if (activeSpan && selectedNote) {
      activeSpan.style.backgroundColor = colorHex;
      saveNote(selectedNote.id, { content: editorRef.current?.innerHTML || '' });
    }
    setSpanOptionsPos(null);
    setActiveSpan(null);
  };

  const removeSpanHighlight = () => {
    if (activeSpan && selectedNote) {
      const parent = activeSpan.parentNode;
      while (activeSpan.firstChild) {
        parent?.insertBefore(activeSpan.firstChild, activeSpan);
      }
      parent?.removeChild(activeSpan);
      saveNote(selectedNote.id, { content: editorRef.current?.innerHTML || '' });
    }
    setSpanOptionsPos(null);
    setActiveSpan(null);
  };
  // ─── Eyedropper ────────────────────────────────────────────────
  const handleEyedropper = async () => {
    try {
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      if (result?.sRGBHex) updateField('color', result.sRGBHex);
    } catch { /* user cancelled */ }
  };

  const handleSaveCustomColor = (color: string) => {
    if (!savedColors.includes(color)) {
      const updated = [...savedColors, color].slice(-10);
      setSavedColors(updated);
      localStorage.setItem('dn_saved_colors', JSON.stringify(updated));
    }
  };

  // ─── Sticker drop handler ─────────────────────────────────────
  useEffect(() => {
    if (!active || !activeStamper || !selectedNote) return;
    const handleClick = (e: MouseEvent) => {
      const container = editorRef.current?.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
      const sticker = {
        id: Date.now().toString(),
        stickerId: activeStamper.stickerId,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      const updated = [...selectedNote.stickers, sticker];
      updateField('stickers', updated);
      markStickerAsUsed(activeStamper.instanceId, 'digital-notebook');
      setActiveStamper(null);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [active, activeStamper, selectedNote, markStickerAsUsed, setActiveStamper, updateField]);

  // ─── Computed values ───────────────────────────────────────────
  const allTags = useMemo(() => {
    const tagMap: Record<string, number> = {};
    notes.forEach(n => n.tags.forEach(t => { tagMap[t] = (tagMap[t] || 0) + 1; }));
    return Object.entries(tagMap).sort((a, b) => b[1] - a[1]);
  }, [notes]);

  const filteredNotes = useMemo(() => {
    let list = notes;
    if (activeTag) list = list.filter(n => n.tags.includes(activeTag));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  }, [notes, activeTag, searchQuery]);

  // ─── Sync editor content when selecting a note ─────────────────
  useEffect(() => {
    if (editorRef.current && selectedNote) {
      if (editorRef.current.innerHTML !== selectedNote.content) {
        editorRef.current.innerHTML = selectedNote.content;
      }
    }
  }, [selectedNoteId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) return null;

  // ─── RENDER ────────────────────────────────────────────────────
  const overlay = (
    <Draggable
      nodeRef={nodeRef}
      handle=".dn-drag-handle"
      position={windowPos}
      onStop={(_e, data) => setWindowPos({ x: data.x, y: data.y })}
      cancel="input,button,.dn-editor,[contenteditable]"
    >
      <div
        ref={nodeRef}
        className="fixed z-[9997] flex flex-col rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900"
        style={{ top: 0, left: 0, width: isMinimized ? 320 : windowSize.w, height: isMinimized ? 52 : windowSize.h }}
      >
        {isHighlightMode && (
          <style>{`
            .dn-editor::selection {
              background-color: ${highlightModeColor} !important;
              color: inherit !important;
            }
          `}</style>
        )}
        {/* ─── Header ────────────────────────────────────── */}
        <div className="dn-drag-handle flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white cursor-move select-none flex-shrink-0">
          <div className="flex items-center gap-2">
            <NotebookPen className="w-4 h-4" />
            <span className="font-semibold text-sm tracking-wide">Caderno de Anotações</span>
            <span className="text-[10px] opacity-70 ml-1">({notes.length} {notes.length === 1 ? 'nota' : 'notas'})</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 hover:bg-white/20 rounded" title={isMinimized ? 'Restaurar' : 'Minimizar'}>
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => setActive(false)} className="p-1 hover:bg-white/20 rounded" title="Fechar (Esc)">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <div className="flex flex-1 min-h-0">

            {/* ─── Sidebar ─────────────────────────────── */}
            {sidebarOpen && (
              <div className="w-56 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-col">
                {/* Search */}
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar notas..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-7 pr-2 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-rose-400 focus:border-rose-400 outline-none text-gray-800 dark:text-gray-200"
                    />
                  </div>
                </div>

                {/* New note button */}
                <button
                  onClick={createNote}
                  className="mx-2 mt-2 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Nova Anotação
                </button>

                {/* Tags */}
                <div className="px-2 pt-3 pb-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Tags</p>
                    <button 
                      onClick={() => setShowSidebarTags(!showSidebarTags)} 
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5 rounded"
                      title={showSidebarTags ? "Esconder Tags" : "Mostrar Tags"}
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSidebarTags ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  {showSidebarTags && (
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => setActiveTag(null)}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${!activeTag ? 'bg-rose-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                      >
                        Todas
                      </button>
                      {allTags.map(([tag, count]) => (
                        <button
                          key={tag}
                          onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${activeTag === tag ? 'bg-rose-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                        >
                          {tag} ({count})
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes list */}
                <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
                  {filteredNotes.map(note => (
                    <button
                      key={note.id}
                      onClick={() => setSelectedNoteId(note.id)}
                      className={`w-full text-left p-2 rounded-lg transition-all text-xs group ${
                        selectedNoteId === note.id
                          ? 'bg-rose-100 dark:bg-rose-900/30 ring-1 ring-rose-300'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {note.isPinned && <Pin className="w-3 h-3 text-rose-500 flex-shrink-0" />}
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0 border border-black/10"
                          style={{ backgroundColor: note.color }}
                        />
                        <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
                          {note.title || 'Sem título'}
                        </span>
                      </div>
                      {note.tags.length > 0 && (
                        <div className="flex gap-0.5 mt-1 ml-[18px]">
                          {note.tags.slice(0, 3).map(t => (
                            <span key={t} className="text-[9px] px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded-full text-gray-500 dark:text-gray-400">{t}</span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                  {filteredNotes.length === 0 && (
                    <p className="text-[10px] text-gray-400 text-center py-4">
                      {searchQuery || activeTag ? 'Nenhuma nota encontrada.' : 'Nenhuma anotação ainda.'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ─── Main content ──────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Sidebar toggle */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="absolute left-0 top-14 z-10 p-1 bg-gray-200 dark:bg-gray-700 rounded-r-md text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title={sidebarOpen ? 'Esconder sidebar' : 'Mostrar sidebar'}
                style={{ left: sidebarOpen ? '224px' : '0' }}
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${sidebarOpen ? '-rotate-90' : 'rotate-90'}`} />
              </button>

              {selectedNote ? (
                <>
                  {/* Title */}
                  <div className="px-4 pt-3 pb-1 flex items-center gap-2 flex-shrink-0">
                    <input
                      ref={titleRef}
                      type="text"
                      value={selectedNote.title}
                      onChange={e => {
                        const val = e.target.value;
                        setNotes(prev => prev.map(n => n.id === selectedNote.id ? { ...n, title: val } : n));
                        saveNote(selectedNote.id, { title: val });
                      }}
                      className="flex-1 text-lg font-bold bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
                      placeholder="Título da anotação..."
                    />
                    <button
                      onClick={() => updateField('isPinned', !selectedNote.isPinned)}
                      className={`p-1.5 rounded-lg transition-colors ${selectedNote.isPinned ? 'text-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      title={selectedNote.isPinned ? 'Desafixar' : 'Fixar no topo'}
                    >
                      {selectedNote.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => { if (window.confirm('Excluir esta anotação?')) deleteNote(selectedNote.id); }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Excluir nota"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Tags bar */}
                  <div className="px-4 pb-2 flex items-center gap-1 flex-wrap flex-shrink-0">
                    {selectedNote.tags.map(t => (
                      <span key={t} className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 rounded-full">
                        <Tag className="w-2.5 h-2.5" />{t}
                        <button onClick={() => removeTag(t)} className="hover:text-red-500 ml-0.5">&times;</button>
                      </span>
                    ))}
                    {showTagInput ? (
                      <form onSubmit={e => { e.preventDefault(); addTag(); }} className="inline-flex items-center gap-1">
                        <input
                          autoFocus
                          value={newTag}
                          onChange={e => setNewTag(e.target.value)}
                          onBlur={() => { if (!newTag.trim()) setShowTagInput(false); }}
                          placeholder="Nova tag..."
                          className="text-[10px] px-2 py-0.5 w-24 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full outline-none focus:ring-1 focus:ring-rose-400 text-gray-700 dark:text-gray-200"
                        />
                      </form>
                    ) : (
                      <button onClick={() => setShowTagInput(true)} className="text-[10px] px-2 py-0.5 border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 rounded-full hover:border-rose-400 hover:text-rose-400 transition-colors">
                        + tag
                      </button>
                    )}
                  </div>

                  {/* Toolbar */}
                  <div className="px-4 pb-2 flex items-center gap-1 flex-wrap border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <button onClick={() => exec('bold')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300" title="Negrito"><Bold className="w-4 h-4" /></button>
                    <button onClick={() => exec('italic')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300" title="Itálico"><Italic className="w-4 h-4" /></button>
                    <button onClick={() => exec('underline')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300" title="Sublinhado"><Underline className="w-4 h-4" /></button>
                    <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />
                    <button onClick={() => exec('insertUnorderedList')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300" title="Lista"><List className="w-4 h-4" /></button>
                    <button onClick={() => exec('insertOrderedList')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300" title="Lista numerada"><ListOrdered className="w-4 h-4" /></button>
                    <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />
                    <button onClick={() => exec('formatBlock', 'h1')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300" title="Título H1"><Heading1 className="w-4 h-4" /></button>
                    <button onClick={() => exec('formatBlock', 'h2')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300" title="Título H2"><Heading2 className="w-4 h-4" /></button>
                    <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />

                    <div className="relative">
                      <button onClick={() => exec('foreColor', '#ef4444')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Cor do texto (vermelho)">
                        <span className="w-4 h-4 flex items-center justify-center text-xs font-bold text-red-500">A</span>
                      </button>
                    </div>
                    <div className="relative flex items-center bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                      <button 
                        onClick={() => {
                          const selection = window.getSelection();
                          if (selection && selection.toString().length > 0) {
                            exec('hiliteColor', highlightModeColor);
                          } else {
                            setIsHighlightMode(!isHighlightMode);
                            setShowHighlighterColors(false);
                          }
                        }} 
                        className={`p-1.5 rounded-l-lg transition-colors ${isHighlightMode ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`} 
                        title={isHighlightMode ? "Desativar Marca-texto Contínuo" : "Marca-texto - Clique sem selecionar texto para modo contínuo"}
                      >
                        <Highlighter className="w-4 h-4" style={{ color: isHighlightMode ? highlightModeColor : 'inherit' }} />
                      </button>
                      <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
                      <button
                        onClick={() => setShowHighlighterColors(!showHighlighterColors)}
                        className={`px-1 py-1.5 rounded-r-lg transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ${showHighlighterColors ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                      >
                        <ChevronDown className={`w-3 h-3 transition-transform ${showHighlighterColors ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {showHighlighterColors && (
                        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-2 z-50 flex gap-1.5">
                          {COLORS.map(c => (
                            <button
                              key={c}
                              onClick={() => {
                                setHighlightModeColor(c);
                                setIsHighlightMode(true);
                                setShowHighlighterColors(false);
                                const selection = window.getSelection();
                                if (selection && selection.toString().length > 0) {
                                  exec('hiliteColor', c);
                                }
                              }}
                              className={`w-5 h-5 rounded-full shadow-inner border hover:scale-110 transition-transform ${highlightModeColor === c ? 'border-gray-800 border-2' : 'border-black/10'}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => exec('removeFormat')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 text-[10px] font-bold" title="Limpar formatação">
                      T̸
                    </button>

                    <div className="flex-1" />

                    {/* Post-it linker */}
                    <div className="relative">
                      <button
                        onClick={() => setShowPostItLinker(!showPostItLinker)}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-yellow-500"
                        title="Linkar Post-it"
                      >
                        <StickyNote className="w-4 h-4" />
                      </button>
                      {showPostItLinker && (
                        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 z-50 w-48">
                          <p className="text-[10px] font-semibold text-gray-500 mb-1.5">Nº do Post-it:</p>
                          <form onSubmit={e => { e.preventDefault(); linkPostIt(); }} className="flex gap-1">
                            <input
                              autoFocus
                              type="number"
                              value={postItNumber}
                              onChange={e => setPostItNumber(e.target.value)}
                              placeholder="#"
                              className="flex-1 text-xs px-2 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-1 focus:ring-yellow-400 text-gray-800 dark:text-gray-200"
                            />
                            <button type="submit" className="px-2 py-1 text-xs bg-yellow-400 text-yellow-900 font-semibold rounded-lg hover:bg-yellow-500">OK</button>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Editor area */}
                  <div
                    className="flex-1 overflow-y-auto relative"
                    style={{ backgroundColor: selectedNote.color + '40' }}
                  >
                    {/* Linked Post-its */}
                    {selectedNote.linkedPostIts.length > 0 && (
                      <div className="px-4 pt-2 flex items-center gap-1 flex-wrap">
                        {selectedNote.linkedPostIts.map(num => (
                          <span
                            key={num}
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full cursor-pointer hover:bg-yellow-200 transition-colors group"
                          >
                            <button onClick={() => openPostIt(num)} className="flex items-center gap-0.5">
                              <StickyNote className="w-2.5 h-2.5" />Post-it #{num}
                            </button>
                            <button onClick={() => unlinkPostIt(num)} className="opacity-0 group-hover:opacity-100 hover:text-red-500 ml-0.5">&times;</button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Stickers placed on note */}
                    {selectedNote.stickers.map(s => (
                      <img
                        key={s.id}
                        src={`/stickers/${s.stickerId}.png`}
                        alt="sticker"
                        className="absolute w-12 h-12 pointer-events-none"
                        style={{ left: s.x, top: s.y }}
                      />
                    ))}

                    <div
                      ref={editorRef}
                      contentEditable
                      suppressContentEditableWarning
                      className="dn-editor min-h-full p-4 outline-none text-sm text-gray-800 dark:text-gray-100 leading-relaxed"
                      style={{
                        ...(BACKGROUNDS[selectedNote.background]?.style || {}),
                        cursor: isHighlightMode 
                          ? 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'black\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><path d=\'M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z\'></path><line x1=\'16\' y1=\'8\' x2=\'2\' y2=\'22\'></line><line x1=\'17.5\' y1=\'15\' x2=\'9\' y2=\'15\'></line></svg>") 0 24, text' 
                          : 'text'
                      }}
                      onMouseUp={() => {
                        if (isHighlightMode) {
                          const selection = window.getSelection();
                          if (selection && selection.toString().length > 0) {
                            exec('hiliteColor', highlightModeColor);
                          }
                        }
                      }}
                      onClick={handleEditorClick}
                      onInput={() => {
                        if (selectedNote && editorRef.current) {
                          saveNote(selectedNote.id, { content: editorRef.current.innerHTML });
                        }
                      }}
                    />
                  </div>

                  {/* Footer bar */}
                  <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50">
                    {/* Background picker */}
                    <div className="relative">
                      <button onClick={() => { setShowBgPicker(!showBgPicker); setShowColorPicker(false); }} className="text-[10px] px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 font-medium">
                        {BACKGROUNDS[selectedNote.background]?.label || 'Fundo'}
                      </button>
                      {showBgPicker && (
                        <div className="absolute bottom-full mb-1 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-2 z-50 flex gap-1">
                          {Object.entries(BACKGROUNDS).map(([key, { label }]) => (
                            <button
                              key={key}
                              onClick={() => { updateField('background', key); setShowBgPicker(false); }}
                              className={`text-[10px] px-2.5 py-1.5 rounded-lg font-medium transition-colors ${selectedNote.background === key ? 'bg-rose-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Color picker */}
                    <div className="relative">
                      <button
                        onClick={() => { setShowColorPicker(!showColorPicker); setShowBgPicker(false); }}
                        className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
                      >
                        <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: selectedNote.color }} />
                        Cor
                      </button>
                      {showColorPicker && (
                        <div className="absolute bottom-full mb-1 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 z-50 w-56 space-y-2">
                          {/* Preset colors */}
                          <div className="flex gap-1.5 justify-center">
                            {COLORS.map(c => (
                              <button
                                key={c}
                                onClick={() => { updateField('color', c); setShowColorPicker(false); }}
                                className={`w-7 h-7 rounded-full shadow-inner border-2 transition-transform hover:scale-110 ${selectedNote.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                          {/* Saved colors */}
                          {savedColors.length > 0 && (
                            <div className="flex gap-1 justify-center flex-wrap pt-1 border-t border-gray-200 dark:border-gray-700">
                              {savedColors.map(c => (
                                <button
                                  key={c}
                                  onClick={() => { updateField('color', c); setShowColorPicker(false); }}
                                  className={`w-5 h-5 rounded-full shadow-inner border border-black/20 hover:scale-110 transition-transform ${selectedNote.color === c ? 'ring-2 ring-rose-500' : ''}`}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                          )}
                          {/* Eyedropper + custom */}
                          <div className="flex gap-1 justify-center pt-1 border-t border-gray-200 dark:border-gray-700">
                            <button onClick={handleEyedropper} className="w-7 h-7 rounded-full shadow-sm border border-gray-300 bg-gray-50 flex items-center justify-center hover:bg-gray-200" title="Conta-gotas">
                              <Pipette className="w-3.5 h-3.5 text-gray-700" />
                            </button>
                            <label className="w-7 h-7 rounded-full shadow-inner border-2 border-transparent bg-gradient-to-tr from-red-500 via-green-500 to-blue-500 cursor-pointer flex items-center justify-center" title="Cor personalizada">
                              <input type="color" value={selectedNote.color} onChange={e => updateField('color', e.target.value)} onBlur={e => handleSaveCustomColor(e.target.value)} className="opacity-0 absolute w-0 h-0" />
                              <PlusCircle className="w-4 h-4 text-white drop-shadow-md" />
                            </label>
                          </div>
                          {/* Random generators */}
                          <div className="flex gap-1 justify-center pt-1 border-t border-gray-200 dark:border-gray-700">
                            <button onClick={() => { updateField('color', getRandomHexColor('pastel')); }} className="text-[10px] font-bold px-2 py-1 rounded shadow-sm border border-gray-200 bg-[#fdfbf7] hover:bg-white text-gray-600">Pastel</button>
                            <button onClick={() => { updateField('color', getRandomHexColor('vibrant')); }} className="px-3 py-1 text-[10px] font-bold rounded text-white shadow-sm hover:opacity-90" style={{ background: 'linear-gradient(135deg, #ff4081 0%, #ff9100 100%)' }}>Vibrante</button>
                            <button onClick={() => { updateField('color', getRandomHexColor('neon')); }} className="px-3 py-1 text-[10px] font-black rounded text-[#ccff00] bg-slate-900 shadow-sm border border-slate-700" style={{ textShadow: '0 0 5px #ccff00, 0 0 10px #ccff00' }}>Neon</button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex-1" />

                    <span className="text-[10px] text-gray-400 italic">Salvo automaticamente ✓</span>
                  </div>
                </>
              ) : (
                /* No note selected */
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-3">
                  <FileText className="w-12 h-12 opacity-30" />
                  <p className="text-sm">Selecione ou crie uma anotação</p>
                  <button onClick={createNote} className="px-4 py-2 text-xs font-semibold bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Nova Anotação
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Span Options Popover */}
        {spanOptionsPos && (
          <div 
            className="dn-span-popover fixed z-[10000] transform -translate-x-1/2 flex gap-2 animate-fade-in shadow-xl"
            style={{ left: spanOptionsPos.x, top: spanOptionsPos.y }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {!showSpanColors ? (
              <>
                <button
                  onClick={() => setShowSpanColors(true)}
                  className="flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-1.5 px-3 rounded-full border border-gray-200 dark:border-gray-600 transition-all text-xs"
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Mudar Cor</span>
                </button>
                <button
                  onClick={removeSpanHighlight}
                  className="flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-bold py-1.5 px-3 rounded-full border border-gray-200 dark:border-gray-600 transition-all text-xs"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Desmarcar</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 p-1.5 rounded-full border border-gray-200 dark:border-gray-600">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => changeSpanColor(c)}
                    className="w-5 h-5 rounded-full shadow-inner border border-black/10 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                  />
                ))}
                <button 
                  onClick={() => setShowSpanColors(false)}
                  className="ml-1 text-[10px] px-1 text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 font-medium"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Resize handle */}
        {!isMinimized && (
          <div
            ref={resizeRef}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-10"
            style={{ background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.15) 50%)' }}
          />
        )}
      </div>
    </Draggable>
  );

  return createPortal(overlay, document.body);
}
