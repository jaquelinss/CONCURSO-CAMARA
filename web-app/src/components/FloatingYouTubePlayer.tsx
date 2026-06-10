import { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { Lock, Unlock, Maximize2, Minimize2, X, GripHorizontal } from 'lucide-react';

interface PlayVideoEventDetail {
  url: string;
  topic: string;
  subject: string;
}

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

function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export default function FloatingYouTubePlayer() {
  const [isOpen, setIsOpen] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  
  const [isLocked, setIsLocked] = useState(false);
  const [isLarge, setIsLarge] = useState(() => localStorage.getItem('youtube_player_large') === 'true');
  const [isDragging, setIsDragging] = useState(false);
  
  const [position, setPosition] = useState<{x: number, y: number}>(() => {
    try {
      const saved = localStorage.getItem('youtube_player_pos');
      return saved ? JSON.parse(saved) : { x: 0, y: 0 };
    } catch {
      return { x: 0, y: 0 };
    }
  });

  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePlay = (e: Event) => {
      const customEvent = e as CustomEvent<PlayVideoEventDetail>;
      if (customEvent.detail && customEvent.detail.url) {
        const id = getYouTubeId(customEvent.detail.url);
        if (id) {
          setVideoId(id);
          setTopic(customEvent.detail.topic || 'Revisão');
          setSubject(customEvent.detail.subject || 'Vídeo Aula');
          setIsOpen(true);
          setIsLocked(false); // Reset lock when opening a new video
        } else {
          alert('Link do YouTube inválido ou formato não suportado. Por favor, cole um link padrão, shorts ou compartilhado.');
        }
      }
    };

    window.addEventListener('play-youtube-video', handlePlay);
    return () => {
      window.removeEventListener('play-youtube-video', handlePlay);
    };
  }, []);

  if (!isOpen || !videoId) return null;

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".player-drag-handle"
      disabled={isLocked}
      defaultPosition={position}
      onStart={() => setIsDragging(true)}
      onStop={(_, data) => {
        setIsDragging(false);
        setPosition({ x: data.x, y: data.y });
        localStorage.setItem('youtube_player_pos', JSON.stringify({ x: data.x, y: data.y }));
      }}
      bounds="body"
    >
      <div
        ref={nodeRef}
        className="fixed z-[9999] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-indigo-500/30 flex flex-col overflow-hidden pointer-events-auto transition-shadow duration-200 hover:shadow-indigo-500/10 group"
        style={{
          width: isLarge ? '720px' : '380px',
          height: isLarge ? '450px' : '260px',
          minWidth: '280px',
          minHeight: '200px',
          resize: isLocked ? 'none' : 'both',
          right: '24px',
          bottom: '100px',
        }}
      >
        {/* Header (Drag handle & controls) */}
        <div 
          className={`player-drag-handle flex items-center justify-between px-3 py-1.5 bg-gray-100/80 dark:bg-gray-800/80 border-b border-gray-200/50 dark:border-gray-700/50 select-none ${
            isLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
          }`}
        >
          <div className="flex items-center gap-2 overflow-hidden flex-grow mr-2">
            {!isLocked && <GripHorizontal className="w-4 h-4 text-gray-400 shrink-0" />}
            <Youtube className="w-4 h-4 text-red-500 shrink-0 animate-pulse" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">
              {subject} <span className="font-medium text-gray-500 dark:text-gray-400">· {topic}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Lock/Unlock Toggle */}
            <button
              onClick={() => setIsLocked(!isLocked)}
              className={`p-1 rounded-md transition-all ${
                isLocked 
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' 
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500'
              }`}
              title={isLocked ? "Desbloquear movimentação e redimensionamento" : "Travar posição (impedir arrastar/redimensionar)"}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>

            {/* Standard/Large Size Toggle */}
            {!isLocked && (
              <button
                onClick={() => {
                  const next = !isLarge;
                  setIsLarge(next);
                  localStorage.setItem('youtube_player_large', String(next));
                }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md text-gray-500 transition-colors"
                title={isLarge ? "Tamanho padrão" : "Tamanho grande (Cinema)"}
              >
                {isLarge ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={() => {
                setIsOpen(false);
                setVideoId(null);
              }}
              className="p-1 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 rounded-md text-gray-500 transition-colors"
              title="Fechar player"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Video Display Area */}
        <div className="relative flex-grow bg-black w-full h-full overflow-hidden">
          {/* Iframe shield overlay while dragging to prevent drag capture */}
          {isDragging && (
            <div className="absolute inset-0 bg-transparent z-50 cursor-grabbing" />
          )}

          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title={`${subject} - ${topic}`}
            className="w-full h-full border-0 absolute inset-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Locked Floating Badge (unobtrusive lock indicator) */}
        {isLocked && (
          <div className="absolute left-3 bottom-3 z-50 bg-amber-500/90 text-white rounded-full p-1.5 shadow-lg border border-white/20 animate-bounce pointer-events-auto cursor-pointer"
               onClick={() => setIsLocked(false)}
               title="Clique para destravar a tela">
            <Lock className="w-3 h-3" />
          </div>
        )}
      </div>
    </Draggable>
  );
}
