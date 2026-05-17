import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Home, FolderHeart, CalendarDays, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Navigation() {
  const { signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 -ml-2 mr-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <span className="text-xl font-bold text-indigo-600 hidden sm:block">EduGenius</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                to="/dashboard"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  location.pathname === '/dashboard'
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <Home className="w-4 h-4 mr-2" /> Gerar Conteúdo
              </Link>
              <Link 
                to="/saved"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  location.pathname === '/saved'
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <FolderHeart className="w-4 h-4 mr-2" /> Meus Salvamentos
              </Link>
              <Link 
                to="/revisions"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  location.pathname === '/revisions'
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <CalendarDays className="w-4 h-4 mr-2" /> Cronograma
              </Link>
              <Link 
                to="/config"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  location.pathname === '/config'
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                Configurações
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => window.dispatchEvent(new Event('toggle-notes'))}
              className="inline-flex items-center px-2 sm:px-3 py-2 border border-yellow-300 text-xs sm:text-sm leading-4 font-bold rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none transition shadow-sm"
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
              <span className="hidden sm:inline">Post-its</span>
            </button>
            <button
              onClick={() => window.dispatchEvent(new Event('add-note'))}
              className="inline-flex items-center px-2 py-2 border border-transparent text-sm leading-4 font-bold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none transition shadow-sm"
              title="Nova Nota"
            >
              +
            </button>
            <button
              onClick={() => window.dispatchEvent(new Event('toggle-archive'))}
              className="inline-flex items-center px-2 py-2 border border-yellow-200 text-sm leading-4 font-bold rounded-md text-yellow-800 bg-white hover:bg-yellow-50 focus:outline-none transition shadow-sm"
              title="Arquivo de Post-its"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
            </button>
            <div className="hidden sm:block w-px h-6 bg-gray-200 mx-2"></div>
            <button
              onClick={signOut}
              className="hidden sm:inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-white hover:text-gray-700 focus:outline-none transition"
            >
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden absolute top-16 left-0 w-full bg-white shadow-lg border-t border-gray-100 z-50">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className={`block pl-3 pr-4 py-3 border-l-4 text-base font-medium ${
                location.pathname === '/dashboard'
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center"><Home className="w-5 h-5 mr-3" /> Gerar Conteúdo</div>
            </Link>
            <Link
              to="/saved"
              onClick={() => setMobileMenuOpen(false)}
              className={`block pl-3 pr-4 py-3 border-l-4 text-base font-medium ${
                location.pathname === '/saved'
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center"><FolderHeart className="w-5 h-5 mr-3" /> Meus Salvamentos</div>
            </Link>
            <Link
              to="/revisions"
              onClick={() => setMobileMenuOpen(false)}
              className={`block pl-3 pr-4 py-3 border-l-4 text-base font-medium ${
                location.pathname === '/revisions'
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center"><CalendarDays className="w-5 h-5 mr-3" /> Cronograma</div>
            </Link>
            <Link
              to="/config"
              onClick={() => setMobileMenuOpen(false)}
              className={`block pl-3 pr-4 py-3 border-l-4 text-base font-medium ${
                location.pathname === '/config'
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                Configurações
              </div>
            </Link>
            <button
              onClick={() => { setMobileMenuOpen(false); signOut(); }}
              className="w-full text-left block pl-3 pr-4 py-3 border-l-4 border-transparent text-base font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
            >
              <div className="flex items-center"><LogOut className="w-5 h-5 mr-3" /> Sair</div>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
