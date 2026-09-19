import { useEffect, useState, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Search, Layers, Play, Trash2, Clock, ChevronLeft, ChevronRight, Repeat, StickyNote, Eye, EyeOff, Edit2 , Maximize, Minimize} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DOMPurify from 'dompurify';
import FlashcardStudy from './FlashcardStudy';
import NoteEditor from './NoteEditor';

export default function FlashcardsView({ isSplitMode }: { isSplitMode?: boolean }) {
  const { user } = useAuth();
  const [decks, setDecks] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStudyDeck, setActiveStudyDeck] = useState<any | null>(null);
  const [cascadeIndex, setCascadeIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [editingNote, setEditingNote] = useState<any | null>(null);
  const [fullscreenNote, setFullscreenNote] = useState<any | null>(null);
  const [isFlippedFS, setIsFlippedFS] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Load flashcard decks (AI-generated)
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'flashcards'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setDecks(data);
    });
    return () => unsubscribe();
  }, [user]);

  // Load post-it flashcards (notes with isFlashcard: true)
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'notes'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setNotes(data);
    });
    return () => unsubscribe();
  }, [user]);

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

  const postItFlashcards = useMemo(() => {
    return notes
      .filter(n => n.isFlashcard && !n.isArchived)
      .sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
  }, [notes]);

  const filteredDecks = decks.filter(deck => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      deck.subject?.toLowerCase().includes(search) || 
      deck.topic?.toLowerCase().includes(search) ||
      deck.customTitle?.toLowerCase().includes(search)
    );
  });

  const filteredPostItFlashcards = useMemo(() => {
    if (!searchTerm) return postItFlashcards;
    const search = searchTerm.toLowerCase();
    return postItFlashcards.filter(n => 
      n.title?.toLowerCase().includes(search) || 
      n.content?.toLowerCase().includes(search) ||
      n.subjectTag?.toLowerCase().includes(search)
    );
  }, [postItFlashcards, searchTerm]);

  useEffect(() => { setCascadeIndex(0); setIsFlipped(false); }, [searchTerm]);

  const deleteDeck = async (id: string) => {
    if (!user) return;
    if (window.confirm('Deseja realmente excluir este deck?')) {
      await deleteDoc(doc(db, 'users', user.uid, 'flashcards', id));
    }
  };

  const toggleArchive = async (noteId: string) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid, 'notes', noteId), { isArchived: true });
    // Adjust cascade index if needed
    if (cascadeIndex >= filteredPostItFlashcards.length - 1 && cascadeIndex > 0) {
      setCascadeIndex(prev => prev - 1);
    }
  };

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

  return (
    <div className={`space-y-4 h-full flex flex-col ${isSplitMode ? "split" : ""}`}>
      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar flashcards..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Post-it Flashcards Section */}
      {filteredPostItFlashcards.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/40 border-b border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-indigo-900">Flashcards Post-it</h3>
              <span className="text-[10px] font-medium text-indigo-500 bg-indigo-100 dark:bg-indigo-900 px-1.5 py-0.5 rounded-full">
                {filteredPostItFlashcards.length}
              </span>
            </div>
            <span className="text-xs text-indigo-400 font-medium">
              {Math.min(cascadeIndex + 1, filteredPostItFlashcards.length)} / {filteredPostItFlashcards.length}
            </span>
          </div>

          {/* Carousel Card */}
          <div className="p-4">
            {(() => {
              const note = filteredPostItFlashcards[Math.min(cascadeIndex, filteredPostItFlashcards.length - 1)];
              if (!note) return null;
              const baseColor = note.color || '#fef08a';
              const backColor = darkenColor(baseColor, 30);
              const frontTextColor = getContrastColor(baseColor);
              const backTextColor = getContrastColor(backColor);

              return (
                <div 
                  className="w-full max-w-md mx-auto perspective-1000 cursor-pointer"
                  style={{ minHeight: '220px' }}
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <div 
                    className="relative w-full transition-transform duration-500 preserve-3d"
                    style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)', minHeight: '220px' }}
                  >
                    {/* Frente */}
                    <div 
                      className="absolute inset-0 backface-hidden rounded-xl shadow-md flex flex-col overflow-hidden"
                      style={{ backgroundColor: baseColor, color: frontTextColor }}
                    >
                      <div 
                        className="px-3 py-2 flex justify-between items-center"
                        style={{ backgroundColor: darkenColor(baseColor, 20) }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-xs font-bold truncate">
                          {note.noteNumber && `#${note.noteNumber} · `}{note.title || 'Flashcard'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => toggleArchive(note.id)} 
                            className="p-1 hover:bg-black/10 rounded"
                            title={note.isArchived ? "Mostrar no painel principal" : "Ocultar do painel principal"}
                          >
                            {note.isArchived ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <button 
                              onClick={(e) => { e.stopPropagation(); setFullscreenNote(note); setIsFlippedFS(false); }} 
                              className="p-1 hover:bg-black/10 rounded"
                              title="Tela Cheia"
                            >
                              <Maximize className="w-3 h-3" />
                            </button>
                            <button 
                            onClick={() => setEditingNote(note)}
                            className="p-1 hover:bg-black/10 rounded"
                            title="Editar"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 flex items-center justify-center p-5 overflow-y-auto">
                        <div className="text-xs font-bold text-indigo-400 absolute top-12 left-3">FRENTE</div>
                        <div 
                          className="prose prose-sm text-center font-bold"
                          style={{ color: 'inherit' }}
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.content || 'Frente do flashcard') }} 
                        />
                      </div>
                    </div>

                    {/* Verso */}
                    <div 
                      className="absolute inset-0 backface-hidden rounded-xl shadow-md flex flex-col overflow-hidden"
                      style={{ backgroundColor: backColor, color: backTextColor, transform: 'rotateY(180deg)' }}
                    >
                      <div 
                        className="px-3 py-2 flex justify-between items-center"
                        style={{ backgroundColor: darkenColor(backColor, 20) }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-xs font-bold">VERSO</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center p-5 overflow-y-auto">
                        <div 
                          className="prose prose-sm text-center font-bold"
                          style={{ color: 'inherit' }}
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.backContent || 'Verso do flashcard') }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Navigation */}
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => { if (cascadeIndex > 0) { setCascadeIndex(prev => prev - 1); setIsFlipped(false); } }}
                disabled={cascadeIndex === 0}
                className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-xl text-sm font-bold hover:bg-indigo-100 dark:bg-indigo-900 transition-colors"
              >
                <Repeat className="w-4 h-4" />
                Virar
              </button>
              <button
                onClick={() => { if (cascadeIndex < filteredPostItFlashcards.length - 1) { setCascadeIndex(prev => prev + 1); setIsFlipped(false); } }}
                disabled={cascadeIndex >= filteredPostItFlashcards.length - 1}
                className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Decks Section */}
      {(filteredPostItFlashcards.length > 0 || filteredDecks.length > 0) && (
        <div className="flex items-center gap-2 px-1">
          <Layers className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400">Decks de Estudo</h3>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
        {filteredDecks.length === 0 ? (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400">
            <Layers className="w-12 h-12 mb-3 text-gray-300" />
            <p>Nenhum deck de estudo encontrado.</p>
          </div>
        ) : (
          filteredDecks.map(deck => (
            <div key={deck.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <div className="p-4 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded text-xs font-semibold">
                    {deck.subject}
                  </span>
                  {deck.createdAt && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(deck.createdAt.toDate(), "dd 'de' MMM", { locale: ptBR })}
                    </span>
                  )}
                </div>
                
                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-1 line-clamp-2">
                  {deck.customTitle || deck.topic}
                </h3>
                
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{deck.data?.length || 0} cartas</span>
                </div>
              </div>
              
              <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-2 flex justify-between items-center gap-2">
                <button 
                  onClick={() => deleteDeck(deck.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setActiveStudyDeck(deck)}
                  className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Play className="w-4 h-4" /> Estudar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      
      {fullscreenNote && (
        <div 
          className="fixed top-[52px] left-0 right-0 bottom-0 z-[15] bg-gray-100/90 dark:bg-gray-900/90 backdrop-blur-sm p-4 flex flex-col items-center justify-center overflow-hidden animate-in fade-in"
          onClick={() => setFullscreenNote(null)}
            onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchStartX === null || !fullscreenNote) return;
              const touchEndX = e.changedTouches[0].clientX;
              const diff = touchStartX - touchEndX;
              const currentIndex = filteredPostItFlashcards.findIndex(n => n.id === fullscreenNote.id);
              if (currentIndex === -1) return;
              
              if (Math.abs(diff) > 50) {
                e.stopPropagation();
                if (diff > 0 && currentIndex < filteredPostItFlashcards.length - 1) {
                  setFullscreenNote(filteredPostItFlashcards[currentIndex + 1]);
                  setIsFlippedFS(false);
                } else if (diff < 0 && currentIndex > 0) {
                  setFullscreenNote(filteredPostItFlashcards[currentIndex - 1]);
                  setIsFlippedFS(false);
                }
              }
              setTouchStartX(null);
            }}
        >
           {filteredPostItFlashcards.findIndex(n => n.id === fullscreenNote.id) > 0 && (
             <button 
               onClick={(e) => { e.stopPropagation(); setFullscreenNote(filteredPostItFlashcards[filteredPostItFlashcards.findIndex(n => n.id === fullscreenNote.id) - 1]); setIsFlippedFS(false); }}
               className="hidden md:flex absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-20 p-2 md:p-3 bg-black/20 hover:bg-black/40 dark:bg-black/60 dark:hover:bg-black/80 rounded-full text-white shadow-md transition-colors backdrop-blur-sm"
             >
               <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
             </button>
           )}

           <div 
             className="w-full h-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 perspective-1000"
           >
             <div 
               className="w-full h-full relative preserve-3d transition-transform duration-500"
               style={{ transform: isFlippedFS ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
               onClick={(e) => { e.stopPropagation(); setIsFlippedFS(!isFlippedFS); }}
             >
               {/* FRENTE */}
               <div 
                 className="absolute inset-0 backface-hidden flex flex-col overflow-hidden rounded-2xl"
                 style={{ backgroundColor: fullscreenNote.color || '#fef08a' }}
               >
                 <div 
                   className="px-4 py-3 flex justify-between items-center"
                   style={{ backgroundColor: darkenColor(fullscreenNote.color || '#fef08a', 20), color: getContrastColor(fullscreenNote.color || '#fef08a') }}
                   onClick={(e) => e.stopPropagation()}
                 >
                   <span className="font-bold text-lg truncate pr-2">
                     {fullscreenNote.title || 'Frente'}
                   </span>
                   <button 
                     onClick={() => setFullscreenNote(null)}
                     className="p-2 hover:bg-black/10 rounded-full"
                   >
                     <Minimize className="w-6 h-6" />
                   </button>
                 </div>
                 
                 <div 
                   className="p-4 md:p-6 text-base md:text-lg flex-1 overflow-y-auto flex items-center justify-center"
                   style={{ color: getContrastColor(fullscreenNote.color || '#fef08a') }}
                 >
                   <div 
                     className="prose prose-sm md:prose-base text-center"
                     style={{ color: 'inherit' }}
                     dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fullscreenNote.content || '') }} 
                   />
                 </div>
                 
                 <div className="px-4 py-2 text-center text-xs font-bold opacity-50" style={{ color: getContrastColor(fullscreenNote.color || '#fef08a') }}>
                   Toque para virar
                 </div>
               </div>

               {/* VERSO */}
               <div 
                 className="absolute inset-0 backface-hidden flex flex-col rounded-2xl overflow-hidden bg-indigo-600 text-white"
                 style={{ transform: 'rotateY(180deg)' }}
               >
                 <div 
                   className="px-4 py-3 flex justify-between items-center bg-indigo-700"
                   onClick={(e) => e.stopPropagation()}
                 >
                   <span className="font-bold text-lg truncate pr-2">
                     Verso
                   </span>
                   <button 
                     onClick={() => setFullscreenNote(null)}
                     className="p-2 hover:bg-white/20 rounded-full"
                   >
                     <Minimize className="w-6 h-6" />
                   </button>
                 </div>
                 
                 <div 
                   className="p-4 md:p-6 text-base md:text-lg flex-1 overflow-y-auto flex items-center justify-center"
                 >
                   <div 
                     className="prose prose-sm md:prose-base prose-invert text-center"
                     dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fullscreenNote.backContent || '') }} 
                   />
                 </div>
                 
                 <div className="px-4 py-2 text-center text-xs font-bold opacity-50 text-white">
                   Toque para voltar
                 </div>
               </div>
             </div>
           </div>

           {filteredPostItFlashcards.findIndex(n => n.id === fullscreenNote.id) !== -1 && filteredPostItFlashcards.findIndex(n => n.id === fullscreenNote.id) < filteredPostItFlashcards.length - 1 && (
             <button 
               onClick={(e) => { e.stopPropagation(); setFullscreenNote(filteredPostItFlashcards[filteredPostItFlashcards.findIndex(n => n.id === fullscreenNote.id) + 1]); setIsFlippedFS(false); }}
               className="hidden md:flex absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-20 p-2 md:p-3 bg-black/20 hover:bg-black/40 dark:bg-black/60 dark:hover:bg-black/80 rounded-full text-white shadow-md transition-colors backdrop-blur-sm"
             >
               <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
             </button>
           )}
        </div>
      )}
  
      {activeStudyDeck && (
        <FlashcardStudy 
          deck={activeStudyDeck} 
          onClose={() => setActiveStudyDeck(null)} 
        />
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





