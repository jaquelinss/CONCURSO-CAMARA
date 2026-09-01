import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Crosshair, Settings, X, GripVertical, MousePointer2, AlignJustify } from 'lucide-react';
import Draggable from 'react-draggable';

const LASER_COLORS = [
  { name: 'Amarelo', value: '#FBBF24' },
  { name: 'Verde', value: '#34D399' },
  { name: 'Azul', value: '#60A5FA' },
  { name: 'Rosa', value: '#F472B6' },
  { name: 'Roxo', value: '#A78BFA' },
  { name: 'Laranja', value: '#FB923C' },
  { name: 'Vermelho', value: '#F87171' },
  { name: 'Cinza', value: '#9CA3AF' },
];

interface ReadingLaserProps {
  containerRef: React.RefObject<HTMLElement | null>;
}

const getSavedSetting = <T,>(key: string, defaultVal: T): T => {
  try {
    const saved = localStorage.getItem(`laser_${key}`);
    return saved ? JSON.parse(saved) : defaultVal;
  } catch {
    return defaultVal;
  }
};

export default function ReadingLaser({ containerRef }: ReadingLaserProps) {
  const [active, setActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [color, setColor] = useState(() => getSavedSetting('color', '#FBBF24'));
  const [opacity, setOpacity] = useState(() => getSavedSetting('opacity', 0.25));
  const [height, setHeight] = useState(() => getSavedSetting('height', 36));
  const [mode, setMode] = useState<'bar' | 'pointer'>(() => getSavedSetting('mode', 'bar'));
  const [fadeDuration, setFadeDuration] = useState(() => getSavedSetting('fadeDuration', 500));
  
  useEffect(() => {
    localStorage.setItem('laser_color', JSON.stringify(color));
    localStorage.setItem('laser_opacity', JSON.stringify(opacity));
    localStorage.setItem('laser_height', JSON.stringify(height));
    localStorage.setItem('laser_mode', JSON.stringify(mode));
    localStorage.setItem('laser_fadeDuration', JSON.stringify(fadeDuration));
  }, [color, opacity, height, mode, fadeDuration]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setActive(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const [mouseY, setMouseY] = useState<number | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<{x: number, y: number, time: number}[]>([]);
  const lassoPathRef = useRef<{x: number, y: number}[]>([]);
  const animationRef = useRef<number>(0);
  const isMouseDownRef = useRef(false);

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!active || !containerRef.current) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    
    // For the bar mode (relative to container)
    const rect = containerRef.current.getBoundingClientRect();
    const relativeY = clientY - rect.top + containerRef.current.scrollTop;
    setMouseY(relativeY);

    // For the pointer mode (fixed to screen) - always draws, no click needed
    if (mode === 'pointer') {
      pointsRef.current.push({ x: clientX, y: clientY, time: Date.now() });
      // Only track lasso path when mouse is held down
      if (isMouseDownRef.current) {
        lassoPathRef.current.push({ x: clientX, y: clientY });
      }
    }
  }, [active, mode, containerRef]);

  const handleMouseLeave = useCallback(() => {
    if (!active) return;
    setMouseY(null);
  }, [active]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !active) return;

    const handleDown = () => { 
      isMouseDownRef.current = true; 
      lassoPathRef.current = [];
      // Don't disable text selection when the global highlighter (marcador) is active
      const highlighterActive = document.body.classList.contains('global-highlighter-active');
      if (mode === 'pointer' && !highlighterActive) {
        container.style.userSelect = 'none';
        container.style.webkitUserSelect = 'none';
      }
    };
    
    const handleUp = () => { 
      isMouseDownRef.current = false; 
      container.style.userSelect = '';
      container.style.webkitUserSelect = '';

      // Skip lasso selection when the global highlighter (marcador) is active
      const highlighterActive = document.body.classList.contains('global-highlighter-active');
      if (mode !== 'pointer' || !containerRef.current || highlighterActive) return;
      
      const pts = lassoPathRef.current;
      if (pts.length < 20) return; // Not enough points for a loop
      
      const first = pts[0];
      const last = pts[pts.length - 1];
      const distance = Math.hypot(last.x - first.x, last.y - first.y);
      
      // Calculate total path length
      let length = 0;
      for (let i = 1; i < pts.length; i++) {
        length += Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
      }

      // If it's a closed loop (distance between start/end is small relative to length)
      if (distance < 150 && length > 200) {
        // Lasso selection logic
        const polygon = pts;
        
        const isPointInPolygon = (point: {x: number, y: number}, vs: {x: number, y: number}[]) => {
          let inside = false;
          for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            const xi = vs[i].x, yi = vs[i].y;
            const xj = vs[j].x, yj = vs[j].y;
            const intersect = ((yi > point.y) !== (yj > point.y)) &&
                (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
          }
          return inside;
        };

        const getTextNodes = (node: Node): Node[] => {
          const textNodes: Node[] = [];
          if (node.nodeType === Node.TEXT_NODE) {
            if (node.textContent?.trim()) textNodes.push(node);
          } else {
            for (const child of Array.from(node.childNodes)) {
              textNodes.push(...getTextNodes(child));
            }
          }
          return textNodes;
        };

        const textNodes = getTextNodes(containerRef.current);
        let firstNode: Node | null = null;
        let lastNode: Node | null = null;

        for (const node of textNodes) {
          const range = document.createRange();
          range.selectNodeContents(node);
          const rects = range.getClientRects();
          let nodeInside = false;
          for (let i = 0; i < rects.length; i++) {
            const rect = rects[i];
            const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            if (isPointInPolygon(center, polygon)) {
              nodeInside = true;
              break;
            }
          }
          if (nodeInside) {
            if (!firstNode) firstNode = node;
            lastNode = node;
          }
        }

        if (firstNode && lastNode) {
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            const range = document.createRange();
            range.setStartBefore(firstNode);
            range.setEndAfter(lastNode);
            selection.addRange(range);
          }
        }
      }
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('touchmove', handleMouseMove, { passive: true });
    container.addEventListener('mouseleave', handleMouseLeave);
    
    // Also attach down/up to window to catch releases outside
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchstart', handleDown, { passive: true });
    window.addEventListener('touchend', handleUp);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('touchmove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchstart', handleDown);
      window.removeEventListener('touchend', handleUp);
    };
  }, [active, handleMouseMove, handleMouseLeave, containerRef]);

  // Canvas animation loop for pointer mode
  useEffect(() => {
    if (!active || mode !== 'pointer') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isDrawing = true;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const draw = () => {
      if (!isDrawing) return;
      // We must clear taking DPR into account, but since we scaled the context, 
      // clearing window.innerWidth/Height works correctly!
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const now = Date.now();

      // Keep only recent points
      pointsRef.current = pointsRef.current.filter(p => now - p.time < fadeDuration);

      if (pointsRef.current.length > 1) {
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;

        // Draw segments with fading opacity and thickness
        for (let i = 0; i < pointsRef.current.length - 1; i++) {
          const p1 = pointsRef.current[i];
          const p2 = pointsRef.current[i + 1];
          const age = now - p1.time;
          const life = Math.max(0, 1 - (age / fadeDuration));
          
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          
          // White core with colored glow
          ctx.strokeStyle = '#ffffff';
          ctx.globalAlpha = life * Math.min(opacity * 2.5, 1);
          ctx.lineWidth = Math.max(2, life * 6);
          ctx.stroke();
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      isDrawing = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [active, mode, color, opacity, fadeDuration]);

  // Close settings on outside click
  useEffect(() => {
    if (!showSettings) return;
    const handleClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSettings]);

  return (
    <>
      {/* Laser overlay - Bar Mode */}
      {active && mode === 'bar' && mouseY !== null && containerRef.current && createPortal(
        <div
          style={{
            position: 'fixed',
            top: containerRef.current.getBoundingClientRect().top + mouseY - height / 2,
            left: containerRef.current.getBoundingClientRect().left,
            width: containerRef.current.getBoundingClientRect().width,
            height: `${height}px`,
            backgroundColor: color,
            opacity: opacity,
            pointerEvents: 'none',
            zIndex: 10010,
            borderRadius: '4px',
            transition: 'top 0.05s ease-out',
          }}
        />,
        document.body
      )}

      {/* Laser overlay - Pointer Mode (Canvas via Portal) */}
      {active && mode === 'pointer' && createPortal(
        <canvas
          ref={canvasRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 99999, // Ensure it's on top of everything
          }}
        />,
        document.body
      )}

      {/* Dimming removed — user prefers the bar without screen darkening */}

      {/* Toggle + Settings button (Draggable via Portal) */}
      {createPortal(
        <Draggable bounds="body" nodeRef={settingsRef} handle=".drag-handle">
          <div className="fixed bottom-8 left-4 z-[10010] flex flex-col gap-2 items-start" ref={settingsRef}>
        {showSettings && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-64 animate-fade-in mb-2">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">Laser de Leitura</h4>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode selection */}
            <div className="mb-4 flex gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg">
              <button
                onClick={() => setMode('bar')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${mode === 'bar' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                <AlignJustify className="w-3.5 h-3.5" /> Barra
              </button>
              <button
                onClick={() => setMode('pointer')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${mode === 'pointer' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                <MousePointer2 className="w-3.5 h-3.5" /> Ponto
              </button>
            </div>

            {/* Color picker */}
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Cor</label>
              <div className="flex flex-wrap gap-1.5">
                {LASER_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${color === c.value ? 'border-gray-800 dark:border-white scale-110 shadow-md' : 'border-transparent'}`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Opacity slider */}
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                Intensidade: {Math.round(opacity * 100)}%
              </label>
              <input
                type="range"
                min="0.05"
                max="0.6"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Height slider - Only relevant in bar mode */}
            {mode === 'bar' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                  Altura da linha: {height}px
                </label>
                <input
                  type="range"
                  min="20"
                  max="80"
                  step="4"
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>
            )}

            {/* Fade Duration slider - Only relevant in pointer mode */}
            {mode === 'pointer' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                  Rastro: {(fadeDuration / 1000).toFixed(1)}s
                </label>
                <input
                  type="range"
                  min="100"
                  max="4000"
                  step="100"
                  value={fadeDuration}
                  onChange={(e) => setFadeDuration(parseInt(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 items-center bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 p-1 pl-2">
          <div className="drag-handle cursor-grab active:cursor-grabbing p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <GripVertical className="w-5 h-5" />
          </div>
          <button
            onClick={() => { setActive(!active); if (!active) setMouseY(null); }}
            className={`p-3 rounded-full shadow-lg transition-all hover:scale-110 ${
              active
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}
            title={active ? 'Desativar laser (Alt+R)' : 'Ativar laser de leitura (Alt+R)'}
          >
            <Crosshair className="w-5 h-5" />
          </button>
          {active && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-3 rounded-full shadow-lg bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:scale-110 transition-all"
              title="Configurações do laser"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
        </Draggable>,
        document.body
      )}
    </>
  );
}
