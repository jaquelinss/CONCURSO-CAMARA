import { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { Play, Pause, Square, Settings, X, GripHorizontal } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCustomSubjects } from '../contexts/CustomSubjectsContext';
import { themes } from '../lib/constants';
import { saveFocusSession } from '../lib/focus.service';
import { format } from 'date-fns';

type TimerMode = 'stopwatch' | 'pomodoro';
type TimerStatus = 'idle' | 'running' | 'paused' | 'break';

export interface FocusTimerEventDetail {
  subject?: string;
  topic?: string;
}

export default function FocusTimerWidget() {
  const { user } = useAuth();
  const { customSubjects } = useCustomSubjects();
  const [isOpen, setIsOpen] = useState(false);
  
  const [position, setPosition] = useState<{x: number, y: number}>(() => {
    try {
      const saved = localStorage.getItem('focus_timer_pos');
      if (saved) return JSON.parse(saved);
      return { x: 24, y: 100 };
    } catch {
      return { x: 24, y: 100 };
    }
  });

  const nodeRef = useRef<HTMLDivElement>(null);

  // Seleção de Matéria
  const [subject, setSubject] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  
  // Lista unificada de matérias
  const allSubjects = Array.from(new Set([...Object.keys(themes), ...customSubjects.map(s => s.id)])).sort();

  // Configurações do Timer
  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [showConfig, setShowConfig] = useState(false);

  // Estado do Timer Interno
  const [secondsElapsed, setSecondsElapsed] = useState(0); // Para cronômetro
  const [secondsRemaining, setSecondsRemaining] = useState(workMinutes * 60); // Para pomodoro
  const [currentSessionSeconds, setCurrentSessionSeconds] = useState(0); // Tempo acumulado na sessão atual para salvar

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Escuta evento para abrir o timer
  useEffect(() => {
    const handleOpenTimer = (e: Event) => {
      const customEvent = e as CustomEvent<FocusTimerEventDetail>;
      setIsOpen(true);
      if (customEvent.detail) {
        if (customEvent.detail.subject) setSubject(customEvent.detail.subject);
        if (customEvent.detail.topic) setTopic(customEvent.detail.topic);
        
        // Se receber matéria e estiver idle, já tenta focar
        if (status === 'idle') {
          // Não dar play automático para não assustar, mas já preenche
        }
      }
    };

    window.addEventListener('open-focus-timer', handleOpenTimer);
    return () => window.removeEventListener('open-focus-timer', handleOpenTimer);
  }, [status]);

  // Atualiza tempo do pomodoro se mudar configuração e estiver idle
  useEffect(() => {
    if (status === 'idle' && mode === 'pomodoro') {
      setSecondsRemaining(workMinutes * 60);
    }
  }, [workMinutes, mode, status]);

  // Lógica principal do Timer
  useEffect(() => {
    if (status === 'running' || status === 'break') {
      timerRef.current = setInterval(() => {
        if (mode === 'stopwatch') {
          setSecondsElapsed(prev => prev + 1);
          setCurrentSessionSeconds(prev => prev + 1);
        } else if (mode === 'pomodoro') {
          setSecondsRemaining(prev => {
            if (prev <= 1) {
              handleTimerComplete();
              return 0;
            }
            if (status === 'running') {
              setCurrentSessionSeconds(sec => sec + 1);
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, mode]);

  const handleTimerComplete = async () => {
    if (status === 'running') {
      // Terminou Pomodoro, vai pro break
      playAlarm();
      await finishAndSaveSession();
      setStatus('break');
      setSecondsRemaining(breakMinutes * 60);
    } else if (status === 'break') {
      // Terminou break, volta pra idle
      playAlarm();
      setStatus('idle');
      setSecondsRemaining(workMinutes * 60);
    }
  };

  const playAlarm = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.5;
      audio.play();
    } catch (e) {
      console.error(e);
    }
  };

  const togglePlayPause = () => {
    if (!subject) {
      alert("Por favor, selecione uma matéria primeiro!");
      return;
    }
    if (status === 'idle' || status === 'paused') {
      setStatus('running');
    } else if (status === 'running') {
      setStatus('paused');
    }
  };

  const stopTimer = async () => {
    if (currentSessionSeconds > 0) {
      await finishAndSaveSession();
    }
    setStatus('idle');
    setSecondsElapsed(0);
    setSecondsRemaining(workMinutes * 60);
  };

  const finishAndSaveSession = async () => {
    if (!user || !subject || currentSessionSeconds < 10) {
      // Não salva se for menos de 10 segundos
      setCurrentSessionSeconds(0);
      return;
    }
    
    const today = format(new Date(), 'yyyy-MM-dd');
    await saveFocusSession(user.uid, {
      subject,
      topic,
      durationSeconds: currentSessionSeconds,
      date: today
    });
    
    setCurrentSessionSeconds(0); // reseta para próxima sessão
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const currentTheme = themes[subject] || themes['Redação']; // Default theme
  const progressPercent = mode === 'pomodoro' 
    ? (status === 'break' 
        ? ((breakMinutes * 60 - secondsRemaining) / (breakMinutes * 60)) * 100 
        : ((workMinutes * 60 - secondsRemaining) / (workMinutes * 60)) * 100)
    : 100;

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".timer-drag-handle"
      defaultPosition={position}
      onStop={(_, data) => {
        setPosition({ x: data.x, y: data.y });
        localStorage.setItem('focus_timer_pos', JSON.stringify({ x: data.x, y: data.y }));
      }}
      bounds="body"
    >
      <div
        ref={nodeRef}
        className="fixed top-0 left-0 z-[9998] w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border-2 overflow-hidden pointer-events-auto transition-shadow flex flex-col"
        style={{ borderColor: subject ? currentTheme.color : '#e5e7eb' }}
      >
        {/* Header Draggable */}
        <div className="timer-drag-handle flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 cursor-grab active:cursor-grabbing select-none">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <GripHorizontal className="w-4 h-4" />
            <span className="font-semibold text-sm">Cronômetro de Foco</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowConfig(!showConfig); }}
              className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
              className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Corpo do Widget */}
        <div className="p-4 flex flex-col items-center">
          
          {/* Matéria Selecionada */}
          <div className="w-full mb-4">
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={status !== 'idle'}
              className="w-full text-sm font-semibold p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none cursor-pointer disabled:opacity-50"
              style={{ color: subject ? currentTheme.color : 'inherit' }}
            >
              <option value="">Selecione a Matéria...</option>
              {allSubjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          {/* Configs Painel Oculto */}
          {showConfig && status === 'idle' && (
            <div className="w-full p-3 mb-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <span className="font-medium text-gray-700 dark:text-gray-300">Modo:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMode('pomodoro')}
                    className={`px-2 py-1 rounded ${mode === 'pomodoro' ? 'bg-indigo-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                  >
                    Pomodoro
                  </button>
                  <button
                    onClick={() => setMode('stopwatch')}
                    className={`px-2 py-1 rounded ${mode === 'stopwatch' ? 'bg-indigo-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                  >
                    Cronômetro
                  </button>
                </div>
              </div>
              {mode === 'pomodoro' && (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Tempo de Foco (min)</span>
                    <input type="number" min="1" max="120" value={workMinutes} onChange={(e) => setWorkMinutes(Number(e.target.value))} className="w-16 p-1 text-center border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Tempo de Pausa (min)</span>
                    <input type="number" min="1" max="60" value={breakMinutes} onChange={(e) => setBreakMinutes(Number(e.target.value))} className="w-16 p-1 text-center border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Relógio Circular */}
          <div className="relative flex justify-center items-center w-40 h-40 mb-6">
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle cx="80" cy="80" r="76" fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-100 dark:text-gray-800" />
              <circle 
                cx="80" 
                cy="80" 
                r="76" 
                fill="none" 
                stroke={subject ? currentTheme.color : '#6366f1'} 
                strokeWidth="6" 
                strokeLinecap="round"
                strokeDasharray="477"
                strokeDashoffset={mode === 'pomodoro' ? 477 - (477 * progressPercent) / 100 : 0}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <div className="flex flex-col items-center justify-center z-10 text-center">
              <div className="text-3xl font-black text-gray-800 dark:text-gray-100 tracking-tighter">
                {mode === 'stopwatch' ? formatTime(secondsElapsed) : formatTime(secondsRemaining)}
              </div>
              <div className="text-xs font-bold uppercase mt-1" style={{ color: subject ? currentTheme.color : '#6366f1' }}>
                {status === 'break' ? 'PAUSA' : mode === 'pomodoro' ? 'FOCO' : 'ESTUDO'}
              </div>
            </div>
          </div>

          {/* Controles */}
          <div className="flex items-center gap-4">
            <button 
              onClick={stopTimer}
              disabled={status === 'idle'}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-red-100 text-red-500 hover:bg-red-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Parar e Salvar"
            >
              <Square className="w-5 h-5 fill-current" />
            </button>
            <button 
              onClick={togglePlayPause}
              className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
              style={{ backgroundColor: subject ? currentTheme.color : '#6366f1' }}
            >
              {status === 'running' ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
            </button>
          </div>

        </div>
      </div>
    </Draggable>
  );
}
