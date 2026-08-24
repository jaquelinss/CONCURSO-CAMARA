import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit2, Archive, Trash2, Search, FileText } from 'lucide-react';
import DOMPurify from 'dompurify';
import NoteEditor from './NoteEditor';

export default function PostItsView() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArchived, setFilterArchived] = useState(false);
  const [editingNote, setEditingNote] = useState<any | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'notes'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setNotes(data);
    });
    return () => unsubscribe();
  }, [user]);

  const filteredNotes = notes
    .filter(n => !n.isFlashcard) // Only standard post-its, not flip cards
    .filter(n => !!n.isArchived === filterArchived)
    .filter(n => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (n.title?.toLowerCase().includes(search) || n.content?.toLowerCase().includes(search) || n.subjectTag?.toLowerCase().includes(search));
    })
    .sort((a, b) => {
      // Sort by newest first
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateB - dateA;
    });

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
    await updateDoc(doc(db, 'users', user.uid, 'notes', noteId), {
      isArchived: !currentStatus
    });
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
      color: '#fef08a', // Default yellow
      x: window.innerWidth / 2 - 100,
      y: window.innerHeight / 2 - 100,
      zIndex: 100,
      createdAt: new Date(), // Local temp until server syncs
      isArchived: false,
    };
    const docRef = await addDoc(collection(db, 'users', user.uid, 'notes'), newNote);
    setEditingNote({ id: docRef.id, ...newNote });
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-100">
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
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setFilterArchived(!filterArchived)}
            className={`flex-1 sm:flex-none px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors border ${filterArchived ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            <Archive className="w-4 h-4" /> {filterArchived ? 'Ver Ativos' : 'Ver Arquivados'}
          </button>
          <button 
            onClick={createNote}
            className="flex-1 sm:flex-none px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-10">
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
                className="rounded-lg shadow-sm border border-black/5 overflow-hidden flex flex-col transform transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                style={{ backgroundColor: note.color || '#fef08a' }}
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
                      title={note.isArchived ? "Desarquivar" : "Arquivar"}
                    >
                      <Archive className="w-3 h-3" />
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
                
                <div 
                  className="p-2 text-xs overflow-hidden flex-1 relative max-h-32"
                  style={{ color: textColor }}
                >
                  <div 
                    className="prose prose-sm prose-p:my-0 prose-ul:my-0 line-clamp-6"
                    style={{ color: 'inherit' }}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.content || '') }} 
                  />
                  {/* Visual gradient to show more text */}
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t pointer-events-none" 
                    style={{ 
                      backgroundImage: `linear-gradient(to top, ${note.color || '#fef08a'} 0%, transparent 100%)` 
                    }}
                  />
                </div>
                
                <div className="px-2 py-1.5 border-t border-black/5 flex justify-between items-center">
                   {note.noteNumber && (
                     <span className="text-[9px] font-bold opacity-50 flex-1" style={{ color: textColor }}>
                       #{note.noteNumber}
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

      {editingNote && (
        <NoteEditor 
          note={editingNote} 
          onClose={() => setEditingNote(null)} 
        />
      )}
    </div>
  );
}
