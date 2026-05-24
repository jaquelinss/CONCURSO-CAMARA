import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Eraser, Trash2, X, Undo2, Redo2, Minus, Plus, PenTool, Maximize2, Minimize2, GripHorizontal, ChevronLeft, ChevronRight, FilePlus, PanelTopClose, PanelTop, Settings2, Focus } from 'lucide-react';
import { getStroke } from 'perfect-freehand';
import Draggable from 'react-draggable';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
}

interface Stroke {
  points: StrokePoint[];
  color: string;
  width: number;
  isEraser: boolean;
}

interface PenPreset {
  id: string;
  color: string;
  width: number;
}

interface EraserPreset {
  id: string;
  type: 'normal' | 'stroke';
  width: number;
}

const COLORS = ['#000000', '#ffffff', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316'];

const DEFAULT_PENS: PenPreset[] = [
  { id: 'p1', color: '#000000', width: 4 },
  { id: 'p2', color: '#3b82f6', width: 4 },
  { id: 'p3', color: '#ef4444', width: 4 },
  { id: 'p4', color: '#22c55e', width: 4 },
  { id: 'p5', color: '#eab308', width: 8 },
];

const DEFAULT_ERASERS: EraserPreset[] = [
  { id: 'e1', type: 'normal', width: 16 },
  { id: 'e2', type: 'stroke', width: 16 },
];

export default function WhiteboardOverlay() {
  const { user } = useAuth();
  const [active, setActive] = useState(false);
  
  // Modos de Lousa
  const [windowMode, setWindowMode] = useState<'fullscreen' | 'floating'>('floating');
  const [mode, setMode] = useState<'transparent' | 'lined' | 'grid' | 'dotted'>('lined');
  
  // Presets and Tools
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [penPresets, setPenPresets] = useState<PenPreset[]>(DEFAULT_PENS);
  const [eraserPresets, setEraserPresets] = useState<EraserPreset[]>(DEFAULT_ERASERS);
  const [activePresetId, setActivePresetId] = useState<string>('p1');
  const [sidebarMode, setSidebarMode] = useState<'fixed' | 'floating' | 'hidden'>('fixed');
  
  const [showToolbar, _setShowToolbar] = useState(true);
  const toggleToolbar = () => _setShowToolbar(p => !p);

  const activePen = penPresets.find(p => p.id === activePresetId) || penPresets[0];
  const activeEraser = eraserPresets.find(p => p.id === activePresetId) || eraserPresets[0];

  const strokeColor = tool === 'pen' ? activePen.color : '#000000';
  const strokeWidth = tool === 'pen' ? activePen.width : activeEraser.width;
  
  // Páginas do Caderninho
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [strokesByPage, setStrokesByPage] = useState<Record<number, Stroke[]>>({ 1: [] });
  const [redoStackByPage, setRedoStackByPage] = useState<Record<number, Stroke[]>>({ 1: [] });

  const [isDrawing, setIsDrawing] = useState(false);
  const [editingPreset, setEditingPreset] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const animFrameRef = useRef<number>(0);

  // Floating Window Size
  const [size, setSize] = useState({ w: Math.min(600, window.innerWidth - 40), h: Math.min(800, window.innerHeight - 100) });
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

  // Carregar/Salvar Settings do Firestore
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid, 'settings', 'whiteboard')).then(d => {
      if (d.exists()) {
        const data = d.data();
        if (data.penPresets) setPenPresets(data.penPresets);
        if (data.eraserPresets) setEraserPresets(data.eraserPresets);
        if (data.sidebarMode) setSidebarMode(data.sidebarMode);
      }
    });
  }, [user]);

  const saveSettings = useCallback((newPens: PenPreset[], newErasers: EraserPreset[], newSidebarMode: string) => {
    if (!user) return;
    setDoc(doc(db, 'users', user.uid, 'settings', 'whiteboard'), {
      penPresets: newPens,
      eraserPresets: newErasers,
      sidebarMode: newSidebarMode
    }, { merge: true }).catch(console.error);
  }, [user]);

  const updatePenPreset = (id: string, updates: Partial<PenPreset>) => {
    const newPens = penPresets.map(p => p.id === id ? { ...p, ...updates } : p);
    setPenPresets(newPens);
    saveSettings(newPens, eraserPresets, sidebarMode);
  };

  const updateEraserPreset = (id: string, updates: Partial<EraserPreset>) => {
    const newErasers = eraserPresets.map(p => p.id === id ? { ...p, ...updates } : p);
    setEraserPresets(newErasers);
    saveSettings(penPresets, newErasers, sidebarMode);
  };

  // Listen for global toggle event
  useEffect(() => {
    const handleToggle = () => setActive(prev => !prev);
    window.addEventListener('toggle-whiteboard', handleToggle);
    return () => window.removeEventListener('toggle-whiteboard', handleToggle);
  }, []);

  const strokes = strokesByPage[currentPage] || [];
  const redoStack = redoStackByPage[currentPage] || [];

  // Redimensionar Canvas
  useEffect(() => {
    if (!active || !canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      redrawAll();
    };
    
    setTimeout(resize, 10);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [active, strokes, windowMode, size.w, size.h, currentPage, mode]);

  const drawPaperPattern = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (mode === 'transparent') return;
    
    ctx.save();
    ctx.fillStyle = '#fefce8';
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1;

    switch (mode) {
      case 'lined':
        for (let y = 40; y < height; y += 32) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(60, 0);
        ctx.lineTo(60, height);
        ctx.stroke();
        break;
      case 'grid':
        for (let x = 0; x < width; x += 24) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += 24) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        break;
      case 'dotted':
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        for (let x = 12; x < width; x += 24) {
          for (let y = 12; y < height; y += 24) {
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
    }
    ctx.restore();
  };

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    ctx.restore();

    drawPaperPattern(ctx, rect.width, rect.height);

    for (const stroke of strokes) {
      drawStroke(ctx, stroke);
    }
    if (currentStrokeRef.current) {
      drawStroke(ctx, currentStrokeRef.current);
    }
  }, [strokes, mode]);

  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length === 0) return;

    ctx.save();
    if (stroke.isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = stroke.color;
    }

    try {
      const pointsArray = stroke.points.map(p => [p.x, p.y, p.pressure] as [number, number, number]);
      const outlinePoints = getStroke(pointsArray, {
        size: stroke.width,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
        simulatePressure: false,
      });

      if (outlinePoints && outlinePoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(outlinePoints[0][0], outlinePoints[0][1]);
        for (let i = 1; i < outlinePoints.length; i++) {
          ctx.lineTo(outlinePoints[i][0], outlinePoints[i][1]);
        }
        ctx.closePath();
        ctx.fill();
      }
    } catch (e) {
      console.warn("Erro ao desenhar traço", e);
    }
    ctx.restore();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.whiteboard-toolbar') || (e.target as HTMLElement).closest('.whiteboard-sidebar')) {
      return;
    }
    setEditingPreset(null); // Close any open preset editor
    e.preventDefault();
    setIsDrawing(true);

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;

    if (tool === 'eraser' && activeEraser.type === 'stroke') {
      // Stroke eraser logic
      eraseIntersectingStrokes(x, y);
    } else {
      currentStrokeRef.current = {
        points: [{ x, y, pressure }],
        color: tool === 'eraser' ? '#000000' : strokeColor,
        width: tool === 'eraser' ? strokeWidth * 4 : strokeWidth,
        isEraser: tool === 'eraser',
      };
    }
  };

  const eraseIntersectingStrokes = (x: number, y: number) => {
    const threshold = 15; // pixels
    const strokesToKeep: Stroke[] = [];
    const strokesToRemove: Stroke[] = [];
    
    for (const stroke of strokes) {
      const isHit = stroke.points.some(p => Math.hypot(p.x - x, p.y - y) < threshold);
      if (isHit) {
        strokesToRemove.push(stroke);
      } else {
        strokesToKeep.push(stroke);
      }
    }

    if (strokesToRemove.length > 0) {
      setStrokesByPage(prev => ({ ...prev, [currentPage]: strokesToKeep }));
      setRedoStackByPage(prev => ({
        ...prev,
        [currentPage]: [...(prev[currentPage] || []), ...strokesToRemove]
      }));
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;

    if (tool === 'eraser' && activeEraser.type === 'stroke') {
      eraseIntersectingStrokes(x, y);
    } else if (currentStrokeRef.current) {
      currentStrokeRef.current.points.push({ x, y, pressure });
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(() => redrawAll());
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDrawing(false);

    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0) {
      const newStroke = currentStrokeRef.current;
      setStrokesByPage(prev => ({
        ...prev,
        [currentPage]: [...(prev[currentPage] || []), newStroke]
      }));
      setRedoStackByPage(prev => ({
        ...prev,
        [currentPage]: []
      }));
    }
    currentStrokeRef.current = null;
    redrawAll();
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    setStrokesByPage(prev => {
      const pageStrokes = prev[currentPage] || [];
      const newStrokes = pageStrokes.slice(0, -1);
      const last = pageStrokes[pageStrokes.length - 1];
      setRedoStackByPage(r => ({ ...r, [currentPage]: [...(r[currentPage] || []), last] }));
      return { ...prev, [currentPage]: newStrokes };
    });
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    setRedoStackByPage(prev => {
      const pageRedo = prev[currentPage] || [];
      const last = pageRedo[pageRedo.length - 1];
      const newRedo = pageRedo.slice(0, -1);
      setStrokesByPage(s => ({ ...s, [currentPage]: [...(s[currentPage] || []), last] }));
      return { ...prev, [currentPage]: newRedo };
    });
  };

  const handleClear = () => {
    if (strokes.length === 0) return;
    if (!window.confirm('Limpar toda a lousa atual?')) return;
    setStrokesByPage(prev => ({ ...prev, [currentPage]: [] }));
    setRedoStackByPage(prev => ({ ...prev, [currentPage]: [] }));
  };

  const handleClose = () => setActive(false);
  const addNewPage = () => { setTotalPages(p => p + 1); setCurrentPage(totalPages + 1); };

  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); handleUndo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); handleRedo(); }
      if (e.key === 'e') { setTool('eraser'); setActivePresetId(eraserPresets[0].id); }
      if (e.key === 'p') { setTool('pen'); setActivePresetId(penPresets[0].id); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, strokes, penPresets, eraserPresets]);

  const onResizeStart = (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: size.w, startH: size.h };
  };

  const onResizeMove = (e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    e.preventDefault();
    const dx = e.clientX - resizeRef.current.startX;
    const dy = e.clientY - resizeRef.current.startY;
    setSize({ w: Math.max(300, resizeRef.current.startW + dx), h: Math.max(300, resizeRef.current.startH + dy) });
  };

  const onResizeEnd = (e: React.PointerEvent) => {
    resizeRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  if (!active) return null;

  const content = (
    <>
      {windowMode === 'fullscreen' && mode === 'transparent' && (
        <div className="absolute inset-0 bg-transparent pointer-events-none" />
      )}

      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      {/* Main Toolbar */}
      {showToolbar && (
        <div className="whiteboard-toolbar absolute top-4 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center gap-1.5 sm:gap-2 z-[9999] max-w-[95vw] flex-wrap justify-center">
          <button
            onClick={() => setWindowMode(windowMode === 'fullscreen' ? 'floating' : 'fullscreen')}
            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
            title={windowMode === 'fullscreen' ? 'Modo Caderninho (Janela)' : 'Modo Tela Cheia'}
          >
            {windowMode === 'fullscreen' ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
          <select 
            value={mode} 
            onChange={(e) => setMode(e.target.value as any)}
            className="px-2 py-1.5 rounded-lg text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-none outline-none cursor-pointer"
          >
            <option value="transparent">🔍 Lousa (Transp)</option>
            <option value="lined">📝 Papel Pautado</option>
            <option value="grid">📐 Quadriculado</option>
            <option value="dotted">📌 Pontilhado</option>
          </select>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
          
          <button
            onClick={() => { setTool('pen'); setActivePresetId(penPresets[0].id); }}
            className={`p-2 rounded-lg transition-all ${tool === 'pen' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 ring-2 ring-indigo-400' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <PenTool className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setTool('eraser'); setActivePresetId(eraserPresets[0].id); }}
            className={`p-2 rounded-lg transition-all ${tool === 'eraser' ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-600 ring-2 ring-pink-400' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Eraser className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
          
          <button onClick={handleUndo} disabled={strokes.length === 0} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30"><Undo2 className="w-5 h-5" /></button>
          <button onClick={handleRedo} disabled={redoStack.length === 0} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30"><Redo2 className="w-5 h-5" /></button>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
          
          <div className="flex items-center gap-1 px-1 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 text-gray-600 disabled:opacity-30 hover:bg-gray-200 rounded"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-xs font-bold w-12 text-center text-gray-700 dark:text-gray-300">Pág {currentPage}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 text-gray-600 disabled:opacity-30 hover:bg-gray-200 rounded"><ChevronRight className="w-4 h-4" /></button>
            <button onClick={addNewPage} className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded ml-1"><FilePlus className="w-4 h-4" /></button>
          </div>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
          
          <button onClick={handleClear} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-5 h-5" /></button>
          <button onClick={toggleToolbar} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg" title="Minimizar Barra"><PanelTopClose className="w-5 h-5" /></button>
          <button onClick={handleClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
      )}

      {/* Custom Sidebar when main toolbar is hidden */}
      {!showToolbar && sidebarMode !== 'hidden' && (
        <div className={`whiteboard-sidebar absolute z-[9999] ${sidebarMode === 'fixed' ? 'left-2 top-1/2 -translate-y-1/2' : 'left-4 top-20'}`}>
          <Draggable disabled={sidebarMode === 'fixed'} handle=".sidebar-drag" nodeRef={sidebarRef}>
            <div ref={sidebarRef} className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-2 flex flex-col items-center gap-2">
              {sidebarMode === 'floating' && (
                <div className="sidebar-drag w-full flex justify-center py-1 cursor-grab active:cursor-grabbing text-gray-400">
                  <GripHorizontal className="w-4 h-4" />
                </div>
              )}
              
              <div className="text-[10px] font-bold text-gray-400 uppercase">Canetas</div>
              {penPresets.map((preset) => (
                <div key={preset.id} className="relative">
                  <button
                    onClick={() => {
                      if (activePresetId === preset.id && tool === 'pen') setEditingPreset(editingPreset === preset.id ? null : preset.id);
                      else { setTool('pen'); setActivePresetId(preset.id); setEditingPreset(null); }
                    }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${tool === 'pen' && activePresetId === preset.id ? 'bg-indigo-100 ring-2 ring-indigo-400' : 'hover:bg-gray-100'}`}
                  >
                    <div className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center" style={{ backgroundColor: preset.color }}>
                      <div className="bg-white/50 rounded-full" style={{ width: Math.min(preset.width, 16), height: Math.min(preset.width, 16) }} />
                    </div>
                  </button>
                  
                  {/* Edit Popover */}
                  {editingPreset === preset.id && tool === 'pen' && (
                    <div className="absolute left-full ml-2 top-0 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 p-2 flex flex-col gap-2 z-[10000]">
                      <div className="flex gap-1 flex-wrap w-32">
                        {COLORS.map(c => (
                          <button key={c} onClick={() => updatePenPreset(preset.id, { color: c })} className={`w-6 h-6 rounded-full border-2 ${preset.color === c ? 'border-indigo-500 scale-110' : 'border-gray-300'}`} style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updatePenPreset(preset.id, { width: Math.max(1, preset.width - 2) })}><Minus className="w-4 h-4" /></button>
                        <span className="text-xs font-bold w-6 text-center">{preset.width}</span>
                        <button onClick={() => updatePenPreset(preset.id, { width: Math.min(30, preset.width + 2) })}><Plus className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-1" />
              <div className="text-[10px] font-bold text-gray-400 uppercase">Borrachas</div>
              
              {eraserPresets.map((preset) => (
                <div key={preset.id} className="relative">
                  <button
                    onClick={() => {
                      if (activePresetId === preset.id && tool === 'eraser') setEditingPreset(editingPreset === preset.id ? null : preset.id);
                      else { setTool('eraser'); setActivePresetId(preset.id); setEditingPreset(null); }
                    }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${tool === 'eraser' && activePresetId === preset.id ? 'bg-pink-100 ring-2 ring-pink-400' : 'hover:bg-gray-100'}`}
                  >
                    {preset.type === 'stroke' ? <Focus className="w-5 h-5 text-gray-600" /> : <Eraser className="w-5 h-5 text-gray-600" />}
                  </button>

                  {editingPreset === preset.id && tool === 'eraser' && (
                    <div className="absolute left-full ml-2 top-0 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 p-2 flex flex-col gap-2 z-[10000] w-40">
                      <select 
                        value={preset.type} 
                        onChange={e => updateEraserPreset(preset.id, { type: e.target.value as 'normal' | 'stroke' })}
                        className="text-xs p-1 rounded border"
                      >
                        <option value="normal">Borracha Normal</option>
                        <option value="stroke">Apagar Traços (Inteiros)</option>
                      </select>
                      {preset.type === 'normal' && (
                        <div className="flex items-center justify-center gap-2 mt-1">
                          <button onClick={() => updateEraserPreset(preset.id, { width: Math.max(4, preset.width - 4) })}><Minus className="w-4 h-4" /></button>
                          <span className="text-xs font-bold w-6 text-center">{preset.width}</span>
                          <button onClick={() => updateEraserPreset(preset.id, { width: Math.min(50, preset.width + 4) })}><Plus className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-1" />
              
              {/* Settings Toggle */}
              <div className="relative group">
                <button className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100">
                  <Settings2 className="w-5 h-5" />
                </button>
                <div className="absolute left-full ml-2 bottom-0 hidden group-hover:flex bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 p-2 flex-col gap-1 z-[10000] w-36">
                  <button onClick={() => { setSidebarMode('fixed'); saveSettings(penPresets, eraserPresets, 'fixed'); }} className={`text-xs p-1.5 rounded text-left ${sidebarMode === 'fixed' ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-50'}`}> Sidebar Fixa</button>
                  <button onClick={() => { setSidebarMode('floating'); saveSettings(penPresets, eraserPresets, 'floating'); }} className={`text-xs p-1.5 rounded text-left ${sidebarMode === 'floating' ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-50'}`}> Sidebar Flutuante</button>
                  <button onClick={() => { setSidebarMode('hidden'); saveSettings(penPresets, eraserPresets, 'hidden'); }} className={`text-xs p-1.5 rounded text-left text-red-500 hover:bg-red-50`}> Ocultar Sidebar</button>
                </div>
              </div>

              <button
                onClick={toggleToolbar}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-indigo-500 hover:bg-indigo-50 mt-1"
                title="Expandir Menu Principal"
              >
                <PanelTop className="w-5 h-5" />
              </button>
            </div>
          </Draggable>
        </div>
      )}

      {/* Recover hidden sidebar button */}
      {!showToolbar && sidebarMode === 'hidden' && (
        <button
          onClick={toggleToolbar}
          className="whiteboard-toolbar absolute top-4 right-4 z-[9999] w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-gray-600 hover:bg-white"
        >
          <PanelTop className="w-5 h-5" />
        </button>
      )}

      {/* Resize Handle for Floating Window */}
      {windowMode === 'floating' && (
        <div
          className="absolute bottom-0 right-0 w-10 h-10 cursor-nwse-resize flex items-end justify-end p-2 opacity-50 hover:opacity-100 whiteboard-toolbar"
          onPointerDown={onResizeStart}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeEnd}
          onPointerCancel={onResizeEnd}
          style={{ touchAction: 'none', zIndex: 10000 }}
        >
          <div className="w-4 h-4 border-r-2 border-b-2 border-gray-500 dark:border-gray-400" />
        </div>
      )}
    </>
  );

  if (windowMode === 'fullscreen') {
    return createPortal(
      <div 
        ref={containerRef}
        className={`fixed inset-0 z-[9998] ${mode !== 'transparent' ? 'bg-[#fefce8]' : ''}`} 
        style={{ touchAction: 'none' }}
      >
        {content}
      </div>,
      document.body
    );
  }

  // Modo Caderninho Flutuante
  return createPortal(
    <div className="fixed inset-0 z-[9998] pointer-events-none flex items-center justify-center">
      <Draggable nodeRef={containerRef} handle=".whiteboard-drag-handle" bounds="parent" defaultPosition={{x: 0, y: 0}}>
        <div 
          ref={containerRef}
          className={`absolute pointer-events-auto rounded-xl shadow-2xl overflow-hidden border border-gray-300 dark:border-gray-600 flex flex-col ${mode !== 'transparent' ? 'bg-[#fefce8]' : 'bg-transparent'}`}
          style={{ width: `${size.w}px`, height: `${size.h}px`, touchAction: 'none' }}
        >
          <div className="whiteboard-drag-handle whiteboard-toolbar h-8 bg-indigo-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-3 cursor-grab active:cursor-grabbing">
            <div className="flex items-center gap-2">
              <GripHorizontal className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Caderno Digital</span>
            </div>
            <button onClick={handleClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="relative flex-1">
            {content}
          </div>
        </div>
      </Draggable>
    </div>,
    document.body
  );
}
