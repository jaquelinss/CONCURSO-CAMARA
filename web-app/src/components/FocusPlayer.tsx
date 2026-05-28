import { useState, useEffect, useRef } from 'react';
import { Headphones, Play, Pause, Volume2, VolumeX, Waves, CloudRain } from 'lucide-react';

type TrackType = 'none' | 'noise-white' | 'noise-pink' | 'noise-brown' | 'binaural-alpha' | 'binaural-beta' | 'binaural-theta';

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

  const playNoise = (type: 'noise-white' | 'noise-pink' | 'noise-brown') => {
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
    
    // Filtro para definir a cor do ruído
    const filter = audioContextRef.current.createBiquadFilter();
    filter.type = 'lowpass';
    if (type === 'noise-white') filter.frequency.value = 5000;
    else if (type === 'noise-pink') filter.frequency.value = 1000;
    else if (type === 'noise-brown') filter.frequency.value = 400;
    
    noise.connect(filter);
    filter.connect(gainNodeRef.current);
    noise.start();
    
    whiteNoiseNodeRef.current = noise;
  };

  const playBinaural = (type: 'binaural-alpha' | 'binaural-beta' | 'binaural-theta') => {
    initAudioContext();
    if (!audioContextRef.current || !gainNodeRef.current) return;
    
    // Frequência base mais baixa (200Hz) gera um zumbido (hum) grave em vez de um "apito" agudo.
    const baseFreq = 200; 
    let beatFreq = 10;
    if (type === 'binaural-beta') beatFreq = 20; // Beta (20Hz - Foco Intenso)
    else if (type === 'binaural-theta') beatFreq = 6; // Theta (6Hz - Relaxamento Criativo)
    // Padrão Alpha (10Hz - Concentração Relaxada)
    
    const osc1 = audioContextRef.current.createOscillator();
    const osc2 = audioContextRef.current.createOscillator();
    
    const merger = audioContextRef.current.createChannelMerger(2);
    
    // Reduzir o volume específico dos osciladores para não ser estridente
    const localGain = audioContextRef.current.createGain();
    localGain.gain.value = 0.4;
    
    osc1.type = 'sine';
    osc2.type = 'sine';
    
    osc1.frequency.value = baseFreq;
    osc2.frequency.value = baseFreq + beatFreq;
    
    osc1.connect(merger, 0, 0); // Esquerdo
    osc2.connect(merger, 0, 1); // Direito
    
    merger.connect(localGain);
    localGain.connect(gainNodeRef.current);
    
    osc1.start();
    osc2.start();
    
    binauralNodesRef.current = { osc1, osc2 };
  };



  const handleTogglePlay = () => {
    if (activeTrack === 'none') {
      setActiveTrack('noise-pink');
      setIsPlaying(true);
      playNoise('noise-pink');
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
    if (track.startsWith('noise-')) playNoise(track as any);
    else if (track.startsWith('binaural-')) playBinaural(track as any);
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
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-2 mb-1 px-1">Ruídos (Foco & Bloqueio)</div>
            <button
              onClick={() => handleTrackChange('noise-white')}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
                activeTrack === 'noise-white' 
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <CloudRain className="w-4 h-4" /> Ruído Branco (Estático)
            </button>
            <button
              onClick={() => handleTrackChange('noise-pink')}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
                activeTrack === 'noise-pink' 
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <CloudRain className="w-4 h-4" /> Ruído Rosa (Suave)
            </button>
            <button
              onClick={() => handleTrackChange('noise-brown')}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
                activeTrack === 'noise-brown' 
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <CloudRain className="w-4 h-4" /> Ruído Marrom (Profundo)
            </button>

            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-4 mb-1 px-1">Binaural (Ondas Cerebrais)</div>
            <button
              onClick={() => handleTrackChange('binaural-beta')}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
                activeTrack === 'binaural-beta' 
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <Waves className="w-4 h-4" /> Ondas Beta (Foco Intenso)
            </button>
            <button
              onClick={() => handleTrackChange('binaural-alpha')}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
                activeTrack === 'binaural-alpha' 
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <Waves className="w-4 h-4" /> Ondas Alpha (Estudo Relaxado)
            </button>
            <button
              onClick={() => handleTrackChange('binaural-theta')}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
                activeTrack === 'binaural-theta' 
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <Waves className="w-4 h-4" /> Ondas Theta (Criatividade)
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
