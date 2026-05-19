import { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, RotateCcw, Calendar, Clock, BookOpen, Trash2, ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import { format, isToday, isBefore, startOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StudyPlanViewProps {
  plan: any;
  onUpdate: () => void;
}

export default function StudyPlanView({ plan, onUpdate }: StudyPlanViewProps) {
  const { user } = useAuth();
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const schedule: any[] = plan.schedule || [];

  // Stats
  const totalBlocks = schedule.reduce((acc: number, day: any) => acc + (day.blocks?.length || 0), 0);
  const completedBlocks = schedule.reduce((acc: number, day: any) =>
    acc + (day.blocks?.filter((b: any) => b.status === 'completed').length || 0), 0);
  const progressPercent = totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0;

  // Find today's entry
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayIndex = schedule.findIndex((d: any) => d.date === todayStr);

  // Auto-expand today
  const getExpandedDay = () => expandedDay ?? (todayIndex >= 0 ? schedule[todayIndex].date : schedule[0]?.date);

  const updateBlockStatus = async (dayDate: string, blockId: string, newStatus: string) => {
    if (!user) return;
    setUpdating(blockId);
    try {
      const newSchedule = schedule.map((day: any) => {
        if (day.date !== dayDate) return day;
        return {
          ...day,
          blocks: day.blocks.map((b: any) => b.id === blockId ? { ...b, status: newStatus } : b),
        };
      });
      const planRef = doc(db, 'users', user.uid, 'studyPlans', plan.id);
      await updateDoc(planRef, { schedule: newSchedule });
      plan.schedule = newSchedule;
      onUpdate();
    } catch (err) {
      console.error('Erro ao atualizar:', err);
    } finally {
      setUpdating(null);
    }
  };

  const rescheduleBlock = async (dayDate: string, blockId: string) => {
    if (!user) return;
    setUpdating(blockId);
    try {
      const dayIdx = schedule.findIndex((d: any) => d.date === dayDate);
      const block = schedule[dayIdx]?.blocks.find((b: any) => b.id === blockId);
      if (!block || dayIdx < 0) return;

      // Find the next available day
      let nextDayIdx = -1;
      for (let i = dayIdx + 1; i < schedule.length; i++) {
        nextDayIdx = i;
        break;
      }

      if (nextDayIdx < 0) {
        alert('Não há dias futuros disponíveis no plano para reagendar.');
        setUpdating(null);
        return;
      }

      const newSchedule = [...schedule];
      // Remove from current day
      newSchedule[dayIdx] = {
        ...newSchedule[dayIdx],
        blocks: newSchedule[dayIdx].blocks.filter((b: any) => b.id !== blockId),
      };
      // Add to next day
      const rescheduledBlock = { ...block, id: `${newSchedule[nextDayIdx].date}-r${Date.now()}`, status: 'pending' };
      newSchedule[nextDayIdx] = {
        ...newSchedule[nextDayIdx],
        blocks: [...newSchedule[nextDayIdx].blocks, rescheduledBlock],
      };

      const planRef = doc(db, 'users', user.uid, 'studyPlans', plan.id);
      await updateDoc(planRef, { schedule: newSchedule });
      plan.schedule = newSchedule;
      onUpdate();
    } catch (err) {
      console.error('Erro ao reagendar:', err);
    } finally {
      setUpdating(null);
    }
  };

  const deletePlan = async () => {
    if (!user) return;
    if (!window.confirm('Tem certeza que deseja excluir este plano de estudos? Esta ação não pode ser desfeita.')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'studyPlans', plan.id));
      onUpdate();
    } catch (err) {
      console.error('Erro ao excluir plano:', err);
    }
  };

  const getDayStatus = (day: any) => {
    const blocks = day.blocks || [];
    if (blocks.length === 0) return 'empty';
    const allDone = blocks.every((b: any) => b.status === 'completed');
    const someDone = blocks.some((b: any) => b.status === 'completed');
    if (allDone) return 'completed';
    if (someDone) return 'partial';
    const dayDate = parseISO(day.date);
    if (isBefore(dayDate, startOfDay(new Date())) && !isToday(dayDate)) return 'overdue';
    return 'pending';
  };

  const statusColors: Record<string, string> = {
    completed: 'border-green-400 bg-green-50 dark:bg-green-900/20',
    partial: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20',
    overdue: 'border-red-400 bg-red-50 dark:bg-red-900/20',
    pending: 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
    empty: 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-500" />
            {plan.title}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-3">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Prova: {new Date(plan.examDate + 'T12:00').toLocaleDateString('pt-BR')}</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {plan.hoursPerDay}h/dia</span>
          </p>
        </div>
        <button
          onClick={deletePlan}
          className="px-3 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-1"
        >
          <Trash2 className="w-4 h-4" /> Excluir Plano
        </button>
      </div>

      {/* Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Progresso Geral</span>
          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{completedBlocks}/{totalBlocks} blocos</span>
        </div>
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">{progressPercent}% concluído</p>
        {progressPercent === 100 && (
          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center gap-2 text-green-700 dark:text-green-400">
            <Trophy className="w-5 h-5" />
            <span className="font-bold text-sm">Parabéns! Você completou todo o plano! 🎉</span>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {schedule.map((day: any) => {
          const dayDate = parseISO(day.date);
          const isExpanded = getExpandedDay() === day.date;
          const status = getDayStatus(day);
          const dayIsToday = isToday(dayDate);

          return (
            <div
              key={day.date}
              className={`rounded-xl border-2 transition-all ${statusColors[status]} ${dayIsToday ? 'ring-2 ring-indigo-400 ring-offset-2 dark:ring-offset-gray-900' : ''}`}
            >
              {/* Day header */}
              <button
                onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    status === 'completed' ? 'bg-green-500' :
                    status === 'partial' ? 'bg-yellow-500' :
                    status === 'overdue' ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`} />
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">
                      {dayIsToday && <span className="text-indigo-600 dark:text-indigo-400 mr-1">HOJE —</span>}
                      {format(dayDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {day.blocks?.length || 0} blocos • {day.blocks?.reduce((a: number, b: any) => a + (b.hours || 0), 0)}h total
                    </p>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>

              {/* Day blocks */}
              {isExpanded && day.blocks && (
                <div className="px-4 pb-4 space-y-2">
                  {day.blocks.map((block: any) => (
                    <div
                      key={block.id}
                      className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                        block.status === 'completed'
                          ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
                          : 'bg-white dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {block.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-500 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className={`font-semibold text-sm truncate ${block.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                            {block.subject}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{block.topic} • {block.hours}h</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        {block.status !== 'completed' && (
                          <>
                            <button
                              onClick={() => updateBlockStatus(day.date, block.id, 'completed')}
                              disabled={updating === block.id}
                              className="p-1.5 text-green-500 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                              title="Concluir"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => rescheduleBlock(day.date, block.id)}
                              disabled={updating === block.id}
                              className="p-1.5 text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
                              title="Reagendar para próximo dia"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {block.status === 'completed' && (
                          <button
                            onClick={() => updateBlockStatus(day.date, block.id, 'pending')}
                            disabled={updating === block.id}
                            className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Desfazer"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
