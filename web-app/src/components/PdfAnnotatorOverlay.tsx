import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Eraser, X, Undo2, Redo2, ChevronLeft, ChevronRight, Download, PenTool, Highlighter, MousePointer2, BookOpen, File as FileIcon, Save, BookMarked, Trash2, FolderOpen, Loader2, ZoomIn, ZoomOut, RotateCcw, ChevronDown, PanelRightOpen } from 'lucide-react';
import { getStroke } from 'perfect-freehand';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import ePub from 'epubjs';
import mammoth from 'mammoth';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, getDocs, getDoc, deleteDoc, query, orderBy, where, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { supabase } from '../lib/supabase';
import Draggable from 'react-draggable';
import ReadingLaser from './ReadingLaser';
import DrawingSidebar from './DrawingSidebar';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface StrokePoint { x: number; y: number; pressure: number; }
interface Stroke { points: StrokePoint[]; color: string; width: number; type: 'pen' | 'highlighter' | 'eraser' | 'sticker'; isSticker?: boolean; stickerNumber?: number; }
interface SavedDocument {
  id: string;
  name: string;
  fileType: 'pdf' | 'epub' | 'docx';
  fileUrl: string;
  storagePath: string;
  currentPage: number;
  totalPages: number;
  strokesByPage: Record<number, Stroke[]>;
  createdAt: number;
  updatedAt: number;
  fileSize?: number;
}

