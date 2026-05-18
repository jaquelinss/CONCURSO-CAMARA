import { useEffect, useState, useMemo } from 'react';
import Navigation from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getSubjectsByMode, topicsBySubject, themes, defaultTheme } from '../lib/constants';
import { ChevronDown, ChevronUp, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';

interface ChecklistItem {
  id: string;
  topic: string;
  subTopic: string;
  checked: boolean;
  isCustom?: boolean;
}

export default function StudyProgressScreen() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'Geral' | 'ENEM' | 'Concurso'>('Concurso');
  const [subject, setSubject] = useState<string>('');
  
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  
  const [newCustomItem, setNewCustomItem] = useState('');
  const [selectedTopicForCustom, setSelectedTopicForCustom] = useState<string>('');

  const subjects = useMemo(() => getSubjectsByMode(mode), [mode]);
  const theme = useMemo(() => themes[subject] || defaultTheme, [subject]);

  useEffect(() => {
    if (subjects.length > 0 && !subjects.includes(subject)) {
      setSubject(subjects[0]);
    }
  }, [mode, subjects, subject]);

  const fetchProgress = async () => {
    if (!user || !subject) return;
    setLoading(true);
    try {
      const docRef = doc(db, 'users', user.uid, 'studyProgress', subject);
      const docSnap = await getDoc(docRef);
      
      const topicsMap = topicsBySubject[subject] || {};
      const defaultItems: ChecklistItem[] = [];
      
      Object.keys(topicsMap).forEach(topic => {
        const subTopics = topicsMap[topic] as string[];
        subTopics.forEach(subTopic => {
          defaultItems.push({
            id: `${topic}___${subTopic}`,
            topic,
            subTopic,
            checked: false,
          });
        });
      });

      if (docSnap.exists()) {
        const data = docSnap.data();
        const savedItems = data.items as ChecklistItem[] || [];
        
        // Merge saved items with default items (in case constants changed)
        const mergedItems = [...defaultItems];
        savedItems.forEach(savedItem => {
          const index = mergedItems.findIndex(item => item.id === savedItem.id);
          if (index !== -1) {
            mergedItems[index].checked = savedItem.checked;
          } else if (savedItem.isCustom) {
            mergedItems.push(savedItem);
          }
        });
        setItems(mergedItems);
      } else {
        setItems(defaultItems);
      }
      
      // Expand first topic by default
      if (Object.keys(topicsMap).length > 0) {
        setExpandedTopics({ [Object.keys(topicsMap)[0]]: true });
        setSelectedTopicForCustom(Object.keys(topicsMap)[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar progresso:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [user, subject]);

  const saveProgress = async (newItems: ChecklistItem[]) => {
    if (!user || !subject) return;
    try {
      const docRef = doc(db, 'users', user.uid, 'studyProgress', subject);
      await setDoc(docRef, {
        subject,
        mode,
        items: newItems,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Erro ao salvar progresso:", error);
    }
  };

  const toggleItem = (id: string) => {
    const newItems = items.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setItems(newItems);
    saveProgress(newItems);
  };

  const addCustomItem = () => {
    if (!newCustomItem.trim() || !selectedTopicForCustom) return;
    const newItem: ChecklistItem = {
      id: `custom___${Date.now()}`,
      topic: selectedTopicForCustom,
      subTopic: newCustomItem.trim(),
      checked: false,
      isCustom: true,
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    saveProgress(newItems);
    setNewCustomItem('');
  };

  const removeCustomItem = (id: string) => {
    const newItems = items.filter(item => item.id !== id);
    setItems(newItems);
    saveProgress(newItems);
  };

  const toggleTopic = (topic: string) => {
    setExpandedTopics(prev => ({ ...prev, [topic]: !prev[topic] }));
  };

  // Group items by topic
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.topic]) acc[item.topic] = [];
    acc[item.topic].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  const totalItems = items.length;
  const completedItems = items.filter(i => i.checked).length;
  const progressPercentage = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <main className="flex-grow p-4 md:p-8 max-w-4xl mx-auto w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Progresso de Estudos</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Acompanhe sua evolução em cada matéria</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Modo de Estudo</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
                className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="Concurso">Concurso</option>
                <option value="ENEM">ENEM</option>
                <option value="Geral">Geral</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Matéria</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {subjects.map(subj => (
                  <option key={subj} value={subj}>{subj}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-2">
            <div className="flex justify-between items-end mb-2">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Progresso Geral: {subject}</span>
              <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
              <div 
                className={`h-4 rounded-full transition-all duration-1000 ease-out ${theme.button.split(' ')[0] || 'bg-indigo-600'}`}
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-right">
              {completedItems} de {totalItems} tópicos concluídos
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : Object.keys(groupedItems).length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">Nenhum tópico mapeado para esta matéria ainda.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedItems).map(([topic, topicItems]) => {
              const topicCompleted = topicItems.filter(i => i.checked).length;
              const topicTotal = topicItems.length;
              const topicProgress = topicTotal === 0 ? 0 : Math.round((topicCompleted / topicTotal) * 100);
              const isExpanded = expandedTopics[topic];

              return (
                <div key={topic} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-200">
                  <button 
                    onClick={() => toggleTopic(topic)}
                    className={`w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${isExpanded ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}
                  >
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 text-left">{topic}</h3>
                        {topicProgress === 100 && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${topicProgress === 100 ? 'bg-green-500' : theme.button.split(' ')[0] || 'bg-indigo-600'}`}
                            style={{ width: `${topicProgress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-8">{topicProgress}%</span>
                      </div>
                    </div>
                    <div className="text-gray-400">
                      {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="p-4 bg-gray-50/50 dark:bg-gray-800/50">
                      <div className="space-y-2">
                        {topicItems.map(item => (
                          <div 
                            key={item.id} 
                            onClick={() => toggleItem(item.id)}
                            className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              item.checked 
                                ? 'border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-900/10' 
                                : 'border-transparent hover:border-gray-200 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <button 
                                className={`flex-shrink-0 transition-colors ${item.checked ? 'text-green-500' : 'text-gray-300 dark:text-gray-500 hover:text-indigo-400'}`}
                              >
                                {item.checked ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                              </button>
                              <span className={`text-base ${item.checked ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-700 dark:text-gray-200'}`}>
                                {item.subTopic}
                              </span>
                            </div>
                            {item.isCustom && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); removeCustomItem(item.id); }}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Add Custom Item */}
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={selectedTopicForCustom === topic ? newCustomItem : ''}
                            onChange={(e) => {
                              setSelectedTopicForCustom(topic);
                              setNewCustomItem(e.target.value);
                            }}
                            placeholder="Adicionar tópico personalizado..."
                            className="flex-1 p-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                            onKeyDown={(e) => e.key === 'Enter' && addCustomItem()}
                          />
                          <button
                            onClick={addCustomItem}
                            disabled={!newCustomItem.trim() || selectedTopicForCustom !== topic}
                            className="p-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
