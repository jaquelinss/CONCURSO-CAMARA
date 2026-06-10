import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { X, Check, Plus, Folder, ListPlus } from 'lucide-react';

interface AddToListModalProps {
  question: any;
  subject: string;
  topic: string;
  onClose: () => void;
}

export default function AddToListModal({ question, subject, topic, onClose }: AddToListModalProps) {
  const { user } = useAuth();
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newListName, setNewListName] = useState('');
  
  // Transform native question to hybrid format
  const hybridQuestion = {
    ...question,
    pergunta: question.statement,
    opcoes: question.options,
    correta: question.options[question.correctAnswer],
    explicacao: question.explanation
  };

  useEffect(() => {
    const fetchLists = async () => {
      if (!user) return;
      try {
        const listsRef = collection(db, 'users', user.uid, 'quizzes');
        const q = query(listsRef, where('model', '==', 'Lista Personalizada'));
        const snap = await getDocs(q);
        setLists(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Erro ao buscar listas", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLists();
  }, [user]);

  const handleCreateAndAdd = async () => {
    if (!user || !newListName.trim()) return;
    setSaving(true);
    try {
      const quizzesRef = collection(db, 'users', user.uid, 'quizzes');
      const newList = {
        subject: subject || 'Geral',
        topic: newListName.trim(),
        customTitle: newListName.trim(),
        difficulty: question.difficulty || 'Misto',
        model: 'Lista Personalizada',
        data: [hybridQuestion],
        userComment: '',
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(quizzesRef, newList);
      setLists([{ id: docRef.id, ...newList }, ...lists]);
      setCreating(false);
      setNewListName('');
      alert('Lista criada e questão adicionada!');
    } catch (err) {
      console.error(err);
      alert('Erro ao criar lista.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddToList = async (listId: string, currentData: any[]) => {
    if (!user) return;
    setSaving(true);
    try {
      const isAlreadyInList = currentData.some((q: any) => q.id === question.id);
      if (isAlreadyInList) {
        alert('Esta questão já está nesta lista.');
        setSaving(false);
        return;
      }
      
      const listRef = doc(db, 'users', user.uid, 'quizzes', listId);
      await updateDoc(listRef, {
        data: arrayUnion(hybridQuestion)
      });
      
      setLists(lists.map(l => l.id === listId ? { ...l, data: [...l.data, hybridQuestion] } : l));
      alert('Questão adicionada à lista!');
    } catch (err) {
      console.error(err);
      alert('Erro ao adicionar à lista.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
          <X className="w-5 h-5" />
        </button>
        
        <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <ListPlus className="w-6 h-6 text-indigo-500" />
          Adicionar à Lista
        </h3>
        
        <div className="mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 truncate border-l-2 border-indigo-500 pl-3">
            {question.statement.substring(0, 100)}...
          </p>
        </div>

        {creating ? (
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl mb-4 border border-indigo-200 dark:border-indigo-800">
            <h4 className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-200">Criar Nova Lista</h4>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Nome da lista (ex: Revisão de Crase)"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateAndAdd();
                if (e.key === 'Escape') setCreating(false);
              }}
            />
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setCreating(false)} 
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreateAndAdd} 
                disabled={saving || !newListName.trim()} 
                className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1"
              >
                {saving ? 'Criando...' : <><Check className="w-3.5 h-3.5"/> Criar e Adicionar</>}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full mb-4 px-4 py-3 rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nova Lista
          </button>
        )}

        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
            <p className="text-center text-sm text-gray-500 py-4">Buscando listas...</p>
          ) : lists.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-4">Você ainda não tem listas personalizadas.</p>
          ) : (
            lists.map(list => {
              const isInList = list.data.some((q: any) => q.id === question.id);
              return (
                <div key={list.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-750 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Folder className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                    <div className="truncate">
                      <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">{list.customTitle || list.topic}</p>
                      <p className="text-xs text-gray-500">{list.data.length} questões</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddToList(list.id, list.data)}
                    disabled={saving || isInList}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${
                      isInList 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-800/60'
                    } disabled:opacity-70`}
                  >
                    {isInList ? 'Adicionada' : 'Adicionar'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
