import { useEffect, useState } from 'react';
import Navigation from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, getDocs, orderBy, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { Calendar, Clock, BookOpen, CheckCircle, AlertCircle, PlusCircle, Brain, ChevronLeft, RefreshCw } from 'lucide-react';
import { format, isBefore, isToday, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import LessonScreen from '../components/LessonScreen';
import QuizScreen from '../components/QuizScreen';
import LinkContentModal from '../components/LinkContentModal';
import { getRevisionSuggestions, calculateNextStep } from '../lib/revision.service';

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

export default function RevisionScreen() {
  const { user } = useAuth();
  const [revisions, setRevisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeContent, setActiveContent] = useState<any>(null);
  const [activeType, setActiveType] = useState<'lesson' | 'quiz' | 'flashcard' | null>(null);

  // Modal de vinculação
  const [linkModal, setLinkModal] = useState<{ revision: any, type: 'lesson' | 'quiz' | 'flashcard' } | null>(null);

  // Modal de seleção (quando há múltiplos itens vinculados)
  const [pickModal, setPickModal] = useState<{ revision: any, type: 'lesson' | 'quiz' | 'flashcard', items: any[] } | null>(null);

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
  }, [user]);

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
      setActiveContent(loadedItems[0]);
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
        setActiveContent({ ...contentSnap.data(), id: contentSnap.id });
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

  const renderContent = () => {
    if (activeType === 'lesson') {
      return <LessonScreen settings={activeContent} onBack={() => setActiveType(null)} savedData={activeContent.data} />;
    }
    if (activeType === 'quiz' || activeType === 'flashcard') {
      return <QuizScreen settings={activeContent} onBack={() => setActiveType(null)} savedData={activeContent.data} />;
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
        <header className="mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Calendar className="text-indigo-600 w-10 h-10" />
            Cronograma de Revisão
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">Gerencie seu ciclo de aprendizagem e vença a curva do esquecimento.</p>
        </header>

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
                    <RevisionCard key={rev.id} revision={rev} onAction={handleStartRevision} onReschedule={handleReschedule} />
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
                    <RevisionCard key={rev.id} revision={rev} onAction={handleStartRevision} onReschedule={handleReschedule} />
                  ))}
              </div>
            </section>
          </div>
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
                    setActiveContent(item);
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

function RevisionCard({ revision, onAction, onReschedule }: { revision: any, onAction: any, onReschedule: any }) {
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

  return (
    <div className={`p-6 rounded-2xl shadow-sm border-2 transition-all hover:shadow-md bg-white dark:bg-gray-800 ${isOverdue ? 'border-red-100 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/10' : 'border-gray-100 dark:border-gray-800'}`}>
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
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <ActionButton 
          icon={<BookOpen className="w-4 h-4" />} 
          label="Aula" 
          count={lessonCount}
          completedCount={lessonsCompleted}
          onClick={() => onAction(revision, 'lesson')}
        />
        <ActionButton 
          icon={<CheckCircle className="w-4 h-4" />} 
          label="Quiz" 
          count={quizCount}
          completedCount={quizzesCompleted}
          onClick={() => onAction(revision, 'quiz')}
        />
        <ActionButton 
          icon={<Brain className="w-4 h-4" />} 
          label="Cards" 
          count={flashcardCount}
          completedCount={flashcardsCompleted}
          onClick={() => onAction(revision, 'flashcard')}
        />
      </div>

      {canReschedule && (
        <button
          onClick={() => onReschedule(revision)}
          className="w-full mt-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:from-green-600 hover:to-emerald-700 transition-all active:scale-95 shadow-md"
        >
          <RefreshCw className="w-4 h-4" />
          Reagendar Revisão
        </button>
      )}
    </div>
  );
}

function ActionButton({ icon, label, count, completedCount, onClick }: { icon: any, label: string, count: number, completedCount: number, onClick: any }) {
  const active = count > 0;
  const allDone = active && completedCount >= count;
  const someDone = active && completedCount > 0 && !allDone;
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all relative ${
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
  );
}
