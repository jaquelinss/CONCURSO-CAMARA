import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Columns, Maximize2, PanelLeftClose, PanelRightClose } from 'lucide-react';

type DockSide = 'center' | 'left' | 'right';
type SplitRatio = '50' | '40' | '30';

interface DockContextType {
  dockSide: DockSide;
  splitRatio: SplitRatio;
  setDockSide: (s: DockSide) => void;
  setSplitRatio: (r: SplitRatio) => void;
  isDocked: boolean;
}

const DockContext = createContext<DockContextType | null>(null);

export function useDock() {
  return useContext(DockContext);
}

const STORAGE_KEY = 'dock_layout_pref';

function DockPreviewIcon({ side, ratio, active }: { side: 'left' | 'right'; ratio: string; active: boolean }) {
  const pct = Number(ratio);
  return (
    <div className={`w-9 h-6 rounded border-2 flex overflow-hidden transition-colors ${active ? 'border-indigo-500' : 'border-gray-300 dark:border-gray-600'}`}>
      <div
        className={`h-full transition-colors ${side === 'left' ? (active ? 'bg-indigo-500' : 'bg-indigo-200 dark:bg-indigo-800') : 'bg-gray-100 dark:bg-gray-700'}`}
        style={{ width: side === 'left' ? `${pct}%` : `${100 - pct}%` }}
      />
      <div
        className={`h-full transition-colors ${side === 'right' ? (active ? 'bg-indigo-500' : 'bg-indigo-200 dark:bg-indigo-800') : 'bg-gray-100 dark:bg-gray-700'}`}
        style={{ width: side === 'right' ? `${pct}%` : `${100 - pct}%` }}
      />
    </div>
  );
}

export function DockMenuButton() {
  const dock = useDock();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  if (!dock) return null;

  // Hide on small screens
  if (typeof window !== 'undefined' && window.innerWidth < 1024) return null;

  const { dockSide, splitRatio, setDockSide, setSplitRatio, isDocked } = dock;
  const ratios: SplitRatio[] = ['50', '40', '30'];

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`p-2 rounded-lg text-sm transition-all flex items-center gap-1.5 font-bold ${
          isDocked
            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700'
            : 'bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
        }`}
        title="Modo Split Screen"
      >
        <Columns className="w-4 h-4" />
        <span className="hidden lg:inline text-xs">
          {isDocked ? `${splitRatio}/${100 - Number(splitRatio)}` : 'Split'}
        </span>
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-[10001] w-72 animate-fade-in">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Columns className="w-3.5 h-3.5" /> Modo de Tela
          </p>

          {/* Centralizado */}
          <button
            onClick={() => { setDockSide('center'); setShowMenu(false); }}
            className={`w-full flex items-center gap-3 p-2.5 rounded-xl mb-2 transition-all ${
              dockSide === 'center'
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-700'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
            }`}
          >
            <div className={`w-9 h-6 rounded border-2 flex items-center justify-center ${dockSide === 'center' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 dark:border-gray-600'}`}>
              <Maximize2 className={`w-3.5 h-3.5 ${dockSide === 'center' ? 'text-indigo-500' : 'text-gray-400'}`} />
            </div>
            <div>
              <span className="text-sm font-semibold block">Centralizado</span>
              <span className="text-[10px] text-gray-400">Tela cheia (padrão)</span>
            </div>
          </button>

          {/* Divider - Left */}
          <div className="h-px bg-gray-100 dark:bg-gray-700 my-3" />
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <PanelLeftClose className="w-3 h-3" /> Ancorar à Esquerda
          </p>

          <div className="space-y-1 mb-3">
            {ratios.map(ratio => {
              const active = dockSide === 'left' && splitRatio === ratio;
              return (
                <button
                  key={`left-${ratio}`}
                  onClick={() => { setDockSide('left'); setSplitRatio(ratio); setShowMenu(false); }}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${
                    active
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <DockPreviewIcon side="left" ratio={ratio} active={active} />
                  <span className="text-sm font-medium">Conteúdo {ratio}% · Livre {100 - Number(ratio)}%</span>
                </button>
              );
            })}
          </div>

          {/* Divider - Right */}
          <div className="h-px bg-gray-100 dark:bg-gray-700 my-3" />
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <PanelRightClose className="w-3 h-3" /> Ancorar à Direita
          </p>

          <div className="space-y-1">
            {ratios.map(ratio => {
              const active = dockSide === 'right' && splitRatio === ratio;
              return (
                <button
                  key={`right-${ratio}`}
                  onClick={() => { setDockSide('right'); setSplitRatio(ratio); setShowMenu(false); }}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${
                    active
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <DockPreviewIcon side="right" ratio={ratio} active={active} />
                  <span className="text-sm font-medium">Livre {100 - Number(ratio)}% · Conteúdo {ratio}%</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DockableWrapper({ children }: { children: React.ReactNode }) {
  const saved = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
    catch { return null; }
  })();

  const [dockSide, setDockSide] = useState<DockSide>(saved?.side || 'center');
  const [splitRatio, setSplitRatio] = useState<SplitRatio>(saved?.ratio || '50');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ side: dockSide, ratio: splitRatio }));
  }, [dockSide, splitRatio]);

  const isDocked = dockSide !== 'center';

  const contextValue: DockContextType = {
    dockSide, splitRatio, setDockSide, setSplitRatio, isDocked,
  };

  if (!isDocked) {
    return (
      <DockContext.Provider value={contextValue}>
        {children}
      </DockContext.Provider>
    );
  }

  const widthStyles: Record<SplitRatio, string> = {
    '50': '50%',
    '40': '40%',
    '30': '30%',
  };

  const panel = (
    <DockContext.Provider value={contextValue}>
      <div
        className={`fixed top-16 bottom-0 ${dockSide === 'left' ? 'left-0' : 'right-0'} z-[40] bg-white dark:bg-gray-900 overflow-y-auto ${dockSide === 'left' ? 'border-r-2' : 'border-l-2'} border-indigo-300/60 dark:border-indigo-700/60 shadow-2xl`}
        style={{ width: widthStyles[splitRatio] }}
      >
        {children}
      </div>
    </DockContext.Provider>
  );

  return createPortal(panel, document.body);
}
