import { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useReward } from '../contexts/RewardContext';
import { CheckCircle, RotateCcw, Calendar, Clock, BookOpen, Trash2, ChevronDown, ChevronUp, Trophy, CirclePlay, Link, X, Sparkles, Search, Loader2, Undo2, RefreshCw, Plus } from 'lucide-react';
import { suggestVideoSearches, suggestRescheduleDate, generateStudyPlan } from '../lib/gemini';
import { format, isToday, isBefore, startOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import InlineContentGenerator from './InlineContentGenerator';
import { ItemVideoManager } from './TodayStudyButton';
interface StudyPlanViewProps {
  plan: any;
  onUpdate: () => void;
}

export default function StudyPlanView({ plan, onUpdate }: StudyPlanViewProps) {
  const { user, activeApiKey: apiKey } = useAuth();
  const { awardPoints } = useReward();
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingYoutube, setEditingYoutube] = useState<string | null>(null);
  const [youtubeInput, setYoutubeInput] = useState('');
  const [loadingAi, setLoadingAi] = useState<Record<string, boolean>>({});
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, any[]>>({});
  const [isReorganizing, setIsReorganizing] = useState(false);

  // Add Subject states
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectTopics, setNewSubjectTopics] = useState('');
  const [isSavingSubject, setIsSavingSubject] = useState(false);

  const handleAddSubject = async () => {
    if (!user) return;
    if (!newSubjectName.trim() || !newSubjectTopics.trim()) {
      alert("Preencha o nome da matéria e os tópicos.");
      return;
    }

    const topics = newSubjectTopics.split('\n').map(t => t.trim()).filter(Boolean);
    if (topics.length === 0) return;

    setIsSavingSubject(true);
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const futureDaysIndices: number[] = [];
      const schedule = plan.schedule || [];
      
      schedule.forEach((day: any, idx: number) => {
        if (day.date >= todayStr) {
          futureDaysIndices.push(idx);
        }
      });

      if (futureDaysIndices.length === 0) {
        alert("Não há dias futuros neste plano para alocar a nova matéria.");
        setIsSavingSubject(false);
        return;
      }

      const updatedSchedule = JSON.parse(JSON.stringify(schedule));
      const spacing = futureDaysIndices.length / topics.length;

      topics.forEach((topic, idx) => {
        const targetDayIndex = futureDaysIndices[Math.min(Math.floor(idx * spacing), futureDaysIndices.length - 1)];
        const day = updatedSchedule[targetDayIndex];
        day.blocks.push({
          id: `${day.date}-added-${Math.random().toString(36).substring(7)}`,
          subject: newSubjectName.trim(),
          topic: topic,
          status: 'pending',
          hours: 1
        });
      });

      const planRef = doc(db, 'users', user.uid, 'studyPlans', plan.id);
      await updateDoc(planRef, { schedule: updatedSchedule });
      plan.schedule = updatedSchedule;
      onUpdate();
      window.dispatchEvent(new Event('study-plan-updated'));
      
      setIsAddingSubject(false);
      setNewSubjectName('');
      setNewSubjectTopics('');
      alert("Matéria adicionada e distribuída com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao adicionar matéria.");
    } finally {
      setIsSavingSubject(false);
    }
  };

  // ─── Reorganize Plan ──────────────────────────────────────────────
  const reorganizePlan = async () => {
    if (!user || !apiKey) {
      alert('Configure sua chave da API do Gemini nas Configurações.');
      return;
    }

    const overdueCount = schedule.filter((day: any) => {
      const d = parseISO(day.date);
      if (isToday(d) || !isBefore(d, startOfDay(new Date()))) return false;
      return day.blocks?.some((b: any) => b.status === 'pending');
    }).length;

    if (overdueCount === 0) {
      alert('Não há matérias atrasadas para reorganizar!');
      return;
    }

    if (!window.confirm(
      `Você tem ${overdueCount} dia(s) com matéria(s) atrasada(s).\n\n` +
      `A reorganização vai:\n` +
      `• Manter todas as matérias já concluídas ✅\n` +
      `• Redistribuir as pendentes de hoje até a prova\n` +
      `• Preservar links de vídeos e conteúdos vinculados\n\n` +
      `Deseja reorganizar o plano?`
    )) return;

    setIsReorganizing(true);
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');

      // 1. Collect ALL completed blocks (from any day) to preserve them
      const completedBlocks: { date: string; block: any }[] = [];
      const completedTopics = new Set<string>(); // track completed subject|||topic pairs
      schedule.forEach((day: any) => {
        day.blocks?.forEach((b: any) => {
          if (b.status === 'completed') {
            completedBlocks.push({ date: day.date, block: { ...b } });
            completedTopics.add(`${b.subject}|||${b.topic}`);
          }
        });
      });

      // 2. Collect ONLY pending blocks whose topic was NOT already completed elsewhere
      const pendingBlocks: any[] = [];
      schedule.forEach((day: any) => {
        day.blocks?.forEach((b: any) => {
          if (b.status === 'pending') {
            const key = `${b.subject}|||${b.topic}`;
            if (!completedTopics.has(key)) {
              pendingBlocks.push({ ...b, fromDate: day.date });
            }
          }
        });
      });

      if (pendingBlocks.length === 0) {
        alert('Não há blocos pendentes para reorganizar.');
        setIsReorganizing(false);
        return;
      }

      // 3. Extract unique subjects with their PENDING-ONLY topics
      const subjectMap: Record<string, Set<string>> = {};
      pendingBlocks.forEach(b => {
        if (!subjectMap[b.subject]) subjectMap[b.subject] = new Set();
        subjectMap[b.subject].add(b.topic);
      });

      const subjects = Object.entries(subjectMap).map(([name, topics]) => ({
        name,
        topics: Array.from(topics),
      }));

      // 4. Build a map of linked content to preserve (youtubeUrls, linkedLessonIds, etc.)
      const contentMap: Record<string, any> = {};
      pendingBlocks.forEach(b => {
        const key = `${b.subject}|||${b.topic}`;
        if (!contentMap[key]) contentMap[key] = {};
        if (b.youtubeUrls?.length) contentMap[key].youtubeUrls = b.youtubeUrls;
        if (b.youtubeUrl) contentMap[key].youtubeUrl = b.youtubeUrl;
        if (b.linkedLessonIds?.length) contentMap[key].linkedLessonIds = b.linkedLessonIds;
        if (b.linkedQuizIds?.length) contentMap[key].linkedQuizIds = b.linkedQuizIds;
        if (b.linkedFlashcardIds?.length) contentMap[key].linkedFlashcardIds = b.linkedFlashcardIds;
      });

      // 5. Call Gemini to generate new schedule (only with pending topics)
      const result = await generateStudyPlan({
        subjects,
        hoursPerDay: plan.hoursPerDay,
        studyDays: plan.studyDays || ['seg', 'ter', 'qua', 'qui', 'sex'],
        examDate: plan.examDate,
        startDate: todayStr,
        customInstructions: 'Este é um plano REORGANIZADO. O aluno ficou com matérias atrasadas e precisa recuperar o conteúdo. NÃO inclua tópicos que já foram estudados. Distribua de forma equilibrada, priorizando matérias com mais tópicos pendentes.',
      }, apiKey);

      // 6. Process new schedule blocks - add IDs, status, and restore linked content
      const newScheduleDays = result.schedule.map((day: any) => ({
        ...day,
        blocks: day.blocks.map((block: any, idx: number) => {
          const key = `${block.subject}|||${block.topic}`;
          const linked = contentMap[key] || {};
          return {
            ...block,
            id: `${day.date}-${idx}`,
            status: 'pending',
            ...linked,
          };
        }),
      }));

      // 7. Group completed blocks by date
      const completedByDate: Record<string, any[]> = {};
      completedBlocks.forEach(({ date, block }) => {
        if (!completedByDate[date]) completedByDate[date] = [];
        completedByDate[date].push(block);
      });

      // 8. Merge: insert completed blocks into the new schedule at their original dates
      // Also add standalone completed-only days that aren't in the new schedule
      const newDatesSet = new Set(newScheduleDays.map((d: any) => d.date));

      // Add completed blocks to matching new schedule days
      const mergedNew = newScheduleDays.map((day: any) => {
        const completed = completedByDate[day.date] || [];
        if (completed.length === 0) return day;
        return {
          ...day,
          blocks: [...completed, ...day.blocks],
        };
      });

      // Add past completed-only days that don't overlap with the new schedule
      const pastCompletedDays = Object.entries(completedByDate)
        .filter(([date]) => !newDatesSet.has(date))
        .map(([date, blocks]) => ({ date, blocks }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const mergedSchedule = [...pastCompletedDays, ...mergedNew]
        .sort((a, b) => a.date.localeCompare(b.date));

      // 7. Update Firestore
      const planRef = doc(db, 'users', user.uid, 'studyPlans', plan.id);
      await updateDoc(planRef, { schedule: mergedSchedule });
      plan.schedule = mergedSchedule;
      onUpdate();
      window.dispatchEvent(new Event('study-plan-updated'));

      alert('✅ Plano reorganizado com sucesso! As matérias pendentes foram redistribuídas.');
    } catch (err) {
      console.error('Erro ao reorganizar plano:', err);
      alert('Erro ao reorganizar o plano. Verifique sua chave API e tente novamente.');
    } finally {
      setIsReorganizing(false);
    }
  };

  const addYoutubeUrl = async (dayDate: string, blockId: string, url: string) => {
    if (!user || !url.trim()) return;
    try {
      const newSchedule = schedule.map((day: any) => {
        if (day.date !== dayDate) return day;
        return {
          ...day,
          blocks: day.blocks.map((b: any) => {
            if (b.id !== blockId) return b;
            const currentUrls = b.youtubeUrls || (b.youtubeUrl ? [b.youtubeUrl] : []);
            if (currentUrls.includes(url.trim())) return b; // avoid duplicates
            return { ...b, youtubeUrls: [...currentUrls, url.trim()] };
          }),
        };
      });
      const planRef = doc(db, 'users', user.uid, 'studyPlans', plan.id);
      await updateDoc(planRef, { schedule: newSchedule });
      plan.schedule = newSchedule;
      onUpdate();
      window.dispatchEvent(new Event('study-plan-updated'));
      setYoutubeInput(''); // clear input after adding
    } catch (err) {
      console.error('Erro ao salvar link do YouTube:', err);
    }
  };

  const removeYoutubeUrl = async (dayDate: string, blockId: string, urlToRemove: string) => {
    if (!user) return;
    try {
      const newSchedule = schedule.map((day: any) => {
        if (day.date !== dayDate) return day;
        return {
          ...day,
          blocks: day.blocks.map((b: any) => {
            if (b.id !== blockId) return b;
            const currentUrls = b.youtubeUrls || (b.youtubeUrl ? [b.youtubeUrl] : []);
            const newUrls = currentUrls.filter((u: string) => u !== urlToRemove);
            return { ...b, youtubeUrls: newUrls };
          }),
        };
      });
      const planRef = doc(db, 'users', user.uid, 'studyPlans', plan.id);
      await updateDoc(planRef, { schedule: newSchedule });
      plan.schedule = newSchedule;
      onUpdate();
      window.dispatchEvent(new Event('study-plan-updated'));
    } catch (err) {
      console.error('Erro ao remover link do YouTube:', err);
    }
  };


  const handleAiSearch = async (block: any) => {
    if (!user) return;
    setLoadingAi(prev => ({ ...prev, [block.id]: true }));
    try {
      const res = await suggestVideoSearches(block.subject, block.topic, apiKey || '');
      setAiSuggestions(prev => ({ ...prev, [block.id]: res.searches || [] }));
    } catch (err) {
      console.error('Erro ao buscar sugestões:', err);
      alert('Erro ao gerar buscas. Verifique sua chave API.');
    } finally {
      setLoadingAi(prev => ({ ...prev, [block.id]: false }));
    }
  };

  const schedule: any[] = plan.schedule || [];

  // Stats
  const totalBlocks = schedule.reduce((acc: number, day: any) => acc + (day.blocks?.filter((b: any) => b.status !== 'rescheduled').length || 0), 0);
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
      
      if (newStatus === 'completed') {
        awardPoints(10, 'complete_task');
      }
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

      const futureSchedule = schedule.slice(dayIdx + 1);
      if (futureSchedule.length === 0) {
        alert('Não há dias futuros disponíveis no plano para reagendar.');
        setUpdating(null);
        return;
      }

      // IA escolhe o dia
      let nextDate = futureSchedule[0].date; // Fallback
      if (apiKey) {
        try {
          const res = await suggestRescheduleDate(futureSchedule, block, apiKey);
          if (res.suggestedDate && futureSchedule.some((d: any) => d.date === res.suggestedDate)) {
            nextDate = res.suggestedDate;
          }
        } catch (e) {
          console.error('Erro na IA ao reagendar, usando o próximo dia', e);
        }
      }

      const nextDayIdx = schedule.findIndex((d: any) => d.date === nextDate);
      if (nextDayIdx < 0) {
        setUpdating(null);
        return;
      }

      const newSchedule = JSON.parse(JSON.stringify(schedule));
      
      // Mantém no dia original, mas marcado como reagendado
      newSchedule[dayIdx] = {
        ...newSchedule[dayIdx],
        blocks: newSchedule[dayIdx].blocks.map((b: any) => 
          b.id === blockId ? { ...b, status: 'rescheduled', rescheduledTo: nextDate } : b
        ),
      };
      
      // Adiciona cópia no dia de destino
      const newId = `${nextDate}-r${Date.now()}`;
      const rescheduledBlock = { 
        ...block, 
        id: newId, 
        status: 'pending',
        rescheduledFrom: dayDate,
        originalBlockId: blockId
      };
      
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

  const cancelReschedule = async (dayDate: string, blockId: string, rescheduledTo: string) => {
    if (!user) return;
    setUpdating(blockId);
    try {
      const newSchedule = JSON.parse(JSON.stringify(schedule));
      
      // Volta o bloco original para pending e remove rescheduledTo
      const origDayIdx = newSchedule.findIndex((d: any) => d.date === dayDate);
      if (origDayIdx >= 0) {
        newSchedule[origDayIdx] = {
          ...newSchedule[origDayIdx],
          blocks: newSchedule[origDayIdx].blocks.map((b: any) => 
            b.id === blockId ? { ...b, status: 'pending', rescheduledTo: null } : b
          )
        };
      }

      // Remove a cópia no dia de destino
      const targetDayIdx = newSchedule.findIndex((d: any) => d.date === rescheduledTo);
      if (targetDayIdx >= 0) {
        newSchedule[targetDayIdx] = {
          ...newSchedule[targetDayIdx],
          blocks: newSchedule[targetDayIdx].blocks.filter((b: any) => b.originalBlockId !== blockId)
        };
      }

      const planRef = doc(db, 'users', user.uid, 'studyPlans', plan.id);
      await updateDoc(planRef, { schedule: newSchedule });
      plan.schedule = newSchedule;
      onUpdate();
    } catch (err) {
      console.error('Erro ao cancelar reagendamento:', err);
    } finally {
      setUpdating(null);
    }
  };

  const rescheduleAllPendingBlocks = async (dayDate: string) => {
    if (!user) return;
    if (!window.confirm('Deseja reagendar todas as matérias pendentes deste dia para o próximo dia disponível?')) return;
    
    setUpdating(`all-${dayDate}`);
    try {
      const dayIdx = schedule.findIndex((d: any) => d.date === dayDate);
      if (dayIdx < 0) return;
      
      const futureSchedule = schedule.slice(dayIdx + 1);
      if (futureSchedule.length === 0) {
        alert('Não há dias futuros disponíveis no plano para reagendar.');
        setUpdating(null);
        return;
      }

      const newSchedule = JSON.parse(JSON.stringify(schedule));
      let hasChanges = false;
      
      const pendingBlocks = newSchedule[dayIdx].blocks.filter((b: any) => b.status === 'pending');
      if (pendingBlocks.length === 0) {
        setUpdating(null);
        return;
      }

      const nextDate = futureSchedule[0].date;
      const nextDayIdx = schedule.findIndex((d: any) => d.date === nextDate);
      
      const rescheduledBlocksToAdd: any[] = [];
      
      newSchedule[dayIdx] = {
        ...newSchedule[dayIdx],
        blocks: newSchedule[dayIdx].blocks.map((b: any) => {
          if (b.status === 'pending') {
            hasChanges = true;
            rescheduledBlocksToAdd.push({
              ...b,
              id: `${nextDate}-r${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              status: 'pending',
              rescheduledFrom: dayDate,
              originalBlockId: b.id
            });
            return { ...b, status: 'rescheduled', rescheduledTo: nextDate };
          }
          return b;
        })
      };
      
      if (hasChanges && nextDayIdx >= 0) {
        newSchedule[nextDayIdx] = {
          ...newSchedule[nextDayIdx],
          blocks: [...newSchedule[nextDayIdx].blocks, ...rescheduledBlocksToAdd]
        };
        
        const planRef = doc(db, 'users', user.uid, 'studyPlans', plan.id);
        await updateDoc(planRef, { schedule: newSchedule });
        plan.schedule = newSchedule;
        onUpdate();
      }
    } catch (err) {
      console.error('Erro ao reagendar todas:', err);
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
    const activeBlocks = blocks.filter((b: any) => b.status !== 'rescheduled');
    if (activeBlocks.length === 0) return 'empty';
    const allDone = activeBlocks.every((b: any) => b.status === 'completed');
    const someDone = activeBlocks.some((b: any) => b.status === 'completed');
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
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setIsAddingSubject(true)}
            className="px-3 py-2 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 rounded-lg transition-colors flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Adicionar Matéria
          </button>
          <button
            onClick={reorganizePlan}
            disabled={isReorganizing}
            className="px-3 py-2 text-sm text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
            title="Redistribuir matérias atrasadas mantendo o progresso"
          >
            {isReorganizing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Reorganizando...</>
            ) : (
              <><RefreshCw className="w-4 h-4" /> Reorganizar Plano</>
            )}
          </button>
          <button
            onClick={deletePlan}
            className="px-3 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" /> Excluir Plano
          </button>
        </div>
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
                  {/* Reschedule All Button */}
                  {day.blocks.some((b: any) => b.status === 'pending') && (
                    <div className="flex justify-end mb-3">
                      <button
                        onClick={() => rescheduleAllPendingBlocks(day.date)}
                        disabled={updating === `all-${day.date}`}
                        className="px-3 py-1.5 text-[11px] font-bold text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/50 dark:hover:bg-orange-900/40 transition-colors flex items-center gap-1.5"
                      >
                        {updating === `all-${day.date}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                        Reagendar Todas
                      </button>
                    </div>
                  )}
                  {day.blocks.map((block: any, idx: number) => (
                    <div
                      key={block.id || idx}
                      className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                        block.status === 'completed'
                          ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
                          : block.status === 'rescheduled'
                          ? 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 opacity-60'
                          : 'bg-white dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 w-full">
                        {block.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : block.status === 'rescheduled' ? (
                          <RotateCcw className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-500 flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-grow">
                          <p className={`font-semibold text-sm truncate ${block.status === 'completed' || block.status === 'rescheduled' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                            {block.subject}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{block.topic} • {block.hours}h</p>
                          
                          {block.status === 'rescheduled' && block.rescheduledTo && (
                            <p className="text-xs font-bold text-orange-500 dark:text-orange-400 mt-1">
                              Aula reagendada para o dia {format(parseISO(block.rescheduledTo), "dd/MM")}
                            </p>
                          )}

                          {/* Múltiplos vídeos */}
                          {block.status !== 'rescheduled' && (
                            <ItemVideoManager
                              itemType="block"
                              id={block.id}
                              originalDate={day.date}
                              blockIndex={idx}
                              subject={block.subject}
                              topic={block.topic}
                              urls={block.youtubeUrls || (block.youtubeUrl ? [block.youtubeUrl] : [])}
                              apiKey={apiKey}
                              onSave={async (url: string) => addYoutubeUrl(day.date, block.id, url)}
                              onRemove={async (url: string) => removeYoutubeUrl(day.date, block.id, url)}
                            />
                          )}

                          {/* Gerar Conteúdo (Aula + Questões + Flashcards) */}
                          {block.status !== 'rescheduled' && (
                            <InlineContentGenerator
                              subject={block.subject}
                              topic={block.topic}
                              apiKey={apiKey}
                              user={user}
                              planId={plan.id}
                              plan={plan}
                              originalDate={day.date}
                              blockIndex={idx}
                              selectedBanca={plan.banca || 'CESPE'}
                              itemType="block"
                              block={block}
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        {block.status === 'rescheduled' ? (
                          <button
                            onClick={() => cancelReschedule(day.date, block.id, block.rescheduledTo)}
                            disabled={updating === block.id}
                            className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-sm"
                            title="Cancelar reagendamento"
                          >
                            <Undo2 className="w-4 h-4" />
                            <span className="text-[10px] font-bold">Cancelar</span>
                          </button>
                        ) : (
                          <>
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
                                  title="Reagendar"
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
                            <button
                              onClick={() => {
                                if (editingYoutube === block.id) {
                                  setEditingYoutube(null);
                                } else {
                                  setEditingYoutube(block.id);
                                  setYoutubeInput(''); // Sempre abre vazio pra adicionar novo
                                }
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${(block.youtubeUrls?.length > 0 || block.youtubeUrl) ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                              title="Gerenciar vídeo aulas"
                            >
                              <CirclePlay className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                      {editingYoutube === block.id && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
                          
                          {/* Lista de vídeos já adicionados */}
                          {((block.youtubeUrls && block.youtubeUrls.length > 0) || block.youtubeUrl) && (
                            <div className="mb-3 space-y-2">
                              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vídeos Vinculados</p>
                              {(block.youtubeUrls || (block.youtubeUrl ? [block.youtubeUrl] : [])).map((url: string, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                                  <CirclePlay className="w-4 h-4 text-red-500 flex-shrink-0" />
                                  <span className="text-xs text-gray-600 dark:text-gray-300 truncate flex-grow" title={url}>{url}</span>
                                  <button
                                    onClick={() => removeYoutubeUrl(day.date, block.id, url)}
                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                                    title="Remover link"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Adicionar novo vídeo */}
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Vincular Novo Vídeo</p>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-grow">
                              <Link className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="url"
                                value={youtubeInput}
                                onChange={(e) => setYoutubeInput(e.target.value)}
                                placeholder="Cole o link do YouTube aqui..."
                                className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => addYoutubeUrl(day.date, block.id, youtubeInput)}
                                disabled={!youtubeInput.trim()}
                                className="px-3 py-2 text-xs bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                              >
                                Adicionar
                              </button>
                              <button
                                onClick={() => handleAiSearch(block)}
                                disabled={loadingAi[block.id]}
                                className="px-3 py-2 text-xs border border-indigo-200 text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300 rounded-lg font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors whitespace-nowrap flex items-center gap-1.5"
                              >
                                {loadingAi[block.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                IA Busca
                              </button>
                            </div>
                          </div>

                          {/* Painel de sugestões da IA */}
                          {aiSuggestions[block.id] && aiSuggestions[block.id].length > 0 && (
                            <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg">
                              <p className="text-xs font-bold text-indigo-800 dark:text-indigo-300 mb-2 flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5" /> Buscas Sugeridas
                              </p>
                              <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-3">
                                Clique na busca para abrir o YouTube. Copie o link do vídeo desejado e cole no campo acima.
                              </p>
                              <div className="space-y-2">
                                {aiSuggestions[block.id].map((sug: any, i: number) => (
                                  <div key={i} className="bg-white dark:bg-gray-800 p-2 rounded shadow-sm border border-indigo-100 dark:border-indigo-800/50">
                                    <a 
                                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(sug.query)}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-between group"
                                    >
                                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-red-500 transition-colors">
                                        "{sug.query}"
                                      </span>
                                      <Search className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                                    </a>
                                    <p className="text-xs text-gray-500 mt-1">Foca em: {sug.topicsCovered}</p>
                                    <p className="text-[10px] text-gray-400 italic mt-0.5">{sug.reason}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Adicionar Matéria Modal */}
      {isAddingSubject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative border border-gray-100 dark:border-gray-700">
            <button
              onClick={() => setIsAddingSubject(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-500" />
              Adicionar Matéria Extra
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              A nova matéria será distribuída automaticamente entre os dias restantes do plano de estudos, sem alterar as matérias atuais.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Nome da Matéria</label>
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                  placeholder="Ex: Direito Administrativo"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Tópicos para Estudar</label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Um tópico por linha. Ex: <br/>- Atos Administrativos<br/>- Licitações</p>
                <textarea
                  value={newSubjectTopics}
                  onChange={e => setNewSubjectTopics(e.target.value)}
                  rows={6}
                  placeholder="Atos Administrativos&#10;Licitações&#10;Agentes Públicos"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setIsAddingSubject(false)}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddSubject}
                disabled={isSavingSubject}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30"
              >
                {isSavingSubject ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                ) : (
                  'Distribuir no Plano'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
