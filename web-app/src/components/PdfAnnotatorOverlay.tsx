import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Eraser, X, Undo2, Redo2, ChevronLeft, ChevronRight, Download, PenTool, Highlighter, MousePointer2, BookOpen, File as FileIcon, Save, BookMarked, Trash2, FolderOpen, Loader2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { getStroke } from 'perfect-freehand';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import ePub from 'epubjs';
import mammoth from 'mammoth';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { db, storage } from '../lib/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import ReadingLaser from './ReadingLaser';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface StrokePoint { x: number; y: number; pressure: number; }
interface Stroke { points: StrokePoint[]; color: string; width: number; type: 'pen' | 'highlighter' | 'eraser'; }
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
}

const COLORS = ['#000000', '#ffffff', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316'];
const HIGHLIGHTER_COLORS = ['#ffff00', '#fce7f3', '#dbeafe', '#dcfce3', '#f3e8ff', '#ffedd5'];

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
  const [viewMode, setViewMode] = useState<'single' | 'book'>('single');
  
  const [strokesByPage, setStrokesByPage] = useState<Record<number, Stroke[]>>({});
  const [redoStackByPage, setRedoStackByPage] = useState<Record<number, Stroke[]>>({});
  const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser' | 'pointer'>('pen');
  const [penColor, setPenColor] = useState('#ef4444');
  const [highlighterColor, setHighlighterColor] = useState('#ffff00');
  const penWidth = 3;
  const highlighterWidth = 20;
  const eraserWidth = 20;

  // Zoom state
  const [zoom, setZoom] = useState(1);
  const zoomIn = () => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)));
  const zoomOut = () => setZoom(z => Math.max(0.25, +(z - 0.25).toFixed(2)));
  const zoomReset = () => setZoom(1);

  // Library state
  const [showLibrary, setShowLibrary] = useState(false);
  const [savedDocs, setSavedDocs] = useState<SavedDocument[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleOpen = () => {
      if (fileInputRef.current) fileInputRef.current.click();
    };
    window.addEventListener('open-pdf-annotator', handleOpen);
    return () => window.removeEventListener('open-pdf-annotator', handleOpen);
  }, []);

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

  // Save document
  const saveDocument = async () => {
    const uid = getUid();
    if (!uid || !pdfFile || !fileType) return;
    setSaving(true);
    try {
      const docId = currentDocId || `doc_${Date.now()}`;
      const storagePath = `users/${uid}/documents/${docId}`;
      
      // Upload file to storage
      const fileRef = storageRef(storage, storagePath);
      await uploadBytes(fileRef, new Uint8Array(pdfFile));
      const fileUrl = await getDownloadURL(fileRef);

      // Save metadata + strokes to Firestore
      const docData: Omit<SavedDocument, 'id'> = {
        name: pdfName,
        fileType,
        fileUrl,
        storagePath,
        currentPage,
        totalPages,
        strokesByPage,
        createdAt: currentDocId ? (savedDocs.find(d => d.id === currentDocId)?.createdAt || Date.now()) : Date.now(),
        updatedAt: Date.now(),
      };

      await setDoc(doc(db, 'users', uid, 'documents', docId), docData);
      setCurrentDocId(docId);
      
      // Refresh library
      await loadLibrary();
      
      alert('Documento salvo com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar documento:', err);
      alert('Erro ao salvar o documento. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

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
        book.ready.then(() => {
          const spineLength = (book.spine as any)?.length || (book.spine as any)?.items?.length || 1;
          setTotalPages(spineLength);
          setCurrentPage(savedDoc.currentPage || 1);
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
        const fileRef = storageRef(storage, savedDoc.storagePath);
        await deleteObject(fileRef);
      } catch (_e) { /* file might not exist */ }
      // Delete from Firestore
      await deleteDoc(doc(db, 'users', uid, 'documents', savedDoc.id));
      await loadLibrary();
    } catch (err) {
      console.error('Erro ao excluir documento:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setActive(true);
    setPdfName(file.name.replace(/\.[^/.]+$/, ""));
    setCurrentDocId(null); // New file, not saved yet
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      setPdfFile(arrayBuffer);
      
      if (extension === 'pdf') {
        setFileType('pdf');
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
      } else if (extension === 'epub') {
        // Destroy previous epub if any
        if (epubBook) {
          try { epubBook.destroy(); } catch (_e) { /* ignore */ }
        }
        setFileType('epub');
        setPdfDoc(null);
        setDocxHtml('');
        const book = ePub(arrayBuffer);
        setEpubBook(book);
        // We use spine-based navigation (next/prev), so total pages = spine items count
        book.ready.then(() => {
          const spineLength = (book.spine as any)?.length || (book.spine as any)?.items?.length || 1;
          setTotalPages(spineLength);
          setCurrentPage(1);
        }).catch(err => {
            console.warn("EPUB ready error", err);
            setTotalPages(1);
            setCurrentPage(1);
        });
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

  const pagesToRender = viewMode === 'book' && fileType === 'pdf' ? [currentPage, currentPage + 1].filter(p => p <= totalPages) : [currentPage];

  const fileTypeLabel = (ft: string) => {
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
        <div className="fixed inset-0 z-[9999] bg-gray-900 flex flex-col">
          {/* Top Toolbar */}
          <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 flex-shrink-0 toolbar">
            <div className="flex items-center gap-4">
              <button onClick={() => setActive(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"><X className="w-5 h-5" /></button>
              <h2 className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-[200px] sm:max-w-md">{pdfName}</h2>
            </div>

            <div className="flex items-center gap-2">
              {fileType === 'pdf' && (
                <>
                  <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                    <button onClick={() => setViewMode('single')} className={`p-2 rounded ${viewMode === 'single' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-800'}`} title="Modo Página Única"><FileIcon className="w-4 h-4" /></button>
                    <button onClick={() => setViewMode('book')} className={`p-2 rounded ${viewMode === 'book' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-800'}`} title="Modo Livro (2 Páginas)"><BookOpen className="w-4 h-4" /></button>
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
                <div className="hidden sm:flex gap-1">
                  {COLORS.slice(0, 5).map(c => <button key={c} onClick={() => setPenColor(c)} className={`w-6 h-6 rounded-full border-2 ${penColor === c ? 'border-gray-400 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}
                </div>
              )}
              {tool === 'highlighter' && (
                <div className="hidden sm:flex gap-1">
                  {HIGHLIGHTER_COLORS.map(c => <button key={c} onClick={() => setHighlighterColor(c)} className={`w-6 h-6 rounded-full border-2 ${highlighterColor === c ? 'border-gray-400 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}
                </div>
              )}

              <div className="w-px h-6 bg-gray-300 mx-1" />

              {/* Save button */}
              <button 
                onClick={saveDocument} 
                disabled={saving || !pdfFile} 
                className="p-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg disabled:opacity-30 transition-colors" 
                title="Salvar na conta"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </button>

              {/* Library button */}
              <button 
                onClick={() => { setShowLibrary(!showLibrary); if (!showLibrary) loadLibrary(); }} 
                className={`p-2 rounded-lg transition-colors ${showLibrary ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-100'}`}
                title="Minha Biblioteca"
              >
                <BookMarked className="w-4 h-4" />
              </button>

              <div className="w-px h-6 bg-gray-300 mx-1" />

              <button onClick={exportPdf} disabled={loading} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-2 text-sm">
                <Download className="w-4 h-4" /> Exportar
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
                            <p className="font-medium text-gray-800 dark:text-gray-200 text-sm truncate">{savedDoc.name}</p>
                            <p className="text-xs text-gray-400">
                              Pag. {savedDoc.currentPage}/{savedDoc.totalPages} &middot; {new Date(savedDoc.updatedAt).toLocaleDateString('pt-BR')}
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
                {fileType === 'pdf' && pdfDoc && pagesToRender.map(pageNum => (
                  <PdfPage
                    key={`${pdfDoc.fingerprints?.[0] || 'doc'}-${pageNum}`}
                    pageNum={pageNum}
                    pdfDoc={pdfDoc}
                    tool={tool}
                    penColor={penColor}
                    highlighterColor={highlighterColor}
                    penWidth={penWidth}
                    highlighterWidth={highlighterWidth}
                    eraserWidth={eraserWidth}
                    strokes={strokesByPage[pageNum] || []}
                    onUpdateStrokes={(newStrokes: Stroke[]) => setStrokesByPage(prev => ({ ...prev, [pageNum]: newStrokes }))}
                    onUpdateRedo={(newRedos: Stroke[]) => setRedoStackByPage(prev => ({ ...prev, [pageNum]: newRedos }))}
                    drawStroke={drawStroke}
                  />
                ))}

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
                    tool={tool}
                    penColor={penColor}
                    highlighterColor={highlighterColor}
                    penWidth={penWidth}
                    highlighterWidth={highlighterWidth}
                    eraserWidth={eraserWidth}
                    strokes={strokesByPage[currentPage] || []}
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
        </div>,
        document.body
      )}
    </>
  );
}

// Custom Hook for common Canvas drawing logic
function useCanvasDrawing(tool: string, penColor: string, highlighterColor: string, penWidth: number, highlighterWidth: number, eraserWidth: number, strokes: Stroke[], onUpdateStrokes: (s: Stroke[]) => void, onUpdateRedo: (s: Stroke[]) => void, drawStroke: any) {
  const highlighterCanvasRef = useRef<HTMLCanvasElement>(null);
  const penCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const animFrameRef = useRef<number>(0);

  const redrawStrokes = useCallback(() => {
    const hCtx = highlighterCanvasRef.current?.getContext('2d');
    const pCtx = penCanvasRef.current?.getContext('2d');
    if (!hCtx || !pCtx || !highlighterCanvasRef.current || !penCanvasRef.current) return;

    hCtx.clearRect(0, 0, highlighterCanvasRef.current.width, highlighterCanvasRef.current.height);
    pCtx.clearRect(0, 0, penCanvasRef.current.width, penCanvasRef.current.height);

    for (const stroke of strokes) {
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
  }, [strokes, drawStroke]);

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

  const handlePointerDown = (e: React.PointerEvent) => {
    if (tool === 'pointer') return;
    e.preventDefault();
    setIsDrawing(true);
    const rect = penCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) * (penCanvasRef.current!.width / rect.width);
    const y = (e.clientY - rect.top) * (penCanvasRef.current!.height / rect.height);
    const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;

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

    const x = (e.clientX - rect.left) * (penCanvasRef.current!.width / rect.width);
    const y = (e.clientY - rect.top) * (penCanvasRef.current!.height / rect.height);
    const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;

    currentStrokeRef.current.points.push({ x, y, pressure });
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
function PdfPage({ pageNum, pdfDoc, tool, penColor, highlighterColor, penWidth, highlighterWidth, eraserWidth, strokes, onUpdateStrokes, onUpdateRedo, drawStroke }: any) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 1131 });

  const { highlighterCanvasRef, penCanvasRef, handlePointerDown, handlePointerMove, handlePointerUp, redrawStrokes } = useCanvasDrawing(tool, penColor, highlighterColor, penWidth, highlighterWidth, eraserWidth, strokes, onUpdateStrokes, onUpdateRedo, drawStroke);

  const renderPage = useCallback(async () => {
    if (!pdfDoc || !bgCanvasRef.current || !highlighterCanvasRef.current || !penCanvasRef.current || !containerRef.current) return;
    try {
      const page = await pdfDoc.getPage(pageNum);
      const unscaledViewport = page.getViewport({ scale: 1 });
      const availableHeight = window.innerHeight - 160; 
      const baseScale = availableHeight / unscaledViewport.height;
      const dpr = window.devicePixelRatio || 1;
      const renderScale = baseScale * dpr;
      
      const viewport = page.getViewport({ scale: renderScale });
      const cssWidth = unscaledViewport.width * baseScale;
      const cssHeight = unscaledViewport.height * baseScale;

      setDimensions({ width: cssWidth, height: cssHeight });

      // Set canvas buffer to high-res size
      bgCanvasRef.current.width = viewport.width;
      bgCanvasRef.current.height = viewport.height;
      highlighterCanvasRef.current.width = viewport.width;
      highlighterCanvasRef.current.height = viewport.height;
      penCanvasRef.current.width = viewport.width;
      penCanvasRef.current.height = viewport.height;

      await page.render({ canvasContext: bgCanvasRef.current.getContext('2d')!, viewport }).promise;
      redrawStrokes();
    } catch (err) {}
  }, [pdfDoc, pageNum, redrawStrokes, highlighterCanvasRef, penCanvasRef]);

  useEffect(() => { renderPage(); }, [renderPage]);

  return (
    <div ref={containerRef} className="relative shadow-2xl bg-white flex-shrink-0" style={{ width: dimensions.width, height: dimensions.height }}>
      <canvas ref={bgCanvasRef} className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }} />
      <canvas ref={highlighterCanvasRef} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: 'multiply', width: '100%', height: '100%' }} />
      <canvas ref={penCanvasRef} className={`absolute inset-0 ${tool === 'pointer' ? 'pointer-events-none' : 'cursor-crosshair'}`} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onPointerLeave={handlePointerUp} style={{ touchAction: 'none', width: '100%', height: '100%' }} />
    </div>
  );
}

// Subcomponent for DOCX rendering
function DocxPage({ html, tool, penColor, highlighterColor, penWidth, highlighterWidth, eraserWidth, strokes, onUpdateStrokes, onUpdateRedo, drawStroke }: any) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { highlighterCanvasRef, penCanvasRef, handlePointerDown, handlePointerMove, handlePointerUp, redrawStrokes } = useCanvasDrawing(tool, penColor, highlighterColor, penWidth, highlighterWidth, eraserWidth, strokes, onUpdateStrokes, onUpdateRedo, drawStroke);

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
      <canvas ref={highlighterCanvasRef} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: 'multiply' }} />
      <canvas ref={penCanvasRef} className={`absolute inset-0 ${tool === 'pointer' ? 'pointer-events-none' : 'cursor-crosshair'}`} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onPointerLeave={handlePointerUp} style={{ touchAction: 'none' }} />
    </div>
  );
}

