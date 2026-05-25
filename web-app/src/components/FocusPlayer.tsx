import { useState, useEffect, useRef } from 'react';
import { Headphones, Play, Pause, Volume2, VolumeX, Music, Waves, CloudRain } from 'lucide-react';

type TrackType = 'none' | 'white-noise' | 'binaural' | 'classic';

export default function FocusPlayer() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTrack, setActiveTrack] = useState<TrackType>('none');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  
  const popoverRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const whiteNoiseNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const binauralNodesRef = useRef<{ osc1: OscillatorNode, osc2: OscillatorNode } | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  
  // HTML Audio para a rádio
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Rádio de Música Clássica (Venice Classic Radio)
  const CLASSIC_RADIO_URL = "https://uk7.internet-radio.com/proxy/veniceclassic?mp=/stream";

  // Fechar popover ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Inicializar Audio Context
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
      gainNodeRef.current.gain.value = volume;
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  // Atualizar volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const stopAll = () => {
    // Parar Ruído Branco
    if (whiteNoiseNodeRef.current) {
      try { whiteNoiseNodeRef.current.stop(); } catch(e) {}
      whiteNoiseNodeRef.current.disconnect();
      whiteNoiseNodeRef.current = null;
    }
    // Parar Binaural
    if (binauralNodesRef.current) {
      try { 
        binauralNodesRef.current.osc1.stop();
        binauralNodesRef.current.osc2.stop();
      } catch(e) {}
      binauralNodesRef.current.osc1.disconnect();
      binauralNodesRef.current.osc2.disconnect();
      binauralNodesRef.current = null;
    }
    // Parar Rádio
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const playWhiteNoise = () => {
    initAudioContext();
    if (!audioContextRef.current || !gainNodeRef.current) return;
    
    const bufferSize = audioContextRef.current.sampleRate * 2; // 2 seconds
    const buffer = audioContextRef.current.createBuffer(1, bufferSize, audioContextRef.current.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = audioContextRef.current.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    
    // Filtro para deixar o som mais suave (ruído rosa / marrom falso)
    const filter = audioContextRef.current.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    
    noise.connect(filter);
    filter.connect(gainNodeRef.current);
    noise.start();
    
    whiteNoiseNodeRef.current = noise;
  };

  const playBinaural = () => {
    initAudioContext();
    if (!audioContextRef.current || !gainNodeRef.current) return;
    
    // Frequência base de 432 Hz e uma diferença de 10Hz (Ondas Alpha - Concentração/Relaxamento)
    const baseFreq = 432;
    const beatFreq = 10;
    
    const osc1 = audioContextRef.current.createOscillator();
    const osc2 = audioContextRef.current.createOscillator();
    
    const merger = audioContextRef.current.createChannelMerger(2);
    
    osc1.type = 'sine';
    osc2.type = 'sine';
    
    osc1.frequency.value = baseFreq;
    osc2.frequency.value = baseFreq + beatFreq;
    
    osc1.connect(merger, 0, 0); // Esquerdo
    osc2.connect(merger, 0, 1); // Direito
    
    merger.connect(gainNodeRef.current);
    
    osc1.start();
    osc2.start();
    
    binauralNodesRef.current = { osc1, osc2 };
  };

  const playClassic = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(CLASSIC_RADIO_URL);
      audioRef.current.volume = volume;
    }
    audioRef.current.play().catch(e => console.error("Error playing radio:", e));
  };

  const handleTogglePlay = () => {
    if (activeTrack === 'none') {
      setActiveTrack('white-noise');
      setIsPlaying(true);
      playWhiteNoise();
      return;
    }

    if (isPlaying) {
      stopAll();
      setIsPlaying(false);
    } else {
      startTrack(activeTrack);
      setIsPlaying(true);
    }
  };

  const startTrack = (track: TrackType) => {
    stopAll();
    if (track === 'white-noise') playWhiteNoise();
    else if (track === 'binaural') playBinaural();
    else if (track === 'classic') playClassic();
  };

  const handleTrackChange = (track: TrackType) => {
    setActiveTrack(track);
    if (isPlaying || track !== 'none') {
      setIsPlaying(true);
      startTrack(track);
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg transition-colors flex items-center relative ${
          isPlaying 
            ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40' 
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        title="Focus Player (Sons para Concentração)"
      >
        <Headphones className={`w-5 h-5 ${isPlaying ? 'animate-pulse' : ''}`} />
        {isPlaying && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full border border-white dark:border-gray-800"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Headphones className="w-4 h-4 text-indigo-500" />
              Sons de Foco
            </h3>
            <button 
              onClick={handleTogglePlay}
              className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
          </div>

          <div className="space-y-2 mb-4">
            <button
              onClick={() => handleTrackChange('white-noise')}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
                activeTrack === 'white-noise' 
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <CloudRain className="w-4 h-4" /> Ruído Suave
            </button>
            <button
              onClick={() => handleTrackChange('binaural')}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
                activeTrack === 'binaural' 
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <Waves className="w-4 h-4" /> Ondas Alpha (Binaural)
            </button>
            <button
              onClick={() => handleTrackChange('classic')}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
                activeTrack === 'classic' 
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <Music className="w-4 h-4" /> Rádio Clássica
            </button>
          </div>

          <div className="flex items-center gap-3">
            <VolumeX className="w-4 h-4 text-gray-400" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <Volume2 className="w-4 h-4 text-gray-500" />
          </div>
        </div>
      )}
    </div>
  );
}
