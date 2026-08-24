import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import { StickyNote, Layers, LogOut } from 'lucide-react';
import PostItsView from './components/PostItsView';
import FlashcardsView from './components/FlashcardsView';

function MainLayout() {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'postits' | 'flashcards'>('postits');

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-3 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Layers className="w-5 h-5 text-indigo-600" />
          </div>
          <h1 className="font-bold text-gray-800 text-lg">EduGenius Notes</h1>
        </div>
        <button
          onClick={signOut}
          className="text-gray-500 hover:text-red-500 p-2 rounded-full transition-colors"
          title="Sair"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {activeTab === 'postits' && <PostItsView />}
        {activeTab === 'flashcards' && <FlashcardsView />}
      </main>

      {/* Bottom Navigation for Mobile / Fixed bottom for desktop */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 pb-safe">
        <div className="flex max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('postits')}
            className={`flex-1 py-4 flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'postits' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <StickyNote className="w-6 h-6" />
            <span className="text-xs font-medium">Post-its</span>
          </button>
          <button
            onClick={() => setActiveTab('flashcards')}
            className={`flex-1 py-4 flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'flashcards' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Layers className="w-6 h-6" />
            <span className="text-xs font-medium">Flashcards</span>
          </button>
        </div>
      </nav>
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
