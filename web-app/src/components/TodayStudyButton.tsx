import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, doc, getDoc, updateDoc, onSnapshot, setDoc, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { BookOpen, X, CheckCircle, ChevronLeft, ChevronRight, CirclePlay, AlertCircle, RefreshCw, Check, PlusCircle, Search, Sparkles, Pencil, Loader2, Play } from 'lucide-react';
import { format, addDays, subDays, isToday, parseISO, startOfDay, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLocation } from 'react-router-dom';
import { getRevisionSuggestions, calculateNextStep } from '../lib/revision.service';
import { suggestVideoSearches } from '../lib/gemini';
import { useReward } from '../contexts/RewardContext';
import InlineContentGenerator from './InlineContentGenerator';

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

export function InlineVideoEditor({ 
  apiKey,
  subject,
  topic,
  onSave,
  onCancel
}: { 
  apiKey: string,
  subject: string,
  topic: string,
  onSave: (url: string) => Promise<void>,
  onCancel: () => void
}) {
  const [videoUrl, setVideoUrl] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);

  const handleAiSearch = async () => {
    setLoadingAi(true);
    try {
      const res = await suggestVideoSearches(subject, topic, apiKey || '');
      setAiSuggestions(res.searches || []);
    } catch (err) {
      console.error(err);
      alert('Erro ao buscar sugestões');
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="mt-2 flex flex-col gap-2 p-2 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700 w-full animate-in fade-in">
      <div className="flex items-center gap-1.5">
        <div className="relative flex-grow">
          <Youtube className="w-3 h-3 text-red-500 absolute left-2 top-2" />
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Link do vídeo ou playlist..."
            className="w-full pl-6 pr-2 py-1 text-[11px] rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-1 focus:ring-indigo-500"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && videoUrl.trim()) onSave(videoUrl.trim());
              if (e.key === 'Escape') onCancel();
            }}
          />
        </div>
        <button onClick={() => onSave(videoUrl.trim())} disabled={!videoUrl.trim()} className="p-1 text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50"><PlusCircle className="w-3 h-3"/></button>
        <button onClick={handleAiSearch} disabled={loadingAi} className="p-1 text-indigo-600 bg-indigo-50 rounded border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50">
          {loadingAi ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
        </button>
        <button onClick={onCancel} className="p-1 text-gray-400 hover:bg-gray-200 rounded"><X className="w-3 h-3"/></button>
      </div>
      {aiSuggestions.length > 0 && (
        <div className="space-y-1 mt-1 max-h-32 overflow-y-auto">
          {aiSuggestions.map((sug: any, i: number) => (
            <a key={i} href={`https://www.youtube.com/results?search_query=${encodeURIComponent(sug.query)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-white dark:bg-gray-700 p-1.5 rounded text-[10px] border border-gray-100 dark:border-gray-600 group hover:border-red-200 transition-colors">
              <span className="truncate group-hover:text-red-500">"{sug.query}"</span>
              <Search className="w-2.5 h-2.5 text-gray-400 group-hover:text-red-500 flex-shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function ItemVideoManager({ 
  itemType, 
  id, 
  originalDate, 
  blockIndex, 
  subject, 
  topic, 
  urls, 
  apiKey,
  onSave,
  onRemove
}: any) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="mt-1.5 flex flex-col gap-1.5 w-full">
      {urls.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {urls.map((url: string, i: number) => (
            <div key={i} className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('play-youtube-video', { detail: { url, topic, subject } }));
                }}
                className="flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400 px-1.5 py-0.5 font-bold"
                title={url}
              >
                <CirclePlay className="w-3 h-3" /> Vídeo {i + 1}
              </button>
              {editing && (
                <button onClick={() => onRemove(url, itemType, id, originalDate, blockIndex)} className="p-0.5 text-red-400 hover:text-red-600 mr-1" title="Remover vídeo">
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
          <button onClick={() => setEditing(!editing)} className="text-[10px] flex items-center gap-1 px-1.5 py-0.5 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded border border-dashed border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
            <Pencil className="w-2.5 h-2.5"/> {editing ? 'Fechar' : 'Editar'}
          </button>
        </div>
      )}
      
      {urls.length === 0 && !editing && (
        <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-indigo-500 font-bold w-fit bg-gray-50 dark:bg-gray-800/50 px-1.5 py-0.5 rounded border border-dashed border-gray-200 dark:border-gray-700">
          <Youtube className="w-3 h-3" /> + Vincular vídeo
        </button>
      )}

      {editing && (
        <InlineVideoEditor apiKey={apiKey} subject={subject} topic={topic} onSave={async (url) => { await onSave(url, itemType, id, originalDate, blockIndex); setEditing(false); }} onCancel={() => setEditing(false)} />
      )}
    </div>
  );
}

export default function TodayStudyButton({ isHidden = false }: { isHidden?: boolean }) {
  const { user, apiKey, selectedBanca } = useAuth();
  const { awardPoints } = useReward();
  const [open, setOpen] = useState(false);
  const [showOverdue, setShowOverdue] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [planTitle, setPlanTitle] = useState('');
  const [hasPlan, setHasPlan] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [revisions, setRevisions] = useState<any[]>([]);
  const [confirmingRevision, setConfirmingRevision] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const fetchPlan = async () => {
      if (!user) return;
      try {
        const plansRef = collection(db, 'users', user.uid, 'studyPlans');
        const q = query(plansRef, orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        if (snap.empty) {
          setHasPlan(false);
          setAllPlans([]);
          return;
        }

        const plans = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        setAllPlans(plans);
        const firstPlan = plans[0];
        setHasPlan(true);
        setPlanId(firstPlan.id);
        setPlanTitle(firstPlan.title || 'Plano de Estudos');
        setPlan(firstPlan);
      } catch (err) {
        console.error('Erro ao buscar plano:', err);
      }
    };

    fetchPlan();

    // Listen for plan updates
    const handler = () => fetchPlan();
    window.addEventListener('study-plan-updated', handler);
    return () => window.removeEventListener('study-plan-updated', handler);
  }, [user]);

  // Fetch Revisions
  useEffect(() => {
    if (!user) return;
    const revRef = collection(db, 'users', user.uid, 'revisions');
    const unsubscribe = onSnapshot(revRef, (snap) => {
      setRevisions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, [user]);

  const currentStr = format(currentDate, 'yyyy-MM-dd');
  const currentSchedule = plan?.schedule?.find((d: any) => d.date === currentStr);
  const currentBlocks = currentSchedule?.blocks || [];

  const pendingBlocks = currentBlocks.filter((b: any) => b.status !== 'completed');
  const completedCount = currentBlocks.filter((b: any) => b.status === 'completed').length;
  const allDone = currentBlocks.length > 0 && pendingBlocks.length === 0;

  // Use today's blocks for the badge on the floating button – aggregate across ALL plans
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todaySchedule = plan?.schedule?.find((d: any) => d.date === todayStr);
  const todayBlocks = todaySchedule?.blocks || [];

  const allPlansTodayPending = useMemo(() => {
    let count = 0;
    for (const p of allPlans) {
      const daySchedule = (p.schedule || []).find((d: any) => d.date === todayStr);
      if (daySchedule) {
        count += (daySchedule.blocks || []).filter((b: any) => b.status !== 'completed').length;
      }
    }
    return count;
  }, [allPlans, todayStr]);

  const todayStart = startOfDay(new Date());
  
  const currentRevisions = useMemo(() => {
    return revisions.filter(r => {
      if (r.status !== 'pending') return false;
      const revDate = r.scheduledDate?.toDate();
      if (!revDate) return false;
      return format(revDate, 'yyyy-MM-dd') === currentStr;
    });
  }, [revisions, currentStr]);

  const overdueRevisions = useMemo(() => {
    return revisions.filter(r => {
      if (r.status !== 'pending') return false;
      const revDate = r.scheduledDate?.toDate();
      if (!revDate) return false;
      return isBefore(revDate, todayStart);
    }).map(r => ({ ...r, originalDate: format(r.scheduledDate.toDate(), 'yyyy-MM-dd') }));
  }, [revisions, todayStart]);

  const todayPendingRevisions = useMemo(() => {
    return revisions.filter(r => {
      if (r.status !== 'pending') return false;
      const revDate = r.scheduledDate?.toDate();
      if (!revDate) return false;
      return isBefore(revDate, todayStart) || isToday(revDate);
    });
  }, [revisions, todayStart]);

  const totalPendingToday = allPlansTodayPending + todayPendingRevisions.length;
  const todayAllDone = (todayBlocks.length > 0 || currentRevisions.length > 0) && totalPendingToday === 0;

  const overdueBlocks = useMemo(() => {
    if (!plan?.schedule) return [];
    let overdue: any[] = [];
    plan.schedule.forEach((day: any) => {
      if (day.date < todayStr) {
        (day.blocks || []).forEach((b: any, index: number) => {
          if (b.status !== 'completed') {
            overdue.push({ ...b, originalDate: day.date, blockIndex: index });
          }
        });
      }
    });
    return overdue;
  }, [plan, todayStr]);

  // Don't show on login page or if no plan
  if (location.pathname === '/login' || !hasPlan) return null;

  const handleToggleComplete = async (targetDate: string, idx: number, currentStatus: string) => {
    if (!user || !planId) return;
    try {
      const planRef = doc(db, 'users', user.uid, 'studyPlans', planId);
      const planSnap = await getDoc(planRef);
      if (!planSnap.exists()) return;
      
      const planData = planSnap.data();
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';

      // Get block data before modifying
      const targetDay = planData.schedule.find((day: any) => day.date === targetDate);
      const block = targetDay?.blocks?.[idx];
      
      const newSchedule = planData.schedule.map((day: any) => {
        if (day.date === targetDate) {
          return {
            ...day,
            blocks: day.blocks.map((b: any, index: number) => 
              index === idx 
                ? {
                    ...b,
                    status: newStatus,
                    ...(newStatus === 'completed' && !b.revisionCreated ? { revisionCreated: true } : {}),
                  }
                : b
            )
          };
        }
        return day;
      });
      
      await updateDoc(planRef, { schedule: newSchedule });

      // Auto-create revision when marking as completed
      if (newStatus === 'completed' && block && !block.revisionCreated) {
        try {
          const nextDate = getRevisionSuggestions(100, 0)[0].date;
          await addDoc(collection(db, 'users', user.uid, 'revisions'), {
            subject: block.subject,
            topic: block.topic,
            scheduledDate: Timestamp.fromDate(nextDate),
            status: 'pending',
            cycleStep: 0,
            reviewCount: 0,
            contentLinks: {
              lessonIds: block.linkedLessonIds || [],
              quizIds: block.linkedQuizIds || [],
              flashcardIds: block.linkedFlashcardIds || [],
            },
            completedItems: { lessonIds: [], quizIds: [], flashcardIds: [] },
            youtubeUrls: block.youtubeUrls || [],
            updatedAt: serverTimestamp(),
          });
        } catch (revErr) {
          console.error('Erro ao criar revisão automática', revErr);
        }
      }

      window.dispatchEvent(new Event('study-plan-updated'));
    } catch(err) {
      console.error('Erro ao atualizar bloco', err);
    }
  };

  const handleSaveVideo = async (url: string, itemType: string, id: string, originalDate: string, blockIndex: number) => {
    if (!user) return;
    try {
      if (itemType === 'revision') {
        const revRef = doc(db, 'users', user.uid, 'revisions', id);
        const rev = revisions.find(r => r.id === id);
        if (!rev) return;
        const currentUrls = rev.youtubeUrls || (rev.youtubeUrl ? [rev.youtubeUrl] : []);
        if (!currentUrls.includes(url)) {
          await setDoc(revRef, { youtubeUrls: [...currentUrls, url] }, { merge: true });
        }
      } else {
        if (!planId || !plan) return;
        const planRef = doc(db, 'users', user.uid, 'studyPlans', planId);
        const newSchedule = [...plan.schedule];
        const dayIndex = newSchedule.findIndex((d: any) => d.date === originalDate);
        if (dayIndex === -1) return;
        const block = newSchedule[dayIndex].blocks[blockIndex];
        const currentUrls = block.youtubeUrls || (block.youtubeUrl ? [block.youtubeUrl] : []);
        if (!currentUrls.includes(url)) {
          block.youtubeUrls = [...currentUrls, url];
          await updateDoc(planRef, { schedule: newSchedule });
        }
      }
    } catch (err) {
      console.error('Erro ao adicionar video', err);
    }
  };

  const handleRemoveVideo = async (urlToRemove: string, itemType: string, id: string, originalDate: string, blockIndex: number) => {
    if (!user) return;
    if (!window.confirm('Remover vídeo?')) return;
    try {
      if (itemType === 'revision') {
        const revRef = doc(db, 'users', user.uid, 'revisions', id);
        const rev = revisions.find(r => r.id === id);
        if (!rev) return;
        const currentUrls = rev.youtubeUrls || (rev.youtubeUrl ? [rev.youtubeUrl] : []);
        await setDoc(revRef, { youtubeUrls: currentUrls.filter((u: string) => u !== urlToRemove) }, { merge: true });
      } else {
        if (!planId || !plan) return;
        const planRef = doc(db, 'users', user.uid, 'studyPlans', planId);
        const newSchedule = [...plan.schedule];
        const dayIndex = newSchedule.findIndex((d: any) => d.date === originalDate);
        if (dayIndex === -1) return;
        const block = newSchedule[dayIndex].blocks[blockIndex];
        const currentUrls = block.youtubeUrls || (block.youtubeUrl ? [block.youtubeUrl] : []);
        block.youtubeUrls = currentUrls.filter((u: string) => u !== urlToRemove);
        await updateDoc(planRef, { schedule: newSchedule });
      }
    } catch (err) {
      console.error('Erro ao remover video', err);
    }
  };

  const handleRescheduleRevision = async (rev: any) => {
    if (!user) return;
    try {
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
      
      awardPoints(15, 'complete_revision');
      setConfirmingRevision(null);
    } catch (err) {
      console.error('Erro ao reagendar revisão', err);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed right-[6.25rem] bottom-6 z-[10005] w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 ${
          todayAllDone
            ? 'bg-green-500 hover:bg-green-600'
            : todayBlocks.length > 0
              ? 'bg-indigo-500 hover:bg-indigo-600'
              : 'bg-gray-400 hover:bg-gray-500'
        } ${isHidden ? 'opacity-0 translate-x-12 pointer-events-none' : 'opacity-100 translate-x-0'}`}
        title="Estudos de hoje"
      >
        <BookOpen className="w-6 h-6 text-white" />
        {allPlansTodayPending > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {allPlansTodayPending}
          </span>
        )}
      </button>

      {/* Sidebar panel */}
      {open && (
        <div className="fixed right-4 bottom-[5.5rem] z-[10005] w-80 max-h-[60vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <div>
              <p className="font-bold text-sm">{planTitle}</p>
              <div className="flex items-center gap-2 mt-1">
                <button onClick={() => setCurrentDate(subDays(currentDate, 1))} className="p-1 bg-black/10 hover:bg-black/20 rounded">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <p className="text-xs font-semibold uppercase tracking-wider min-w-[100px] text-center">
                  {isToday(currentDate) ? 'Hoje' : format(currentDate, "dd 'de' MMM", { locale: ptBR })}
                </p>
                <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-1 bg-black/10 hover:bg-black/20 rounded">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {currentBlocks.length === 0 && currentRevisions.length === 0 && (!showOverdue || (overdueBlocks.length === 0 && overdueRevisions.length === 0)) ? (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum estudo agendado para esta data</p>
              </div>
            ) : (
              <>
                {/* Current Date Blocks */}
                {currentBlocks.length > 0 && (
                  <div className="space-y-2">
                    {allDone && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
                        <p className="text-sm font-bold text-green-700 dark:text-green-400">✅ Tudo concluído!</p>
                      </div>
                    )}
                    {currentBlocks.map((block: any, idx: number) => (
                      <div
                        key={block.id || idx}
                        className={`p-3 rounded-xl border transition-all ${
                          block.status === 'completed'
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                            : 'bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-600'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button 
                            onClick={() => handleToggleComplete(currentStr, idx, block.status)}
                            className="mt-0.5 hover:scale-110 transition-transform focus:outline-none"
                            title={block.status === 'completed' ? 'Marcar como pendente' : 'Marcar como concluído'}
                          >
                            {block.status === 'completed' ? (
                              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-indigo-400 dark:border-indigo-500 hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"></div>
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-semibold truncate transition-colors ${block.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                              {block.subject}
                            </p>
                            <p className={`text-xs ${block.status === 'completed' ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
                              {block.topic} • {block.hours}h
                            </p>
                            
                            {/* Play Focus Timer */}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                window.dispatchEvent(new CustomEvent('open-focus-timer', { detail: { subject: block.subject, topic: block.topic } }));
                              }}
                              className="mt-1 flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-[10px] font-bold uppercase tracking-wider"
                            >
                              <Play className="w-3 h-3" /> Focar
                            </button>

                            {/* Múltiplos vídeos */}
                            <ItemVideoManager
                              itemType="block"
                              id={block.id || `idx-${idx}`}
                              originalDate={currentStr}
                              blockIndex={idx}
                              subject={block.subject}
                              topic={block.topic}
                              urls={block.youtubeUrls || (block.youtubeUrl ? [block.youtubeUrl] : [])}
                              apiKey={apiKey}
                              onSave={handleSaveVideo}
                              onRemove={handleRemoveVideo}
                            />

                            {/* Gerar Conteúdo (Aula + Questões + Flashcards) */}
                            <InlineContentGenerator
                              subject={block.subject}
                              topic={block.topic}
                              apiKey={apiKey}
                              user={user}
                              planId={planId}
                              plan={plan}
                              originalDate={currentStr}
                              blockIndex={idx}
                              selectedBanca={selectedBanca}
                              itemType="block"
                              block={block}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Current Date Revisions */}
                {currentRevisions.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center gap-2 mb-2">
                       <RefreshCw className="w-4 h-4 text-indigo-500" />
                       <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Revisões de Hoje</span>
                    </div>
                    {currentRevisions.map((rev: any) => (
                      <div
                        key={rev.id}
                        className="group p-3 rounded-xl border transition-all bg-indigo-50/30 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800 relative overflow-hidden"
                      >
                        {confirmingRevision === rev.id ? (
                          <div className="absolute inset-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur flex items-center justify-between p-3 z-10 animate-in fade-in">
                             <p className="text-xs font-bold text-gray-700 dark:text-gray-200">Reagendar revisão?</p>
                             <div className="flex gap-2">
                               <button onClick={() => setConfirmingRevision(null)} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancelar</button>
                               <button onClick={() => handleRescheduleRevision(rev)} className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1"><Check className="w-3 h-3"/> Confirmar</button>
                             </div>
                          </div>
                        ) : null}
                        <div className="flex items-start gap-3">
                          <button 
                            onClick={() => setConfirmingRevision(rev.id)}
                            className="mt-0.5 hover:scale-110 transition-transform focus:outline-none"
                            title="Marcar revisão como concluída"
                          >
                            <div className="w-5 h-5 rounded-full border-2 border-indigo-400 dark:border-indigo-500 hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"></div>
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">
                              {rev.subject}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {rev.topic}
                            </p>

                            {/* Play Focus Timer */}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                window.dispatchEvent(new CustomEvent('open-focus-timer', { detail: { subject: rev.subject, topic: rev.topic } }));
                              }}
                              className="mt-1 flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-[10px] font-bold uppercase tracking-wider"
                            >
                              <Play className="w-3 h-3" /> Focar
                            </button>

                            <ItemVideoManager
                              itemType="revision"
                              id={rev.id}
                              originalDate={currentStr}
                              blockIndex={0}
                              subject={rev.subject}
                              topic={rev.topic}
                              urls={rev.youtubeUrls || (rev.youtubeUrl ? [rev.youtubeUrl] : [])}
                              apiKey={apiKey}
                              onSave={handleSaveVideo}
                              onRemove={handleRemoveVideo}
                            />

                            <InlineContentGenerator
                              subject={rev.subject}
                              topic={rev.topic}
                              apiKey={apiKey}
                              user={user}
                              planId={planId}
                              plan={plan}
                              originalDate={currentStr}
                              blockIndex={0}
                              selectedBanca={selectedBanca}
                              itemType="revision"
                              itemId={rev.id}
                              block={rev}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Overdue Items Container */}
                {showOverdue && (overdueBlocks.length > 0 || overdueRevisions.length > 0) && (
                  <div className="mt-4 pt-4 border-t border-red-100 dark:border-red-900/30 flex flex-col gap-4">
                    
                    {/* Aulas Atrasadas */}
                    {overdueBlocks.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Aulas Atrasadas</span>
                        </div>
                        {overdueBlocks.map((block: any, idx: number) => (
                          <div
                            key={`overdue-${idx}`}
                            className="group p-3 rounded-xl border bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/50 transition-all"
                          >
                            <div className="flex items-start gap-3">
                              <button 
                                onClick={() => handleToggleComplete(block.originalDate, block.blockIndex, block.status)}
                                className="mt-0.5 hover:scale-110 transition-transform focus:outline-none"
                                title="Marcar como concluído"
                              >
                                <div className="w-5 h-5 rounded-full border-2 border-red-400 dark:border-red-500 hover:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"></div>
                              </button>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold truncate transition-colors text-gray-900 dark:text-white">
                                  {block.subject}
                                </p>
                                <p className="text-xs text-red-500 dark:text-red-400 font-medium">
                                  {format(parseISO(block.originalDate), "dd 'de' MMM", { locale: ptBR })}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  {block.topic} • {block.hours}h
                                </p>
                                
                                {/* Play Focus Timer */}
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.dispatchEvent(new CustomEvent('open-focus-timer', { detail: { subject: block.subject, topic: block.topic } }));
                                  }}
                                  className="mt-1 flex items-center gap-1 px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-[10px] font-bold uppercase tracking-wider"
                                >
                                  <Play className="w-3 h-3" /> Focar
                                </button>
                                
                                <ItemVideoManager
                                  itemType="block"
                                  id={block.id || `overdue-${idx}`}
                                  originalDate={block.originalDate}
                                  blockIndex={block.blockIndex}
                                  subject={block.subject}
                                  topic={block.topic}
                                  urls={block.youtubeUrls || (block.youtubeUrl ? [block.youtubeUrl] : [])}
                                  apiKey={apiKey}
                                  onSave={handleSaveVideo}
                                  onRemove={handleRemoveVideo}
                                />

                                <InlineContentGenerator
                                  subject={block.subject}
                                  topic={block.topic}
                                  apiKey={apiKey}
                                  user={user}
                                  planId={planId}
                                  plan={plan}
                                  originalDate={block.originalDate}
                                  blockIndex={block.blockIndex}
                                  selectedBanca={selectedBanca}
                                  itemType="block"
                                  block={block}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Revisões Atrasadas */}
                    {overdueRevisions.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <RefreshCw className="w-4 h-4 text-orange-500" />
                          <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">Revisões Atrasadas</span>
                        </div>
                        {overdueRevisions.map((rev: any) => (
                          <div key={`overdue-rev-${rev.id}`} className="group p-3 rounded-xl border transition-all bg-orange-50/50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/50 relative overflow-hidden">
                            {confirmingRevision === rev.id ? (
                              <div className="absolute inset-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur flex items-center justify-between p-3 z-10 animate-in fade-in">
                                 <p className="text-xs font-bold text-gray-700 dark:text-gray-200">Reagendar revisão?</p>
                                 <div className="flex gap-2">
                                   <button onClick={() => setConfirmingRevision(null)} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancelar</button>
                                   <button onClick={() => handleRescheduleRevision(rev)} className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1"><Check className="w-3 h-3"/> Confirmar</button>
                                 </div>
                              </div>
                            ) : null}
                            <div className="flex items-start gap-3">
                              <button 
                                onClick={() => setConfirmingRevision(rev.id)}
                                className="mt-0.5 hover:scale-110 transition-transform focus:outline-none"
                                title="Marcar revisão como concluída"
                              >
                                <div className="w-5 h-5 rounded-full border-2 border-orange-400 dark:border-orange-500 hover:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors"></div>
                              </button>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">
                                  {rev.subject}
                                </p>
                                <p className="text-xs text-orange-500 dark:text-orange-400 font-medium">
                                  {format(parseISO(rev.originalDate), "dd 'de' MMM", { locale: ptBR })}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  {rev.topic}
                                </p>

                                {/* Play Focus Timer */}
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.dispatchEvent(new CustomEvent('open-focus-timer', { detail: { subject: rev.subject, topic: rev.topic } }));
                                  }}
                                  className="mt-1 flex items-center gap-1 px-2 py-1 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors text-[10px] font-bold uppercase tracking-wider"
                                >
                                  <Play className="w-3 h-3" /> Focar
                                </button>
                                
                                <ItemVideoManager
                                  itemType="revision"
                                  id={rev.id}
                                  originalDate={rev.originalDate}
                                  blockIndex={0}
                                  subject={rev.subject}
                                  topic={rev.topic}
                                  urls={rev.youtubeUrls || (rev.youtubeUrl ? [rev.youtubeUrl] : [])}
                                  apiKey={apiKey}
                                  onSave={handleSaveVideo}
                                  onRemove={handleRemoveVideo}
                                />

                                <InlineContentGenerator
                                  subject={rev.subject}
                                  topic={rev.topic}
                                  apiKey={apiKey}
                                  user={user}
                                  planId={planId}
                                  plan={plan}
                                  originalDate={rev.originalDate}
                                  blockIndex={0}
                                  selectedBanca={selectedBanca}
                                  itemType="revision"
                                  itemId={rev.id}
                                  block={rev}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              {(overdueBlocks.length > 0 || overdueRevisions.length > 0) ? (
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={showOverdue}
                    onChange={(e) => setShowOverdue(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-500 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 w-3.5 h-3.5"
                  />
                  Mostrar Atrasadas ({overdueBlocks.length + overdueRevisions.length})
                </label>
              ) : (
                <div className="text-xs font-medium text-green-600 dark:text-green-500 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Nenhuma pendência
                </div>
              )}
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {completedCount}/{currentBlocks.length} estudos hoje
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
