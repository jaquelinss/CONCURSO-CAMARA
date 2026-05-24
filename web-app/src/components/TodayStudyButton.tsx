import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, limit, doc, getDoc, updateDoc } from 'firebase/firestore';
import { BookOpen, X, CheckCircle, ChevronLeft, ChevronRight, CirclePlay } from 'lucide-react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLocation } from 'react-router-dom';

export default function TodayStudyButton({ isHidden = false }: { isHidden?: boolean }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [planTitle, setPlanTitle] = useState('');
  const [hasPlan, setHasPlan] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const location = useLocation();

  useEffect(() => {
    const fetchPlan = async () => {
      if (!user) return;
      try {
        const plansRef = collection(db, 'users', user.uid, 'studyPlans');
        const q = query(plansRef, orderBy('createdAt', 'desc'), limit(1));
        const snap = await getDocs(q);
        if (snap.empty) {
          setHasPlan(false);
          return;
        }

        const planData = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
        setHasPlan(true);
        setPlanId(planData.id);
        setPlanTitle(planData.title || 'Plano de Estudos');
        setPlan(planData);
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

  // Don't show on login page or if no plan
  if (location.pathname === '/login' || !hasPlan) return null;

  const currentStr = format(currentDate, 'yyyy-MM-dd');
  const currentSchedule = plan?.schedule?.find((d: any) => d.date === currentStr);
  const currentBlocks = currentSchedule?.blocks || [];

  const pendingBlocks = currentBlocks.filter((b: any) => b.status !== 'completed');
  const completedCount = currentBlocks.filter((b: any) => b.status === 'completed').length;
  const allDone = currentBlocks.length > 0 && pendingBlocks.length === 0;

  // Use today's blocks for the badge on the floating button
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todaySchedule = plan?.schedule?.find((d: any) => d.date === todayStr);
  const todayBlocks = todaySchedule?.blocks || [];
  const todayPendingBlocks = todayBlocks.filter((b: any) => b.status !== 'completed');
  const todayAllDone = todayBlocks.length > 0 && todayPendingBlocks.length === 0;

  const handleToggleComplete = async (idx: number, currentStatus: string) => {
    if (!user || !planId) return;
    try {
      const planRef = doc(db, 'users', user.uid, 'studyPlans', planId);
      const planSnap = await getDoc(planRef);
      if (!planSnap.exists()) return;
      
      const planData = planSnap.data();
      
      const newSchedule = planData.schedule.map((day: any) => {
        if (day.date === currentStr) {
          return {
            ...day,
            blocks: day.blocks.map((b: any, index: number) => 
              index === idx 
                ? { ...b, status: currentStatus === 'completed' ? 'pending' : 'completed' } 
                : b
            )
          };
        }
        return day;
      });
      
      await updateDoc(planRef, { schedule: newSchedule });
      window.dispatchEvent(new Event('study-plan-updated'));
    } catch(err) {
      console.error('Erro ao atualizar bloco', err);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed right-[6.25rem] bottom-6 z-[999] w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 ${
          todayAllDone
            ? 'bg-green-500 hover:bg-green-600'
            : todayBlocks.length > 0
              ? 'bg-indigo-500 hover:bg-indigo-600'
              : 'bg-gray-400 hover:bg-gray-500'
        } ${isHidden ? 'opacity-0 translate-x-12 pointer-events-none' : 'opacity-100 translate-x-0'}`}
        title="Estudos de hoje"
      >
        <BookOpen className="w-6 h-6 text-white" />
        {todayPendingBlocks.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {todayPendingBlocks.length}
          </span>
        )}
      </button>

      {/* Sidebar panel */}
      {open && (
        <div className="fixed right-4 bottom-[5.5rem] z-[999] w-80 max-h-[60vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
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
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {currentBlocks.length === 0 ? (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum estudo agendado para esta data</p>
              </div>
            ) : (
              <>
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
                        onClick={() => handleToggleComplete(idx, block.status)}
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
                        {block.youtubeUrl && (
                          <button
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('play-youtube-video', {
                                detail: { url: block.youtubeUrl, topic: block.topic, subject: block.subject }
                              }));
                            }}
                            className="flex items-center gap-1 mt-1 text-[10px] text-red-500 hover:text-red-600 font-bold transition-colors"
                          >
                            <CirclePlay className="w-3 h-3" />
                            Assistir Vídeo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-100 dark:border-gray-700 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {completedCount}/{currentBlocks.length} blocos concluídos
            </p>
          </div>
        </div>
      )}
    </>
  );
}