const COLORS = ['#000000', '#ffffff', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316'];
const HIGHLIGHTER_COLORS = ['#ffff00', '#fce7f3', '#dbeafe', '#dcfce3', '#f3e8ff', '#ffedd5'];
const EMPTY_STROKES: Stroke[] = [];

export default function PdfAnnotatorOverlay() {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileType, setFileType] = useState<'pdf' | 'epub' | 'docx' | null>(null);
  const [pdfFile, setPdfFile] = useState<ArrayBuffer | null>(null);
  const [pdfName, setPdfName] = useState<string>('documento');
  
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [epubBook, setEpubBook] = useState<any>(null);
  const [docxHtml, setDocxHtml] = useState<string>('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<'single' | 'book' | 'scroll'>('single');
  
  const [strokesByPage, setStrokesByPage] = useState<Record<number, Stroke[]>>({});
  const [redoStackByPage, setRedoStackByPage] = useState<Record<number, Stroke[]>>({});
  const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser' | 'pointer' | 'sticker'>('pen');
  const [penColor, setPenColor] = useState('#ef4444');
  const [highlighterColor, setHighlighterColor] = useState('#ffff00');
  const [penWidth, setPenWidth] = useState(3);
  const [highlighterWidth, setHighlighterWidth] = useState(20);
  const [eraserWidth, setEraserWidth] = useState(20);

  const [penPresets, setPenPresets] = useState([{ id: 'p1', color: '#ef4444', width: 3 }]);
  const [eraserPresets, setEraserPresets] = useState([{ id: 'e1', type: 'normal', width: 20 }]);
  const [activePenId, setActivePenId] = useState('p1');
  const [activeEraserId, setActiveEraserId] = useState('e1');

  useEffect(() => {
    const activePen = penPresets.find(p => p.id === activePenId);
    if (activePen) {
      setPenColor(activePen.color);
      setPenWidth(activePen.width);
    }
  }, [activePenId, penPresets]);

  useEffect(() => {
    const activeEraser = eraserPresets.find(p => p.id === activeEraserId);
    if (activeEraser) {
      setEraserWidth(activeEraser.width);
    }
  }, [activeEraserId, eraserPresets]);

  // Zoom state
  const [zoom, setZoom] = useState(1);
  const zoomIn = () => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)));
  const zoomOut = () => setZoom(z => Math.max(0.25, +(z - 0.25).toFixed(2)));
  const zoomReset = () => setZoom(1);

  // Split-screen state
  const [splitMode, setSplitMode] = useState(false);
  const [splitWidth, setSplitWidth] = useState(50); // percentage of screen for the reader
  const splitDragging = useRef(false);

  useEffect(() => {
    if (active && splitMode) {
      document.body.style.transition = 'padding-right 0.3s ease';
      document.body.style.paddingRight = `${splitWidth}%`;
      document.body.style.overflowX = 'hidden';
    } else {
      document.body.style.paddingRight = '0px';
      document.body.style.overflowX = '';
    }
    return () => {
      document.body.style.paddingRight = '0px';
      document.body.style.overflowX = '';
      document.body.style.transition = '';
    };
  }, [active, splitMode, splitWidth]);

  // Library state
  const [showLibrary, setShowLibrary] = useState(false);
  const [savedDocs, setSavedDocs] = useState<SavedDocument[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const hasAutoLoaded = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleOpen = () => {
      setActive(true);
    };
    window.addEventListener('open-pdf-annotator', handleOpen);
    return () => window.removeEventListener('open-pdf-annotator', handleOpen);
  }, []);

  // Auto-load last session when annotator becomes active
  useEffect(() => {
    if (!active || hasAutoLoaded.current) return;
    // Only auto-load if no document is currently open
    if (pdfDoc || epubBook || docxHtml) return;
    hasAutoLoaded.current = true;

    const loadLastSession = async () => {
      const uid = getUid();
      if (!uid) return;
      try {
        const prefDoc = await getDoc(doc(db, 'users', uid, 'preferences', 'lastSession'));
        if (!prefDoc.exists()) return;
        const lastDocId = prefDoc.data()?.lastDocId;
        if (!lastDocId) return;

        // Load the library to find the document
        const q = query(collection(db, 'users', uid, 'documents'), orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);
        const docs: SavedDocument[] = [];
        snapshot.forEach(docSnap => {
          docs.push({ id: docSnap.id, ...docSnap.data() } as SavedDocument);
        });
        setSavedDocs(docs);

        const lastDoc = docs.find(d => d.id === lastDocId);
        if (lastDoc && lastDoc.fileUrl) {
          openSavedDocument(lastDoc);
        }
      } catch (err) {
        console.warn('Erro ao carregar última sessão:', err);
      }
    };

    loadLastSession();
  }, [active]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!active) return;
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'ArrowRight' && viewMode !== 'scroll') {
        setCurrentPage(p => Math.min(totalPages, p + (viewMode === 'book' && fileType === 'pdf' ? 2 : 1)));
      } else if (e.key === 'ArrowLeft' && viewMode !== 'scroll') {
        setCurrentPage(p => Math.max(1, p - (viewMode === 'book' && fileType === 'pdf' ? 2 : 1)));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [strokesByPage, currentPage, active, viewMode, fileType, totalPages]);



  // Get current user
  const getUid = () => {
    const auth = getAuth();
    return auth.currentUser?.uid;
  };

  // Load library
  const loadLibrary = async () => {
    const uid = getUid();
    if (!uid) return;
    setLoadingLibrary(true);
    try {
      const q = query(collection(db, 'users', uid, 'documents'), orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      const docs: SavedDocument[] = [];
      snapshot.forEach(docSnap => {
        docs.push({ id: docSnap.id, ...docSnap.data() } as SavedDocument);
      });
      setSavedDocs(docs);
    } catch (err) {
      console.error('Erro ao carregar biblioteca:', err);
    } finally {
      setLoadingLibrary(false);
    }
  };

  // Save document metadata and strokes only
  const saveDocument = async () => {
    const uid = getUid();
    if (!uid || !currentDocId) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'users', uid, 'documents', currentDocId);
      await setDoc(docRef, { strokesByPage, currentPage, updatedAt: Date.now() }, { merge: true });
      await loadLibrary();
    } catch (err) {
      console.error('Erro ao salvar documento:', err);
    } finally {
      setSaving(false);
    }
  };

  // Auto-save useEffect
  useEffect(() => {
    if (!currentDocId || !active) return;
    const timeout = setTimeout(async () => {
      const uid = getUid();
      if (!uid) return;
      try {
        setSaving(true);
        const docRef = doc(db, 'users', uid, 'documents', currentDocId);
        await setDoc(docRef, { strokesByPage, currentPage, updatedAt: Date.now() }, { merge: true });
        // Save last session for cross-device resume
        await setDoc(doc(db, 'users', uid, 'preferences', 'lastSession'), { lastDocId: currentDocId, updatedAt: Date.now() }, { merge: true });
        setSaving(false);
      } catch (e) {
        console.error("Auto-save failed", e);
        setSaving(false);
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timeout);
  }, [strokesByPage, currentPage, currentDocId, active]);

  // Load a saved document
  const openSavedDocument = async (savedDoc: SavedDocument) => {
    setLoading(true);
    setShowLibrary(false);
    setActive(true);
    setPdfName(savedDoc.name);
    setCurrentDocId(savedDoc.id);
    setStrokesByPage(savedDoc.strokesByPage || {});
    setRedoStackByPage({});

    try {
      if (!savedDoc.fileUrl) {
        alert('O upload deste arquivo ainda não foi concluído ou falhou. Aguarde alguns segundos ou faça o upload novamente.');
        setLoading(false);
        return;
      }

      // Download file from storage
      const response = await fetch(savedDoc.fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      setPdfFile(arrayBuffer);

      if (savedDoc.fileType === 'pdf') {
        setFileType('pdf');
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(savedDoc.currentPage || 1);
      } else if (savedDoc.fileType === 'epub') {
        if (epubBook) {
          try { epubBook.destroy(); } catch (_e) { /* ignore */ }
        }
        setFileType('epub');
        setPdfDoc(null);
        setDocxHtml('');
        const book = ePub(arrayBuffer);
        setEpubBook(book);
        book.ready.then(async () => {
          try {
            await book.locations.generate(1600);
            const total = book.locations.length() > 0 ? book.locations.length() : 1;
            setTotalPages(total);
            setCurrentPage(savedDoc.currentPage || 1);
          } catch (e) {
            setTotalPages(1);
            setCurrentPage(1);
          }
        }).catch(err => {
          console.warn("EPUB ready error", err);
          setTotalPages(1);
          setCurrentPage(1);
        });
      } else if (savedDoc.fileType === 'docx') {
        setFileType('docx');
        setPdfDoc(null);
        setEpubBook(null);
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setDocxHtml(result.value);
        setTotalPages(1);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error('Erro ao abrir documento salvo:', err);
      alert('Erro ao abrir o documento. Tente novamente.');
      setActive(false);
    } finally {
      setLoading(false);
    }
  };

  // Delete a saved document
  const deleteSavedDocument = async (savedDoc: SavedDocument) => {
    const uid = getUid();
    if (!uid) return;
    if (!confirm(`Excluir "${savedDoc.name}"?`)) return;
    try {
      // Delete from storage
      try {
        await supabase.storage.from('materials').remove([savedDoc.storagePath]);
      } catch (_e) { /* file might not exist */ }
      // Delete from Firestore
      await deleteDoc(doc(db, 'users', uid, 'documents', savedDoc.id));
      await loadLibrary();
    } catch (err) {
      console.error('Erro ao excluir documento:', err);
    }
  };

  const checkStorageQuota = async (fileType: string, newFileSize: number) => {
    const uid = getUid();
    if (!uid) return false;
    const q = query(collection(db, 'users', uid, 'documents'));
    const snapshot = await getDocs(q);
    let totalSize = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.fileType === fileType && data.fileSize) {
        totalSize += data.fileSize;
      }
    });

    const limits = {
      pdf: 200 * 1024 * 1024,
      epub: 50 * 1024 * 1024,
      docx: 50 * 1024 * 1024,
      doc: 50 * 1024 * 1024
    };

    const limit = limits[fileType as keyof typeof limits] || 0;
    if (totalSize + newFileSize > limit) {
      alert(`Limite excedido para arquivos ${fileType.toUpperCase()}. Espaço usado: ${Math.round(totalSize / 1024 / 1024)}MB. Arquivo atual: ${Math.round(newFileSize / 1024 / 1024)}MB. Limite: ${Math.round(limit / 1024 / 1024)}MB.`);
      return false;
    }
    return true;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setActive(true);
    setPdfName(file.name.replace(/\.[^/.]+$/, ""));
    setCurrentDocId(null); 
    const extension = file.name.split('.').pop()?.toLowerCase();
    const typeAlias = (extension === 'doc' ? 'docx' : extension) as 'pdf' | 'epub' | 'docx';
    
    try {
      const hasQuota = await checkStorageQuota(typeAlias, file.size);
      if (!hasQuota) {
        setLoading(false);
        setActive(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const arrayBuffer = await file.arrayBuffer();
      setPdfFile(arrayBuffer);
      let parsedTotalPages = 1;
      
      if (extension === 'pdf') {
        setFileType('pdf');
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        parsedTotalPages = pdf.numPages;
        setTotalPages(parsedTotalPages);
        setCurrentPage(1);
      } else if (extension === 'epub') {
        if (epubBook) {
          try { epubBook.destroy(); } catch (_e) { }
        }
        setFileType('epub');
        setPdfDoc(null);
        setDocxHtml('');
        const book = ePub(arrayBuffer);
        setEpubBook(book);
        
        try {
          await book.ready;
          await book.locations.generate(1600);
          parsedTotalPages = book.locations.length() > 0 ? book.locations.length() : 1;
        } catch (err) {
          console.warn("EPUB ready error", err);
          parsedTotalPages = 1;
        }

        setTotalPages(parsedTotalPages);
        setCurrentPage(1);
      } else if (extension === 'docx' || extension === 'doc') {
        setFileType('docx');
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setDocxHtml(result.value);
        setTotalPages(1);
        setCurrentPage(1);
      } else {
        throw new Error('Formato não suportado');
      }
      
      setStrokesByPage({});
      setRedoStackByPage({});

      // Create Firestore record immediately so save works right away
      const uid = getUid();
      if (uid) {
        const docId = `doc_${Date.now()}`;
        const storagePath = `users/${uid}/documents/${docId}`;
        setCurrentDocId(docId);

        // Create doc record immediately (without fileUrl yet)
        const docData: Omit<SavedDocument, 'id'> = {
          name: file.name.replace(/\.[^/.]+$/, ""),
          fileType: typeAlias,
          fileUrl: '',
          storagePath,
          currentPage: 1,
          totalPages: parsedTotalPages,
          strokesByPage: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
          fileSize: file.size
        };
        setDoc(doc(db, 'users', uid, 'documents', docId), docData).catch(e => console.error("Firestore create failed", e));

        // Upload file in background and update the fileUrl when done
        (async () => {
          setIsUploadingFile(true);
          try {
            const { error: uploadError } = await supabase.storage.from('materials').upload(storagePath, file, {
              upsert: true
            });
            
            if (uploadError) throw uploadError;
            
            const { data } = supabase.storage.from('materials').getPublicUrl(storagePath);
            const fileUrl = data.publicUrl;
            
            await setDoc(doc(db, 'users', uid, 'documents', docId), { fileUrl }, { merge: true });
            await loadLibrary();
          } catch (e) {
            console.error("Auto-upload failed", e);
            alert("Ocorreu um erro ao salvar o arquivo na nuvem. Verifique sua conexão e tente novamente.");
            try {
              await deleteDoc(doc(db, 'users', uid, 'documents', docId));
              await loadLibrary();
            } catch (delErr) {
              console.error("Failed to delete broken doc", delErr);
            }
          } finally {
            setIsUploadingFile(false);
          }
        })();
      }

    } catch (err) {
      console.error('Error loading file:', err);
      alert('Erro ao carregar o arquivo. Verifique se o formato é suportado.');
      setActive(false);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length === 0) return;
    ctx.save();
    if (stroke.type === 'eraser') {
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
        thinning: stroke.type === 'highlighter' ? 0 : 0.5,
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
  }, []);

  const handleUndo = () => {
    const pageStrokes = strokesByPage[currentPage] || [];
    if (pageStrokes.length === 0) return;
    const newStrokes = [...pageStrokes];
    const undone = newStrokes.pop();
    setStrokesByPage(prev => ({ ...prev, [currentPage]: newStrokes }));
    if (undone) {
      setRedoStackByPage(prev => ({ ...prev, [currentPage]: [...(prev[currentPage] || []), undone] }));
    }
  };

  const handleRedo = () => {
    const pageRedos = redoStackByPage[currentPage] || [];
    if (pageRedos.length === 0) return;
    const newRedos = [...pageRedos];
    const redone = newRedos.pop();
    setRedoStackByPage(prev => ({ ...prev, [currentPage]: newRedos }));
    if (redone) {
      setStrokesByPage(prev => ({ ...prev, [currentPage]: [...(prev[currentPage] || []), redone] }));
    }
  };

  const exportPdf = async () => {
    setLoading(true);
    try {
      if (fileType === 'pdf' && pdfFile && pdfDoc) {
        const pdfLibDoc = await PDFDocument.load(pdfFile);
        const pages = pdfLibDoc.getPages();

        for (let i = 0; i < pages.length; i++) {
          const pageNum = i + 1;
          const strokes = strokesByPage[pageNum];
          if (!strokes || strokes.length === 0) continue;

          const page = pages[i];
          const { width, height } = page.getSize();

          const canvas = document.createElement('canvas');
          canvas.width = width * 2; 
          canvas.height = height * 2;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          ctx.scale(2, 2);

          const pdfJsPage = await pdfDoc.getPage(pageNum);
          const unscaledViewport = pdfJsPage.getViewport({ scale: 1 });
          const scaleX = width / unscaledViewport.width;
          const scaleY = height / unscaledViewport.height;
          ctx.scale(scaleX, scaleY);

          for (const stroke of strokes.filter(s => s.type === 'highlighter')) drawStroke(ctx, stroke);
          
          const highlighterDataUrl = canvas.toDataURL('image/png');
          if (highlighterDataUrl !== 'data:,') {
            const highlighterImage = await pdfLibDoc.embedPng(highlighterDataUrl);
            page.drawImage(highlighterImage, { x: 0, y: 0, width, height, opacity: 0.4 });
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          for (const stroke of strokes.filter(s => s.type === 'pen')) drawStroke(ctx, stroke);
          
          const penDataUrl = canvas.toDataURL('image/png');
          if (penDataUrl !== 'data:,') {
            const penImage = await pdfLibDoc.embedPng(penDataUrl);
            page.drawImage(penImage, { x: 0, y: 0, width, height, opacity: 1 });
          }
        }

        const pdfBytes = await pdfLibDoc.save();
        const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
        saveAs(blob, `${pdfName}_anotado.pdf`);

      } else {
        const container = document.getElementById('document-render-container');
        if (!container) throw new Error('Container not found');
        
        const canvas = await html2canvas(container, {
          allowTaint: true,
          useCORS: true,
          scale: 2
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'l' : 'p',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });
        
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`${pdfName}_anotado.pdf`);
      }
      
    } catch (err) {
      console.error('Erro ao exportar:', err);
      alert('Erro ao salvar o documento com anotações.');
    } finally {
      setLoading(false);
    }
  };

  let pagesToRender: number[] = [];
  if (viewMode === 'scroll' && fileType === 'pdf') {
    pagesToRender = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else if (viewMode === 'book' && fileType === 'pdf') {
    pagesToRender = [currentPage, currentPage + 1].filter(p => p <= totalPages);
  } else {
    pagesToRender = [currentPage];
  }

  const fileTypeLabel = (ft?: string) => {
    if (!ft) return 'DOC';
    switch (ft) {
      case 'pdf': return 'PDF';
      case 'epub': return 'EPUB';
      case 'docx': return 'DOCX';
      default: return ft.toUpperCase();
    }
  };

  return (
    <>
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.epub,.doc,.docx" className="hidden" />

      {active && createPortal(
        <div 
          className={`fixed bg-gray-900 flex flex-col ${splitMode ? 'top-16 right-0 bottom-0 z-[40]' : 'inset-0 z-[9999]'}`}
          style={splitMode ? { width: `${splitWidth}%` } : undefined}
        >
          {/* Draggable split divider */}
          {splitMode && (
            <div
              className="absolute top-0 left-0 w-2 h-full cursor-col-resize z-[10000] group hover:bg-indigo-500/30 transition-colors"
              style={{ marginLeft: '-4px' }}
              onPointerDown={(e) => {
                e.preventDefault();
                splitDragging.current = true;
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!splitDragging.current) return;
                const pct = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
                setSplitWidth(Math.max(25, Math.min(75, pct)));
              }}
              onPointerUp={(e) => {
                splitDragging.current = false;
                (e.target as HTMLElement).releasePointerCapture(e.pointerId);
              }}
            >
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 bg-gray-500 rounded-full opacity-40 group-hover:opacity-100 group-hover:bg-indigo-500 transition-all" />
            </div>
          )}
          {/* Top Toolbar */}
          <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 flex-shrink-0 overflow-x-auto no-scrollbar gap-4">
            <div className="flex items-center gap-4 flex-shrink-0">
              <button onClick={() => setActive(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"><X className="w-5 h-5" /></button>
              <h2 className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-[150px] sm:max-w-md">{pdfName}</h2>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {(fileType === 'pdf' || fileType === 'epub') && (
                <>
                  <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                    <button onClick={() => setViewMode('single')} className={`p-2 rounded ${viewMode === 'single' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-800'}`} title="Modo Página Única"><FileIcon className="w-4 h-4" /></button>
                    {fileType === 'pdf' && (
                      <button onClick={() => setViewMode('book')} className={`p-2 rounded ${viewMode === 'book' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-800'}`} title="Modo Livro (2 Páginas)"><BookOpen className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => setViewMode('scroll')} className={`p-2 rounded ${viewMode === 'scroll' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-800'}`} title="Modo Scroll Contínuo"><ChevronDown className="w-4 h-4" /></button>
                  </div>
                  <div className="w-px h-6 bg-gray-300 mx-1" />
                </>
              )}

              <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                <button onClick={() => setTool('pointer')} className={`p-2 rounded ${tool === 'pointer' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-800'}`} title="Mouse"><MousePointer2 className="w-4 h-4" /></button>
                <button onClick={() => setTool('pen')} className={`p-2 rounded ${tool === 'pen' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-800'}`} title="Caneta"><PenTool className="w-4 h-4" /></button>
                <button onClick={() => setTool('highlighter')} className={`p-2 rounded ${tool === 'highlighter' ? 'bg-white shadow text-yellow-500' : 'text-gray-500 hover:text-gray-800'}`} title="Marca-Texto"><Highlighter className="w-4 h-4" /></button>
                <button onClick={() => setTool('eraser')} className={`p-2 rounded ${tool === 'eraser' ? 'bg-white shadow text-pink-500' : 'text-gray-500 hover:text-gray-800'}`} title="Borracha"><Eraser className="w-4 h-4" /></button>
              </div>

              <div className="w-px h-6 bg-gray-300 mx-1" />

              <button onClick={handleUndo} disabled={!(strokesByPage[currentPage]?.length > 0)} className="p-2 text-gray-500 hover:text-indigo-600 disabled:opacity-30"><Undo2 className="w-4 h-4" /></button>
              <button onClick={handleRedo} disabled={!(redoStackByPage[currentPage]?.length > 0)} className="p-2 text-gray-500 hover:text-indigo-600 disabled:opacity-30"><Redo2 className="w-4 h-4" /></button>

              <div className="w-px h-6 bg-gray-300 mx-1" />

              {tool === 'pen' && (
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-1.5 rounded-lg flex-shrink-0">
                  <div className="flex gap-1">
                    {COLORS.slice(0, 5).map(c => <button key={c} onClick={() => setPenColor(c)} className={`w-6 h-6 rounded-full border-2 ${penColor === c ? 'border-gray-400 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}
                  </div>
                  <div className="w-px h-4 bg-gray-300 mx-1" />
                  <input type="range" min="1" max="10" value={penWidth} onChange={(e) => setPenWidth(Number(e.target.value))} className="w-16 accent-indigo-600" title="Tamanho da caneta" />
                </div>
              )}
              {tool === 'highlighter' && (
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-1.5 rounded-lg flex-shrink-0">
                  <div className="flex gap-1">
                    {HIGHLIGHTER_COLORS.map(c => <button key={c} onClick={() => setHighlighterColor(c)} className={`w-6 h-6 rounded-full border-2 ${highlighterColor === c ? 'border-gray-400 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}
                  </div>
                  <div className="w-px h-4 bg-gray-300 mx-1" />
                  <input type="range" min="10" max="40" value={highlighterWidth} onChange={(e) => setHighlighterWidth(Number(e.target.value))} className="w-16 accent-yellow-500" title="Tamanho do marca-texto" />
                </div>
              )}
              {tool === 'eraser' && (
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-1.5 rounded-lg flex-shrink-0">
                  <input type="range" min="10" max="50" value={eraserWidth} onChange={(e) => setEraserWidth(Number(e.target.value))} className="w-16 accent-pink-500" title="Tamanho da borracha" />
                </div>
              )}

              <div className="w-px h-6 bg-gray-300 mx-1" />

              {/* Save button */}
              <button 
                onClick={saveDocument} 
                disabled={saving || isUploadingFile || !currentDocId} 
                className="p-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg disabled:opacity-30 transition-colors" 
                title={isUploadingFile ? "Sincronizando arquivo com a nuvem em segundo plano..." : "Salvar na conta"}
              >
                {saving || isUploadingFile ? <Loader2 className={`w-4 h-4 animate-spin ${isUploadingFile ? 'text-indigo-500' : ''}`} /> : <Save className="w-4 h-4" />}
              </button>

              {/* Library button */}
              <button 
                onClick={() => { setShowLibrary(!showLibrary); if (!showLibrary) loadLibrary(); }} 
                className={`p-2 rounded-lg transition-colors ${showLibrary ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-100'}`}
                title="Minha Biblioteca"
              >
                <BookMarked className="w-4 h-4" />
              </button>

              {/* Split-screen toggle */}
              <button 
                onClick={() => setSplitMode(prev => !prev)} 
                className={`p-2 rounded-lg transition-colors flex items-center gap-2 flex-shrink-0 ${splitMode ? 'bg-red-100 text-red-600 font-bold border border-red-200' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-100'}`}
                title={splitMode ? 'Sair da Tela Dividida' : 'Tela Dividida'}
              >
                {splitMode ? (
                  <>
                    <X className="w-4 h-4" />
                    <span className="text-xs">Sair da Divisão</span>
                  </>
                ) : (
                  <PanelRightOpen className="w-4 h-4" />
                )}
              </button>

              <div className="w-px h-6 bg-gray-300 mx-1" />

              <button 
                onClick={exportPdf} 
                disabled={loading || fileType === 'epub'} 
                className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm transition-colors ${fileType === 'epub' ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                title={fileType === 'epub' ? 'Exportação indisponível para EPUB' : 'Exportar PDF'}
              >
                <Download className="w-4 h-4" /> {fileType === 'epub' ? 'Não Exporta' : 'Exportar'}
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Library Sidebar */}
            {showLibrary && (
              <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <BookMarked className="w-5 h-5 text-indigo-500" />
                    Minha Biblioteca
                  </h3>
                  <button onClick={() => setShowLibrary(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><X className="w-4 h-4" /></button>
                </div>
                
                {/* Open new file button */}
                <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                  <button 
                    onClick={() => { if (fileInputRef.current) fileInputRef.current.click(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-sm font-medium"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Abrir novo arquivo
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                  {loadingLibrary ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    </div>
                  ) : savedDocs.length === 0 ? (
                    <div className="text-center text-gray-400 py-8 text-sm">
                      <BookMarked className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      Nenhum documento salvo ainda.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {savedDocs.map(savedDoc => (
                        <div
                          key={savedDoc.id}
                          className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            currentDocId === savedDoc.id 
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700' 
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                          onClick={() => openSavedDocument(savedDoc)}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                            savedDoc.fileType === 'pdf' ? 'bg-red-100 text-red-600' :
                            savedDoc.fileType === 'epub' ? 'bg-green-100 text-green-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {fileTypeLabel(savedDoc.fileType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 dark:text-gray-200 text-sm truncate">{savedDoc.name || 'Documento sem nome'}</p>
                            <p className="text-xs text-gray-400">
                              Pag. {savedDoc.currentPage || 1}/{savedDoc.totalPages || 1} &middot; {savedDoc.updatedAt ? new Date(savedDoc.updatedAt).toLocaleDateString('pt-BR') : ''}
                            </p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteSavedDocument(savedDoc); }}
                            className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Document Area */}
            <div ref={contentAreaRef} className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 flex justify-center items-start p-8 gap-8 relative">
              {loading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                  <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              
              <div id="document-render-container" className="flex justify-center gap-8 relative" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.15s ease' }}>
                {fileType === 'pdf' && pdfDoc && (
                  <div 
                    ref={(node) => {
                      if (node && viewMode === 'scroll' && currentPage > 1 && !node.dataset.scrolled) {
                        setTimeout(() => {
                          const pageEl = document.getElementById(`pdf-page-${currentPage}`);
                          if (pageEl && contentAreaRef.current) {
                            contentAreaRef.current.scrollTo({ top: pageEl.offsetTop - 20, behavior: 'auto' });
                            node.dataset.scrolled = "true";
                          }
                        }, 100);
                      }
                    }}
                    className={`flex ${viewMode === 'scroll' ? 'flex-col overflow-y-auto w-full items-center gap-8 py-8' : 'justify-center items-center gap-4'} relative`}
                  >
                    {pagesToRender.map(pageNum => (
                      <PdfPage
                        key={`${pdfDoc.fingerprints?.[0] || 'doc'}-${pageNum}`}
                        pageNum={pageNum}
                        pdfDoc={pdfDoc}
                        zoom={zoom}
                        tool={tool}
                        penColor={penColor}
                        highlighterColor={highlighterColor}
                        penWidth={penWidth}
                        highlighterWidth={highlighterWidth}
                        eraserWidth={eraserWidth}
                        strokes={strokesByPage[pageNum] || EMPTY_STROKES}
                        onUpdateStrokes={(newStrokes: Stroke[]) => setStrokesByPage(prev => ({ ...prev, [pageNum]: newStrokes }))}
                        onUpdateRedo={(newRedos: Stroke[]) => setRedoStackByPage(prev => ({ ...prev, [pageNum]: newRedos }))}
                        drawStroke={drawStroke}
                        onVisible={() => { if (viewMode === 'scroll') setCurrentPage(pageNum); }}
                      />
                    ))}
                  </div>
                )}

                {fileType === 'docx' && docxHtml && (
                  <DocxPage 
                    html={docxHtml} 
                    tool={tool}
                    penColor={penColor}
                    highlighterColor={highlighterColor}
                    penWidth={penWidth}
                    highlighterWidth={highlighterWidth}
                    eraserWidth={eraserWidth}
                    strokes={strokesByPage[1] || []}
                    onUpdateStrokes={(newStrokes: Stroke[]) => setStrokesByPage(prev => ({ ...prev, 1: newStrokes }))}
                    onUpdateRedo={(newRedos: Stroke[]) => setRedoStackByPage(prev => ({ ...prev, 1: newRedos }))}
                    drawStroke={drawStroke}
                  />
                )}

                {fileType === 'epub' && epubBook && (
                  <EpubPage 
                    book={epubBook} 
                    pageNum={currentPage}
                    viewMode={viewMode}
                    tool={tool}
                    penColor={penColor}
                    highlighterColor={highlighterColor}
                    penWidth={penWidth}
                    highlighterWidth={highlighterWidth}
                    eraserWidth={eraserWidth}
                    strokes={strokesByPage[currentPage] || EMPTY_STROKES}
                    onUpdateStrokes={(newStrokes: Stroke[]) => setStrokesByPage(prev => ({ ...prev, [currentPage]: newStrokes }))}
                    onUpdateRedo={(newRedos: Stroke[]) => setRedoStackByPage(prev => ({ ...prev, [currentPage]: newRedos }))}
                    drawStroke={drawStroke}
                  />
                )}
              </div>

              {/* Reading Laser */}
              <ReadingLaser containerRef={contentAreaRef} />
            </div>
          </div>

          {/* Bottom Toolbar (Pagination + Zoom) */}
          <div className="h-14 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 flex-shrink-0 toolbar">
            {/* Zoom Controls - Left */}
            <div className="flex items-center gap-1">
              <button onClick={zoomOut} disabled={zoom <= 0.25} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition-colors" title="Diminuir zoom"><ZoomOut className="w-4 h-4" /></button>
              <button onClick={zoomReset} className="px-2 py-1 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg min-w-[48px] transition-colors" title="Resetar zoom">{Math.round(zoom * 100)}%</button>
              <button onClick={zoomIn} disabled={zoom >= 3} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition-colors" title="Aumentar zoom"><ZoomIn className="w-4 h-4" /></button>
              {zoom !== 1 && <button onClick={zoomReset} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors" title="Resetar zoom"><RotateCcw className="w-3 h-3" /></button>}
            </div>

            {/* Pagination - Center */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - (viewMode === 'book' && fileType === 'pdf' ? 2 : 1)))} 
                disabled={currentPage === 1}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">
                Página {currentPage} {viewMode === 'book' && fileType === 'pdf' && currentPage < totalPages ? `e ${currentPage + 1}` : ''} de {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + (viewMode === 'book' && fileType === 'pdf' ? 2 : 1)))} 
                disabled={currentPage >= (viewMode === 'book' && fileType === 'pdf' ? totalPages - 1 : totalPages)}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Spacer - Right (to balance the layout) */}
            <div className="w-[140px]" />
          </div>

          {/* Floating Drawing Sidebar */}
          <DrawingSidebar
            tool={tool} setTool={setTool}
            penPresets={penPresets} setPenPresets={setPenPresets}
            activePenId={activePenId} setActivePenId={setActivePenId}
            eraserPresets={eraserPresets} setEraserPresets={setEraserPresets}
            activeEraserId={activeEraserId} setActiveEraserId={setActiveEraserId}
            strokes={strokesByPage[currentPage] || []}
            handleUndo={handleUndo} handleRedo={handleRedo}
            redoStack={redoStackByPage[currentPage] || []}
          />
        </div>,
        document.body
      )}
    </>
  );
}

// Custom Hook for common Canvas drawing logic
function useCanvasDrawing(zoom: number, tool: string, penColor: string, highlighterColor: string, penWidth: number, highlighterWidth: number, eraserWidth: number, strokes: Stroke[], onUpdateStrokes: (s: Stroke[]) => void, onUpdateRedo: (s: Stroke[]) => void, drawStroke: any) {
  const highlighterCanvasRef = useRef<HTMLCanvasElement>(null);
  const penCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const animFrameRef = useRef<number>(0);
  const isStraightLineRef = useRef(false);

  const redrawStrokes = useCallback(() => {
    const hCtx = highlighterCanvasRef.current?.getContext('2d');
    const pCtx = penCanvasRef.current?.getContext('2d');
    if (!hCtx || !pCtx || !highlighterCanvasRef.current || !penCanvasRef.current) return;

    hCtx.clearRect(0, 0, highlighterCanvasRef.current.width, highlighterCanvasRef.current.height);
    pCtx.clearRect(0, 0, penCanvasRef.current.width, penCanvasRef.current.height);

    hCtx.save();
    pCtx.save();
    
    // Scale the context by the current zoom level so that old strokes (drawn at zoom=1 equivalent)
    // are rendered correctly on the higher-resolution canvas.
    if (zoom !== 1) {
      hCtx.scale(zoom, zoom);
      pCtx.scale(zoom, zoom);
    }

    for (const stroke of strokes) {
      if (stroke.isSticker) continue;
      if (stroke.type === 'highlighter') drawStroke(hCtx, stroke);
      else if (stroke.type === 'pen') drawStroke(pCtx, stroke);
      else if (stroke.type === 'eraser') { drawStroke(hCtx, stroke); drawStroke(pCtx, stroke); }
    }

    if (currentStrokeRef.current) {
      const stroke = currentStrokeRef.current;
      if (stroke.type === 'highlighter') drawStroke(hCtx, stroke);
      else if (stroke.type === 'pen') drawStroke(pCtx, stroke);
      else if (stroke.type === 'eraser') { drawStroke(hCtx, stroke); drawStroke(pCtx, stroke); }
    }
    
    hCtx.restore();
    pCtx.restore();
  }, [strokes, drawStroke, zoom]);

  useEffect(() => { redrawStrokes(); }, [strokes, redrawStrokes]);

  const eraseIntersecting = (x: number, y: number) => {
    const threshold = eraserWidth / 2;
    const strokesToKeep: Stroke[] = [];
    const strokesToRemove: Stroke[] = [];
    for (const stroke of strokes) {
      if (stroke.type === 'eraser') continue;
      const isHit = stroke.points.some((p: StrokePoint) => Math.hypot(p.x - x, p.y - y) < threshold);
      if (isHit) strokesToRemove.push(stroke);
      else strokesToKeep.push(stroke);
    }
    if (strokesToRemove.length > 0) {
      onUpdateStrokes(strokesToKeep);
      setTimeout(redrawStrokes, 0);
    }
  };

  const handlePointerDown = async (e: React.PointerEvent) => {
    if (tool === 'pointer') return;
    e.preventDefault();
    setIsDrawing(true);
    
    // Check if right click (button 2) is used to start the stroke
    isStraightLineRef.current = e.button === 2 || (e.buttons & 2) !== 0;

    const rect = penCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Divide the x, y by zoom so they are stored normalized to zoom=1
    const x = ((e.clientX - rect.left) * (penCanvasRef.current!.width / rect.width)) / zoom;
    const y = ((e.clientY - rect.top) * (penCanvasRef.current!.height / rect.height)) / zoom;
    const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;

    if (tool === 'sticker') {
      setIsDrawing(false);
      const postitNumberStr = window.prompt("Digite o número do Post-it para linkar:");
      if (postitNumberStr) {
        const num = parseInt(postitNumberStr.replace(/\D/g, ''), 10);
        if (!isNaN(num)) {
          let stickerColor = '#fef08a';
          const user = getAuth().currentUser;
          if (user) {
            try {
              const q = query(collection(db, 'users', user.uid, 'notes'), where('noteNumber', '==', num));
              const querySnapshot = await getDocs(q);
              if (!querySnapshot.empty) {
                stickerColor = querySnapshot.docs[0].data().color || '#fef08a';
              }
            } catch (e) {
              console.error("Erro ao buscar cor do post-it", e);
            }
          }
          const newStroke: Stroke = {
            points: [{ x, y, pressure }],
            color: stickerColor,
            width: 1,
            type: 'sticker',
            isSticker: true,
            stickerNumber: num
          };
          onUpdateStrokes([...strokes, newStroke]);
        }
      }
      return;
    }

    if (tool === 'eraser') {
      eraseIntersecting(x, y);
      currentStrokeRef.current = { points: [{ x, y, pressure }], color: '#000000', width: eraserWidth, type: 'eraser' };
    } else {
      currentStrokeRef.current = {
        points: [{ x, y, pressure }],
        color: tool === 'highlighter' ? highlighterColor : penColor,
        width: tool === 'highlighter' ? highlighterWidth : penWidth,
        type: tool as any,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !currentStrokeRef.current) return;
    e.preventDefault();
    const rect = penCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Divide the x, y by zoom so they are stored normalized to zoom=1
    const x = ((e.clientX - rect.left) * (penCanvasRef.current!.width / rect.width)) / zoom;
    const y = ((e.clientY - rect.top) * (penCanvasRef.current!.height / rect.height)) / zoom;
    const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;

    // Se começou com botão direito OU se agora está segurando o botão direito
    if (isStraightLineRef.current || (e.buttons & 2) !== 0) {
      if (currentStrokeRef.current.points.length > 1) {
        currentStrokeRef.current.points[1] = { x, y, pressure };
      } else {
        currentStrokeRef.current.points.push({ x, y, pressure });
      }
    } else {
      currentStrokeRef.current.points.push({ x, y, pressure });
    }
    
    if (tool === 'eraser') eraseIntersecting(x, y);

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => redrawStrokes());
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDrawing(false);
    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0 && tool !== 'eraser') {
      onUpdateStrokes([...strokes, currentStrokeRef.current]);
      onUpdateRedo([]);
    }
    currentStrokeRef.current = null;
    redrawStrokes();
  };

  return { highlighterCanvasRef, penCanvasRef, handlePointerDown, handlePointerMove, handlePointerUp, redrawStrokes };
}

// Subcomponent for each PDF page
function PdfPage({ pageNum, pdfDoc, zoom, tool, penColor, highlighterColor, penWidth, highlighterWidth, eraserWidth, strokes, onUpdateStrokes, onUpdateRedo, drawStroke, onVisible }: any) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 1131 });
  const hasCalledVisible = useRef(false);
  const lastRenderedZoom = useRef<number | null>(null);

  const { highlighterCanvasRef, penCanvasRef, handlePointerDown, handlePointerMove, handlePointerUp } = useCanvasDrawing(zoom, tool, penColor, highlighterColor, penWidth, highlighterWidth, eraserWidth, strokes, onUpdateStrokes, onUpdateRedo, drawStroke);

  // Track visibility for scroll mode page tracking
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasCalledVisible.current) {
        hasCalledVisible.current = true;
        if (onVisible) onVisible();
      }
    }, { threshold: 0.5 });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [onVisible]);

  // Render the PDF page directly once pdfDoc is available
  useEffect(() => {
    if (!pdfDoc || lastRenderedZoom.current === zoom) return;

    const doRender = async () => {
      // Wait a tick for canvas refs to be attached
      await new Promise(r => setTimeout(r, 50));
      
      if (!bgCanvasRef.current || !highlighterCanvasRef.current || !penCanvasRef.current) {
        console.warn(`[PdfPage ${pageNum}] Canvas refs not ready, retrying...`);
        await new Promise(r => setTimeout(r, 200));
      }
      
      if (!bgCanvasRef.current || !highlighterCanvasRef.current || !penCanvasRef.current) {
        console.error(`[PdfPage ${pageNum}] Canvas refs still null after retry`);
        return;
      }

      lastRenderedZoom.current = zoom;

      try {
        const page = await pdfDoc.getPage(pageNum);
        const unscaledViewport = page.getViewport({ scale: 1 });
        const availableHeight = window.innerHeight - 160;
        const baseScale = availableHeight / unscaledViewport.height;
        const dpr = window.devicePixelRatio || 1;
        const renderScale = baseScale * dpr * (zoom || 1);

        const viewport = page.getViewport({ scale: renderScale });
        const cssWidth = unscaledViewport.width * baseScale;
        const cssHeight = unscaledViewport.height * baseScale;

        setDimensions(prev => {
          if (prev.width === cssWidth && prev.height === cssHeight) return prev;
          return { width: cssWidth, height: cssHeight };
        });

        bgCanvasRef.current.width = viewport.width;
        bgCanvasRef.current.height = viewport.height;
        highlighterCanvasRef.current.width = viewport.width;
        highlighterCanvasRef.current.height = viewport.height;
        penCanvasRef.current.width = viewport.width;
        penCanvasRef.current.height = viewport.height;

        await page.render({ canvasContext: bgCanvasRef.current.getContext('2d')!, viewport }).promise;
      } catch (err) {
        console.error(`[PdfPage ${pageNum}] Render error:`, err);
      }
    };

    doRender();
  }, [pdfDoc, pageNum, zoom, highlighterCanvasRef, penCanvasRef]);

  return (
    <div id={`pdf-page-${pageNum}`} ref={containerRef} className="relative shadow-2xl bg-white flex-shrink-0" style={{ width: dimensions.width, height: dimensions.height }}>
      <canvas ref={bgCanvasRef} className="absolute inset-0 pointer-events-none z-0" style={{ width: '100%', height: '100%' }} />
      <canvas ref={highlighterCanvasRef} className="absolute inset-0 pointer-events-none z-10" style={{ mixBlendMode: 'multiply', width: '100%', height: '100%' }} />
      <canvas ref={penCanvasRef} className={`absolute inset-0 z-20 ${tool === 'pointer' ? 'pointer-events-none' : 'cursor-crosshair'}`} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onPointerLeave={handlePointerUp} onContextMenu={(e) => e.preventDefault()} style={{ touchAction: 'none', width: '100%', height: '100%' }} />
      {strokes.filter((s: Stroke) => s.isSticker && s.points && s.points.length > 0).map((s: Stroke, idx: number) => (
        <StickerNode
          key={`sticker-${idx}`}
          s={s}
          zoom={zoom}
          onStop={(_e: any, data: any) => {
            const updatedStrokes = strokes.map((stroke: Stroke) => 
              stroke === s ? { ...stroke, points: [{ x: data.x / zoom, y: data.y / zoom, pressure: stroke.points[0]?.pressure || 0.5 }] } : stroke
            );
            onUpdateStrokes(updatedStrokes);
          }}
          onDelete={(e: any) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.confirm("Excluir este adesivo?")) {
              const updatedStrokes = strokes.filter((stroke: Stroke) => stroke !== s);
              onUpdateStrokes(updatedStrokes);
            }
          }}
          onEdit={async (e: any) => {
            e.stopPropagation();
            const newNumStr = window.prompt("Editar número do Post-it linkado:", s.stickerNumber?.toString());
            if (newNumStr) {
              const num = parseInt(newNumStr.replace(/\D/g, ''), 10);
              if (!isNaN(num)) {
                let newColor = s.color;
                const user = getAuth().currentUser;
                if (user) {
                  try {
                    const q = query(collection(db, 'users', user.uid, 'notes'), where('noteNumber', '==', num));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                      newColor = querySnapshot.docs[0].data().color || '#fef08a';
                    }
                  } catch (err) {}
                }
                const updatedStrokes = strokes.map((stroke: Stroke) => 
                  stroke === s ? { ...stroke, stickerNumber: num, color: newColor } : stroke
                );
                onUpdateStrokes(updatedStrokes);
              }
            }
          }}
        />
      ))}
    </div>
  );
}

// Subcomponent for DOCX rendering
function DocxPage({ html, tool, penColor, highlighterColor, penWidth, highlighterWidth, eraserWidth, strokes, onUpdateStrokes, onUpdateRedo, drawStroke }: any) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { highlighterCanvasRef, penCanvasRef, handlePointerDown, handlePointerMove, handlePointerUp, redrawStrokes } = useCanvasDrawing(1, tool, penColor, highlighterColor, penWidth, highlighterWidth, eraserWidth, strokes, onUpdateStrokes, onUpdateRedo, drawStroke);

  useEffect(() => {
    if (containerRef.current) {
      setTimeout(() => {
        if (containerRef.current) {
          const w = 800;
          const h = containerRef.current.scrollHeight;
          
          if (highlighterCanvasRef.current) {
             highlighterCanvasRef.current.width = w;
             highlighterCanvasRef.current.height = h;
          }
          if (penCanvasRef.current) {
             penCanvasRef.current.width = w;
             penCanvasRef.current.height = h;
          }
          redrawStrokes();
        }
      }, 500);
    }
  }, [html, redrawStrokes, highlighterCanvasRef, penCanvasRef]);

  return (
    <div className="relative shadow-2xl bg-white flex-shrink-0 mx-auto" style={{ width: '800px', minHeight: '1131px' }}>
      <div ref={containerRef} className="p-12 prose max-w-none text-black w-full min-h-[1131px]" dangerouslySetInnerHTML={{ __html: html }} />
      <canvas ref={highlighterCanvasRef} className="absolute inset-0 pointer-events-none z-10" style={{ mixBlendMode: 'multiply' }} />
      <canvas ref={penCanvasRef} className={`absolute inset-0 z-20 ${tool === 'pointer' ? 'pointer-events-none' : 'cursor-crosshair'}`} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onPointerLeave={handlePointerUp} onContextMenu={(e) => e.preventDefault()} style={{ touchAction: 'none' }} />
      {strokes.filter((s: Stroke) => s.isSticker && s.points && s.points.length > 0).map((s: Stroke, idx: number) => (
        <StickerNode
          key={`sticker-${idx}`}
          s={s}
          zoom={1}
          onStop={(_e: any, data: any) => {
            const updatedStrokes = strokes.map((stroke: Stroke) => 
              stroke === s ? { ...stroke, points: [{ x: data.x, y: data.y, pressure: stroke.points[0]?.pressure || 0.5 }] } : stroke
            );
            onUpdateStrokes(updatedStrokes);
          }}
          onDelete={(e: any) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.confirm("Excluir este adesivo?")) {
              const updatedStrokes = strokes.filter((stroke: Stroke) => stroke !== s);
              onUpdateStrokes(updatedStrokes);
            }
          }}
          onEdit={async (e: any) => {
            e.stopPropagation();
            const newNumStr = window.prompt("Editar número do Post-it linkado:", s.stickerNumber?.toString());
            if (newNumStr) {
              const num = parseInt(newNumStr.replace(/\D/g, ''), 10);
              if (!isNaN(num)) {
                let newColor = s.color;
                const user = getAuth().currentUser;
                if (user) {
                  try {
                    const q = query(collection(db, 'users', user.uid, 'notes'), where('noteNumber', '==', num));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                      newColor = querySnapshot.docs[0].data().color || '#fef08a';
                    }
                  } catch (err) {}
                }
                const updatedStrokes = strokes.map((stroke: Stroke) => 
                  stroke === s ? { ...stroke, stickerNumber: num, color: newColor } : stroke
                );
                onUpdateStrokes(updatedStrokes);
              }
            }
          }}
        />
      ))}
    </div>
  );
}

