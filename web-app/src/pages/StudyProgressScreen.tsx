import { useEffect, useState, useMemo } from 'react';
import Navigation from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore';
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

  const [allSubjects, setAllSubjects] = useState<string[]>([]);
  const [isCreatingNewSubject, setIsCreatingNewSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  // AI Modal States
  const { apiKey } = useAuth();
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiContext, setAiContext] = useState('');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [aiError, setAiError] = useState('');
  const [isAiGeneratedPlan, setIsAiGeneratedPlan] = useState(false);

  const defaultSubjects = useMemo(() => getSubjectsByMode(mode), [mode]);
  const subjects = useMemo(() => {
    const combined = [...defaultSubjects];
    allSubjects.forEach(s => {
      if (!combined.includes(s)) combined.push(s);
    });
    return combined.sort();
  }, [defaultSubjects, allSubjects]);

  const theme = useMemo(() => themes[subject] || defaultTheme, [subject]);

  useEffect(() => {
    const loadUserSubjects = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, 'users', user.uid, 'studyProgress'), where('mode', '==', mode));
        const querySnapshot = await getDocs(q);
        const savedSubjects: string[] = [];
        querySnapshot.forEach(doc => {
          if (doc.data().subject) savedSubjects.push(doc.data().subject);
        });
        setAllSubjects(savedSubjects);
      } catch (error) {
        console.error("Erro ao carregar matérias salvas:", error);
      }
    };
    loadUserSubjects();
  }, [user, mode]);

  useEffect(() => {
    if (!isCreatingNewSubject && subjects.length > 0 && !subjects.includes(subject) && subject !== 'new') {
      setSubject(subjects[0]);
    }
  }, [mode, subjects, subject, isCreatingNewSubject]);

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
        const isAiPlan = data.isAiGenerated || (savedItems.length > 0 && savedItems.every((item: any) => item.isCustom));
        
        setIsAiGeneratedPlan(isAiPlan);

        if (isAiPlan) {
          setItems(savedItems);
        } else {
          // Merge saved items with default items (in case constants changed)
          const mergedItems = [...defaultItems];
          savedItems.forEach((savedItem: any) => {
            const index = mergedItems.findIndex(item => item.id === savedItem.id);
            if (index !== -1) {
              mergedItems[index].checked = savedItem.checked;
            } else if (savedItem.isCustom) {
              mergedItems.push(savedItem);
            }
          });
          setItems(mergedItems);
        }
      } else {
        setItems(defaultItems);
        setIsAiGeneratedPlan(false);
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

  const saveProgress = async (newItems: ChecklistItem[], aiGeneratedFlag?: boolean) => {
    if (!user || !subject) return;
    try {
      const docRef = doc(db, 'users', user.uid, 'studyProgress', subject);
      await setDoc(docRef, {
        subject,
        mode,
        items: newItems,
        isAiGenerated: aiGeneratedFlag !== undefined ? aiGeneratedFlag : isAiGeneratedPlan,
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

  const handleGeneratePlan = async () => {
    if (!apiKey) {
      setAiError("Chave de API não configurada. Vá em Configurações para adicionar sua chave do Gemini.");
      return;
    }
    
    setIsGeneratingPlan(true);
    setAiError('');

    const prompt = `Atue como um professor especialista. Preciso de um plano de estudos estruturado para a matéria de "${subject}", focado no modo "${mode}". 
${aiContext ? `Contexto extra do aluno: "${aiContext}"` : ''}

Retorne ESTRITAMENTE um JSON válido, sem markdown (\`\`\`json), sem textos antes ou depois. 
O JSON deve ser um array de objetos, onde cada objeto tem uma chave "topic" (nome do grande assunto) e uma chave "subTopics" (um array de strings com os tópicos menores a estudar).
Exemplo de formato esperado:
[
  { "topic": "Gramática", "subTopics": ["Fonologia", "Morfologia", "Sintaxe"] },
  { "topic": "Interpretação", "subTopics": ["Coesão e Coerência", "Tipologia Textual"] }
]
Certifique-se de que a ordem dos tópicos seja a melhor ordem lógica de aprendizado.`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!response.ok) throw new Error("A API falhou ao gerar o plano.");
      const result = await response.json();
      
      let textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) throw new Error("Resposta inválida da IA.");
      
      // Clean up potential markdown formatting
      textResponse = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      const parsedData = JSON.parse(textResponse);
      if (!Array.isArray(parsedData)) throw new Error("Formato JSON inválido.");

      const newItems: ChecklistItem[] = [];
      const newExpandedTopics: Record<string, boolean> = {};

      parsedData.forEach((item: any, index: number) => {
        const topic = item.topic || `Tópico ${index + 1}`;
        newExpandedTopics[topic] = true; // expand all initially
        
        if (Array.isArray(item.subTopics)) {
          item.subTopics.forEach((subTopic: string) => {
            newItems.push({
              id: `${topic}___${subTopic}___${Date.now()}`,
              topic,
              subTopic,
              checked: false,
              isCustom: true
            });
          });
        }
      });

      setItems(newItems);
      setExpandedTopics(newExpandedTopics);
      setIsAiGeneratedPlan(true);
      saveProgress(newItems, true);
      setIsAIModalOpen(false);
      setAiContext('');

    } catch (error) {
      console.error(error);
      setAiError("Não foi possível gerar o plano. Tente novamente ou ajuste o contexto.");
    } finally {
      setIsGeneratingPlan(false);
    }
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
          <button 
            onClick={() => { setAiError(''); setIsAIModalOpen(true); }} 
            disabled={!subject || isCreatingNewSubject}
            className="px-4 py-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-lg font-bold hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            ✨ Plano com IA
          </button>
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
              <div className="flex gap-2">
                {!isCreatingNewSubject ? (
                  <select
                    value={subject}
                    onChange={(e) => {
                      if (e.target.value === 'new') {
                        setIsCreatingNewSubject(true);
                        setSubject('');
                        setItems([]);
                      } else {
                        setSubject(e.target.value);
                      }
                    }}
                    className="flex-1 p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {subjects.map(subj => (
                      <option key={subj} value={subj}>{subj}</option>
                    ))}
                    <option value="new" className="font-bold text-indigo-600">+ Nova Matéria...</option>
                  </select>
                ) : (
                  <div className="flex flex-1 gap-2">
                    <input 
                      type="text" 
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      placeholder="Nome da matéria..."
                      className="flex-1 p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                      autoFocus
                    />
                    <button 
                      onClick={() => {
                        if (newSubjectName.trim()) {
                          setSubject(newSubjectName.trim());
                          setIsCreatingNewSubject(false);
                          setNewSubjectName('');
                        }
                      }}
                      disabled={!newSubjectName.trim()}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Confirmar
                    </button>
                    <button 
                      onClick={() => {
                        setIsCreatingNewSubject(false);
                        setSubject(subjects[0] || '');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg font-bold hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
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

      {/* AI Modal */}
      {isAIModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Gerar Plano de Estudos com IA</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">A IA criará uma ordem lógica de tópicos e subtópicos para <strong>{subject}</strong>.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Contexto ou Foco Específico (Opcional)</label>
                <textarea 
                  value={aiContext}
                  onChange={(e) => setAiContext(e.target.value)}
                  placeholder="Ex: Foco no edital do Banco do Brasil, priorizar questões da banca CEBRASPE..."
                  className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  rows={3}
                ></textarea>
              </div>

              {aiError && (
                <div className="p-3 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200 rounded-lg text-sm">
                  {aiError}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4">
                <button 
                  onClick={() => setIsAIModalOpen(false)}
                  disabled={isGeneratingPlan}
                  className="px-5 py-2 text-gray-600 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleGeneratePlan}
                  disabled={isGeneratingPlan}
                  className={`px-5 py-2 text-white font-bold rounded-lg transition-all flex items-center gap-2 ${theme.button.split(' ')[0] || 'bg-indigo-600'}`}
                >
                  {isGeneratingPlan ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Gerando...
                    </>
                  ) : (
                    'Gerar Plano'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
