import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LogOut, Menu, X, Home, CalendarDays, FolderHeart, Sun, Moon, TrendingUp, Database, HelpCircle, PenTool, Focus, Book } from 'lucide-react';
import { useState } from 'react';

export default function Navigation() {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-[1000] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <div className="flex items-center sm:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              </div>
              <span className="text-xl font-bold text-indigo-600 hidden sm:block">EduGenius</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link 
                to="/dashboard"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  location.pathname === '/dashboard'
                    ? 'border-indigo-500 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-100'
                }`}
              >
                <Home className="w-4 h-4 mr-2" /> Gerar Conteúdo
              </Link>
              <Link 
                to="/saved"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  location.pathname === '/saved'
                    ? 'border-indigo-500 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-100'
                }`}
              >
                <FolderHeart className="w-4 h-4 mr-2" /> Meus Salvamentos
              </Link>
              <Link 
                to="/revisions"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  location.pathname === '/revisions'
                    ? 'border-indigo-500 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-100'
                }`}
              >
                <CalendarDays className="w-4 h-4 mr-2" /> Cronograma
              </Link>
              <Link 
                to="/progress"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  location.pathname === '/progress'
                    ? 'border-indigo-500 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-100'
                }`}
              >
                <TrendingUp className="w-4 h-4 mr-2" /> Progresso
              </Link>
              <Link 
                to="/questions"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  location.pathname === '/questions'
                    ? 'border-indigo-500 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-100'
                }`}
              >
                <Database className="w-4 h-4 mr-2" /> Banco de Questões
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => window.dispatchEvent(new Event('toggle-archive'))}
              className="inline-flex items-center px-2 sm:px-3 py-2 border border-yellow-300 dark:border-yellow-600 text-xs sm:text-sm leading-4 font-bold rounded-md text-yellow-900 dark:text-yellow-100 bg-yellow-100 dark:bg-yellow-900/50 hover:bg-yellow-200 dark:hover:bg-yellow-800/50 focus:outline-none transition shadow-sm"
              title="Meus Post-its"
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
              <span className="hidden sm:inline">Meus Post-its</span>
            </button>
            <button
              onClick={() => window.dispatchEvent(new Event('add-note'))}
              className="inline-flex items-center px-2 py-2 border border-transparent text-sm leading-4 font-bold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none transition shadow-sm"
              title="Nova Nota"
            >
              +
            </button>
            <button
              onClick={() => window.dispatchEvent(new Event('toggle-whiteboard-transparent'))}
              className="inline-flex items-center px-2 sm:px-3 py-2 border border-emerald-300 dark:border-emerald-600 text-xs sm:text-sm leading-4 font-bold rounded-md text-emerald-900 dark:text-emerald-100 bg-emerald-100 dark:bg-emerald-900/50 hover:bg-emerald-200 dark:hover:bg-emerald-800/50 focus:outline-none transition shadow-sm"
              title="Lousa Transparente"
            >
              <Focus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Lousa</span>
            </button>
            <button
              onClick={() => window.dispatchEvent(new Event('toggle-whiteboard-notebook'))}
              className="inline-flex items-center px-2 sm:px-3 py-2 border border-purple-300 dark:border-purple-600 text-xs sm:text-sm leading-4 font-bold rounded-md text-purple-900 dark:text-purple-100 bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200 dark:hover:bg-purple-800/50 focus:outline-none transition shadow-sm"
              title="Cadernos"
            >
              <Book className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Cadernos</span>
            </button>

            <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>

            <Link 
              to="/config"
              className={`p-2 rounded-lg focus:outline-none transition-colors ${
                location.pathname === '/config'
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Configurações"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </Link>

            <button
              onClick={() => window.dispatchEvent(new Event('open-tutorial'))}
              className="p-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg focus:outline-none transition-colors"
              title="Ajuda e Tutorial"
            >
              <HelpCircle className="w-5 h-5 animate-pulse" />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg focus:outline-none transition-colors"
              title={theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            
            <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
            
            <button
              onClick={signOut}
              className="hidden sm:inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 dark:text-gray-400 bg-transparent hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none transition"
            >
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu Dropdown */}
      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden absolute top-16 left-0 w-full bg-white dark:bg-gray-800 shadow-lg border-t border-gray-100 dark:border-gray-700 z-50">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className={`block pl-3 pr-4 py-3 border-l-4 text-base font-medium ${
                location.pathname === '/dashboard'
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-700 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center"><Home className="w-5 h-5 mr-3" /> Gerar Conteúdo</div>
            </Link>
            <Link
              to="/saved"
              onClick={() => setMobileMenuOpen(false)}
              className={`block pl-3 pr-4 py-3 border-l-4 text-base font-medium ${
                location.pathname === '/saved'
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-700 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center"><FolderHeart className="w-5 h-5 mr-3" /> Meus Salvamentos</div>
            </Link>
              <Link
                to="/revisions"
                onClick={() => setMobileMenuOpen(false)}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  location.pathname === '/revisions'
                    ? 'bg-indigo-50 dark:bg-indigo-900/50 border-indigo-500 text-indigo-700 dark:text-indigo-200'
                    : 'border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center">
                  <CalendarDays className="w-5 h-5 mr-3" /> Cronograma
                </div>
              </Link>
              <Link
                to="/progress"
                onClick={() => setMobileMenuOpen(false)}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  location.pathname === '/progress'
                    ? 'bg-indigo-50 dark:bg-indigo-900/50 border-indigo-500 text-indigo-700 dark:text-indigo-200'
                    : 'border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-3" /> Progresso
                </div>
              </Link>
              <Link
                to="/questions"
                onClick={() => setMobileMenuOpen(false)}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  location.pathname === '/questions'
                    ? 'bg-indigo-50 dark:bg-indigo-900/50 border-indigo-500 text-indigo-700 dark:text-indigo-200'
                    : 'border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center">
                  <Database className="w-5 h-5 mr-3" /> Banco de Questões
                </div>
              </Link>
              <Link to="/config"
              onClick={() => setMobileMenuOpen(false)}
              className={`block pl-3 pr-4 py-3 border-l-4 text-base font-medium ${
                location.pathname === '/config'
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-700 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                Configurações
              </div>
            </Link>
            <button
              onClick={() => { setMobileMenuOpen(false); window.dispatchEvent(new Event('open-tutorial')); }}
              className="w-full text-left block pl-3 pr-4 py-3 border-l-4 border-transparent text-base font-medium text-indigo-600 dark:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            >
              <div className="flex items-center">
                <HelpCircle className="w-5 h-5 mr-3 animate-pulse" />
                Tutorial &amp; Ajuda
              </div>
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); window.dispatchEvent(new Event('toggle-whiteboard-transparent')); }}
              className="w-full text-left block pl-3 pr-4 py-3 border-l-4 border-transparent text-base font-medium text-emerald-600 dark:text-emerald-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            >
              <div className="flex items-center">
                <Focus className="w-5 h-5 mr-3" />
                Lousa Transparente
              </div>
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); window.dispatchEvent(new Event('toggle-whiteboard-notebook')); }}
              className="w-full text-left block pl-3 pr-4 py-3 border-l-4 border-transparent text-base font-medium text-purple-600 dark:text-purple-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            >
              <div className="flex items-center">
                <Book className="w-5 h-5 mr-3" />
                Cadernos
              </div>
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); toggleTheme(); }}
              className="w-full text-left block pl-3 pr-4 py-3 border-l-4 border-transparent text-base font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <div className="flex items-center">
                {theme === 'light' ? <Moon className="w-5 h-5 mr-3" /> : <Sun className="w-5 h-5 mr-3" />}
                {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
              </div>
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); signOut(); }}
              className="w-full text-left block pl-3 pr-4 py-3 border-l-4 border-transparent text-base font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <div className="flex items-center"><LogOut className="w-5 h-5 mr-3" /> Sair</div>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
