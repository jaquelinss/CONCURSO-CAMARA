import { useEffect, useState, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Search, Layers, Play, Trash2, Clock, ChevronLeft, ChevronRight, Repeat, StickyNote, Archive, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DOMPurify from 'dompurify';
import FlashcardStudy from './FlashcardStudy';
import NoteEditor from './NoteEditor';

export default function FlashcardsView() {
  const { user } = useAuth();
  const [decks, setDecks] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStudyDeck, setActiveStudyDeck] = useState<any | null>(null);
  const [cascadeIndex, setCascadeIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [editingNote, setEditingNote] = useState<any | null>(null);

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
    <div className="space-y-4 h-full flex flex-col">
      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar flashcards..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Post-it Flashcards Section */}
      {filteredPostItFlashcards.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-indigo-900">Flashcards Post-it</h3>
              <span className="text-[10px] font-medium text-indigo-500 bg-indigo-100 px-1.5 py-0.5 rounded-full">
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
                            title="Arquivar"
                          >
                            <Archive className="w-3 h-3" />
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
                className="p-2.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors"
              >
                <Repeat className="w-4 h-4" />
                Virar
              </button>
              <button
                onClick={() => { if (cascadeIndex < filteredPostItFlashcards.length - 1) { setCascadeIndex(prev => prev + 1); setIsFlipped(false); } }}
                disabled={cascadeIndex >= filteredPostItFlashcards.length - 1}
                className="p-2.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-30 transition-colors"
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
          <h3 className="text-sm font-bold text-gray-600">Decks de Estudo</h3>
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
            <div key={deck.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <div className="p-4 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-semibold">
                    {deck.subject}
                  </span>
                  {deck.createdAt && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(deck.createdAt.toDate(), "dd 'de' MMM", { locale: ptBR })}
                    </span>
                  )}
                </div>
                
                <h3 className="font-bold text-gray-800 text-sm mb-1 line-clamp-2">
                  {deck.customTitle || deck.topic}
                </h3>
                
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{deck.data?.length || 0} cartas</span>
                </div>
              </div>
              
              <div className="border-t border-gray-100 bg-gray-50 p-2 flex justify-between items-center gap-2">
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
