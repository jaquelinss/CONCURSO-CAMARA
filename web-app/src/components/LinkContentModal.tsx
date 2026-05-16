import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { X, BookOpen, CheckCircle, Brain, ArrowRight, Search } from 'lucide-react';

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

  const typeLabels: Record<string, { label: string, collection: string, icon: any, color: string }> = {
    lesson: { label: 'Aula Explicativa', collection: 'lessons', icon: <BookOpen className="w-5 h-5" />, color: 'blue' },
    quiz: { label: 'Quiz / Questões', collection: 'quizzes', icon: <CheckCircle className="w-5 h-5" />, color: 'green' },
    flashcard: { label: 'Flashcards', collection: 'flashcards', icon: <Brain className="w-5 h-5" />, color: 'indigo' },
  };

  const config = typeLabels[type];

  useEffect(() => {
    const fetchItems = async () => {
      if (!user) return;
      try {
        const ref = collection(db, 'users', user.uid, config.collection);
        const q = query(ref, orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const allItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Filtrar pelo mesmo subject da revisão
        const filtered = allItems.filter((item: any) => item.subject === revision.subject);
        setItems(filtered);
      } catch (error) {
        console.error("Erro ao buscar itens:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [user, revision.subject, config.collection]);

  const handleLink = async (item: any) => {
    setLinking(true);
    try {
      const revisionRef = doc(db, 'users', user.uid, 'revisions', revision.id);
      await setDoc(revisionRef, {
        contentLinks: {
          ...revision.contentLinks,
          [`${type}Id`]: item.id,
        },
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className={`p-6 border-b bg-${config.color}-50`}>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900">
              {config.icon}
              Vincular {config.label}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Revisão de <strong>{revision.subject}</strong> — {revision.topic}
          </p>
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
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                Nenhum(a) {config.label.toLowerCase()} encontrado(a)
              </h3>
              <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
                Você ainda não tem {config.label.toLowerCase()} salvo(a) para <strong>{revision.subject}</strong>. 
                Vá em <strong>"Gerar Conteúdo"</strong> na tela inicial, gere e salve, depois volte aqui para vincular.
              </p>
              <a 
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg"
              >
                Ir para Gerar Conteúdo
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">
                {items.length} item(ns) disponível(eis) — clique para vincular
              </p>
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleLink(item)}
                  disabled={linking}
                  className={`w-full text-left p-4 rounded-xl border-2 border-gray-100 hover:border-${config.color}-300 hover:bg-${config.color}-50/50 transition-all group disabled:opacity-50`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-gray-900">
                        {type === 'lesson' 
                          ? (item.data?.titulo || `${item.subject} - ${item.topic}`)
                          : `${item.subject} - ${item.topic}`
                        }
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {type === 'lesson' 
                          ? `Nível: ${item.lessonLevel || 'N/A'}`
                          : `${item.data?.length || 0} ${type === 'quiz' ? 'questões' : 'flashcards'}`
                        }
                        {' · '}
                        Salvo em: {item.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                      </p>
                    </div>
                    <ArrowRight className={`w-5 h-5 text-gray-300 group-hover:text-${config.color}-500 transition-colors`} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
