import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Search, Layers, Play, Trash2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function FlashcardsView() {
  const { user } = useAuth();
  const [decks, setDecks] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredDecks = decks.filter(deck => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      deck.subject?.toLowerCase().includes(search) || 
      deck.topic?.toLowerCase().includes(search) ||
      deck.customTitle?.toLowerCase().includes(search)
    );
  });

  const deleteDeck = async (id: string) => {
    if (!user) return;
    if (window.confirm('Deseja realmente excluir este deck?')) {
      await deleteDoc(doc(db, 'users', user.uid, 'flashcards', id));
    }
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
        {filteredDecks.length === 0 ? (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400">
            <Layers className="w-12 h-12 mb-3 text-gray-300" />
            <p>Nenhum flashcard encontrado.</p>
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
                  onClick={() => alert('Modo estudo em breve (FlashcardStudy)')}
                  className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Play className="w-4 h-4" /> Estudar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
