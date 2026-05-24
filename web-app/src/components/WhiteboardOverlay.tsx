import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Eraser, Trash2, X, Undo2, Redo2, Minus, Plus, PenTool } from 'lucide-react';
import { getStroke } from 'perfect-freehand';

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
  const [mode, setMode] = useState<'transparent' | 'lined' | 'grid' | 'dotted'>('transparent');
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const animFrameRef = useRef<number>(0);

  // Listen for global toggle event
  useEffect(() => {
    const handleToggle = () => setActive(prev => !prev);
    window.addEventListener('toggle-whiteboard', handleToggle);
    return () => window.removeEventListener('toggle-whiteboard', handleToggle);
  }, []);

  // Resize canvas to match window
  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      redrawAll();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [active, strokes]);

  const drawPaperPattern = (ctx: CanvasRenderingContext2D) => {
    if (mode === 'transparent') return;
    
    ctx.save();
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Fill background
    ctx.fillStyle = '#fefce8'; // Light amber/yellowish background like paper
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
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    ctx.restore();

    drawPaperPattern(ctx);

    // Render all strokes
    for (const stroke of strokes) {
      drawStroke(ctx, stroke);
    }
    // Render current in-progress stroke
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

    // Convert points to perfect-freehand array format
    const pointsArray = stroke.points.map(p => [p.x, p.y, p.pressure] as [number, number, number]);
    
    // Use perfect-freehand algorithm
    const outlinePoints = getStroke(pointsArray, {
      size: stroke.width,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: false, // We pass real pressure from stylus if available
    });

    if (outlinePoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(outlinePoints[0][0], outlinePoints[0][1]);
      for (let i = 1; i < outlinePoints.length; i++) {
        ctx.lineTo(outlinePoints[i][0], outlinePoints[i][1]);
      }
      ctx.closePath();
      ctx.fill();
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
    const pressure = e.pressure !== undefined && e.pressure !== 0 ? e.pressure : 0.5;

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
    const pressure = e.pressure !== undefined && e.pressure !== 0 ? e.pressure : 0.5;

    currentStrokeRef.current.points.push({ x, y, pressure });

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => redrawAll());
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!currentStrokeRef.current) return;
    e.preventDefault();
    setIsDrawing(false);

    if (currentStrokeRef.current.points.length > 0) {
      setStrokes(prev => [...prev, currentStrokeRef.current!]);
      setRedoStack([]);
    }
    currentStrokeRef.current = null;
    redrawAll();
  };

  const handleUndo = () => {
    setStrokes(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack(r => [...r, last]);
      return prev.slice(0, -1);
    });
  };

  const handleRedo = () => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setStrokes(s => [...s, last]);
      return prev.slice(0, -1);
    });
  };

  const handleClear = () => {
    if (strokes.length === 0) return;
    if (!window.confirm('Limpar toda a lousa?')) return;
    setStrokes([]);
    setRedoStack([]);
  };

  const handleClose = () => {
    setActive(false);
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

  if (!active) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9998]" style={{ touchAction: 'none' }}>
      {/* Background layer for clicks when transparent (prevents interacting with elements behind) */}
      <div className="absolute inset-0 bg-transparent" />

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
          
          {/* Mode Selector */}
          <select 
            value={mode} 
            onChange={(e) => setMode(e.target.value as any)}
            className="px-2 py-1.5 rounded-lg text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-none outline-none cursor-pointer"
          >
            <option value="transparent">🔍 Lousa (Transp)</option>
            <option value="lined">📝 Papel Pautado</option>
            <option value="grid">📐 Papel Quadriculado</option>
            <option value="dotted">📌 Papel Pontilhado</option>
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

          {/* Clear */}
          <button
            onClick={handleClear}
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
            title="Limpar Lousa"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          {/* Close */}
          <button
            onClick={handleClose}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
            title="Fechar Lousa (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Toggle toolbar visibility on mobile */}
      {!showToolbar && (
        <button
          onClick={() => setShowToolbar(true)}
          className="whiteboard-toolbar absolute top-4 right-4 z-[9999] w-10 h-10 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-lg flex items-center justify-center text-gray-600 dark:text-gray-300"
        >
          <Pencil className="w-5 h-5" />
        </button>
      )}

      {/* Minimize toolbar button (inside toolbar) */}
      {showToolbar && (
        <button
          onClick={() => setShowToolbar(false)}
          className="whiteboard-toolbar absolute top-4 right-4 z-[9999] text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hidden sm:block"
        >
          minimizar
        </button>
      )}
    </div>,
    document.body
  );
}
