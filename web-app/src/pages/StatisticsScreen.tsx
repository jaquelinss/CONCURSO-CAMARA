import { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Clock, TrendingUp, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getFocusSessions } from '../lib/focus.service';
import type { FocusSession } from '../lib/focus.service';
import { format, startOfWeek, endOfWeek, isWithinInterval, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Navigation from '../components/Navigation';

const SUBJECT_COLORS: Record<string, string> = {
  'Matemática': '#3b82f6',
  'Português': '#eab308',
  'Biologia': '#22c55e',
  'Física': '#f43f5e',
  'Química': '#06b6d4',
  'História': '#f97316',
  'Geografia': '#14b8a6',
  'Filosofia': '#6366f1',
  'Sociologia': '#a855f7',
  'Inglês': '#ef4444',
  'Espanhol': '#84cc16',
  'Redação': '#6b7280',
  'Medicina': '#0d9488',
  'Artes': '#e11d48',
  'Atualidades': '#c026d3',
  'Constituição Federal': '#f59e0b',
  'Tecnologia e Sociedade': '#0ea5e9',
  'Interpretação Textual': '#10b981',
  'Raciocínio Lógico-Matemático': '#2563eb',
  'Noções de Informática': '#0284c7',
  'Lei Orgânica de Caruaru': '#d97706',
  'Legislação Específica': '#b45309',
  'Administração Pública': '#059669',
  'Noções de Arquivologia': '#ea580c',
  'Noções de Direito Constitucional': '#d97706',
  'Noções de Direito Administrativo': '#10b981',
};
const FALLBACK_COLORS = ['#6366f1','#ec4899','#f97316','#22c55e','#3b82f6','#a855f7','#14b8a6','#eab308'];

export default function StatisticsScreen() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Períodos: 'hoje', 'semana', 'geral'
  const [period, setPeriod] = useState<'hoje' | 'semana' | 'geral'>('semana');

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  const loadSessions = async () => {
    setLoading(true);
    const data = await getFocusSessions(user!.uid);
    setSessions(data);
    setLoading(false);
  };

  // Filtragem e Agrupamento
  const filteredSessions = useMemo(() => {
    const today = startOfDay(new Date());
    const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Domingo
    const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

    return sessions.filter(session => {
      const sessionDate = startOfDay(new Date(session.date + 'T00:00:00'));
      if (period === 'hoje') return sessionDate.getTime() === today.getTime();
      if (period === 'semana') return isWithinInterval(sessionDate, { start: weekStart, end: weekEnd });
      return true; // geral
    });
  }, [sessions, period]);

  const stats = useMemo(() => {
    const totalSeconds = filteredSessions.reduce((acc, curr) => acc + curr.durationSeconds, 0);
    const todaySeconds = sessions
      .filter(s => s.date === format(new Date(), 'yyyy-MM-dd'))
      .reduce((acc, curr) => acc + curr.durationSeconds, 0);
    const weekSeconds = sessions
      .filter(s => {
        const d = startOfDay(new Date(s.date + 'T00:00:00'));
        return isWithinInterval(d, { start: startOfWeek(new Date(), { weekStartsOn: 0 }), end: endOfWeek(new Date(), { weekStartsOn: 0 }) });
      })
      .reduce((acc, curr) => acc + curr.durationSeconds, 0);

    return { totalSeconds, todaySeconds, weekSeconds };
  }, [sessions, filteredSessions]);

  const chartDataBySubject = useMemo(() => {
    const map = new Map<string, number>();
    filteredSessions.forEach(s => {
      if (s.subject) map.set(s.subject, (map.get(s.subject) || 0) + s.durationSeconds);
    });
    
    return Array.from(map.entries()).map(([subject, seconds], i) => ({
      name: subject,
      value: Number((seconds / 3600).toFixed(2)),
      minutes: Math.round(seconds / 60),
      color: SUBJECT_COLORS[subject] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]
    })).sort((a, b) => b.value - a.value);
  }, [filteredSessions]);

  const chartDataByDay = useMemo(() => {
    if (period === 'hoje') return [];
    
    const daysMap = new Map<string, number>();
    
    if (period === 'semana') {
      // Usar a semana real (domingo a sábado) igual ao filtro
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
      for (let i = 0; i < 7; i++) {
        const d = format(new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
        daysMap.set(d, 0);
      }
    } else {
      // Geral: inicializa com as datas que existem nas sessões
      filteredSessions.forEach(s => {
        if (!daysMap.has(s.date)) daysMap.set(s.date, 0);
      });
    }

    filteredSessions.forEach(s => {
      daysMap.set(s.date, (daysMap.get(s.date) || 0) + s.durationSeconds);
    });

    return Array.from(daysMap.entries())
      .map(([date, seconds]) => ({
        date: format(new Date(date + 'T00:00:00'), "EEE dd/MM", { locale: ptBR }).replace(/^(\w)/, c => c.toUpperCase()),
        rawDate: date,
        hours: Number((seconds / 3600).toFixed(2))
      }))
      .sort((a, b) => a.rawDate.localeCompare(b.rawDate));
  }, [filteredSessions, period]);

  const formatTimeStr = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    return `${h}h ${m}m`;
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Carregando estatísticas...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-500" />
            Estatísticas de Foco
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Acompanhe seu desempenho e tempo de estudo</p>
        </div>
        
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setPeriod('hoje')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${period === 'hoje' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
          >
            Hoje
          </button>
          <button
            onClick={() => setPeriod('semana')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${period === 'semana' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
          >
            Esta Semana
          </button>
          <button
            onClick={() => setPeriod('geral')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${period === 'geral' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
          >
            Geral
          </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tempo de foco total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatTimeStr(stats.totalSeconds)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tempo de foco desta semana</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatTimeStr(stats.weekSeconds)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tempo de foco hoje</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatTimeStr(stats.todaySeconds)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras */}
        {period !== 'hoje' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Tempo de foco ({period})</h3>
            <div className="h-72 w-full">
              {chartDataByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#fff', color: '#111827' }} 
                      formatter={(value: any) => [`${value}h`, 'Tempo']} 
                    />
                    <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">Nenhum dado neste período.</div>
              )}
            </div>
          </div>
        )}

        {/* Gráfico de Pizza por Matéria */}
        <div className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 ${period === 'hoje' ? 'lg:col-span-2' : ''}`}>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Distribuição por projeto</h3>
          <div className="h-72 w-full flex items-center justify-center">
            {chartDataBySubject.length > 0 ? (
              <div className="flex w-full h-full gap-4">
                <ResponsiveContainer width="60%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartDataBySubject}
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {chartDataBySubject.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(_value: any, _name: any, props: any) => [`${props.payload.minutes}min`, props.payload.name]}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#fff', color: '#111827' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 flex flex-col justify-center gap-2 overflow-y-auto pr-1">
                  {chartDataBySubject.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-700 dark:text-gray-300 truncate flex-1">{item.name}</span>
                      <span className="font-semibold text-gray-900 dark:text-white shrink-0">{item.minutes}min</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">Nenhum dado neste período.</div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
