import { useState, useMemo, useEffect } from 'react';
import Navigation from '../components/Navigation';
import { 
  Database, 
  Search, 
  Folder, 
  FolderOpen, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Filter, 
  Sparkles,
  ArrowRight,
  Bookmark,
  Coins,
  Layers,
  GraduationCap,
  Award,
  Play,
  Plus,
  Check,
  Pencil,
  X,
  ListPlus
} from 'lucide-react';
import { topicsBySubject } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';
import { useReward } from '../contexts/RewardContext';
import { useCustomSubjects } from '../contexts/CustomSubjectsContext';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import QuestionTutorChat from '../components/QuestionTutorChat';
import AddToListModal from '../components/AddToListModal';

function Youtube({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      width="24" 
      height="24" 
      stroke="currentColor" 
      strokeWidth="2" 
      fill="none" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"></path>
      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"></polygon>
    </svg>
  );
}


interface QuestionMock {
  id: string;
  subtopic: string;
  difficulty: 'Fácil' | 'Médio' | 'Difícil' | 'Avançado';
  status: 'unanswered' | 'correct' | 'incorrect';
  code: string;
  statement: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  leiSeca?: string;
}

export default function QuestionsDatabase() {
  const { awardPoints } = useReward();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<'Todos' | 'Concurso' | 'ENEM' | 'Geral'>('Todos');
  
  // Sidebar accordion states
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({
    'Língua Portuguesa': true, // Keep first expanded as default
  });
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  
  // Selection states
  const [selectedSubtopic, setSelectedSubtopic] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<'all' | 'unanswered' | 'correct' | 'incorrect'>('all');
  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<'Fácil' | 'Médio' | 'Difícil' | 'Avançado'>>(
    new Set(['Fácil', 'Médio', 'Difícil', 'Avançado'])
  );

  // Quiz interactive state
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [checkedAnswers, setCheckedAnswers] = useState<Record<string, boolean>>({});
  const [addingToListQuestion, setAddingToListQuestion] = useState<any>(null);

  const { user, selectedBanca, saveBanca } = useAuth();
  const { getAllSubjectsByMode } = useCustomSubjects();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [tempUrl, setTempUrl] = useState('');
  const [loadingVideo, setLoadingVideo] = useState(false);

  useEffect(() => {
    const loadVideoUrl = async () => {
      if (!user || !selectedSubject || !selectedSubtopic) {
        setYoutubeUrl('');
        setTempUrl('');
        return;
      }
      setLoadingVideo(true);
      try {
        const docId = `${selectedSubject.replace(/\//g, '_')}___${selectedSubtopic.replace(/\//g, '_')}`;
        const docRef = doc(db, 'users', user.uid, 'questionsDatabaseYoutube', docId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setYoutubeUrl(data.url || '');
          setTempUrl(data.url || '');
        } else {
          setYoutubeUrl('');
          setTempUrl('');
        }
      } catch (err) {
        console.error("Erro ao carregar video do subtopico:", err);
      } finally {
        setLoadingVideo(false);
      }
    };
    loadVideoUrl();
    setIsEditingUrl(false);
  }, [user, selectedSubject, selectedSubtopic]);

  const handleSaveVideoUrl = async () => {
    if (!user || !selectedSubject || !selectedSubtopic) return;
    try {
      const docId = `${selectedSubject.replace(/\//g, '_')}___${selectedSubtopic.replace(/\//g, '_')}`;
      const docRef = doc(db, 'users', user.uid, 'questionsDatabaseYoutube', docId);
      await setDoc(docRef, {
        subject: selectedSubject,
        subtopic: selectedSubtopic,
        url: tempUrl.trim(),
      }, { merge: true });
      setYoutubeUrl(tempUrl.trim());
      setIsEditingUrl(false);
    } catch (err) {
      console.error("Erro ao salvar video do subtopico:", err);
      alert("Erro ao salvar o link do vídeo.");
    }
  };

  const handlePlayVideo = () => {
    if (!youtubeUrl) return;
    window.dispatchEvent(new CustomEvent('play-youtube-video', {
      detail: {
        url: youtubeUrl,
        topic: selectedSubtopic || 'Subtópico',
        subject: selectedSubject || 'Questões',
      }
    }));
  };


  // Toggle subject accordion - also select and show all questions
  const toggleSubject = (subject: string) => {
    const willExpand = !expandedSubjects[subject];
    setExpandedSubjects(prev => ({
      ...prev,
      [subject]: willExpand
    }));
    
    // When expanding a subject, auto-select it to show all questions
    if (willExpand) {
      setSelectedSubject(subject);
      setSelectedTopic(null);
      setSelectedSubtopic('__ALL__');
      setUserAnswers({});
      setCheckedAnswers({});
    }
  };

  // Toggle topic accordion AND select topic to show all its questions
  const toggleTopic = (subject: string, topic: string) => {
    const key = `${subject}::${topic}`;
    setExpandedTopics(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    // Select this topic to show all questions under it
    setSelectedSubject(subject);
    setSelectedTopic(topic);
    setSelectedSubtopic('__TOPIC__');
    setUserAnswers({});
    setCheckedAnswers({});
  };

  // Select a subtopic
  const handleSelectSubtopic = (subject: string, topic: string, subtopic: string) => {
    setSelectedSubject(subject);
    setSelectedTopic(topic);
    setSelectedSubtopic(subtopic);
    
    // Clear interactive answers when changing subtopics
    setUserAnswers({});
    setCheckedAnswers({});
  };

  // Toggle difficulty selection
  const toggleDifficulty = (difficulty: 'Fácil' | 'Médio' | 'Difícil' | 'Avançado') => {
    const newDiffs = new Set(selectedDifficulties);
    if (newDiffs.has(difficulty)) {
      if (newDiffs.size > 1) { // Keep at least one checked
        newDiffs.delete(difficulty);
      }
    } else {
      newDiffs.add(difficulty);
    }
    setSelectedDifficulties(newDiffs);
  };

  // Group subjects by category for structured filter
  const subjectsToDisplay = useMemo(() => {
    let list: string[] = [];
    if (activeCategory === 'Todos') {
      list = Array.from(new Set([
        ...getAllSubjectsByMode('Concurso'), 
        ...getAllSubjectsByMode('ENEM'), 
        ...getAllSubjectsByMode('Geral')
      ]));
    } else if (activeCategory === 'Concurso') {
      list = getAllSubjectsByMode('Concurso');
    } else if (activeCategory === 'ENEM') {
      list = getAllSubjectsByMode('ENEM');
    } else {
      list = getAllSubjectsByMode('Geral');
    }

    // Filter list based on search term
    return list.filter(subject => {
      const subjectMatch = subject.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Also match if any topic or subtopic inside matches search
      const topics = topicsBySubject[subject] || {};
      const topicsMatch = Object.entries(topics).some(([topicName, subtopics]) => {
        if (topicName.toLowerCase().includes(searchTerm.toLowerCase())) return true;
        if (Array.isArray(subtopics)) {
          return subtopics.some((sub: string) => sub.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return false;
      });

      return subjectMatch || topicsMatch;
    });
  }, [activeCategory, searchTerm]);

  const [subjectQuestions, setSubjectQuestions] = useState<any[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Load questions when subject changes
  useEffect(() => {
    if (!selectedSubject) {
      setSubjectQuestions([]);
      return;
    }

    const loadQuestions = async () => {
      setIsLoadingQuestions(true);
      try {
        const normalizeString = (str: string) => {
          return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '-');
        };
        const fileName = `native-${normalizeString(selectedSubject)}.json`;
        const response = await fetch(`/data/questions/${fileName}?v=3`);
        if (!response.ok) {
          throw new Error('File not found');
        }
        
        const data = await response.json();
        setSubjectQuestions(data);
      } catch (err) {
        console.error('Error loading questions for subject:', selectedSubject, err);
        setSubjectQuestions([]); 
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    loadQuestions();
  }, [selectedSubject]);

  // Generate dynamic premium mock questions for selected subtopic and calculate real stats
  const { baseQuestions, stats } = useMemo(() => {
    if (!selectedSubtopic) return { baseQuestions: [], stats: { all: 0, unanswered: 0, correct: 0, incorrect: 0 } };

    let list: any[];

    // "__ALL__" or "Ver todas" shows ALL questions for the subject
    if (selectedSubtopic === '__ALL__' || selectedSubtopic === 'Ver todas') {
      list = [...subjectQuestions];
    } else if (selectedSubtopic === '__TOPIC__' && selectedTopic) {
      // Show all questions under the selected main topic
      list = subjectQuestions.filter(q => {
        if (!q.topics || !Array.isArray(q.topics) || q.topics.length < 1) return false;
        
        let mainTopic = q.topics[0];
        const mapping = selectedSubject ? topicsBySubject[selectedSubject] : undefined;
        if (mapping) {
          for (const [mTopic, sTopics] of Object.entries(mapping)) {
            if ((sTopics as string[]).includes(mainTopic)) {
              mainTopic = mTopic;
              break;
            }
          }
        }
        
        return mainTopic.toLowerCase() === selectedTopic.toLowerCase();
      });
    } else {
      list = subjectQuestions.filter(q => {
        if (!q.topics || !Array.isArray(q.topics)) return false;
        return q.topics.some((t: string) => t.toLowerCase().includes(selectedSubtopic.toLowerCase()) || selectedSubtopic.toLowerCase().includes(t.toLowerCase()));
      });

      if (list.length === 0) {
         list = subjectQuestions.filter(q => 
            (q.pergunta && q.pergunta.toLowerCase().includes(selectedSubtopic.toLowerCase())) ||
            (q.contexto && q.contexto.toLowerCase().includes(selectedSubtopic.toLowerCase()))
         );
      }
    }

    const mappedList: QuestionMock[] = list.map((q, idx) => {
       let correctIdx = -1;
       if (q.correta && Array.isArray(q.opcoes)) {
          correctIdx = q.opcoes.findIndex((opt: string) => opt.trim() === q.correta.trim());
       }

       const qId = q.id || `q-${idx}`;
       let status: 'unanswered' | 'correct' | 'incorrect' = 'unanswered';
       if (checkedAnswers[qId]) {
         status = userAnswers[qId] === correctIdx ? 'correct' : 'incorrect';
       }

       return {
         id: qId,
         subtopic: selectedSubtopic,
         difficulty: (q.difficulty === 'Fácil' || q.difficulty === 'Fǭcil' || q.difficulty === 'Facil') ? 'Fácil' : 
                     (q.difficulty === 'Médio' || q.difficulty === 'M\u00E9dio') ? 'Médio' : 
                     (q.difficulty === 'Difícil' || q.difficulty === 'Difcil') ? 'Difícil' : 'Avançado',
         status,
         code: `QUESTÃO #${idx+1}`,
         statement: (q.contexto ? q.contexto + '\n\n' : '') + (q.pergunta || ''),
         options: q.opcoes || [],
         correctAnswer: correctIdx,
         explanation: q.explicacao || 'Nenhuma explicação disponível.',
         leiSeca: q.lei_seca || undefined,
       };
    });

    const diffFilteredList = mappedList.filter(q => selectedDifficulties.has(q.difficulty));

    const calculatedStats = {
      all: diffFilteredList.length,
      unanswered: diffFilteredList.filter(q => q.status === 'unanswered').length,
      correct: diffFilteredList.filter(q => q.status === 'correct').length,
      incorrect: diffFilteredList.filter(q => q.status === 'incorrect').length,
    };

    return { baseQuestions: diffFilteredList, stats: calculatedStats };
  }, [selectedSubtopic, selectedTopic, subjectQuestions, selectedDifficulties, checkedAnswers, userAnswers]);

  const displayQuestions = useMemo(() => {
    return baseQuestions.filter(q => {
      if (statusFilter === 'unanswered' && q.status !== 'unanswered') return false;
      if (statusFilter === 'correct' && q.status !== 'correct') return false;
      if (statusFilter === 'incorrect' && q.status !== 'incorrect') return false;
      return true;
    });
  }, [baseQuestions, statusFilter]);

  // Handler for option click
  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (checkedAnswers[questionId]) return; // locked once checked
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  // Verify answer
  const handleCheckAnswer = (questionId: string) => {
    if (userAnswers[questionId] === undefined) return;
    setCheckedAnswers(prev => ({
      ...prev,
      [questionId]: true
    }));
    // Award points for answering a question in the bank
    awardPoints(2, 'answer_question_db');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-200 text-gray-800 dark:text-gray-200">
      <Navigation />
      
      {/* Premium Glassmorphic Header */}
      <div className="bg-gradient-to-r from-indigo-600/10 via-purple-600/5 to-transparent border-b border-gray-200 dark:border-gray-800 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-500 dark:from-indigo-400 dark:to-purple-300 flex items-center gap-2">
              <Database className="w-8 h-8 text-indigo-500 animate-pulse" /> Banco de Questões
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Estudo focado e local com consumo zero de tokens. Otimizado para sua aprovação.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
              <Coins className="w-3.5 h-3.5" /> Tokens Poupados: 100% (Modo Local)
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
              <Sparkles className="w-3.5 h-3.5" /> Acesso Instantâneo
            </span>
          </div>
        </div>
      </div>

      {/* Main Container - Split Layout */}
      <div className="flex-grow max-w-7xl w-full mx-auto flex flex-col lg:flex-row gap-6 p-4 sm:p-6">
        
        {/* SIDEBAR: Navigation Tree */}
        <aside className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-2xl p-4 shadow-sm transition-colors max-h-[85vh] overflow-hidden">
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" /> Grade de Matérias
            </h2>
            
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar matéria ou tópico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-sm pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-gray-800 dark:text-gray-100 transition-all"
              />
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" />
            </div>

            {/* Category Quick Pills */}
            <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-900/60 p-1 rounded-xl">
              {(['Todos', 'Concurso', 'ENEM', 'Geral'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-1 py-1 px-2 text-[11px] font-bold rounded-lg transition-all ${
                    activeCategory === cat
                      ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <a 
              href="/saved" 
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800/40 transition-colors text-xs font-bold"
            >
              <ListPlus className="w-4 h-4" />
              Ver Minhas Listas Salvas
            </a>

            {activeCategory === 'Concurso' && (
              <div className="flex flex-col mt-3">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 ml-1">Banca do Concurso</label>
                <select
                  value={selectedBanca || 'IBAM'}
                  onChange={(e) => saveBanca(e.target.value)}
                  className="w-full text-sm py-1.5 px-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 dark:text-gray-200"
                >
                  {['IBAM', 'CESPE', 'FGV', 'CESGRANRIO'].map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Accordion Tree View Container */}
          <div className="flex-grow overflow-y-auto pr-1 space-y-2 select-none scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
            {subjectsToDisplay.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-xs">
                Nenhuma matéria encontrada.
              </div>
            ) : (
              subjectsToDisplay.map(subject => {
                const isExpanded = !!expandedSubjects[subject];
                
                // Build topics dynamically from actual question data when this subject is loaded
                const topics: Record<string, string[]> = {};
                
                if (selectedSubject === subject && subjectQuestions.length > 0) {
                  // Group subtopics by their main topic
                  const topicMap = new Map<string, Set<string>>();
                  
                  subjectQuestions.forEach(q => {
                    if (q.topics && Array.isArray(q.topics) && q.topics.length >= 1) {
                      const mainTopic = q.topics[0];
                      const subTopic = q.topics.length > 1 ? q.topics[1] : null;
                      
                      if (!topicMap.has(mainTopic)) {
                        topicMap.set(mainTopic, new Set());
                      }
                      if (subTopic && subTopic !== mainTopic) {
                        topicMap.get(mainTopic)!.add(subTopic);
                      }
                    }
                  });
                  
                  // Convert Map to sorted Object
                  Array.from(topicMap.keys()).sort().forEach(mainTopic => {
                    const subTopics = Array.from(topicMap.get(mainTopic)!).sort();
                    // If no subtopics, we can put an empty array, or the mainTopic itself
                    topics[mainTopic] = subTopics.length > 0 ? subTopics : [mainTopic];
                  });
                } else {
                  // For non-selected subjects, use static topics from constants (if any)
                  const regularTopics = topicsBySubject[subject] || {};
                  Object.keys(regularTopics).forEach(k => {
                    topics[k] = [...regularTopics[k]];
                  });
                }

                const hasTopics = Object.keys(topics).length > 0;
                const isSelected = selectedSubject === subject;

                return (
                  <div key={subject} className="border border-transparent hover:border-gray-100 dark:hover:border-gray-700/30 rounded-xl transition-all">
                    {/* LEVEL 1: Subject Folder */}
                    <button
                      onClick={() => toggleSubject(subject)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-sm font-semibold transition-all ${
                        selectedSubject === subject 
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' 
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        {isExpanded ? (
                          <FolderOpen className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        ) : (
                          <Folder className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        )}
                        <span className="truncate">{subject}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isSelected && subjectQuestions.length > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                            {subjectQuestions.length}
                          </span>
                        )}
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </div>
                    </button>

                    {/* LEVEL 2: Topics list under Subject */}
                    {isExpanded && hasTopics && (
                      <div className="pl-4 mt-1 border-l-2 border-dashed border-gray-200 dark:border-gray-700 ml-4 space-y-1">
                        {Object.entries(topics).map(([topicName, subtopics]) => {
                          const topicKey = `${subject}::${topicName}`;
                          const isTopicExpanded = !!expandedTopics[topicKey];
                          const hasSubtopics = Array.isArray(subtopics) && subtopics.length > 0;

                          return (
                            <div key={topicName} className="space-y-0.5">
                              <button
                                onClick={() => toggleTopic(subject, topicName)}
                                className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs font-medium transition-all ${
                                  selectedTopic === topicName
                                    ? 'bg-purple-50/40 dark:bg-purple-950/10 text-purple-600 dark:text-purple-400'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-700/30'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                  <BookOpen className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                                  <span className="truncate">{topicName}</span>
                                </div>
                                {hasSubtopics && (
                                  isTopicExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
                                )}
                              </button>

                              {/* LEVEL 3: Subtopics list under Topic */}
                              {isTopicExpanded && hasSubtopics && (
                                <div className="pl-3 border-l border-indigo-100 dark:border-indigo-950/40 ml-3.5 mt-0.5 space-y-0.5">
                                  {(subtopics as string[]).map(subtopic => {
                                    const isSubtopicSelected = selectedSubtopic === subtopic && selectedSubject === subject;
                                    return (
                                      <button
                                        key={subtopic}
                                        onClick={() => handleSelectSubtopic(subject, topicName, subtopic)}
                                        className={`w-full flex items-center gap-1.5 p-1.5 rounded-md text-left text-[11px] leading-relaxed transition-all ${
                                          isSubtopicSelected
                                            ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/40'
                                        }`}
                                      >
                                        <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${isSubtopicSelected ? 'text-white' : 'text-gray-400'}`} />
                                        <span className="truncate">{subtopic}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* WORKSPACE: Questions & Filters Panel */}
        <main className="flex-grow bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col justify-between min-h-[60vh] lg:min-h-0">
          {selectedSubtopic ? (
            <div className="space-y-6">
              
              {/* Active Selection Breadcrumbs */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40 p-2.5 rounded-xl border border-gray-200/50 dark:border-gray-800/40">
                <GraduationCap className="w-4 h-4 text-indigo-500" />
                <span className="font-semibold text-gray-700 dark:text-gray-300">{selectedSubject}</span>
                {selectedSubtopic !== '__ALL__' && selectedSubtopic !== '__TOPIC__' && (
                  <>
                    <ChevronRight className="w-3 h-3" />
                    <span>{selectedTopic}</span>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900/20">{selectedSubtopic}</span>
                  </>
                )}
                {selectedSubtopic === '__TOPIC__' && selectedTopic && (
                  <>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900/20">{selectedTopic} — Todas ({displayQuestions.length})</span>
                  </>
                )}
                {selectedSubtopic === '__ALL__' && (
                  <>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900/20">Todas as Questões ({displayQuestions.length})</span>
                  </>
                )}
              </div>

              {/* YouTube Support Class Section */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/10 border border-red-100 dark:border-red-900/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 flex items-center justify-center flex-shrink-0 text-red-600 dark:text-red-400">
                    <Youtube className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">Vídeo Aula de Apoio (YouTube)</h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      Vincule ou assista a uma aula de apoio no YouTube de forma fluida no player flutuante.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto flex-grow sm:flex-grow-0 max-w-full sm:max-w-md">
                  {loadingVideo ? (
                    <span className="text-xs text-gray-400">Carregando vídeo...</span>
                  ) : isEditingUrl ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="text"
                        placeholder="Cole o link do YouTube aqui..."
                        value={tempUrl}
                        onChange={(e) => setTempUrl(e.target.value)}
                        className="flex-grow p-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                      <button
                        onClick={handleSaveVideoUrl}
                        className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        title="Salvar link"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setIsEditingUrl(false); setTempUrl(youtubeUrl); }}
                        className="p-1.5 bg-gray-200 dark:bg-gray-750 text-gray-600 dark:text-gray-400 rounded-lg transition-colors hover:bg-gray-300"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : youtubeUrl ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePlayVideo}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5 fill-current animate-bounce" /> Assistir Vídeo Aula
                      </button>
                      <button
                        onClick={() => setIsEditingUrl(true)}
                        className="p-2 border border-gray-300 dark:border-gray-750 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-gray-500 dark:text-gray-400"
                        title="Editar link"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditingUrl(true)}
                      className="px-4 py-2 bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 font-bold text-xs rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Vincular Aula (YouTube)
                    </button>
                  )}
                </div>
              </div>


              {/* FILTERS PANEL */}
              <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700/60 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                  <Filter className="w-4 h-4 text-indigo-500" /> Painel de Filtros Operacionais
                </div>
                
                {/* 1. Status Filter Tabs */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status das Questões</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'all', label: 'Todas as Questões', count: stats.all },
                      { key: 'unanswered', label: 'Não Respondidas', count: stats.unanswered },
                      { key: 'correct', label: 'Corretas (Acertos)', count: stats.correct },
                      { key: 'incorrect', label: 'Incorretas (Erros)', count: stats.incorrect }
                    ].map(statusTab => (
                      <button
                        key={statusTab.key}
                        onClick={() => setStatusFilter(statusTab.key as any)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                          statusFilter === statusTab.key
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60'
                        }`}
                      >
                        {statusTab.key === 'correct' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {statusTab.key === 'incorrect' && <XCircle className="w-3.5 h-3.5" />}
                        {statusTab.key === 'unanswered' && <HelpCircle className="w-3.5 h-3.5" />}
                        <span>{statusTab.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                          statusFilter === statusTab.key 
                            ? 'bg-indigo-700 text-white' 
                            : 'bg-gray-100 dark:bg-gray-750 text-gray-500'
                        }`}>
                          {statusTab.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Difficulty Multi-Select Chips */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Nível de Dificuldade</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'Fácil', label: 'Fáceis', color: 'border-green-200 text-green-700 dark:text-green-400 dark:border-green-950 bg-green-50/50 dark:bg-green-950/20', activeBg: 'bg-green-500 border-green-500 text-white' },
                      { key: 'Médio', label: 'Médias', color: 'border-yellow-200 text-yellow-700 dark:text-yellow-400 dark:border-yellow-950 bg-yellow-50/50 dark:bg-yellow-950/20', activeBg: 'bg-yellow-500 border-yellow-500 text-white' },
                      { key: 'Difícil', label: 'Difíceis', color: 'border-orange-200 text-orange-700 dark:text-orange-400 dark:border-orange-950 bg-orange-50/50 dark:bg-orange-950/20', activeBg: 'bg-orange-500 border-orange-500 text-white' },
                      { key: 'Avançado', label: 'Avançadas', color: 'border-purple-200 text-purple-700 dark:text-purple-400 dark:border-purple-950 bg-purple-50/50 dark:bg-purple-950/20', activeBg: 'bg-purple-500 border-purple-500 text-white' }
                    ].map(diff => {
                      const isActive = selectedDifficulties.has(diff.key as any);
                      return (
                        <button
                          key={diff.key}
                          onClick={() => toggleDifficulty(diff.key as any)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                            isActive ? diff.activeBg : `${diff.color} opacity-50 hover:opacity-80`
                          }`}
                        >
                          {diff.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* QUESTIONS LIST WORKSPACE */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-indigo-500" /> Questões Filtradas ({displayQuestions.length})
                  </h3>
                  <span className="text-[11px] text-gray-400 italic">
                    Dados simulados - Preparados para conexão de banco
                  </span>
                </div>

                {isLoadingQuestions ? (
                  <div className="text-center py-20 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/80">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto mb-4"></div>
                    <p>Carregando banco de questões...</p>
                  </div>
                ) : displayQuestions.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/20 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-gray-400 dark:text-gray-500">
                    <HelpCircle className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-700 mb-2" />
                    <p className="text-sm font-medium">Nenhuma questão corresponde aos filtros atuais.</p>
                    <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Experimente habilitar mais dificuldades ou mudar a aba de status.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {displayQuestions.map((q) => {
                      const selectedOption = userAnswers[q.id];
                      const isChecked = checkedAnswers[q.id];
                      const isCorrect = selectedOption === q.correctAnswer;

                      return (
                        <article 
                          key={q.id} 
                          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-750 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
                        >
                          {/* Question Card Header */}
                          <div className="bg-gray-50 dark:bg-gray-750 px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded-lg">
                              {q.code}
                            </span>
                            
                            <div className="flex items-center gap-2">
                              {/* Difficulty Tag */}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                q.difficulty === 'Fácil' ? 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300' :
                                q.difficulty === 'Médio' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300' :
                                q.difficulty === 'Difícil' ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300' :
                                'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                              }`}>
                                {q.difficulty}
                              </span>

                              {/* Status Badge */}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                q.status === 'correct' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' :
                                q.status === 'incorrect' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300' :
                                'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                              }`}>
                                {q.status === 'correct' && <>Acerto Anterior</>}
                                {q.status === 'incorrect' && <>Erro Anterior</>}
                                {q.status === 'unanswered' && <>Não Respondida</>}
                              </span>

                              <button
                                onClick={() => setAddingToListQuestion(q)}
                                title="Adicionar a uma Lista"
                                className="ml-2 text-gray-400 hover:text-indigo-500 transition-colors p-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                              >
                                <ListPlus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Question Card Content */}
                          <div className="p-4 sm:p-5 space-y-4">
                            <p className="text-sm font-medium leading-relaxed text-gray-800 dark:text-gray-100">
                              {q.statement}
                            </p>

                            {/* Options List */}
                            <div className="space-y-2">
                              {q.options.map((opt, idx) => {
                                const letters = ['A', 'B', 'C', 'D', 'E'];
                                const isSelected = selectedOption === idx;
                                
                                // Color logic for option rows based on check state
                                let rowClass = 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300';
                                let circleClass = 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500';

                                if (isSelected) {
                                  rowClass = 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300';
                                  circleClass = 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-400';
                                }

                                if (isChecked) {
                                  if (idx === q.correctAnswer) {
                                    rowClass = 'border-green-500 dark:border-green-500/80 bg-green-50/50 dark:bg-green-950/20 text-green-700 dark:text-green-300 font-medium';
                                    circleClass = 'border-green-600 bg-green-600 text-white dark:border-green-500 dark:bg-green-500';
                                  } else if (isSelected && !isCorrect) {
                                    rowClass = 'border-rose-500 dark:border-rose-500/80 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300';
                                    circleClass = 'border-rose-600 bg-rose-600 text-white dark:border-rose-500 dark:bg-rose-500';
                                  } else {
                                    rowClass = 'border-gray-100 dark:border-gray-800 opacity-60 text-gray-400 dark:text-gray-500';
                                  }
                                }

                                return (
                                  <button
                                    key={idx}
                                    disabled={isChecked}
                                    onClick={() => handleSelectOption(q.id, idx)}
                                    className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border text-xs leading-relaxed transition-all ${rowClass}`}
                                  >
                                    <span className={`w-5 h-5 rounded-full border text-[10px] flex items-center justify-center font-bold flex-shrink-0 transition-all ${circleClass}`}>
                                      {letters[idx]}
                                    </span>
                                    <span>{opt}</span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Action Buttons & Feedback */}
                            <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              {!isChecked ? (
                                <button
                                  onClick={() => handleCheckAnswer(q.id)}
                                  disabled={selectedOption === undefined}
                                  className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 self-end sm:self-auto ${
                                    selectedOption !== undefined
                                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-md'
                                      : 'bg-gray-150 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed border border-transparent'
                                  }`}
                                >
                                  Responder Questão <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <div className={`flex-grow p-3.5 rounded-xl text-xs leading-relaxed border ${
                                  isCorrect 
                                    ? 'bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-950 text-green-800 dark:text-green-300' 
                                    : 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-200 dark:border-rose-950 text-rose-800 dark:text-rose-300'
                                }`}>
                                  <div className="flex items-center gap-1.5 font-bold mb-1.5">
                                    {isCorrect ? (
                                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                    )}
                                    {isCorrect ? 'Resposta Correta!' : 'Resposta Incorreta.'}
                                  </div>
                                  <p>{q.explanation}</p>
                                  {q.leiSeca && (
                                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 rounded-r-lg">
                                      <div className="flex items-center gap-2 mb-1">
                                        <svg className="w-4 h-4 text-amber-700 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                                        </svg>
                                        <span className="font-bold text-amber-900 dark:text-amber-100 text-sm">Lei Seca</span>
                                      </div>
                                      <p className="text-sm italic text-amber-800 dark:text-amber-200">"{q.leiSeca}"</p>
                                    </div>
                                  )}
                                  <QuestionTutorChat 
                                    question={{
                                      pergunta: q.statement,
                                      opcoes: q.options,
                                      correta: q.options[q.correctAnswer],
                                      explicacao: q.explanation
                                    }}
                                    subject={selectedSubject || 'Geral'}
                                    topic={selectedTopic || 'Geral'}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            
            /* PLACEHOLDER LANDING STATE: When no subtopic is selected */
            <div className="flex-grow flex flex-col items-center justify-center text-center p-6 sm:p-8 max-w-xl mx-auto my-auto space-y-6 select-none">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <Database className="w-8 h-8 text-white animate-bounce" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300">
                  Banco de Questões Off-line
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Esta é a sua biblioteca de suporte local. Quando seu limite de geração mensal de conteúdo via Inteligência Artificial for atingido, você poderá continuar seu treinamento intensivo sem qualquer interrupção de cota.
                </p>
              </div>

              {/* Informative Stats Rows */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-750 rounded-xl flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center flex-shrink-0">
                    <Bookmark className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Filtro de Erros</h4>
                    <p className="text-[10px] text-gray-400">Revisão focada de erros anteriores.</p>
                  </div>
                </div>
                
                <div className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-750 rounded-xl flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center flex-shrink-0">
                    <Award className="w-4 h-4 text-purple-500" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">4 Dificuldades</h4>
                    <p className="text-[10px] text-gray-400">Fácil, Médio, Difícil e Avançado.</p>
                  </div>
                </div>
              </div>

              {/* Alert Guide Callout */}
              <div className="w-full p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/60 dark:border-indigo-900/20 rounded-2xl flex items-start gap-3 text-left">
                <Sparkles className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300">Como iniciar o treinamento?</h4>
                  <p className="text-[11px] text-indigo-700/80 dark:text-indigo-400/80 leading-relaxed mt-0.5">
                    Navegue pela barra lateral esquerda, expanda as pastas correspondentes às suas matérias favoritas, selecione um subtópico específico e libere o acesso aos simulados de apoio.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {addingToListQuestion && (
        <AddToListModal
          question={addingToListQuestion}
          subject={selectedSubject || 'Geral'}
          onClose={() => setAddingToListQuestion(null)}
        />
      )}
    </div>
  );
}
