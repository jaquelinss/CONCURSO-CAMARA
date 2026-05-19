import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { BookOpen, X, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLocation } from 'react-router-dom';

export default function TodayStudyButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [todayBlocks, setTodayBlocks] = useState<any[]>([]);
  const [planTitle, setPlanTitle] = useState('');
  const [hasPlan, setHasPlan] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const fetchTodayPlan = async () => {
      if (!user) return;
      try {
        const plansRef = collection(db, 'users', user.uid, 'studyPlans');
        const q = query(plansRef, orderBy('createdAt', 'desc'), limit(1));
        const snap = await getDocs(q);
        if (snap.empty) {
          setHasPlan(false);
          return;
        }

        const plan = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
        setHasPlan(true);
        setPlanTitle(plan.title || 'Plano de Estudos');

        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const todaySchedule = plan.schedule?.find((d: any) => d.date === todayStr);
        setTodayBlocks(todaySchedule?.blocks || []);
      } catch (err) {
        console.error('Erro ao buscar plano:', err);
      }
    };

    fetchTodayPlan();

    // Listen for plan updates
    const handler = () => fetchTodayPlan();
    window.addEventListener('study-plan-updated', handler);
    return () => window.removeEventListener('study-plan-updated', handler);
  }, [user]);

  // Don't show on login page or if no plan
  if (location.pathname === '/login' || !hasPlan) return null;

  const pendingBlocks = todayBlocks.filter(b => b.status !== 'completed');
  const completedCount = todayBlocks.filter(b => b.status === 'completed').length;
  const allDone = todayBlocks.length > 0 && pendingBlocks.length === 0;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed right-4 bottom-20 z-[999] w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 ${
          allDone
            ? 'bg-green-500 hover:bg-green-600'
            : todayBlocks.length > 0
              ? 'bg-indigo-500 hover:bg-indigo-600'
              : 'bg-gray-400 hover:bg-gray-500'
        }`}
        title="Estudos de hoje"
      >
        <BookOpen className="w-6 h-6 text-white" />
        {pendingBlocks.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {pendingBlocks.length}
          </span>
        )}
      </button>

      {/* Sidebar panel */}
      {open && (
        <div className="fixed right-4 bottom-36 z-[999] w-80 max-h-[60vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <div>
              <p className="font-bold text-sm">{planTitle}</p>
              <p className="text-xs opacity-80">{format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {todayBlocks.length === 0 ? (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum estudo agendado para hoje</p>
              </div>
            ) : (
              <>
                {allDone && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
                    <p className="text-sm font-bold text-green-700 dark:text-green-400">✅ Tudo concluído hoje!</p>
                  </div>
                )}
                {todayBlocks.map((block: any, idx: number) => (
                  <div
                    key={block.id || idx}
                    className={`p-3 rounded-xl border transition-all ${
                      block.status === 'completed'
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {block.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${block.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                          {block.subject}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{block.topic} • {block.hours}h</p>
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
              {completedCount}/{todayBlocks.length} blocos concluídos
            </p>
          </div>
        </div>
      )}
    </>
  );
}