// Subcomponent for EPUB rendering
function EpubPage({ book, pageNum, viewMode, tool, penColor, highlighterColor, penWidth, highlighterWidth, eraserWidth, strokes, onUpdateStrokes, onUpdateRedo, drawStroke }: any) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const bookIdRef = useRef<string>('');
  const [dimensions, setDimensions] = useState({ width: 800, height: 1131 });

  const { highlighterCanvasRef, penCanvasRef, handlePointerDown, handlePointerMove, handlePointerUp } = useCanvasDrawing(1, tool, penColor, highlighterColor, penWidth, highlighterWidth, eraserWidth, strokes, onUpdateStrokes, onUpdateRedo, drawStroke);

  // Initialize rendition when book changes
  useEffect(() => {
    if (!book || !viewerRef.current) return;

    const bookId = book.key || Math.random().toString();
    
    if (bookIdRef.current === bookId && renditionRef.current) return;
    
    if (renditionRef.current) {
      try { renditionRef.current.destroy(); } catch (_e) { /* ignore */ }
      renditionRef.current = null;
    }
    
    if (viewerRef.current) {
      viewerRef.current.innerHTML = '';
    }
    
    bookIdRef.current = bookId;
    
    const availableHeight = window.innerHeight - 160;
    const width = 800;
    const height = availableHeight > 800 ? availableHeight : 800;
    
    setDimensions({ width, height });

    const rendition = book.renderTo(viewerRef.current, {
      width: width,
      height: height,
      spread: 'none',
      flow: viewMode === 'scroll' ? 'scrolled-doc' : 'paginated',
      manager: viewMode === 'scroll' ? 'continuous' : 'default'
    });
    renditionRef.current = rendition;
    
    // Initialize exactly on the targeted page
    if (book.locations && book.locations.length() > 0) {
      const percentage = (pageNum - 1) / Math.max(book.locations.length() - 1, 1);
      const cfi = book.locations.cfiFromPercentage(percentage);
      rendition.display(cfi || undefined);
    } else {
      rendition.display();
    }
    
    if (highlighterCanvasRef.current) {
      highlighterCanvasRef.current.width = width;
      highlighterCanvasRef.current.height = height;
    }
    if (penCanvasRef.current) {
      penCanvasRef.current.width = width;
      penCanvasRef.current.height = height;
    }
    
    return () => {
      if (renditionRef.current) {
        try { renditionRef.current.destroy(); } catch (_e) { /* ignore */ }
        renditionRef.current = null;
      }
    };
  }, [book, highlighterCanvasRef, penCanvasRef]);

  // Navigate using spine-based next/prev when pageNum changes
  const prevPageRef = useRef<number>(1);
  useEffect(() => {
    if (!renditionRef.current || viewMode === 'scroll') return;
    const diff = pageNum - prevPageRef.current;
    prevPageRef.current = pageNum;
    
    if (diff === 0) return;
    
    const targetSpine = book.spine && book.spine.get ? book.spine.get(pageNum - 1) : null;
    if (targetSpine && targetSpine.href) {
      renditionRef.current.display(targetSpine.href);
    } else {
      if (diff > 0) {
        renditionRef.current.next();
      } else if (diff < 0) {
        renditionRef.current.prev();
      }
    }
  }, [pageNum, viewMode]);

  return (
    <div className="relative shadow-2xl bg-white flex-shrink-0" style={{ width: dimensions.width, height: dimensions.height }}>
      <div ref={viewerRef} className="absolute inset-0 overflow-hidden" />
      <canvas ref={highlighterCanvasRef} className="absolute inset-0 pointer-events-none z-10" style={{ mixBlendMode: 'multiply', width: '100%', height: '100%' }} />
      <canvas ref={penCanvasRef} className={`absolute inset-0 z-20 ${tool === 'pointer' ? 'pointer-events-none' : 'cursor-crosshair'}`} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onPointerLeave={handlePointerUp} onContextMenu={(e) => e.preventDefault()} style={{ touchAction: 'none', width: '100%', height: '100%' }} />
      {strokes.filter((s: Stroke) => s.isSticker && s.points && s.points.length > 0).map((s: Stroke, idx: number) => (
        <StickerNode
          key={`sticker-${idx}`}
          s={s}
          zoom={1}
          onStop={(_e: any, data: any) => {
            const updatedStrokes = strokes.map((stroke: Stroke) => 
              stroke === s ? { ...stroke, points: [{ x: data.x, y: data.y, pressure: stroke.points[0]?.pressure || 0.5 }] } : stroke
            );
            onUpdateStrokes(updatedStrokes);
          }}
          onDelete={(e: any) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.confirm("Excluir este adesivo?")) {
              const updatedStrokes = strokes.filter((stroke: Stroke) => stroke !== s);
              onUpdateStrokes(updatedStrokes);
            }
          }}
          onEdit={async (e: any) => {
            e.stopPropagation();
            const newNumStr = window.prompt("Editar número do Post-it linkado:", s.stickerNumber?.toString());
            if (newNumStr) {
              const num = parseInt(newNumStr.replace(/\D/g, ''), 10);
              if (!isNaN(num)) {
                let newColor = s.color;
                const user = getAuth().currentUser;
                if (user) {
                  try {
                    const q = query(collection(db, 'users', user.uid, 'notes'), where('noteNumber', '==', num));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                      newColor = querySnapshot.docs[0].data().color || '#fef08a';
                    }
                  } catch (err) {}
                }
                const updatedStrokes = strokes.map((stroke: Stroke) => 
                  stroke === s ? { ...stroke, stickerNumber: num, color: newColor } : stroke
                );
                onUpdateStrokes(updatedStrokes);
              }
            }
          }}
        />
      ))}
    </div>
  );
}

