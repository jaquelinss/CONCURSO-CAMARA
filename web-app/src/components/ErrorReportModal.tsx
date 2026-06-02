import { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, Send, X, Camera, CheckCircle, Image as ImageIcon } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ErrorReportModalProps {
  errorMessage?: string;
  onClose: () => void;
}

export default function ErrorReportModal({ errorMessage, onClose }: ErrorReportModalProps) {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [capturingScreen, setCapturingScreen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const captureScreenshot = async () => {
    setCapturingScreen(true);
    try {
      // Esconde o modal temporariamente para capturar a tela por trás
      const modalEl = document.getElementById('error-report-modal-overlay');
      if (modalEl) modalEl.style.display = 'none';

      await new Promise(r => setTimeout(r, 200)); // Dá um tempo extra pro modal sumir

      const canvas = await html2canvas(document.body, {
        useCORS: true,
        scale: 0.8, // Escala razoável
        logging: false,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        x: window.scrollX,
        y: window.scrollY,
        width: window.innerWidth,
        height: window.innerHeight
      });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
      setScreenshot(dataUrl);

      if (modalEl) modalEl.style.display = '';
    } catch (err) {
      console.error("Erro ao capturar tela:", err);
      alert("Não foi possível capturar a tela do seu dispositivo automaticamente. Por favor, descreva o problema no campo de texto.");
      const modalEl = document.getElementById('error-report-modal-overlay');
      if (modalEl) modalEl.style.display = '';
    } finally {
      setCapturingScreen(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Redimensionar para no máximo 1000px para economizar espaço
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setScreenshot(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    if (!description.trim() && !errorMessage) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'error_reports'), {
        userEmail: user?.email || 'Anônimo',
        userId: user?.uid || null,
        description: description.trim(),
        errorMessage: errorMessage || null,
        screenshot: screenshot || null,
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        url: window.location.href,
        createdAt: serverTimestamp(),
        status: 'new',
      });
      setSent(true);
    } catch (err) {
      console.error("Erro ao enviar reporte:", err);
      alert("Não foi possível enviar o reporte. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div id="error-report-modal-overlay" className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10006] p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Reporte enviado!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Obrigado por nos ajudar a melhorar o EduGenius. Vamos analisar o problema o mais rápido possível.</p>
          <button onClick={onClose} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="error-report-modal-overlay" className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10006] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b bg-red-50 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-6 h-6" />
              Reportar Problema
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-400">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Erro detectado automaticamente */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Erro detectado</p>
              <p className="text-sm text-red-800 font-mono break-all">{errorMessage}</p>
            </div>
          )}

          {/* Descrição do usuário */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Descreva o que aconteceu:
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Tentei gerar um quiz de Direito Constitucional e apareceu um erro..."
              rows={4}
              className="w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl resize-none focus:border-indigo-500 focus:ring-0 transition-colors"
            />
          </div>

          {/* Captura de tela */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Captura de tela:
            </label>
            {screenshot ? (
              <div className="relative">
                <img src={screenshot} alt="Screenshot" className="w-full rounded-xl border-2 border-green-200" />
                <button 
                  onClick={() => setScreenshot(null)} 
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
                <p className="text-xs text-green-600 font-semibold mt-1">✓ Captura anexada</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={captureScreenshot}
                  disabled={capturingScreen}
                  className="w-full p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 hover:border-indigo-300 hover:text-indigo-600 transition-all flex flex-col items-center justify-center gap-2"
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-sm font-semibold text-center">{capturingScreen ? 'Capturando...' : 'Capturar tela automaticamente'}</span>
                </button>
                
                <label className="w-full p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 hover:border-indigo-300 hover:text-indigo-600 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer">
                  <ImageIcon className="w-6 h-6" />
                  <span className="text-sm font-semibold text-center">Enviar print da Galeria</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Info do dispositivo */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <p className="text-xs text-gray-400">Informações enviadas junto: navegador, resolução de tela, página atual e e-mail da conta.</p>
          </div>

          {/* Botão de envio */}
          <button
            onClick={handleSend}
            disabled={sending || (!description.trim() && !errorMessage)}
            className="w-full py-4 bg-red-600 text-white rounded-xl font-bold shadow-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Send className="w-5 h-5" />
            {sending ? 'Enviando...' : 'Enviar Reporte'}
          </button>
        </div>
      </div>
    </div>
  );
}
