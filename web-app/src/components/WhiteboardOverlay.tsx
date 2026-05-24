import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Eraser, Trash2, X, Undo2, Redo2, Minus, Plus, PenTool, Maximize2, Minimize2, GripHorizontal, ChevronLeft, ChevronRight, FilePlus, PanelTopClose, PanelTop } from 'lucide-react';
import { getStroke } from 'perfect-freehand';
import Draggable from 'react-draggable';

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

const COLORS = ['#000000', '#ffffff', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316'];

export default function WhiteboardOverlay() {
  const [active, setActive] = useState(false);
  
  // Modos de Lousa
  const [windowMode, setWindowMode] = useState<'fullscreen' | 'floating'>('floating');
  const [mode, setMode] = useState<'transparent' | 'lined' | 'grid' | 'dotted'>('lined');
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [showToolbar, _setShowToolbar] = useState(true);
  const toggleToolbar = () => _setShowToolbar(p => !p);
  
  // Páginas do Caderninho
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [strokesByPage, setStrokesByPage] = useState<Record<number, Stroke[]>>({ 1: [] });
  const [redoStackByPage, setRedoStackByPage] = useState<Record<number, Stroke[]>>({ 1: [] });

  const [isDrawing, setIsDrawing] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const animFrameRef = useRef<number>(0);

  // Floating Window Size
  const [size, setSize] = useState({ w: Math.min(600, window.innerWidth - 40), h: Math.min(800, window.innerHeight - 100) });
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

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
    
    // Pequeno delay para garantir que o container já assumiu o tamanho
    setTimeout(resize, 10);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [active, strokes, windowMode, size.w, size.h, currentPage, mode]);

  const drawPaperPattern = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (mode === 'transparent') return;
    
    ctx.save();
    // Fill background
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
        // Red margin line
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
      // Ignorar erros na geração de geometria de um traço corrompido
      console.warn("Erro ao desenhar traço", e);
    }
    
    ctx.restore();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.whiteboard-toolbar')) return;
    e.preventDefault();
    setIsDrawing(true);

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;

    currentStrokeRef.current = {
      points: [{ x, y, pressure }],
      color: tool === 'eraser' ? '#000000' : color,
      width: tool === 'eraser' ? strokeWidth * 4 : strokeWidth,
      isEraser: tool === 'eraser',
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !currentStrokeRef.current) return;
    e.preventDefault();

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;

    currentStrokeRef.current.points.push({ x, y, pressure });

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => redrawAll());
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!currentStrokeRef.current) return;
    e.preventDefault();
    setIsDrawing(false);

    if (currentStrokeRef.current.points.length > 0) {
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
      
      setRedoStackByPage(r => ({
        ...r,
        [currentPage]: [...(r[currentPage] || []), last]
      }));
      
      return { ...prev, [currentPage]: newStrokes };
    });
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    setRedoStackByPage(prev => {
      const pageRedo = prev[currentPage] || [];
      const last = pageRedo[pageRedo.length - 1];
      const newRedo = pageRedo.slice(0, -1);
      
      setStrokesByPage(s => ({
        ...s,
        [currentPage]: [...(s[currentPage] || []), last]
      }));
      
      return { ...prev, [currentPage]: newRedo };
    });
  };

  const handleClear = () => {
    if (strokes.length === 0) return;
    if (!window.confirm('Limpar toda a lousa atual?')) return;
    setStrokesByPage(prev => ({ ...prev, [currentPage]: [] }));
    setRedoStackByPage(prev => ({ ...prev, [currentPage]: [] }));
  };

  const handleClose = () => {
    setActive(false);
  };

  const addNewPage = () => {
    setTotalPages(p => p + 1);
    setCurrentPage(totalPages + 1);
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); handleUndo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); handleRedo(); }
      if (e.key === 'e') setTool('eraser');
      if (e.key === 'p') setTool('pen');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, strokes]);

  // Resize handler for floating window
  const onResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: size.w,
      startH: size.h,
    };
  };

  const onResizeMove = (e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    e.preventDefault();
    const dx = e.clientX - resizeRef.current.startX;
    const dy = e.clientY - resizeRef.current.startY;
    setSize({
      w: Math.max(300, resizeRef.current.startW + dx),
      h: Math.max(300, resizeRef.current.startH + dy),
    });
  };

  const onResizeEnd = (e: React.PointerEvent) => {
    resizeRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  if (!active) return null;

  const content = (
    <>
      {/* Background layer for fullscreen transparent mode */}
      {windowMode === 'fullscreen' && mode === 'transparent' && (
        <div className="absolute inset-0 bg-transparent pointer-events-none" />
      )}

      {/* Canvas */}
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

      {/* Floating Toolbar */}
      {showToolbar && (
        <div className="whiteboard-toolbar absolute top-4 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center gap-1.5 sm:gap-2 z-[9999] max-w-[95vw] flex-wrap justify-center">
          
          {/* View Mode Toggle */}
          <button
            onClick={() => {
              setWindowMode(windowMode === 'fullscreen' ? 'floating' : 'fullscreen');
              if (windowMode === 'fullscreen' && mode === 'transparent') {
                 setMode('lined'); // fallback se entrar em flutuante
              }
            }}
            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
            title={windowMode === 'fullscreen' ? 'Modo Caderninho (Janela)' : 'Modo Tela Cheia'}
          >
            {windowMode === 'fullscreen' ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

          {/* Mode Selector */}
          <select 
            value={mode} 
            onChange={(e) => setMode(e.target.value as any)}
            className="px-2 py-1.5 rounded-lg text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-none outline-none cursor-pointer"
          >
            {windowMode === 'fullscreen' && <option value="transparent">🔍 Lousa (Transp)</option>}
            <option value="lined">📝 Papel Pautado</option>
            <option value="grid">📐 Quadriculado</option>
            <option value="dotted">📌 Pontilhado</option>
          </select>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

          {/* Pen */}
          <button
            onClick={() => setTool('pen')}
            className={`p-2 rounded-lg transition-all ${
              tool === 'pen'
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 ring-2 ring-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Caneta (P)"
          >
            <PenTool className="w-5 h-5" />
          </button>

          {/* Eraser */}
          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-lg transition-all ${
              tool === 'eraser'
                ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300 ring-2 ring-pink-400'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Borracha (E)"
          >
            <Eraser className="w-5 h-5" />
          </button>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

          {/* Colors */}
          {tool === 'pen' && (
            <div className="flex gap-1 items-center">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                    color === c ? 'border-indigo-500 dark:border-indigo-400 scale-110 ring-2 ring-indigo-300' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          )}

          {/* Stroke width */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setStrokeWidth(w => Math.max(1, w - 2))}
              className="p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div
              className="w-8 h-8 flex items-center justify-center"
              title={`Espessura: ${strokeWidth}px`}
            >
              <div
                className="rounded-full"
                style={{
                  width: `${Math.min(strokeWidth * 2, 24)}px`,
                  height: `${Math.min(strokeWidth * 2, 24)}px`,
                  backgroundColor: tool === 'eraser' ? '#9ca3af' : color,
                }}
              />
            </div>
            <button
              onClick={() => setStrokeWidth(w => Math.min(30, w + 2))}
              className="p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

          {/* Undo/Redo */}
          <button
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-30 transition-all"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-30 transition-all"
            title="Refazer (Ctrl+Y)"
          >
            <Redo2 className="w-5 h-5" />
          </button>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

          {/* Pagination Controls */}
          <div className="flex items-center gap-1 px-1 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 text-gray-600 dark:text-gray-400 disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold w-12 text-center text-gray-700 dark:text-gray-300">
              Pág {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 text-gray-600 dark:text-gray-400 disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={addNewPage}
              className="p-1.5 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded ml-1"
              title="Nova Página"
            >
              <FilePlus className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

          {/* Clear & Close */}
          <button
            onClick={handleClear}
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
            title="Limpar Lousa"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          <button
            onClick={toggleToolbar}
            className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
            title="Minimizar Barra"
          >
            <PanelTopClose className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleClose}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
            title="Fechar Lousa (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Resize Handle for Floating Window - larger touch target */}
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

      {/* Toggle toolbar visibility */}
      {!showToolbar && (
        <button
          onClick={toggleToolbar}
          className="whiteboard-toolbar absolute top-4 right-4 z-[9999] w-10 h-10 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700"
          title="Mostrar ferramentas"
        >
          <PanelTop className="w-5 h-5" />
        </button>
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
      <Draggable handle=".whiteboard-drag-handle" bounds="parent" defaultPosition={{x: 0, y: 0}}>
        <div 
          ref={containerRef}
          className="absolute pointer-events-auto bg-[#fefce8] rounded-xl shadow-2xl overflow-hidden border border-gray-300 dark:border-gray-600 flex flex-col"
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