function StickerNode({ s, zoom = 1, onStop, onDelete, onEdit }: any) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [noteData, setNoteData] = useState<any>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (!user || !s.stickerNumber) return;
    const q = query(collection(db, 'users', user.uid, 'notes'), where('noteNumber', '==', s.stickerNumber));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setNoteData(snap.docs[0].data());
      }
    });
    return () => unsub();
  }, [user, s.stickerNumber]);

  const isFlashcard = noteData?.isFlashcard;

  if (isFlashcard) {
    return (
      <Draggable
        nodeRef={nodeRef}
        position={{ x: s.points[0].x * zoom, y: s.points[0].y * zoom }}
        onStop={onStop}
      >
        <div ref={nodeRef} className="absolute top-0 left-0 z-50 cursor-move" style={{ width: '160px', height: '110px' }}>
          <div 
            className="w-full h-full relative group" 
            style={{ perspective: '1000px' }}
            onContextMenu={onDelete}
            onDoubleClick={onEdit}
            onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}
            title="Clique para virar o cartão. Duplo-clique para editar. Botão direito para excluir."
          >
            <div 
              className="w-full h-full absolute top-0 left-0 transition-transform duration-500 rounded-lg shadow-lg border border-gray-200 overflow-hidden cursor-pointer"
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                backgroundColor: s.color || '#fef08a'
              }}
            >
              {/* Front */}
              <div 
                className="absolute inset-0 w-full h-full p-3 flex flex-col items-center justify-center bg-white/40 pointer-events-none"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="text-[10px] font-bold text-gray-500 mb-1">FRENTE #{s.stickerNumber}</div>
                <div className="text-xs font-semibold text-gray-800 line-clamp-3 text-center" dangerouslySetInnerHTML={{ __html: noteData?.content || '...' }} />
              </div>

              {/* Back */}
              <div 
                className="absolute inset-0 w-full h-full p-3 flex flex-col items-center justify-center bg-indigo-50 pointer-events-none"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <div className="text-[10px] font-bold text-indigo-500 mb-1">VERSO</div>
                <div className="text-xs font-semibold text-gray-800 line-clamp-3 text-center" dangerouslySetInnerHTML={{ __html: noteData?.backContent || '...' }} />
              </div>
            </div>
          </div>
        </div>
      </Draggable>
    );
  }

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: s.points[0].x * zoom, y: s.points[0].y * zoom }}
      onStop={onStop}
    >
      <div ref={nodeRef} className="absolute top-0 left-0 z-50 cursor-move">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-postit', { detail: s.stickerNumber }))}
          onContextMenu={onDelete}
          onDoubleClick={onEdit}
          className="hover:scale-110 transition-transform text-gray-800 px-3 py-1.5 rounded-md shadow-md border border-black/10 font-bold text-sm flex items-center gap-1 group"
          style={{ backgroundColor: s.color || '#fef08a' }}
          title={`Duplo-clique para editar. Botão direito para excluir.`}
        >
          📌 #{s.stickerNumber}
        </button>
      </div>
    </Draggable>
  );
}
