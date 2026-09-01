import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import { StickyNote, Layers, LogOut, Download, X, Menu, LayoutPanelLeft } from 'lucide-react';
import PostItsView from './components/PostItsView';
import FlashcardsView from './components/FlashcardsView';

function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // Check if user dismissed recently
    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    if (dismissedAt && Date.now() - parseInt(dismissedAt) < 7 * 24 * 60 * 60 * 1000) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showBanner || dismissed) return null;

  return (
    <div className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between gap-3 animate-in slide-in-from-top">
      <div className="flex items-center gap-3 min-w-0">
        <Download className="w-5 h-5 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-bold">Instalar EduGenius Notes</p>
          <p className="text-xs text-indigo-200 truncate">Acesse offline direto da tela inicial</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 bg-white text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors"
        >
          Instalar
        </button>
        <button onClick={handleDismiss} className="p-1 hover:bg-white/20 rounded-full">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function MainLayout() {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'postits' | 'flashcards' | 'split'>('postits');
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* PWA Install Banner */}
      <InstallBanner />

      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-3 flex justify-between items-center sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuOpen(true)}
            className="p-1.5 -ml-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-700"
            title="Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Layers className="w-4 h-4 text-indigo-600" />
            </div>
            <h1 className="font-bold text-gray-800 text-lg">EduGenius Notes</h1>
          </div>
        </div>
      </header>

      {/* Sidebar Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 transition-opacity"
            onClick={() => setMenuOpen(false)}
          />
          
          {/* Drawer */}
          <div className="relative w-64 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <span className="font-bold text-gray-800">Menu</span>
              <button 
                onClick={() => setMenuOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto py-2">
              <button
                onClick={() => { setActiveTab('postits'); setMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                  activeTab === 'postits' ? 'bg-indigo-50 text-indigo-700 border-r-4 border-indigo-600' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <StickyNote className="w-5 h-5" />
                <span className="font-medium text-sm">Meus Post-its</span>
              </button>
              
              <button
                onClick={() => { setActiveTab('flashcards'); setMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                  activeTab === 'flashcards' ? 'bg-indigo-50 text-indigo-700 border-r-4 border-indigo-600' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Layers className="w-5 h-5" />
                <span className="font-medium text-sm">Meus Flashcards</span>
              </button>
              
              <button
                onClick={() => { setActiveTab('split'); setMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                  activeTab === 'split' ? 'bg-indigo-50 text-indigo-700 border-r-4 border-indigo-600' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <LayoutPanelLeft className="w-5 h-5" />
                <span className="font-medium text-sm">Dividir Tela (Ambos)</span>
              </button>
            </div>
            
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium text-sm">Sair do app</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 overflow-y-auto p-4 ${activeTab === 'split' ? 'flex flex-col lg:flex-row gap-4' : ''}`}>
        {activeTab === 'postits' && <PostItsView />}
        {activeTab === 'flashcards' && <FlashcardsView />}
        {activeTab === 'split' && (
          <>
            <div className="flex-1 flex flex-col h-[50vh] lg:h-auto min-h-[400px] border border-gray-200 rounded-xl overflow-hidden shadow-sm relative">
               <div className="bg-indigo-600 text-white text-xs font-bold py-1 px-3 absolute top-0 left-0 w-full z-20 text-center">Post-its</div>
               <div className="flex-1 overflow-y-auto bg-gray-50 p-2 pt-8">
                 <PostItsView isSplitMode />
               </div>
            </div>
            <div className="flex-1 flex flex-col h-[50vh] lg:h-auto min-h-[400px] border border-gray-200 rounded-xl overflow-hidden shadow-sm relative">
               <div className="bg-indigo-600 text-white text-xs font-bold py-1 px-3 absolute top-0 left-0 w-full z-20 text-center">Flashcards</div>
               <div className="flex-1 overflow-y-auto bg-gray-50 p-2 pt-8">
                 <FlashcardsView isSplitMode />
               </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function App() {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  return <MainLayout />;
}

export default App;

