import { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { Play, Pause, Square, Settings, X, GripHorizontal, Minus, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCustomSubjects } from '../contexts/CustomSubjectsContext';
import { useReward } from '../contexts/RewardContext';
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
  const { awardFocusPoints } = useReward();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('focus_timer_pos');
      if (saved) return JSON.parse(saved);
      return { x: 24, y: 100 };
    } catch {
      return { x: 24, y: 100 };
    }
  });

  // Size: controls em-based font size (0.7 = small, 1 = normal, 1.3 = large)
  const [fontSize, setFontSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('focus_timer_fontsize');
      if (saved) return parseFloat(saved);
      return 1;
    } catch {
      return 1;
    }
  });

  const nodeRef = useRef<HTMLDivElement>(null);

  const [subject, setSubject] = useState<string>('');
  const [topic, setTopic] = useState<string>('');

  const allSubjects = Array.from(
    new Set([...Object.keys(themes), ...customSubjects.map((s) => s.id)])
  ).sort();

  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [showConfig, setShowConfig] = useState(false);

  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(workMinutes * 60);
  const [currentSessionSeconds, setCurrentSessionSeconds] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleOpenTimer = (e: Event) => {
      const customEvent = e as CustomEvent<FocusTimerEventDetail>;
      setIsOpen(true);
      if (customEvent.detail) {
        if (customEvent.detail.subject) setSubject(customEvent.detail.subject);
        if (customEvent.detail.topic) setTopic(customEvent.detail.topic);
      }
    };
    window.addEventListener('open-focus-timer', handleOpenTimer);
    return () => window.removeEventListener('open-focus-timer', handleOpenTimer);
  }, [status]);

  // Auto-save a cada 5 minutos enquanto rodando
  useEffect(() => {
    if (status === 'running') {
      autoSaveRef.current = setInterval(async () => {
        if (currentSessionSeconds >= 60) {
          await finishAndSaveSession();
        }
      }, 5 * 60 * 1000);
    } else {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    }
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [status, currentSessionSeconds]);

  useEffect(() => {
    if (status === 'idle' && mode === 'pomodoro') {
      setSecondsRemaining(workMinutes * 60);
    }
  }, [workMinutes, mode, status]);

  useEffect(() => {
    if (status === 'running' || status === 'break') {
      timerRef.current = setInterval(() => {
        if (mode === 'stopwatch') {
          setSecondsElapsed((prev) => prev + 1);
          setCurrentSessionSeconds((prev) => prev + 1);
        } else if (mode === 'pomodoro') {
          setSecondsRemaining((prev) => {
            if (prev <= 1) {
              handleTimerComplete();
              return 0;
            }
            if (status === 'running') {
              setCurrentSessionSeconds((sec) => sec + 1);
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
      playAlarm();
      await finishAndSaveSession();
      setStatus('break');
      setSecondsRemaining(breakMinutes * 60);
    } else if (status === 'break') {
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

  const togglePlayPause = async () => {
    if (!subject) {
      alert('Por favor, selecione uma matéria primeiro!');
      return;
    }
    if (status === 'idle' || status === 'paused') {
      setStatus('running');
    } else if (status === 'running') {
      setStatus('paused');
      if (currentSessionSeconds >= 60) {
        await finishAndSaveSession();
      }
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
    if (!user || !subject || currentSessionSeconds < 60) {
      // Não salva se for menos de 1 minuto
      setCurrentSessionSeconds(0);
      return;
    }
    const today = format(new Date(), 'yyyy-MM-dd');
    await saveFocusSession(user.uid, {
      subject,
      topic,
      durationSeconds: currentSessionSeconds,
      date: today,
    });
    
    // Conceder pontos de foco acumulados
    awardFocusPoints(currentSessionSeconds);
    
    setCurrentSessionSeconds(0);
  };

  const handleClose = async () => {
    // Salva o tempo acumulado ao fechar se >= 60 segundos
    if (currentSessionSeconds >= 60) {
      await finishAndSaveSession();
    } else {
      setCurrentSessionSeconds(0);
    }
    if (status === 'running' || status === 'paused') setStatus('idle');
    setIsOpen(false);
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleFontSizeChange = (delta: number) => {
    const next = Math.min(1.4, Math.max(0.65, parseFloat((fontSize + delta).toFixed(2))));
    setFontSize(next);
    localStorage.setItem('focus_timer_fontsize', next.toString());
  };

  if (!isOpen) return null;

  const currentTheme = themes[subject] || themes['Redação'];
  const progressPercent =
    mode === 'pomodoro'
      ? status === 'break'
        ? ((breakMinutes * 60 - secondsRemaining) / (breakMinutes * 60)) * 100
        : ((workMinutes * 60 - secondsRemaining) / (workMinutes * 60)) * 100
      : 100;

  // em-based sizes that scale with fontSize
  const clockSize = `${10 * fontSize}em`;
  const r = 76;
  const circ = 2 * Math.PI * r;

  const renderFullWidget = () => (
    <Draggable
      nodeRef={nodeRef}
      handle=".timer-drag-handle"
      defaultPosition={position}
      onStop={(_, data) => {
        setPosition({ x: data.x, y: data.y });
        localStorage.setItem('focus_timer_pos', JSON.stringify({ x: data.x, y: data.y }));
      }}
    >
      <div
        ref={nodeRef}
        className={`fixed top-0 left-0 z-[9998] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border-2 overflow-hidden pointer-events-auto flex flex-col ${
          subject ? currentTheme.border : 'border-gray-200 dark:border-gray-700'
        }`}
        style={{ fontSize: `${fontSize}rem`, width: `${20 * fontSize}rem` }}
      >
        {/* Header */}
        <div className="timer-drag-handle flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 cursor-grab active:cursor-grabbing select-none">
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 overflow-hidden">
            <GripHorizontal className="w-3.5 h-3.5 shrink-0" />
            <span className="font-semibold text-xs truncate">Cronômetro de Foco</span>
          </div>
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Size controls */}
            <button
              onClick={() => handleFontSizeChange(-0.05)}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              title="Diminuir"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleFontSizeChange(0.05)}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              title="Aumentar"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              title="Configurações"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              title="Minimizar"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
            </button>
            <button
              onClick={handleClose}
              className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              title="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col items-center">
          {/* Subject Selector */}
          <div className="w-full mb-3">
            <select
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                if (e.target.value) localStorage.setItem('focus_timer_last_subject', e.target.value);
              }}
              disabled={status !== 'idle'}
              className={`w-full text-sm font-semibold p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none cursor-pointer disabled:opacity-50 ${
                subject ? currentTheme.text : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              <option value="">Selecione a Matéria...</option>
              {allSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {/* Config Panel */}
          {showConfig && status === 'idle' && (
            <div className="w-full p-3 mb-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-700 dark:text-gray-300">Modo:</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setMode('pomodoro')}
                    className={`px-2 py-1 rounded text-xs ${
                      mode === 'pomodoro'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    Pomodoro
                  </button>
                  <button
                    onClick={() => setMode('stopwatch')}
                    className={`px-2 py-1 rounded text-xs ${
                      mode === 'stopwatch'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    Cronômetro
                  </button>
                </div>
              </div>
              {mode === 'pomodoro' && (
                <>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-gray-600 dark:text-gray-400">Foco (min)</span>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={workMinutes}
                      onChange={(e) => setWorkMinutes(Number(e.target.value))}
                      className="w-14 p-1 text-center border rounded text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Pausa (min)</span>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={breakMinutes}
                      onChange={(e) => setBreakMinutes(Number(e.target.value))}
                      className="w-14 p-1 text-center border rounded text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Circular Clock */}
          <div
            className="relative flex justify-center items-center mb-5"
            style={{ width: clockSize, height: clockSize }}
          >
            <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 160 160">
              <circle
                cx="80"
                cy="80"
                r={r}
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-gray-100 dark:text-gray-800"
              />
              <circle
                cx="80"
                cy="80"
                r={r}
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={
                  mode === 'pomodoro' ? circ - (circ * progressPercent) / 100 : 0
                }
                className={`transition-all duration-1000 ease-linear ${
                  subject ? currentTheme.accent : 'text-indigo-500'
                }`}
              />
            </svg>
            <div className="flex flex-col items-center justify-center z-10 text-center">
              <div className="text-3xl font-black text-gray-800 dark:text-gray-100 tracking-tighter">
                {mode === 'stopwatch' ? formatTime(secondsElapsed) : formatTime(secondsRemaining)}
              </div>
              <div
                className={`text-xs font-bold uppercase mt-1 ${
                  subject ? currentTheme.accent : 'text-indigo-500'
                }`}
              >
                {status === 'break' ? 'PAUSA' : mode === 'pomodoro' ? 'FOCO' : 'ESTUDO'}
              </div>
            </div>
          </div>

          {/* Controls */}
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
              className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ${
                subject ? currentTheme.button : 'bg-indigo-500 hover:bg-indigo-600'
              }`}
            >
              {status === 'running' ? (
                <Pause className="w-8 h-8 fill-current" />
              ) : (
                <Play className="w-8 h-8 fill-current ml-1" />
              )}
            </button>
          </div>
        </div>
      </div>
    </Draggable>
  );

  return (
    <>
      {!isMinimized ? renderFullWidget() : (
        <Draggable
          nodeRef={nodeRef}
          handle=".timer-mini-drag-handle"
          defaultPosition={position}
          onStop={(_, data) => {
            setPosition({ x: data.x, y: data.y });
            localStorage.setItem('focus_timer_pos', JSON.stringify({ x: data.x, y: data.y }));
          }}
        >
          <div
            ref={nodeRef}
            className={`fixed top-0 left-0 z-[9998] bg-white dark:bg-gray-900 rounded-full shadow-xl border overflow-hidden pointer-events-auto flex items-center p-1.5 gap-2 ${
              subject ? currentTheme.border : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="timer-mini-drag-handle cursor-grab active:cursor-grabbing p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <GripHorizontal className="w-4 h-4" />
            </div>
            
            <div className="flex items-center gap-2 px-2 font-mono font-bold text-lg dark:text-gray-100">
              <span className={status === 'break' ? 'text-indigo-500' : subject ? currentTheme.text : 'text-gray-900 dark:text-gray-100'}>
                {mode === 'stopwatch' ? formatTime(secondsElapsed) : formatTime(secondsRemaining)}
              </span>
            </div>

            <div className="flex items-center gap-1 border-l border-gray-200 dark:border-gray-700 pl-2">
              <button
                onClick={togglePlayPause}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 ${
                  subject ? currentTheme.button : 'bg-indigo-500 hover:bg-indigo-600'
                }`}
              >
                {status === 'running' ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>
              <button
                onClick={stopTimer}
                disabled={status === 'idle'}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-red-100 text-red-500 hover:bg-red-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Parar"
              >
                <Square className="w-3 h-3 fill-current" />
              </button>
            </div>

            <div className="flex items-center gap-1 border-l border-gray-200 dark:border-gray-700 pl-2 pr-1">
              <button
                onClick={() => setIsMinimized(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                title="Maximizar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-full hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 text-gray-500 transition-colors"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Draggable>
      )}
    </>
  );
}
