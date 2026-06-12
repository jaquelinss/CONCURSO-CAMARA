import { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Clock, TrendingUp, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getFocusSessions } from '../lib/focus.service';
import type { FocusSession } from '../lib/focus.service';
import { themes, defaultTheme } from '../lib/constants';
import { format, subDays, startOfWeek, endOfWeek, isWithinInterval, startOfDay } from 'date-fns';
import Navigation from '../components/Navigation';

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
      map.set(s.subject, (map.get(s.subject) || 0) + s.durationSeconds);
    });
    
    return Array.from(map.entries()).map(([subject, seconds]) => ({
      name: subject,
      value: Number((seconds / 3600).toFixed(2)), // em horas
      color: themes[subject]?.color || defaultTheme.color
    })).sort((a, b) => b.value - a.value);
  }, [filteredSessions]);

  const chartDataByDay = useMemo(() => {
    if (period === 'hoje') return [];
    
    const daysMap = new Map<string, number>();
    
    // Preparar chaves dos últimos 7 dias se for semana, ou usar as datas existentes
    if (period === 'semana') {
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = format(subDays(today, i), 'yyyy-MM-dd');
        daysMap.set(d, 0);
      }
    }

    filteredSessions.forEach(s => {
      daysMap.set(s.date, (daysMap.get(s.date) || 0) + s.durationSeconds);
    });

    return Array.from(daysMap.entries())
      .map(([date, seconds]) => ({
        date: format(new Date(date + 'T00:00:00'), 'dd/MM'),
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
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartDataBySubject}
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartDataBySubject.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`${value}h`, 'Tempo']} 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#fff', color: '#111827' }} 
                  />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right" 
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px', color: '#6b7280' }}
                  />
                </PieChart>
              </ResponsiveContainer>
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
