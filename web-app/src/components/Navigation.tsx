import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useReward } from '../contexts/RewardContext';
import { LogOut, Menu, X, CalendarDays, FolderHeart, Sun, Moon, TrendingUp, Database, HelpCircle, Focus, Book, Home, BookOpen, Archive, Flame, Store } from 'lucide-react';
import { useState, useEffect } from 'react';
import FocusPlayer from './FocusPlayer';
import { RewardShop } from './RewardShop';

export default function Navigation() {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { effortPoints, floatingPoints, awardPoints, spendPoints } = useReward();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showShop, setShowShop] = useState(false);

  useEffect(() => {
    if (effortPoints > 0 && localStorage.getItem('fix_points_119') !== 'true') {
      localStorage.setItem('fix_points_119', 'true');
      const diff = effortPoints - 119;
      if (diff > 0) {
         spendPoints(diff, 'ajuste_bug');
      } else if (diff < 0) {
         awardPoints(Math.abs(diff), 'ajuste_bug');
      }
    }
  }, [effortPoints, spendPoints, awardPoints]);

  useEffect(() => {
    if (localStorage.getItem('refund_sticker_350') !== 'true') {
      localStorage.setItem('refund_sticker_350', 'true');
      awardPoints(350, 'refund_sticker');
    }
  }, [awardPoints]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        window.dispatchEvent(new Event('toggle-whiteboard-transparent'));
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        window.dispatchEvent(new Event('toggle-whiteboard-notebook'));
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        window.dispatchEvent(new Event('toggle-archive'));
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        window.dispatchEvent(new Event('add-note'));
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        // Easter egg para restaurar pontos perdidos com um bônus
        awardPoints(500, 'restore_bug');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const navLinks = [
    { to: '/dashboard', icon: Home, label: 'Gerar Conteúdo' },
    { to: '/saved', icon: FolderHeart, label: 'Meus Salvamentos' },
    { to: '/revisions', icon: CalendarDays, label: 'Cronograma' },
    { to: '/progress', icon: TrendingUp, label: 'Progresso' },
    { to: '/questions', icon: Database, label: 'Banco de Questões' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm fixed top-0 left-0 right-0 z-[1000] transition-colors duration-200">
        <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">

          {/* LEFT: Logo + Nav Links */}
          <div className="flex items-center gap-1 sm:gap-2 xl:gap-6 min-w-0">
            {/* Logo: clicável, vai para /dashboard */}
            <Link
              to="/dashboard"
              className="flex-shrink-0 flex items-center gap-2 group"
              title="Ir para o Início"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <span className="text-white font-bold text-sm">E</span>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hidden sm:block group-hover:opacity-80 transition-opacity">
                EduGenius
              </span>
            </Link>

            {/* Separador vertical desktop */}
            <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-gray-700 flex-shrink-0" />

            {/* Nav Links - desktop */}
            <div className="hidden sm:flex items-center gap-1">
              {navLinks.map(({ to, icon: Icon, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-2 xl:px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(to)
                      ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden xl:block">{label}</span>
                </Link>
              ))}
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 rounded-md text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* RIGHT: Tools + Icon actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Ferramentas de estudo */}
            <button
              onClick={() => window.dispatchEvent(new Event('toggle-archive'))}
              className="hidden sm:block p-2 rounded-lg text-yellow-500 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 transition-colors"
              title="Meus Post-its (Ctrl+Shift+P)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </button>

            <button
              onClick={() => window.dispatchEvent(new Event('add-note'))}
              className="hidden sm:block p-2 rounded-lg text-yellow-600 dark:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 transition-colors"
              title="Novo Post-it (Ctrl+Shift+N)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>

            <button
              onClick={() => window.dispatchEvent(new Event('archive-all-notes'))}
              className="hidden sm:block p-2 rounded-lg text-yellow-600 dark:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 transition-colors"
              title="Guardar todos os Post-its"
            >
              <Archive className="w-5 h-5" />
            </button>

            <button
              onClick={() => window.dispatchEvent(new Event('toggle-whiteboard-transparent'))}
              className={`hidden sm:block p-2 rounded-lg transition-colors ${
                isActive('/') ? 'text-emerald-600' : 'text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
              }`}
              title="Lousa Transparente (Ctrl+Shift+L)"
            >
              <Focus className="w-5 h-5" />
            </button>

            <button
              onClick={() => window.dispatchEvent(new Event('open-pdf-annotator'))}
              className="hidden sm:block p-2 rounded-lg text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              title="Leitor de PDF"
            >
              <BookOpen className="w-5 h-5" />
            </button>

            <button
              onClick={() => window.dispatchEvent(new Event('toggle-whiteboard-notebook'))}
              className="hidden sm:block p-2 rounded-lg text-purple-500 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
              title="Cadernos (Ctrl+Shift+C)"
            >
              <Book className="w-5 h-5" />
            </button>

            {/* Separador */}
            <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-gray-700 mx-0.5" />

            {/* Lojinha */}
            <button
              onClick={() => setShowShop(true)}
              className="p-2 rounded-lg text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors relative group"
              title="Lojinha de Recompensas"
            >
              <Store className="w-5 h-5" />
            </button>

            {/* Pontos de Esforço */}
            <div className="flex items-center relative gap-1.5 px-2 sm:px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-lg font-bold text-xs sm:text-sm cursor-help transition-transform hover:scale-105 group" title="Pontos de Esforço">
              <Flame className="w-4 h-4 fill-current" />
              <span>{effortPoints}</span>
              
              {/* Tooltip explicativo */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-gray-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
                Ganhe pontos ao ser constante, tirar dúvidas e concluir tarefas!
              </div>

              {/* Animações flutuantes de pontos (Silenciosa) */}
              {floatingPoints.map(fp => (
                <div 
                  key={fp.id}
                  className="absolute -top-6 left-1/2 -translate-x-1/2 text-green-500 font-black text-sm pointer-events-none animate-float-up-fade"
                >
                  +{fp.amount}
                </div>
              ))}
            </div>

            {/* Focus Player */}
            <FocusPlayer />

            {/* Separador */}
            <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-gray-700 mx-0.5" />

            {/* Config */}
            <Link
              to="/config"
              className={`hidden sm:block p-2 rounded-lg transition-colors ${
                isActive('/config')
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Configurações"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>

            {/* Tutorial */}
            <button
              onClick={() => window.dispatchEvent(new Event('open-tutorial'))}
              className="hidden sm:block p-2 text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
              title="Ajuda e Tutorial"
            >
              <HelpCircle className="w-5 h-5 animate-pulse" />
            </button>

            {/* Tema */}
            <button
              onClick={toggleTheme}
              className="hidden sm:block p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Alternar Tema"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            {/* Sair */}
            <button
              onClick={signOut}
              className="hidden sm:flex items-center gap-1.5 px-2 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden absolute top-16 left-0 w-full bg-white dark:bg-gray-800 shadow-lg border-t border-gray-100 dark:border-gray-700 z-50">
          <div className="pt-2 pb-3 space-y-1">
            {navLinks.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 pl-3 pr-4 py-3 border-l-4 text-base font-medium ${
                  isActive(to)
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-700 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            ))}

            <div className="my-1 mx-3 border-t border-gray-100 dark:border-gray-700" />

            <button
              onClick={() => { setMobileMenuOpen(false); window.dispatchEvent(new Event('toggle-whiteboard-transparent')); }}
              className="w-full flex items-center gap-3 pl-3 pr-4 py-3 border-l-4 border-transparent text-base font-medium text-emerald-600 dark:text-emerald-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Focus className="w-5 h-5" /> Lousa Transparente
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); window.dispatchEvent(new Event('toggle-archive')); }}
              className="w-full flex items-center gap-3 pl-3 pr-4 py-3 border-l-4 border-transparent text-base font-medium text-yellow-500 dark:text-yellow-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Meus Post-its
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); window.dispatchEvent(new Event('add-note')); }}
              className="w-full flex items-center gap-3 pl-3 pr-4 py-3 border-l-4 border-transparent text-base font-medium text-yellow-600 dark:text-yellow-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Novo Post-it
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); window.dispatchEvent(new Event('archive-all-notes')); }}
              className="w-full flex items-center gap-3 pl-3 pr-4 py-3 border-l-4 border-transparent text-base font-medium text-yellow-600 dark:text-yellow-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Archive className="w-5 h-5" /> Guardar todos os Post-its
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); window.dispatchEvent(new Event('open-pdf-annotator')); }}
              className="w-full flex items-center gap-3 pl-3 pr-4 py-3 border-l-4 border-transparent text-base font-medium text-blue-500 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <BookOpen className="w-5 h-5" /> Leitor de PDF
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); window.dispatchEvent(new Event('toggle-whiteboard-notebook')); }}
              className="w-full flex items-center gap-3 pl-3 pr-4 py-3 border-l-4 border-transparent text-base font-medium text-purple-600 dark:text-purple-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Book className="w-5 h-5" /> Cadernos
            </button>
            <Link
              to="/config"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 pl-3 pr-4 py-3 border-l-4 text-base font-medium ${
                isActive('/config')
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-700 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configurações
            </Link>
            <button
              onClick={() => { setMobileMenuOpen(false); window.dispatchEvent(new Event('open-tutorial')); }}
              className="w-full flex items-center gap-3 pl-3 pr-4 py-3 border-l-4 border-transparent text-base font-medium text-indigo-600 dark:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <HelpCircle className="w-5 h-5 animate-pulse" /> Tutorial & Ajuda
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); toggleTheme(); }}
              className="w-full flex items-center gap-3 pl-3 pr-4 py-3 border-l-4 border-transparent text-base font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); signOut(); }}
              className="w-full flex items-center gap-3 pl-3 pr-4 py-3 border-l-4 border-transparent text-base font-medium text-red-500 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <LogOut className="w-5 h-5" /> Sair
            </button>
          </div>
        </div>
      )}

      {showShop && <RewardShop onClose={() => setShowShop(false)} />}
      </nav>
      {/* Spacer para a nav fixed */}
      <div className="h-16 w-full shrink-0" />
    </>
  );
}
