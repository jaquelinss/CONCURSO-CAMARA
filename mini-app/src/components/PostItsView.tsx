import { useEffect, useState, useMemo } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit2,  Trash2, Search, FileText, Eye, EyeOff, ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import DOMPurify from 'dompurify';
import NoteEditor from './NoteEditor';

export default function PostItsView({ isSplitMode }: { isSplitMode?: boolean }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingNote, setEditingNote] = useState<any | null>(null);
  const [isCascadeMode, setIsCascadeMode] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string>('__all__');
  const [selectedSubTag, setSelectedSubTag] = useState<string>('__all__');
  const [showTagsFilter, setShowTagsFilter] = useState(() => localStorage.getItem('mini-showTagsFilter') !== 'false');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [cascadeIndex, setCascadeIndex] = useState(0);

  useEffect(() => { setCascadeIndex(0); }, [selectedTag, selectedSubTag, searchTerm, sortOrder]);
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'notes'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setNotes(data);
    });

    const settingsRef = doc(db, 'users', user.uid, 'settings', 'stickyNotes');
    const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.isCascadeMode !== undefined) setIsCascadeMode(data.isCascadeMode);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeSettings();
    };
  }, [user]);

  // Build tags hierarchy from all notes
  const tagsHierarchy = useMemo(() => {
    const hierarchy: Record<string, Set<string>> = {};
    notes.forEach(n => {
      if (n.subjectTag) {
        if (!hierarchy[n.subjectTag]) hierarchy[n.subjectTag] = new Set();
        if (n.subTag) hierarchy[n.subjectTag].add(n.subTag);
      }
    });
    return hierarchy;
  }, [notes]);

  const allTags = useMemo(() => Object.keys(tagsHierarchy).sort((a, b) => a.localeCompare(b, 'pt-BR')), [tagsHierarchy]);

  const postItNotes = useMemo(() => notes.filter(n => !n.isFlashcard), [notes]);

  const filteredNotes = useMemo(() => {
    return postItNotes
      
      .filter(n => {
        if (selectedTag === '__all__') return true;
        if (selectedTag === '__no_tag__') return !n.subjectTag;
        return n.subjectTag === selectedTag;
      })
      .filter(n => {
        if (selectedSubTag === '__all__') return true;
        return n.subTag === selectedSubTag;
      })
      .filter(n => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (n.title?.toLowerCase().includes(search) || n.content?.toLowerCase().includes(search) || n.subjectTag?.toLowerCase().includes(search));
      })
      .sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
      });
  }, [postItNotes, selectedTag, selectedSubTag, searchTerm, sortOrder]);

  const getContrastColor = (hexColor: string) => {
    if (!hexColor) return '#1f2937';
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 140) ? '#1f2937' : '#ffffff';
  };

  const darkenColor = (hexColor: string, amount: number = 40) => {
    if (!hexColor) return '#e5e7eb';
    let hex = hexColor.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    const r = Math.max(0, parseInt(hex.substring(0, 2), 16) - amount);
    const g = Math.max(0, parseInt(hex.substring(2, 4), 16) - amount);
    const b = Math.max(0, parseInt(hex.substring(4, 6), 16) - amount);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const toggleArchive = async (noteId: string, currentStatus: boolean) => {
    if (!user) return;
    if (currentStatus) {
      if (!window.confirm('Desarquivar este post-it também vai abri-lo na tela do app principal. Continuar?')) return;
    }
    await updateDoc(doc(db, 'users', user.uid, 'notes', noteId), { isArchived: !currentStatus });
  };

  const toggleCascadeMode = async () => {
    if (!user) return;
    const newMode = !isCascadeMode;
    setIsCascadeMode(newMode);
    try {
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'users', user.uid, 'settings', 'stickyNotes'), { isCascadeMode: newMode }, { merge: true });
    } catch (e) {
      console.error(e);
      setIsCascadeMode(!newMode);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!user) return;
    if (window.confirm("Deseja realmente excluir este post-it permanentemente?")) {
      await deleteDoc(doc(db, 'users', user.uid, 'notes', noteId));
    }
  };

  const createNote = async () => {
    if (!user) return;
    const newNote = {
      content: 'Nova anotação...',
      title: 'Novo Post-it',
      color: '#fef08a',
      x: window.innerWidth / 2 - 100,
      y: window.innerHeight / 2 - 100,
      zIndex: 100,
      createdAt: new Date(),
      isArchived: false,
    };
    const docRef = await addDoc(collection(db, 'users', user.uid, 'notes'), newNote);
    setEditingNote({ id: docRef.id, ...newNote });
  };

  // Batch actions
  const handleShowRecent = async () => {
    if (!user) return;
    const archived = postItNotes
      .filter(n => n.isArchived)
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      .slice(0, 3);
    if (archived.length === 0) { alert('Nenhum post-it arquivado para reabrir.'); return; }
    if (!window.confirm(`Reabrir os ${archived.length} últimos post-its? Isso também vai mostrá-los no app principal.`)) return;
    for (const n of archived) {
      await updateDoc(doc(db, 'users', user.uid, 'notes', n.id), { isArchived: false, isMinimized: false });
    }
  };

  

  

  const handleToggleTagsFilter = () => {
    const next = !showTagsFilter;
    setShowTagsFilter(next);
    localStorage.setItem('mini-showTagsFilter', String(next));
  };

  return (
    <div className={`space-y-3 h-full flex flex-col ${isSplitMode ? "split" : ""}`}>
      {/* Search + Actions Bar */}
      <div className="flex flex-col gap-2 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar post-its..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-1.5 w-full sm:w-auto flex-wrap">
            <button 
              onClick={toggleCascadeMode}
              className={`flex-1 sm:flex-none px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors border ${isCascadeMode ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}
            >
              {isCascadeMode ? 'Cascata ✓' : 'Cascata'}
            </button>
            
            <button 
              onClick={createNote}
              className="flex-1 sm:flex-none px-2.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Novo
            </button>
          </div>
        </div>

        {/* Sort + Tags toggle + Batch actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <select 
              value={sortOrder} 
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="appearance-none bg-gray-50 border border-gray-200 rounded-lg text-xs px-2.5 py-1.5 pr-7 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigos</option>
            </select>
            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button 
            onClick={handleToggleTagsFilter}
            className={`p-1.5 rounded-lg transition-colors ${showTagsFilter ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:bg-gray-100'}`}
            title={showTagsFilter ? 'Ocultar tags' : 'Mostrar tags'}
          >
            {showTagsFilter ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          <div className="h-4 w-px bg-gray-200" />

          <button onClick={handleShowRecent} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md transition-colors flex items-center gap-1" title="Reabrir últimos 3 arquivados">
            <RotateCcw className="w-3 h-3" /> Últimos
          </button>
          

          <span className="text-[10px] text-gray-400 ml-auto">{filteredNotes.length} post-its</span>
        </div>

        {/* Tag filter pills */}
        {showTagsFilter && allTags.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => { setSelectedTag('__all__'); setSelectedSubTag('__all__'); }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${selectedTag === '__all__' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Todos
              </button>
              <button
                onClick={() => { setSelectedTag('__no_tag__'); setSelectedSubTag('__all__'); }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${selectedTag === '__no_tag__' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Sem Tags
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => { setSelectedTag(tag); setSelectedSubTag('__all__'); }}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${selectedTag === tag ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* SubTag pills */}
            {selectedTag !== '__all__' && selectedTag !== '__no_tag__' && tagsHierarchy[selectedTag]?.size > 0 && (
              <div className="flex flex-wrap gap-1 pl-2 border-l-2 border-indigo-200">
                <button
                  onClick={() => setSelectedSubTag('__all__')}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-colors ${selectedSubTag === '__all__' ? 'bg-indigo-400 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                >
                  Todos
                </button>
                {Array.from(tagsHierarchy[selectedTag]).sort().map(sub => (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubTag(sub)}
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-colors ${selectedSubTag === sub ? 'bg-indigo-400 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content View */}
      {isCascadeMode && filteredNotes.length > 0 ? (
        /* Cascade Carousel View */
        <div className="flex-1 flex flex-col items-center justify-center pb-10">
          {/* Counter */}
          <div className="text-xs font-medium text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100 mb-3">
            {Math.min(cascadeIndex + 1, filteredNotes.length)} / {filteredNotes.length}
          </div>

          {/* Card */}
          {(() => {
            const note = filteredNotes[Math.min(cascadeIndex, filteredNotes.length - 1)];
            if (!note) return null;
            const textColor = getContrastColor(note.color || '#fef08a');
            const topBarColor = darkenColor(note.color || '#fef08a', 20);
            return (
              <div 
                className="w-full max-w-md rounded-xl overflow-hidden shadow-lg flex flex-col"
                style={{ backgroundColor: note.color || '#fef08a', minHeight: '280px' }}
              >
                <div 
                  className="px-3 py-2 flex justify-between items-center"
                  style={{ backgroundColor: topBarColor, color: textColor }}
                >
                  <span className="text-xs font-bold truncate pr-2">
                    {note.noteNumber && `#${note.noteNumber} · `}{note.title || (note.subjectTag ? note.subjectTag : 'Nota')}
                  </span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => toggleArchive(note.id, note.isArchived)} 
                      className="p-1 hover:bg-black/10 rounded"
                      title={note.isArchived ? "Mostrar no painel principal" : "Ocultar do painel principal"}
                    >
                      {note.isArchived ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button 
                      onClick={() => setEditingNote(note)}
                      className="p-1 hover:bg-black/10 rounded"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {(note.subjectTag || note.subTag) && (
                  <div className="px-3 pt-2 flex flex-wrap gap-1">
                    {note.subjectTag && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-black/10" style={{ color: textColor }}>
                        {note.subjectTag}
                      </span>
                    )}
                    {note.subTag && (
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-black/5" style={{ color: textColor }}>
                        {note.subTag}
                      </span>
                    )}
                  </div>
                )}

                <div 
                  className="p-4 flex-1 overflow-y-auto"
                  style={{ color: textColor }}
                >
                  <div 
                    className="prose prose-sm max-w-none"
                    style={{ color: 'inherit' }}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.content || '') }} 
                  />
                </div>
              </div>
            );
          })()}

          {/* Navigation Buttons */}
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={() => { if (cascadeIndex > 0) setCascadeIndex(prev => prev - 1); }}
              disabled={cascadeIndex === 0}
              className="p-3 rounded-full bg-white shadow-sm border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => { if (cascadeIndex < filteredNotes.length - 1) setCascadeIndex(prev => prev + 1); }}
              disabled={cascadeIndex >= filteredNotes.length - 1}
              className="p-3 rounded-full bg-white shadow-sm border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-10">
          {filteredNotes.length === 0 ? (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400">
              <FileText className="w-12 h-12 mb-3 text-gray-300" />
              <p>Nenhum post-it encontrado.</p>
            </div>
          ) : (
            filteredNotes.map(note => {
              const textColor = getContrastColor(note.color || '#fef08a');
              const topBarColor = darkenColor(note.color || '#fef08a', 20);

              return (
                <div 
                  key={note.id} 
                  className="rounded-lg overflow-hidden flex flex-col transform transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                  style={{ backgroundColor: note.color || '#fef08a', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
                  onClick={() => setEditingNote(note)}
                >
                  <div 
                    className="px-2 py-1.5 flex justify-between items-center"
                    style={{ backgroundColor: topBarColor, color: textColor }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[10px] font-bold truncate pr-2">
                      {note.title || (note.subjectTag ? `${note.subjectTag}` : 'Nota')}
                    </span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleArchive(note.id, note.isArchived); }} 
                        className="p-1 hover:bg-black/10 rounded"
                        title={note.isArchived ? "Mostrar no painel principal" : "Ocultar do painel principal"}
                      >
                        {note.isArchived ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }} 
                        className="p-1 hover:bg-black/10 rounded"
                        title="Excluir"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Tags display */}
                  {(note.subjectTag || note.subTag) && (
                    <div className="px-2 pt-1 flex flex-wrap gap-1">
                      {note.subjectTag && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-black/10" style={{ color: textColor }}>
                          {note.subjectTag}
                        </span>
                      )}
                      {note.subTag && (
                        <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-black/5" style={{ color: textColor }}>
                          {note.subTag}
                        </span>
                      )}
                    </div>
                  )}

                  <div 
                    className="p-2 text-xs overflow-hidden flex-1 relative max-h-28"
                    style={{ color: textColor }}
                  >
                    <div 
                      className="prose prose-sm prose-p:my-0 prose-ul:my-0 line-clamp-5"
                      style={{ color: 'inherit' }}
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.content || '') }} 
                    />
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none" 
                      style={{ backgroundImage: `linear-gradient(to top, ${note.color || '#fef08a'} 0%, transparent 100%)` }}
                    />
                  </div>
                  
                  <div className="px-2 py-1 border-t border-black/5 flex justify-between items-center">
                     {note.noteNumber && (
                       <span className="text-[9px] font-bold opacity-50 flex-1" style={{ color: textColor }}>
                         📌 #{note.noteNumber}
                       </span>
                     )}
                     <button 
                       onClick={(e) => { e.stopPropagation(); setEditingNote(note); }}
                       className="ml-auto flex items-center justify-center p-1 rounded-full hover:bg-black/10"
                       style={{ color: textColor }}
                     >
                       <Edit2 className="w-3.5 h-3.5" />
                     </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {editingNote && (
        <NoteEditor 
          note={editingNote} 
          onClose={() => setEditingNote(null)}
          allTags={tagsHierarchy}
        />
      )}
    </div>
  );
}









