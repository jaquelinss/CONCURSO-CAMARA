import { useEffect, useState } from 'react';
import Navigation from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, getDocs, orderBy, doc, getDoc, setDoc, deleteDoc, Timestamp, limit } from 'firebase/firestore';
import { Calendar, Clock, BookOpen, CheckCircle, AlertCircle, PlusCircle, Brain, ChevronLeft, RefreshCw, Sparkles, Play, Trash2, Pencil, X, Search, Loader2 } from 'lucide-react';
import { format, isBefore, isToday, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import LessonScreen from '../components/LessonScreen';
import QuizScreen from '../components/QuizScreen';
import LinkContentModal from '../components/LinkContentModal';
import { getRevisionSuggestions, calculateNextStep } from '../lib/revision.service';
import { suggestVideoSearches } from '../lib/gemini';
import StudyPlanWizard from '../components/StudyPlanWizard';
import StudyPlanView from '../components/StudyPlanView';

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


// Helper: pega IDs vinculados de um tipo, compatível com formato antigo (singular) e novo (array)
function getLinkedIds(contentLinks: any, type: string): string[] {
  if (!contentLinks) return [];
  const arrayKey = `${type}Ids`;
  const singleKey = `${type}Id`;
  const ids = contentLinks[arrayKey] || [];
  const oldId = contentLinks[singleKey];
  if (oldId && !ids.includes(oldId)) ids.push(oldId);
  return ids;
}

const REV_SESSION_KEY = 'revision_active';
const REV_TAB_KEY = 'revision_tab';

export default function RevisionScreen() {
  const { user } = useAuth();
  const [revisions, setRevisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Restaurar estado ativo do sessionStorage ao dar F5
  const savedActive = (() => {
    try { return JSON.parse(sessionStorage.getItem(REV_SESSION_KEY) || 'null'); } catch { return null; }
  })();
  const savedTab = (sessionStorage.getItem(REV_TAB_KEY) as 'revisions' | 'studyPlan') || 'revisions';

  const [activeContent, setActiveContent] = useState<any>(savedActive?.content || null);
  const [activeType, setActiveType] = useState<'lesson' | 'quiz' | 'flashcard' | null>(savedActive?.type || null);

  // Modal de vinculação
  const [linkModal, setLinkModal] = useState<{ revision: any, type: 'lesson' | 'quiz' | 'flashcard' } | null>(null);

  // Modal de seleção (quando há múltiplos itens vinculados)
  const [pickModal, setPickModal] = useState<{ revision: any, type: 'lesson' | 'quiz' | 'flashcard', items: any[] } | null>(null);

  // Study Plan
  const [activeTab, setActiveTab] = useState<'revisions' | 'studyPlan'>(savedTab);
  const [studyPlan, setStudyPlan] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  // Persistir activeType + activeContent no sessionStorage
  useEffect(() => {
    if (activeType && activeContent) {
      sessionStorage.setItem(REV_SESSION_KEY, JSON.stringify({ type: activeType, content: activeContent }));
    } else {
      sessionStorage.removeItem(REV_SESSION_KEY);
    }
  }, [activeType, activeContent]);

  // Persistir tab
  useEffect(() => {
    sessionStorage.setItem(REV_TAB_KEY, activeTab);
  }, [activeTab]);

  const fetchRevisions = async () => {
    if (!user) return;
    try {
      const revRef = collection(db, 'users', user.uid, 'revisions');
      const q = query(revRef, orderBy('scheduledDate', 'asc'));
      const snap = await getDocs(q);
      setRevisions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Erro ao buscar revisões:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevisions();
    fetchStudyPlan();
  }, [user]);

  const fetchStudyPlan = async () => {
    if (!user) return;
    setLoadingPlan(true);
    try {
      const plansRef = collection(db, 'users', user.uid, 'studyPlans');
      const q = query(plansRef, orderBy('createdAt', 'desc'), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setStudyPlan({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setStudyPlan(null);
      }
    } catch (err) {
      console.error('Erro ao buscar plano:', err);
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleStartRevision = async (rev: any, type: 'lesson' | 'quiz' | 'flashcard') => {
    const ids = getLinkedIds(rev.contentLinks, type);
    
    // Nenhum vinculado → abrir modal de vinculação
    if (ids.length === 0) {
      setLinkModal({ revision: rev, type });
      return;
    }

    if (!user) return;

    // Um único vinculado → abrir direto
    if (ids.length === 1) {
      await openContent(type, ids[0], rev);
      return;
    }

    // Múltiplos vinculados → mostrar lista para o usuário escolher
    const collectionName = type === 'lesson' ? 'lessons' : type === 'quiz' ? 'quizzes' : 'flashcards';
    const loadedItems: any[] = [];
    for (const id of ids) {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid, collectionName, id));
        if (snap.exists()) {
          loadedItems.push({ id: snap.id, ...snap.data() });
        }
      } catch (e) { /* ignore */ }
    }

    if (loadedItems.length === 1) {
      setActiveContent({ ...loadedItems[0], revisionId: rev.id });
      setActiveType(type);
    } else if (loadedItems.length > 1) {
      setPickModal({ revision: rev, type, items: loadedItems });
    } else {
      setLinkModal({ revision: rev, type });
    }
  };

  const openContent = async (type: string, contentId: string, revisionForLesson?: any) => {
    if (!user) return;
    const collectionName = type === 'lesson' ? 'lessons' : type === 'quiz' ? 'quizzes' : 'flashcards';
    try {
      const contentRef = doc(db, 'users', user.uid, collectionName, contentId);
      const contentSnap = await getDoc(contentRef);
      if (contentSnap.exists()) {
        setActiveContent({ ...contentSnap.data(), id: contentSnap.id, revisionId: revisionForLesson?.id });
        setActiveType(type as any);

        // Se for aula, marca como completa ao abrir
        if (type === 'lesson' && revisionForLesson) {
          markLessonComplete(revisionForLesson, contentId);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar conteúdo:", error);
    }
  };

  const markLessonComplete = async (rev: any, lessonId: string) => {
    if (!user) return;
    const revisionRef = doc(db, 'users', user.uid, 'revisions', rev.id);
    const completedItems = rev.completedItems || { lessonIds: [], quizIds: [], flashcardIds: [] };
    if (!completedItems.lessonIds) completedItems.lessonIds = [];
    if (!completedItems.lessonIds.includes(lessonId)) {
      completedItems.lessonIds.push(lessonId);
      await setDoc(revisionRef, { completedItems }, { merge: true });
    }
  };

  const handleReschedule = async (rev: any) => {
    if (!user) return;
    const revisionRef = doc(db, 'users', user.uid, 'revisions', rev.id);
    const currentStep = rev.cycleStep || 0;
    const perf = rev.performance || 100;
    const nextStep = calculateNextStep(perf, currentStep);
    const nextDate = getRevisionSuggestions(perf, nextStep)[0].date;
    await setDoc(revisionRef, {
      cycleStep: nextStep,
      scheduledDate: Timestamp.fromDate(nextDate),
      reviewCount: (rev.reviewCount || 0) + 1,
      completedItems: { lessonIds: [], quizIds: [], flashcardIds: [] },
    }, { merge: true });
    
    fetchRevisions();
  };

  const handleBack = () => {
    setActiveType(null);
    setActiveContent(null);
    fetchRevisions();
  };

  const renderContent = () => {
    if (activeType === 'lesson') {
      return <LessonScreen settings={activeContent} onBack={handleBack} savedData={activeContent.data} />;
    }
    if (activeType === 'quiz' || activeType === 'flashcard') {
      return <QuizScreen settings={activeContent} onBack={handleBack} savedData={activeContent.data} />;
    }
    return null;
  };

  if (activeType) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <main className="flex-grow p-4">{renderContent()}</main>
      </div>
    );
  }

  const today = startOfDay(new Date());

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <main className="flex-grow p-4 md:p-8 max-w-6xl mx-auto w-full">
        <header className="mb-6">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Calendar className="text-indigo-600 w-10 h-10" />
            Cronograma
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">Gerencie suas revisões e plano de estudos.</p>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('revisions')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'revisions'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <RefreshCw className="w-4 h-4" /> Revisões
          </button>
          <button
            onClick={() => setActiveTab('studyPlan')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'studyPlan'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Plano de Estudos
          </button>
        </div>

        {/* Study Plan Tab */}
        {activeTab === 'studyPlan' ? (
          <div>
            {loadingPlan ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            ) : studyPlan ? (
              <div>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => setShowWizard(true)}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md flex items-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" /> Novo Plano
                  </button>
                </div>
                <StudyPlanView plan={studyPlan} onUpdate={() => { fetchStudyPlan(); window.dispatchEvent(new Event('study-plan-updated')); }} />
              </div>
            ) : (
              <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border-2 border-dashed border-gray-200 dark:border-gray-700">
                <Sparkles className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Crie seu Plano de Estudos</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-2 mb-6">Envie o conteúdo programático ou selecione as matérias e a IA vai gerar um cronograma personalizado dia a dia.</p>
                <button
                  onClick={() => setShowWizard(true)}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg flex items-center gap-2 mx-auto"
                >
                  <Sparkles className="w-5 h-5" /> Criar Plano
                </button>
              </div>
            )}
            {showWizard && (
              <StudyPlanWizard
                onPlanCreated={() => { setShowWizard(false); fetchStudyPlan(); window.dispatchEvent(new Event('study-plan-updated')); }}
                onClose={() => setShowWizard(false)}
              />
            )}
          </div>
        ) : (
        /* Revisions Tab (original content) */
        <>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : revisions.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border-2 border-dashed border-gray-200 dark:border-gray-700">
            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Nenhuma revisão agendada</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto mt-2">Vá em "Meus Salvamentos" e escolha um conteúdo para iniciar seu ciclo de revisão.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                Urgentes / Hoje
              </h2>
              <div className="space-y-4">
                {revisions
                  .filter(r => r.status === 'pending' && (isBefore(r.scheduledDate.toDate(), today) || isToday(r.scheduledDate.toDate())))
                  .map(rev => (
                    <RevisionCard key={rev.id} revision={rev} onAction={handleStartRevision} onLink={(rev: any, type: 'lesson' | 'quiz' | 'flashcard') => setLinkModal({ revision: rev, type })} onReschedule={handleReschedule} onUpdate={fetchRevisions} />
                  ))}
                {revisions.filter(r => r.status === 'pending' && (isBefore(r.scheduledDate.toDate(), today) || isToday(r.scheduledDate.toDate()))).length === 0 && (
                  <p className="text-gray-400 italic bg-gray-100 dark:bg-gray-800 p-4 rounded-xl text-center">Tudo em dia por aqui! ✨</p>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-600">
                <Clock className="w-5 h-5" />
                Próximas Revisões
              </h2>
              <div className="space-y-4">
                {revisions
                  .filter(r => r.status === 'pending' && !isBefore(r.scheduledDate.toDate(), today) && !isToday(r.scheduledDate.toDate()))
                  .map(rev => (
                    <RevisionCard key={rev.id} revision={rev} onAction={handleStartRevision} onLink={(rev: any, type: 'lesson' | 'quiz' | 'flashcard') => setLinkModal({ revision: rev, type })} onReschedule={handleReschedule} onUpdate={fetchRevisions} />
                  ))}
              </div>
            </section>
          </div>
        )}
        </>
        )}
      </main>

      {/* Modal de Vinculação */}
      {linkModal && (
        <LinkContentModal
          user={user}
          revision={linkModal.revision}
          type={linkModal.type}
          onClose={() => setLinkModal(null)}
          onLinked={() => {
            setLinkModal(null);
            fetchRevisions();
          }}
        />
      )}

      {/* Modal de Seleção (múltiplos vinculados) */}
      {pickModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <ChevronLeft className="w-5 h-5 text-indigo-600" />
              Escolha qual {pickModal.type === 'quiz' ? 'quiz' : pickModal.type === 'flashcard' ? 'flashcard' : 'aula'} revisar
            </h3>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {pickModal.items.map((item: any) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveContent({ ...item, revisionId: pickModal.revision.id });
                    setActiveType(pickModal.type);
                    setPickModal(null);
                  }}
                  className="w-full text-left p-4 rounded-xl border-2 border-gray-100 dark:border-gray-800 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all"
                >
                  <h4 className="font-bold text-gray-900 dark:text-gray-100">
                    {pickModal.type === 'lesson' ? (item.data?.titulo || item.topic) : `${item.topic}`}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {pickModal.type !== 'lesson' && `${item.data?.length || 0} ${pickModal.type === 'quiz' ? 'questões' : 'flashcards'} · `}
                    {item.difficulty || ''} · Salvo em: {item.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                  </p>
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setPickModal(null)} className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl font-semibold hover:bg-gray-200 transition-colors">
                Cancelar
              </button>
              <button 
                onClick={() => { setPickModal(null); setLinkModal({ revision: pickModal.revision, type: pickModal.type }); }}
                className="flex-1 py-2 bg-indigo-100 text-indigo-700 rounded-xl font-semibold hover:bg-indigo-200 transition-colors"
              >
                Editar vínculos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RevisionCard({ revision, onAction, onLink, onReschedule, onUpdate }: { revision: any, onAction: any, onLink: any, onReschedule: any, onUpdate: () => void }) {
  const { user, apiKey } = useAuth();
  const date = revision.scheduledDate.toDate();
  const isOverdue = isBefore(date, startOfDay(new Date()));
  const isTodayDate = isToday(date);

  const lessonCount = getLinkedIds(revision.contentLinks, 'lesson').length;
  const quizCount = getLinkedIds(revision.contentLinks, 'quiz').length;
  const flashcardCount = getLinkedIds(revision.contentLinks, 'flashcard').length;

  // Contagem de completados
  const completed = revision.completedItems || { lessonIds: [], quizIds: [], flashcardIds: [] };
  const lessonsCompleted = (completed.lessonIds || []).length;
  const quizzesCompleted = (completed.quizIds || []).length;
  const flashcardsCompleted = (completed.flashcardIds || []).length;

  // Botão reagendar disponível quando pelo menos 1 de cada tipo vinculado foi completado
  const canReschedule = 
    (lessonCount === 0 || lessonsCompleted >= 1) &&
    (quizCount === 0 || quizzesCompleted >= 1) &&
    (flashcardCount === 0 || flashcardsCompleted >= 1) &&
    (lessonsCompleted + quizzesCompleted + flashcardsCompleted) > 0;

  // YouTube video states and operations
  const [editingVideo, setEditingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [savingVideo, setSavingVideo] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);

  const urls = revision.youtubeUrls || (revision.youtubeUrl ? [revision.youtubeUrl] : []);

  const handleAddVideo = async () => {
    if (!user || !videoUrl.trim()) return;
    setSavingVideo(true);
    try {
      const currentUrls = revision.youtubeUrls || (revision.youtubeUrl ? [revision.youtubeUrl] : []);
      if (currentUrls.includes(videoUrl.trim())) {
        setVideoUrl('');
        setSavingVideo(false);
        return;
      }
      const newUrls = [...currentUrls, videoUrl.trim()];
      const revisionRef = doc(db, 'users', user.uid, 'revisions', revision.id);
      await setDoc(revisionRef, { youtubeUrls: newUrls }, { merge: true });
      revision.youtubeUrls = newUrls;
      setVideoUrl('');
      onUpdate();
    } catch (err) {
      console.error('Erro ao salvar vídeo:', err);
      alert('Erro ao salvar link do vídeo.');
    } finally {
      setSavingVideo(false);
    }
  };

  const handleRemoveVideo = async (e: React.MouseEvent, urlToRemove: string) => {
    e.stopPropagation();
    if (!user) return;
    if (!window.confirm('Deseja realmente remover o vídeo desta revisão?')) return;
    try {
      const currentUrls = revision.youtubeUrls || (revision.youtubeUrl ? [revision.youtubeUrl] : []);
      const newUrls = currentUrls.filter((u: string) => u !== urlToRemove);
      const revisionRef = doc(db, 'users', user.uid, 'revisions', revision.id);
      await setDoc(revisionRef, { youtubeUrls: newUrls }, { merge: true });
      revision.youtubeUrls = newUrls;
      onUpdate();
    } catch (err) {
      console.error('Erro ao excluir vídeo:', err);
      alert('Erro ao excluir vídeo.');
    }
  };

  const handleAiSearch = async () => {
    if (!user) return;
    setLoadingAi(true);
    try {
      const res = await suggestVideoSearches(revision.subject, revision.topic, apiKey || '');
      setAiSuggestions(res.searches || []);
    } catch (err) {
      console.error('Erro ao buscar sugestões:', err);
      alert('Erro ao gerar buscas. Verifique sua chave API.');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    if (!window.confirm(`Deseja excluir a revisão de "${revision.subject} - ${revision.topic}"?`)) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'revisions', revision.id));
      onUpdate();
    } catch (err) {
      console.error('Erro ao excluir revisão:', err);
      alert('Erro ao excluir revisão.');
    }
  };

  return (
    <div className={`p-6 rounded-2xl shadow-sm border-2 transition-all hover:shadow-md bg-white dark:bg-gray-800 flex flex-col justify-between group ${isOverdue ? 'border-red-100 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/10' : 'border-gray-100 dark:border-gray-800'}`}>
      <div>
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${isOverdue ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : isTodayDate ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'}`}>
              {isOverdue ? 'Atrasado' : isTodayDate ? 'Hoje' : format(date, "d 'de' MMMM", { locale: ptBR })}
            </span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-2">{revision.subject}</h3>
            <p className="text-gray-600 dark:text-gray-400">{revision.topic}</p>
            {revision.reviewCount > 0 && (
              <p className="text-xs text-gray-400 mt-1">Revisada {revision.reviewCount}x</p>
            )}
          </div>
          <button
            onClick={handleDelete}
            className="p-1.5 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="Excluir revisão"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <ActionButton 
            icon={<BookOpen className="w-4 h-4" />} 
            label="Aula" 
            count={lessonCount}
            completedCount={lessonsCompleted}
            onClick={() => onAction(revision, 'lesson')}
            onAdd={() => onLink(revision, 'lesson')}
          />
          <ActionButton 
            icon={<CheckCircle className="w-4 h-4" />} 
            label="Quiz" 
            count={quizCount}
            completedCount={quizzesCompleted}
            onClick={() => onAction(revision, 'quiz')}
            onAdd={() => onLink(revision, 'quiz')}
          />
          <ActionButton 
            icon={<Brain className="w-4 h-4" />} 
            label="Cards" 
            count={flashcardCount}
            completedCount={flashcardsCompleted}
            onClick={() => onAction(revision, 'flashcard')}
            onAdd={() => onLink(revision, 'flashcard')}
          />
        </div>
      </div>

      {/* YouTube Class Video Module */}
      <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700/60 flex flex-col gap-2">
        {editingVideo ? (
          <div className="flex flex-col gap-3">
            {/* Lista de vídeos existentes */}
            {urls.length > 0 && (
              <div className="space-y-2 mb-2">
                <p className="text-xs font-bold text-gray-500 uppercase">Vídeos Vinculados</p>
                {urls.map((url: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 p-2 rounded border border-gray-200 dark:border-gray-600">
                    <Play className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <span className="text-xs text-gray-600 dark:text-gray-300 truncate flex-grow" title={url}>{url}</span>
                    <button onClick={(e) => handleRemoveVideo(e, url)} className="p-1 text-gray-400 hover:text-red-500 shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input para novo vídeo */}
            <div className="flex items-center gap-2">
              <div className="relative flex-grow">
                <Youtube className="w-4 h-4 text-red-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="Cole o link do YouTube aqui..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddVideo();
                    if (e.key === 'Escape') setEditingVideo(false);
                  }}
                />
              </div>
              <button
                onClick={handleAddVideo}
                disabled={savingVideo || !videoUrl.trim()}
                className="p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors shrink-0"
                title="Adicionar vídeo"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
              <button
                onClick={handleAiSearch}
                disabled={loadingAi}
                className="p-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-md hover:bg-indigo-100 disabled:opacity-50 transition-colors shrink-0"
                title="Buscar com IA"
              >
                {loadingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              </button>
              <button
                onClick={() => { setVideoUrl(''); setEditingVideo(false); setAiSuggestions([]); }}
                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-md transition-colors shrink-0"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sugestões da IA */}
            {aiSuggestions.length > 0 && (
              <div className="mt-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 rounded-lg">
                <p className="text-xs font-bold text-indigo-800 flex items-center gap-1 mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> Sugestões
                </p>
                <div className="space-y-2">
                  {aiSuggestions.map((sug: any, i: number) => (
                    <div key={i} className="bg-white p-2 rounded shadow-sm border border-indigo-100">
                      <a 
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(sug.query)}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-between group"
                      >
                        <span className="text-xs font-semibold group-hover:text-red-500">"{sug.query}"</span>
                        <Search className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-500" />
                      </a>
                      <p className="text-[10px] text-gray-500 mt-1">{sug.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : urls.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {urls.map((url: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent('play-youtube-video', {
                        detail: { url, topic: revision.topic, subject: revision.subject },
                      })
                    );
                  }}
                  className="flex items-center gap-1 text-[11px] bg-red-50 text-red-600 px-2 py-1.5 rounded-md border border-red-100 hover:bg-red-100 font-bold transition-colors"
                >
                  <Play className="w-3 h-3 fill-red-600" />
                  Vídeo {idx + 1}
                </button>
              ))}
              <button
                onClick={() => setEditingVideo(true)}
                className="flex items-center gap-1 text-[11px] bg-gray-50 text-gray-500 px-2 py-1.5 rounded-md border border-gray-200 hover:bg-gray-100 font-bold transition-colors"
                title="Adicionar ou remover vídeos"
              >
                <Pencil className="w-3 h-3" /> Editar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditingVideo(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-red-600 transition-colors bg-gray-50 dark:bg-gray-800/40 hover:bg-red-50 dark:hover:bg-red-950/10 px-3 py-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 w-full justify-center"
          >
            <Youtube className="w-4 h-4 text-red-500 shrink-0" />
            <span>+ Vídeo da Aula (YouTube)</span>
          </button>
        )}

        {canReschedule ? (
          <button
            onClick={() => onReschedule(revision)}
            className="w-full py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:from-green-600 hover:to-emerald-700 transition-all active:scale-95 shadow-md animate-fade-in mt-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reagendar Revisão
          </button>
        ) : (
          <button
            onClick={() => {
              if (window.confirm("Deseja marcar esta revisão como concluída manualmente?")) {
                onReschedule(revision);
              }
            }}
            className="w-full py-2.5 bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 mt-2"
            title="Concluir revisão sem fazer os exercícios vinculados"
          >
            <CheckCircle className="w-4 h-4" />
            Marcar como Concluída
          </button>
        )}
      </div>
    </div>
  );
}


function ActionButton({ icon, label, count, completedCount, onClick, onAdd }: { icon: any, label: string, count: number, completedCount: number, onClick: any, onAdd?: any }) {
  const active = count > 0;
  const allDone = active && completedCount >= count;
  const someDone = active && completedCount > 0 && !allDone;
  return (
    <div className="relative">
      <button 
        onClick={onClick}
        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all relative w-full ${
          allDone
            ? 'border-green-200 bg-green-50 text-green-700'
            : active 
              ? 'border-indigo-100 bg-indigo-50 text-indigo-700 hover:border-indigo-300' 
              : 'border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-400 hover:border-indigo-300 hover:text-indigo-500'
        }`}
      >
        {allDone ? <CheckCircle className="w-4 h-4 text-green-600" /> : active ? icon : <PlusCircle className="w-4 h-4" />}
        <span className="text-xs font-bold">{active ? label : 'Vincular'}</span>
        {someDone && (
          <span className="text-[10px] text-indigo-500 font-semibold">{completedCount}/{count}</span>
        )}
        {count > 1 && !allDone && (
          <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {count}
          </span>
        )}
        {allDone && (
          <span className="absolute -top-1.5 -right-1.5 bg-green-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">✓</span>
        )}
      </button>
      {active && onAdd && (
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(); }}
          className="absolute -bottom-1.5 -right-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 z-10"
          title={`Vincular mais ${label.toLowerCase()}`}
        >
          +
        </button>
      )}
    </div>
  );
}
