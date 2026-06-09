import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { X, BookOpen, CheckCircle, Brain, ArrowRight, Search, Check, PlusCircle } from 'lucide-react';

interface LinkContentModalProps {
  user: any;
  revision: any;
  type: 'lesson' | 'quiz' | 'flashcard';
  onClose: () => void;
  onLinked: () => void;
}

export default function LinkContentModal({ user, revision, type, onClose, onLinked }: LinkContentModalProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllSubjects, setShowAllSubjects] = useState(false);

  const typeLabels: Record<string, { label: string, collection: string, icon: any, color: string, plural: string }> = {
    lesson: { label: 'Aula Explicativa', collection: 'lessons', icon: <BookOpen className="w-5 h-5" />, color: 'blue', plural: 'aulas' },
    quiz: { label: 'Quiz / Questões', collection: 'quizzes', icon: <CheckCircle className="w-5 h-5" />, color: 'green', plural: 'quizzes' },
    flashcard: { label: 'Flashcards', collection: 'flashcards', icon: <Brain className="w-5 h-5" />, color: 'indigo', plural: 'flashcards' },
  };

  const config = typeLabels[type];

  // Chave para o array de IDs no contentLinks
  const linkKey = `${type}Ids`;

  useEffect(() => {
    const fetchItems = async () => {
      if (!user) return;
      try {
        const ref = collection(db, 'users', user.uid, config.collection);
        const q = query(ref, orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const allItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Mantém todos os itens no state, filtraremos no render
        setItems(allItems);

        // Pré-selecionar os que já estão vinculados
        const existingIds = revision.contentLinks?.[linkKey] || [];
        // Compatibilidade: também checa o formato antigo (singular)
        const oldId = revision.contentLinks?.[`${type}Id`];
        const allExisting = new Set<string>([...existingIds, ...(oldId ? [oldId] : [])]);
        setSelectedIds(allExisting);
      } catch (error) {
        console.error("Erro ao buscar itens:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [user, revision.subject, config.collection]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    setLinking(true);
    try {
      const revisionRef = doc(db, 'users', user.uid, 'revisions', revision.id);
      
      const updatedLinks = { ...revision.contentLinks };
      updatedLinks[linkKey] = Array.from(selectedIds);
      // Limpa o formato antigo singular se existir
      delete updatedLinks[`${type}Id`];

      await setDoc(revisionRef, {
        contentLinks: updatedLinks,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      onLinked();
    } catch (error) {
      console.error("Erro ao vincular conteúdo:", error);
      alert("Erro ao vincular. Tente novamente.");
    } finally {
      setLinking(false);
    }
  };

  const filteredItems = items.filter(item => {
    if (!showAllSubjects && item.subject !== revision.subject) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const title = type === 'lesson' 
      ? (item.data?.titulo || `${item.subject} - ${item.topic}`)
      : `${item.subject} - ${item.topic}`;
    const comment = item.userComment || '';
    return title.toLowerCase().includes(term) || comment.toLowerCase().includes(term) || (item.topic || '').toLowerCase().includes(term);
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
              {config.icon}
              Vincular {config.label}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Revisão de <strong>{revision.subject}</strong> — {revision.topic}
          </p>
          {type !== 'lesson' && (
            <p className="text-xs text-indigo-500 mt-2 font-semibold">
              💡 Você pode selecionar vários {config.plural} para esta revisão
            </p>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Search className="w-14 h-14 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">
                Nenhum(a) {config.label.toLowerCase()} encontrado(a)
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-xs mx-auto">
                Você ainda não tem {config.label.toLowerCase()} salvo(a). 
                Vá na tela inicial, gere e salve, depois volte aqui para vincular.
              </p>
              <Link 
                to="/dashboard"
                state={{
                  subject: revision.subject,
                  topic: revision.topic,
                  model: type === 'lesson' ? 'Aula Explicativa' : type === 'flashcard' ? 'Flashcards' : 'Quiz (Múltipla Escolha)'
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg"
              >
                Ir para Gerar Conteúdo
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">
                {filteredItems.length} item(ns) disponível(eis) · {selectedIds.size} selecionado(s)
              </p>
              <div className="flex flex-col gap-3 mb-4">
                <Link 
                  to="/dashboard"
                  state={{
                    subject: revision.subject,
                    topic: revision.topic,
                    model: type === 'lesson' ? 'Aula Explicativa' : type === 'flashcard' ? 'Flashcards' : 'Quiz (Múltipla Escolha)'
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors border border-indigo-200 dark:border-indigo-800"
                >
                  <PlusCircle className="w-4 h-4" />
                  Gerar Novo(a) {config.label}
                </Link>

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome, tópico ou comentário..."
                  className="w-full text-sm p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />

                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer w-max">
                  <input 
                    type="checkbox" 
                    checked={showAllSubjects} 
                    onChange={(e) => setShowAllSubjects(e.target.checked)} 
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Mostrar de outras matérias também
                </label>
              </div>
              {filteredItems.map(item => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleSelect(item.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all group ${
                      isSelected 
                        ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200' 
                        : 'border-gray-100 dark:border-gray-800 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-gray-100">
                          {type === 'lesson' 
                            ? (item.data?.titulo || `${item.subject} - ${item.topic}`)
                            : `${item.subject} - ${item.topic}`
                          }
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {type === 'lesson' 
                            ? `Nível: ${item.lessonLevel || 'N/A'}`
                            : `${item.data?.length || 0} ${type === 'quiz' ? 'questões' : 'flashcards'}`
                          }
                          {' · '}
                          Salvo em: {item.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                        </p>
                        {item.userComment && (
                          <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1 italic flex items-center gap-1">
                            💬 {item.userComment}
                          </p>
                        )}
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                      }`}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer com botão de confirmar */}
        {items.length > 0 && (
          <div className="p-4 border-t bg-gray-50 dark:bg-gray-900">
            <button
              onClick={handleConfirm}
              disabled={linking}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {linking ? 'Vinculando...' : `Confirmar (${selectedIds.size} selecionado${selectedIds.size !== 1 ? 's' : ''})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
