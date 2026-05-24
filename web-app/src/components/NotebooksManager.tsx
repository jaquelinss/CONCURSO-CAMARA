import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { Notebook } from '../types/notebook';
import { X, Plus, Book, Trash2 } from 'lucide-react';

interface NotebooksManagerProps {
  onClose: () => void;
  onSelectNotebook: (notebook: Notebook) => void;
}

const COVER_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b', '#1e293b'];
const PATTERNS = ['solid', 'polka-dots', 'stripes', 'grid', 'stars'] as const;

export default function NotebooksManager({ onClose, onSelectNotebook }: NotebooksManagerProps) {
  const { user } = useAuth();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // New Notebook Form
  const [newName, setNewName] = useState('Meu Caderno');
  const [newColor, setNewColor] = useState(COVER_COLORS[0]);
  const [newPattern, setNewPattern] = useState<Notebook['coverPattern']>('solid');

  useEffect(() => {
    if (!user) return;
    loadNotebooks();
  }, [user]);

  const loadNotebooks = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'users', user.uid, 'notebooks'), orderBy('updatedAt', 'desc'));
      const snap = await getDocs(q);
      const loaded: Notebook[] = [];
      snap.forEach(d => loaded.push({ id: d.id, ...d.data() } as Notebook));
      setNotebooks(loaded);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!user) return;
    setIsCreating(false);
    const newNb: Omit<Notebook, 'id'> = {
      name: newName,
      coverColor: newColor,
      coverPattern: newPattern,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      totalPages: 1
    };
    try {
      const docRef = await addDoc(collection(db, 'users', user.uid, 'notebooks'), newNb);
      const created: Notebook = { id: docRef.id, ...newNb };
      setNotebooks([created, ...notebooks]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user) return;
    if (!window.confirm('Tem certeza que deseja excluir este caderno? Tudo será perdido.')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'notebooks', id));
      setNotebooks(notebooks.filter(n => n.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const renderCover = (color: string, pattern: string) => {
    let bgStyle: React.CSSProperties = { backgroundColor: color };
    
    // CSS Patterns
    if (pattern === 'polka-dots') {
      bgStyle.backgroundImage = `radial-gradient(rgba(255,255,255,0.3) 2px, transparent 2px)`;
      bgStyle.backgroundSize = '16px 16px';
    } else if (pattern === 'stripes') {
      bgStyle.backgroundImage = `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)`;
    } else if (pattern === 'grid') {
      bgStyle.backgroundImage = `linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)`;
      bgStyle.backgroundSize = '20px 20px';
    }

    return (
      <div 
        className="w-full h-32 rounded-lg shadow-inner relative overflow-hidden flex items-center justify-center border border-black/10"
        style={bgStyle}
      >
        <div className="absolute left-2 top-0 bottom-0 w-3 bg-black/10 border-r border-black/5" />
        {pattern === 'stars' && <span className="text-3xl opacity-50">✨</span>}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2">
            <Book className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Meus Cadernos</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {isCreating ? (
            <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
              <h3 className="text-lg font-bold mb-4">Criar Novo Caderno</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome do Caderno</label>
                  <input 
                    type="text" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cor da Capa</label>
                  <div className="flex gap-2 flex-wrap">
                    {COVER_COLORS.map(c => (
                      <button 
                        key={c}
                        onClick={() => setNewColor(c)}
                        className={`w-8 h-8 rounded-full border-2 ${newColor === c ? 'border-indigo-500 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-2">Estampa</label>
                  <div className="grid grid-cols-5 gap-4">
                    {PATTERNS.map(p => (
                      <button 
                        key={p}
                        onClick={() => setNewPattern(p)}
                        className={`rounded-lg overflow-hidden border-2 transition-transform hover:scale-105 ${newPattern === p ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-transparent'}`}
                      >
                        {renderCover(newColor, p)}
                        <div className="text-center text-xs py-1 text-gray-500 capitalize">{p.replace('-', ' ')}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">Cancelar</button>
                <button onClick={handleCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Criar Caderno</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {/* Create Button */}
              <button 
                onClick={() => setIsCreating(true)}
                className="group flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all h-48"
              >
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-500 group-hover:text-indigo-600 group-hover:bg-indigo-100 mb-3">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="font-medium text-gray-600 dark:text-gray-400 group-hover:text-indigo-600">Novo Caderno</span>
              </button>

              {/* Notebooks List */}
              {loading ? (
                <div className="col-span-full py-12 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : (
                notebooks.map(nb => (
                  <div 
                    key={nb.id} 
                    className="group cursor-pointer flex flex-col transition-transform hover:-translate-y-1"
                    onClick={() => onSelectNotebook(nb)}
                  >
                    <div className="relative">
                      {renderCover(nb.coverColor, nb.coverPattern)}
                      {/* Delete Button (visible on hover) */}
                      <button 
                        onClick={(e) => handleDelete(e, nb.id)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-3 text-center">
                      <h4 className="font-bold text-gray-800 dark:text-white truncate" title={nb.name}>{nb.name}</h4>
                      <span className="text-xs text-gray-500">{new Date(nb.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
