import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Eraser, Trash2, X, Undo2, Redo2, Minus, Plus, Maximize2, Minimize2, GripHorizontal, ChevronLeft, ChevronRight, FilePlus, PanelTop, Settings2, Focus, MousePointer2, Book } from 'lucide-react';
import { getStroke } from 'perfect-freehand';
import Draggable from 'react-draggable';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc, collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import localforage from 'localforage';

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

import NotebooksManager from './NotebooksManager';
import type { Notebook } from '../types/notebook';

export default function WhiteboardOverlay() {
  const { user } = useAuth();
  const [active, setActive] = useState(false);
  
  // Notebooks
  const [showNotebooksManager, setShowNotebooksManager] = useState(false);
  const [activeNotebook, setActiveNotebook] = useState<Notebook | null>(null);

  // Modos de Lousa
  const [windowMode, setWindowMode] = useState<'fullscreen' | 'floating'>('fullscreen');
  const [scrollY, setScrollY] = useState(0);
  const [mode, setMode] = useState<'transparent' | 'lined' | 'grid' | 'dotted'>('lined');
  
  // Menu Principal Original
  const [tool, setTool] = useState<'pen' | 'eraser' | 'pointer'>('pen');
  const previousTool = useRef<'pen' | 'eraser'>('pen');

  useEffect(() => {
    if (tool !== 'pointer') {
      previousTool.current = tool as 'pen' | 'eraser';
    }
  }, [tool]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar se o usuário estiver digitando em um input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) return;

      // Atalho V ou Escape para alternar para o mouse
      if (e.key.toLowerCase() === 'v' || e.key === 'Escape') {
        setTool(prev => prev === 'pointer' ? previousTool.current : 'pointer');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  // Sidebar e Presets
  const [penPresets, setPenPresets] = useState<PenPreset[]>([{ id: 'p1', color: '#000000', width: 4 }]);
  const [eraserPresets, setEraserPresets] = useState<EraserPreset[]>([{ id: 'e1', type: 'normal', width: 16 }]);
  const [activePenId, setActivePenId] = useState<string>('p1');
  const [activeEraserId, setActiveEraserId] = useState<string>('e1');
  const [sidebarMode, setSidebarMode] = useState<'fixed' | 'floating' | 'hidden'>('fixed');
  const [editingPreset, setEditingPreset] = useState<string | null>(null);
  const [showSidebarSettings, setShowSidebarSettings] = useState(false);

  // Derived values from active presets (single source of truth)
  const activePen = penPresets.find(p => p.id === activePenId) || penPresets[0];
  const activeEraser = eraserPresets.find(p => p.id === activeEraserId) || eraserPresets[0];
  const color = tool === 'pen' ? activePen.color : '#000000';
  const strokeWidth = tool === 'pen' ? activePen.width : activeEraser.width;


  // Páginas do Caderninho
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [strokesByPage, setStrokesByPage] = useState<Record<number, Stroke[]>>({ 1: [] });
  const [redoStackByPage, setRedoStackByPage] = useState<Record<number, Stroke[]>>({ 1: [] });
  const [isLoaded, setIsLoaded] = useState(false);

  // Carregar dados iniciais (Rascunho ou Caderno)
  useEffect(() => {
    const loadData = async () => {
      setIsLoaded(false);
      if (activeNotebook && user) {
        // Load from Firebase
        try {
          const q = query(collection(db, 'users', user.uid, 'notebooks', activeNotebook.id, 'pages'));
          const snap = await getDocs(q);
          const loadedStrokes: Record<number, Stroke[]> = {};
          snap.forEach(d => {
            const data = d.data();
            const pageNum = parseInt(d.id.replace('page_', ''));
            if (!isNaN(pageNum) && data.strokes) {
              loadedStrokes[pageNum] = JSON.parse(data.strokes);
            }
          });
          if (Object.keys(loadedStrokes).length > 0) {
            setStrokesByPage(loadedStrokes);
          } else {
            setStrokesByPage({ 1: [] });
          }
          setTotalPages(activeNotebook.totalPages || 1);
          setCurrentPage((activeNotebook as any).lastPage || 1);
        } catch (e) {
          console.error('Erro ao carregar caderno:', e);
          setStrokesByPage({ 1: [] });
        }
      } else {
        // Load Quick Draft from IndexedDB
        try {
          const savedStrokes = await localforage.getItem<Record<number, Stroke[]>>('whiteboard-quick-draft');
          if (savedStrokes && Object.keys(savedStrokes).length > 0) {
            setStrokesByPage(savedStrokes);
            const maxPage = Math.max(...Object.keys(savedStrokes).map(Number));
            if (maxPage > 1) {
              setTotalPages(maxPage);
            }
          } else {
            setStrokesByPage({ 1: [] });
          }
        } catch (e) {
          console.error(e);
          setStrokesByPage({ 1: [] });
        }
      }
      setRedoStackByPage({ 1: [] });
      setIsLoaded(true);
    };

    loadData();
  }, [activeNotebook, user]);

  // Auto-save: Salvar no IndexedDB ou Firebase sempre que mudar
  useEffect(() => {
    if (!isLoaded) return;

    if (activeNotebook && user) {
      // Save current page to Firebase (debounce or save immediately)
      const currentStrokes = strokesByPage[currentPage] || [];
      const pageRef = doc(db, 'users', user.uid, 'notebooks', activeNotebook.id, 'pages', `page_${currentPage}`);
      setDoc(pageRef, {
        strokes: JSON.stringify(currentStrokes),
        updatedAt: Date.now()
      }, { merge: true }).catch(console.error);

      // Se o total de páginas aumentou ou a página mudou, atualiza no caderno principal
      setDoc(doc(db, 'users', user.uid, 'notebooks', activeNotebook.id), {
        totalPages: Math.max(totalPages, activeNotebook.totalPages || 1),
        lastPage: currentPage,
        updatedAt: Date.now()
      }, { merge: true }).catch(console.error);
      
      if (totalPages > (activeNotebook.totalPages || 1)) {
        setActiveNotebook(prev => prev ? { ...prev, totalPages } : prev);
      }
    } else {
      // Save Quick Draft to IndexedDB
      localforage.setItem('whiteboard-quick-draft', strokesByPage).catch(console.error);
    }
  }, [strokesByPage, isLoaded, currentPage, totalPages, activeNotebook, user]);

  const [isDrawing, setIsDrawing] = useState(false);
  
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
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
        if (data.penPresets && data.penPresets.length > 0) setPenPresets(data.penPresets);
        if (data.eraserPresets && data.eraserPresets.length > 0) setEraserPresets(data.eraserPresets);
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
    setPenPresets(prev => {
      const newPens = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      saveSettings(newPens, eraserPresets, sidebarMode);
      return newPens;
    });
  };

  const updateEraserPreset = (id: string, updates: Partial<EraserPreset>) => {
    setEraserPresets(prev => {
      const newErasers = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      saveSettings(penPresets, newErasers, sidebarMode);
      return newErasers;
    });
  };

  const addPenPreset = () => {
    if (penPresets.length >= 5) return;
    const newId = `p${Date.now()}`;
    const newPens = [...penPresets, { id: newId, color: '#000000', width: 4 }];
    setPenPresets(newPens);
    saveSettings(newPens, eraserPresets, sidebarMode);
    setActivePenId(newId);
    setTool('pen');
  };

  const addEraserPreset = () => {
    if (eraserPresets.length >= 2) return;
    const newId = `e${Date.now()}`;
    const newErasers: EraserPreset[] = [...eraserPresets, { id: newId, type: 'stroke', width: 16 }];
    setEraserPresets(newErasers);
    saveSettings(penPresets, newErasers, sidebarMode);
    setActiveEraserId(newId);
    setTool('eraser');
  };

  const deletePenPreset = (id: string) => {
    if (penPresets.length <= 1) return;
    const newPens = penPresets.filter(p => p.id !== id);
    setPenPresets(newPens);
    if (activePenId === id) setActivePenId(newPens[0].id);
    setEditingPreset(null);
    saveSettings(newPens, eraserPresets, sidebarMode);
  };


  // Listen for global toggle events
  useEffect(() => {
    const handleTransparent = () => {
      setActive(true);
      setMode('transparent');
      setWindowMode('fullscreen');
    };
    const handleNotebook = () => {
      setActive(true);
      setMode('lined');
      setWindowMode('floating');
    };
    const handleToggle = () => setActive(prev => !prev);
    window.addEventListener('toggle-whiteboard-transparent', handleTransparent);
    window.addEventListener('toggle-whiteboard-notebook', handleNotebook);
    window.addEventListener('toggle-whiteboard', handleToggle);
    return () => {
      window.removeEventListener('toggle-whiteboard-transparent', handleTransparent);
      window.removeEventListener('toggle-whiteboard-notebook', handleNotebook);
      window.removeEventListener('toggle-whiteboard', handleToggle);
    };
  }, []);

  // Load all notebooks for sidebar navigation
  useEffect(() => {
    if (!user) return;
    const loadAllNotebooks = async () => {
      try {
        const q2 = query(collection(db, 'users', user.uid, 'notebooks'), orderBy('updatedAt', 'desc'));
        const snap = await getDocs(q2);
        const loaded: Notebook[] = [];
        snap.forEach(d => loaded.push({ id: d.id, ...d.data() } as Notebook));
        if (loaded.length > 0) {
          setActiveNotebook(prev => prev || loaded[0]);
        }
      } catch (e) {
        console.error('Erro ao carregar lista de cadernos:', e);
      }
    };
    loadAllNotebooks();
  }, [user, showNotebooksManager]);


  const strokes = strokesByPage[currentPage] || [];
  const redoStack = redoStackByPage[currentPage] || [];

  // Redimensionar Canvas
  useEffect(() => {
    if (!active || !canvasRef.current || !bgCanvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const bgCanvas = bgCanvasRef.current;
    const container = containerRef.current;
    
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      
      bgCanvas.width = rect.width * dpr;
      bgCanvas.height = rect.height * dpr;
      bgCanvas.style.width = `${rect.width}px`;
      bgCanvas.style.height = `${rect.height}px`;
      
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      
      const bgCtx = bgCanvas.getContext('2d');
      if (bgCtx) {
        bgCtx.scale(dpr, dpr);
        drawPaperPattern(bgCtx, rect.width, rect.height, scrollY);
      }
      
      redrawAll();
    };
    
    setTimeout(resize, 10);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [active, strokes, windowMode, size.w, size.h, currentPage, mode, scrollY]);

  const drawPaperPattern = (ctx: CanvasRenderingContext2D, width: number, height: number, sy: number) => {
    ctx.clearRect(0, 0, width, height);
    if (windowMode === 'fullscreen' && mode === 'transparent') return;
    
    ctx.save();
    ctx.translate(0, -sy);
    ctx.fillStyle = '#fefce8';
    ctx.fillRect(0, sy, width, height);

    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1;

    switch (mode) {
      case 'lined': {
        const startY = Math.max(40, Math.floor(sy / 32) * 32);
        for (let y = startY; y < sy + height + 32; y += 32) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(60, sy);
        ctx.lineTo(60, sy + height);
        ctx.stroke();
        break;
      }
      case 'grid': {
        for (let x = 0; x < width; x += 24) {
          ctx.beginPath();
          ctx.moveTo(x, sy);
          ctx.lineTo(x, sy + height);
          ctx.stroke();
        }
        const startY = Math.floor(sy / 24) * 24;
        for (let y = startY; y < sy + height + 24; y += 24) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        break;
      }
      case 'dotted': {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        const startY = Math.floor(sy / 24) * 24 + 12;
        for (let x = 12; x < width; x += 24) {
          for (let y = startY; y < sy + height + 24; y += 24) {
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      }
    }
    ctx.restore();
  };

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    ctx.translate(0, -scrollY);
    ctx.restore();

    ctx.save();
    ctx.translate(0, -scrollY);
    for (const stroke of strokes) {
      drawStroke(ctx, stroke);
    }
    ctx.restore();
    if (currentStrokeRef.current) {
      ctx.save();
      ctx.translate(0, -scrollY);
      drawStroke(ctx, currentStrokeRef.current);
      ctx.restore();
    }
  }, [strokes, scrollY]);

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

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.whiteboard-toolbar') || (e.target as HTMLElement).closest('.whiteboard-sidebar')) {
      return;
    }
    setEditingPreset(null);
    e.preventDefault();
    setIsDrawing(true);

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = (e.clientY - rect.top) + scrollY;
    const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;

    if (tool === 'eraser' && activeEraser.type === 'stroke') {
      eraseIntersectingStrokes(x, y);
    } else {
      currentStrokeRef.current = {
        points: [{ x, y, pressure }],
        color: tool === 'eraser' ? '#000000' : color,
        width: tool === 'eraser' ? strokeWidth * 4 : strokeWidth,
        isEraser: tool === 'eraser',
      };
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
  const addNewPage = () => { 
    setTotalPages(p => p + 1); 
    setCurrentPage(totalPages + 1); 
    setScrollY(0);
  };
  
  const setPageWithScrollReset = (pageUpdater: (p: number) => number) => {
    setCurrentPage(p => {
      const newPage = pageUpdater(p);
      if (newPage !== p) setScrollY(0);
      return newPage;
    });
  };

  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); handleUndo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); handleRedo(); }
      if (e.key === 'e') { setTool('eraser'); }
      if (e.key === 'p' || e.key === 'b') { setTool('pen'); }
      if (e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        handleClear();
      }
      
      // Focus element check to avoid triggering when typing in inputs
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setScrollY(y => Math.max(0, y - 100));
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setScrollY(y => y + 100);
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPageWithScrollReset(p => Math.max(1, p - 1));
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentPage === totalPages) {
          addNewPage();
        } else {
          setPageWithScrollReset(p => Math.min(totalPages, p + 1));
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, strokes, currentPage, totalPages]);

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
        ref={bgCanvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ touchAction: 'none' }}
      />
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 ${tool === 'pointer' ? 'pointer-events-none' : 'cursor-crosshair'}`}
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      {/* Transparent Custom Sidebar */}
      {sidebarMode !== 'hidden' && (
        <div className={`whiteboard-sidebar pointer-events-auto absolute z-[9999] ${sidebarMode === 'fixed' ? 'left-2 top-1/2 -translate-y-1/2' : 'left-4 top-20'}`}>
          <Draggable disabled={sidebarMode === 'fixed'} handle=".sidebar-drag" nodeRef={sidebarRef}>
            <div ref={sidebarRef} className="flex flex-col items-center gap-1 p-1.5 bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 dark:border-gray-700/50">
              {sidebarMode === 'floating' && (
                <div className="sidebar-drag w-full flex justify-center py-1 cursor-grab active:cursor-grabbing text-gray-400 drop-shadow-md">
                  <GripHorizontal className="w-4 h-4" />
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-1 w-full place-items-center">
                {/* Close Button */}
                <button onClick={handleClose} className="w-8 h-8 rounded-full flex items-center justify-center transition-all bg-red-100 text-red-600 hover:bg-red-200 shadow-sm" title="Fechar Lousa">
                  <X className="w-4 h-4" />
                </button>
                
                {/* Window Mode */}
                <button
                  onClick={() => {
                    const nextMode = windowMode === 'fullscreen' ? 'floating' : 'fullscreen';
                    setWindowMode(nextMode);
                    if (nextMode === 'floating' && mode === 'transparent') setMode('lined');
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all bg-white/90 shadow-sm text-gray-500 hover:text-indigo-600"
                  title={windowMode === 'fullscreen' ? 'Modo Janela' : 'Tela Cheia'}
                >
                  {windowMode === 'fullscreen' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                {/* Background Mode */}
                <div className="relative group">
                  <button className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${mode === 'transparent' ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-400' : 'bg-white/90 text-gray-500 hover:text-indigo-600'}`} title="Fundo / Modo">
                    {mode === 'transparent' ? <Focus className="w-4 h-4" /> : <PanelTop className="w-4 h-4" />}
                  </button>
                  <div className="absolute left-full ml-3 top-0 hidden group-hover:flex bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 p-2 flex-col gap-1 z-[10000] w-40">
                    <button onClick={() => { setMode('transparent'); setWindowMode('fullscreen'); }} className={`text-xs p-1.5 rounded text-left ${mode === 'transparent' ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-50'}`}> Lousa Transparente</button>
                    <button onClick={() => setMode('lined')} className={`text-xs p-1.5 rounded text-left ${mode === 'lined' ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-50'}`}> 📝 Pautado</button>
                    <button onClick={() => setMode('grid')} className={`text-xs p-1.5 rounded text-left ${mode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-50'}`}> 📐 Quadriculado</button>
                    <button onClick={() => setMode('dotted')} className={`text-xs p-1.5 rounded text-left ${mode === 'dotted' ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-50'}`}> 📌 Pontilhado</button>
                  </div>
                </div>

                {/* Mouse / Pointer Tool */}
                <button onClick={() => setTool('pointer')} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${tool === 'pointer' ? 'bg-indigo-50 text-indigo-600 ring-2 ring-indigo-400' : 'bg-white/90 shadow-sm text-gray-500 hover:text-indigo-600'}`} title="Mouse (Atalho: V ou Esc)">
                  <MousePointer2 className="w-4 h-4" />
                </button>

                {/* Notebooks Menu */}
                <button onClick={() => setShowNotebooksManager(true)} className="w-8 h-8 rounded-full flex items-center justify-center transition-all bg-white/90 shadow-sm text-gray-500 hover:text-purple-600" title="Alterar Caderno">
                  <Book className="w-4 h-4" />
                </button>

                {/* Clear Board */}
                <button onClick={handleClear} className="w-8 h-8 rounded-full flex items-center justify-center transition-all bg-white/90 shadow-sm text-red-500 hover:text-red-600 hover:bg-red-50" title="Limpar Lousa">
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Undo / Redo */}
                <button onClick={handleUndo} disabled={strokes.length === 0} className="w-8 h-8 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-gray-500 hover:text-indigo-600 disabled:opacity-30"><Undo2 className="w-4 h-4" /></button>
                <button onClick={handleRedo} disabled={redoStack.length === 0} className="w-8 h-8 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-gray-500 hover:text-indigo-600 disabled:opacity-30"><Redo2 className="w-4 h-4" /></button>
              </div>

              <div className="w-full h-px bg-gray-300 dark:bg-gray-600 my-1 drop-shadow-md" />

              {/* PENS GRID */}
              <div className="grid grid-cols-2 gap-1 w-full place-items-center">
                {penPresets.map((preset) => (
                  <div key={preset.id} className="relative group">
                    <button
                      onClick={() => {
                        if (activePenId === preset.id && tool === 'pen') setEditingPreset(editingPreset === preset.id ? null : preset.id);
                        else { setTool('pen'); setActivePenId(preset.id); setEditingPreset(null); }
                      }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all drop-shadow-md ${tool === 'pen' && activePenId === preset.id ? 'ring-2 ring-indigo-500 scale-110' : 'opacity-80 hover:opacity-100'}`}
                      style={{ backgroundColor: preset.color }}
                    >
                      <div className="bg-white/40 rounded-full" style={{ width: Math.min(preset.width, 12), height: Math.min(preset.width, 12) }} />
                    </button>
                    {editingPreset === preset.id && tool === 'pen' && (
                      <div className="absolute left-full ml-3 top-0 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 p-2 flex flex-col gap-2 z-[10000]">
                        <div className="flex gap-1 flex-wrap w-24">
                          {COLORS.map(c => (
                            <button key={c} onClick={() => updatePenPreset(preset.id, { color: c })} className={`w-5 h-5 rounded-full border-2 ${preset.color === c ? 'border-indigo-500 scale-110' : 'border-gray-300'}`} style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updatePenPreset(preset.id, { width: Math.max(1, preset.width - 2) })}><Minus className="w-4 h-4" /></button>
                          <span className="text-xs font-bold w-6 text-center">{preset.width}</span>
                          <button onClick={() => updatePenPreset(preset.id, { width: Math.min(30, preset.width + 2) })}><Plus className="w-4 h-4" /></button>
                        </div>
                        {penPresets.length > 1 && (
                          <button onClick={() => deletePenPreset(preset.id)} className="flex items-center gap-1 text-xs text-red-500 hover:bg-red-50 rounded p-1 mt-1"><Trash2 className="w-3 h-3" /> Excluir</button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {penPresets.length < 5 && (
                  <button onClick={addPenPreset} className="w-7 h-7 rounded-full bg-white/80 border border-gray-200 text-gray-500 hover:text-indigo-600 flex items-center justify-center shadow-sm backdrop-blur-sm"><Plus className="w-4 h-4" /></button>
                )}
              </div>

              <div className="w-full h-px bg-gray-300 dark:bg-gray-600 my-1 drop-shadow-md" />
              
              {/* ERASERS GRID */}
              <div className="grid grid-cols-2 gap-1 w-full place-items-center">
                {eraserPresets.map((preset) => (
                  <div key={preset.id} className="relative group">
                    <button
                      onClick={() => {
                        if (activeEraserId === preset.id && tool === 'eraser') setEditingPreset(editingPreset === preset.id ? null : preset.id);
                        else { setTool('eraser'); setActiveEraserId(preset.id); setEditingPreset(null); }
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center bg-white/90 shadow-md backdrop-blur-sm transition-all ${tool === 'eraser' && activeEraserId === preset.id ? 'ring-2 ring-pink-500 text-pink-600 scale-110' : 'text-gray-600 hover:text-pink-500'}`}
                    >
                      {preset.type === 'stroke' ? <Focus className="w-4 h-4" /> : <Eraser className="w-4 h-4" />}
                    </button>
                    {editingPreset === preset.id && tool === 'eraser' && (
                      <div className="absolute left-full ml-3 top-0 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 p-2 flex flex-col gap-2 z-[10000] w-40">
                        <select value={preset.type} onChange={e => updateEraserPreset(preset.id, { type: e.target.value as 'normal' | 'stroke' })} className="text-xs p-1 rounded border">
                          <option value="normal">Borracha Normal</option>
                          <option value="stroke">Apagar Traços</option>
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
                {eraserPresets.length < 2 && (
                  <button onClick={addEraserPreset} className="w-7 h-7 rounded-full bg-white/80 border border-gray-200 text-gray-500 hover:text-pink-600 flex items-center justify-center shadow-sm backdrop-blur-sm"><Plus className="w-4 h-4" /></button>
                )}
              </div>

              <div className="w-full h-px bg-gray-300 dark:bg-gray-600 my-1 drop-shadow-md" />

              {/* Bottom Row */}
              <div className="grid grid-cols-2 gap-1 w-full place-items-center relative group">
                <div className="relative group col-span-2 flex justify-center w-full">
                  <button className="w-full max-w-[4rem] h-8 rounded-full bg-indigo-50 shadow-sm flex items-center justify-center text-indigo-600 text-xs font-bold ring-1 ring-indigo-200">
                    Pág {currentPage}
                  </button>
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 p-1 items-center gap-1 z-[10000]">
                    <button onClick={() => setPageWithScrollReset(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 text-gray-600 disabled:opacity-30 hover:bg-gray-200 rounded"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-xs font-bold w-12 text-center text-gray-700 dark:text-gray-300">Pág {currentPage}</span>
                    <button onClick={() => setPageWithScrollReset(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 text-gray-600 disabled:opacity-30 hover:bg-gray-200 rounded"><ChevronRight className="w-4 h-4" /></button>
                    <div className="w-px h-4 bg-gray-300 mx-1" />
                    <button onClick={addNewPage} className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded" title="Nova Página"><FilePlus className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>

              {/* Settings Toggle */}
              <div className="relative mt-1 w-full flex justify-center">
                <button onClick={() => setShowSidebarSettings(!showSidebarSettings)} className={`w-8 h-8 rounded-full shadow-md backdrop-blur-sm flex items-center justify-center transition-all ${showSidebarSettings ? 'bg-indigo-50 text-indigo-600 ring-2 ring-indigo-400' : 'bg-white/90 text-gray-500 hover:text-indigo-600'}`}>
                  <Settings2 className="w-4 h-4" />
                </button>
                {showSidebarSettings && (
                  <div className="absolute left-full ml-3 bottom-0 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 p-2 flex flex-col gap-1 z-[10000] w-36">
                    <button onClick={() => { setSidebarMode('fixed'); saveSettings(penPresets, eraserPresets, 'fixed'); setShowSidebarSettings(false); }} className={`text-xs p-1.5 rounded text-left ${sidebarMode === 'fixed' ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-50'}`}> Sidebar Fixa</button>
                    <button onClick={() => { setSidebarMode('floating'); saveSettings(penPresets, eraserPresets, 'floating'); setShowSidebarSettings(false); }} className={`text-xs p-1.5 rounded text-left ${sidebarMode === 'floating' ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-50'}`}> Sidebar Flutuante</button>
                    <button onClick={() => { setSidebarMode('hidden'); saveSettings(penPresets, eraserPresets, 'hidden'); setShowSidebarSettings(false); }} className={`text-xs p-1.5 rounded text-left text-red-500 hover:bg-red-50`}> Ocultar Sidebar</button>
                  </div>
                )}
              </div>
            </div>
          </Draggable>
        </div>
      )}

      {/* Recover hidden sidebar button */}
      {sidebarMode === 'hidden' && (
        <button
          onClick={() => { setSidebarMode('floating'); saveSettings(penPresets, eraserPresets, 'floating'); }}
          className="whiteboard-toolbar pointer-events-auto absolute top-4 right-4 z-[9999] w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-gray-600 hover:bg-white"
          title="Mostrar Menu da Lousa"
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

      {/* Notebooks Manager Modal */}
      {showNotebooksManager && (
        <NotebooksManager 
          onClose={() => setShowNotebooksManager(false)} 
          onSelectNotebook={(nb) => {
            setActiveNotebook(nb);
            setShowNotebooksManager(false);
            // reset strokes array to empty or load from Firebase (to be implemented)
            setStrokesByPage({ 1: [] });
            setRedoStackByPage({ 1: [] });
            setCurrentPage(1);
            setTotalPages(nb.totalPages || 1);
          }} 
        />
      )}
    </>
  );

  const handleWheel = (e: React.WheelEvent) => {
    if (mode === 'transparent') return;
    // Intercept scroll event to scroll notebook instead of the app
    e.stopPropagation();
    setScrollY(y => Math.max(0, y + e.deltaY));
  };

  if (windowMode === 'fullscreen') {
    return createPortal(
      <div 
        ref={containerRef}
        className={`fixed inset-0 z-[9998] ${mode !== 'transparent' ? 'bg-[#fefce8]' : ''} ${tool === 'pointer' && mode === 'transparent' ? 'pointer-events-none' : ''}`} 
        style={{ touchAction: 'none' }}
        onWheel={handleWheel}
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
          className="absolute pointer-events-auto bg-[#fefce8] rounded-xl shadow-2xl overflow-hidden border border-gray-300 dark:border-gray-600 flex flex-col"
          style={{ width: `${size.w}px`, height: `${size.h}px`, touchAction: 'none' }}
          onWheel={handleWheel}
        >
          <div 
            className={`whiteboard-drag-handle whiteboard-toolbar h-8 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-3 cursor-grab active:cursor-grabbing ${!activeNotebook ? 'bg-indigo-50 dark:bg-gray-800' : ''}`}
            style={activeNotebook ? { backgroundColor: activeNotebook.coverColor, color: '#ffffff' } : {}}
          >
            <div className="flex items-center gap-2">
              <GripHorizontal className={`w-4 h-4 ${activeNotebook ? 'text-white/80' : 'text-gray-400'}`} />
              <span className={`text-xs font-bold uppercase tracking-wider truncate max-w-[200px] sm:max-w-xs ${activeNotebook ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                {activeNotebook ? `Caderno Digital de ${activeNotebook.name}` : 'Rascunho Rápido'}
              </span>
            </div>
            <button onClick={handleClose} className={`p-1 rounded ${activeNotebook ? 'text-white hover:bg-white/20' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500'}`}>
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