// Subcomponent for EPUB rendering
function EpubPage({ book, pageNum, tool, penColor, highlighterColor, penWidth, highlighterWidth, eraserWidth, strokes, onUpdateStrokes, onUpdateRedo, drawStroke }: any) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const bookIdRef = useRef<string>('');
  const [dimensions, setDimensions] = useState({ width: 800, height: 1131 });

  const { highlighterCanvasRef, penCanvasRef, handlePointerDown, handlePointerMove, handlePointerUp } = useCanvasDrawing(tool, penColor, highlighterColor, penWidth, highlighterWidth, eraserWidth, strokes, onUpdateStrokes, onUpdateRedo, drawStroke);

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
      spread: 'none'
    });
    renditionRef.current = rendition;
    rendition.display();
    
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
    if (!renditionRef.current) return;
    const diff = pageNum - prevPageRef.current;
    prevPageRef.current = pageNum;
    
    if (diff === 0) return;
    
    if (diff > 0) {
      renditionRef.current.next();
    } else if (diff < 0) {
      renditionRef.current.prev();
    }
  }, [pageNum]);

  return (
    <div className="relative shadow-2xl bg-white flex-shrink-0" style={{ width: dimensions.width, height: dimensions.height }}>
      <div ref={viewerRef} className="absolute inset-0 overflow-hidden" />
      <canvas ref={highlighterCanvasRef} className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: 'multiply', width: '100%', height: '100%' }} />
      <canvas ref={penCanvasRef} className={`absolute inset-0 ${tool === 'pointer' ? 'pointer-events-none' : 'cursor-crosshair'}`} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onPointerLeave={handlePointerUp} style={{ touchAction: 'none', width: '100%', height: '100%' }} />
    </div>
  );
}
