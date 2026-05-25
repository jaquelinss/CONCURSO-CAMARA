import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navigation from '../components/Navigation';
import SettingsScreen from '../components/SettingsScreen';
import LessonScreen from '../components/LessonScreen';
import QuizScreen from '../components/QuizScreen';
import WelcomeModal from '../components/WelcomeModal';
import { useAuth } from '../contexts/AuthContext';
import { FlaskConical } from 'lucide-react';
import { PeriodicTable, ElementDetailModal } from '../components/PeriodicTable';

export default function Dashboard() {
  const { hasSeenWelcome, apiKey } = useAuth();
  const location = useLocation();
  const stateFromNav = location.state as any;

  const [screen, setScreen] = useState<'settings' | 'lesson' | 'quiz'>('settings');
  const [settings, setSettings] = useState({
    mode: stateFromNav?.mode || 'Concurso',
    subject: stateFromNav?.subject || 'Língua Portuguesa',
    model: stateFromNav?.model || 'Aula Explicativa',
    difficulty: stateFromNav?.difficulty || 'Médio',
    quantity: stateFromNav?.quantity || 5,
    topic: stateFromNav?.topic || 'Todos',
    subTopic: stateFromNav?.subTopic || 'Todos',
    specificTopic: stateFromNav?.specificTopic || '',
    lessonLevel: stateFromNav?.lessonLevel || 'Introdutória',
  });

  useEffect(() => {
    if (location.state) {
      setSettings(prev => ({
        ...prev,
        ...location.state
      }));
    }
  }, [location.state]);

  const [showPeriodicTable, setShowPeriodicTable] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<any>(null);

  const handleStart = () => {
    if (settings.model === 'Aula Explicativa') {
      setScreen('lesson');
    } else {
      setScreen('quiz');
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <Navigation />
      {!hasSeenWelcome && !apiKey && <WelcomeModal />}
      <main className="flex-grow p-4">
        {screen === 'settings' && (
          <SettingsScreen 
            settings={settings} 
            setSettings={setSettings} 
            onStart={handleStart} 
          />
        )}
        {screen === 'lesson' && (
          <LessonScreen settings={settings} onBack={() => setScreen('settings')} />
        )}
        {screen === 'quiz' && (
          <QuizScreen settings={settings} onBack={() => setScreen('settings')} />
        )}
      </main>

      {settings.subject === 'Química' && (screen === 'quiz' || screen === 'lesson') && (
        <>
          <button 
            onClick={() => setShowPeriodicTable(!showPeriodicTable)}
            className="fixed bottom-6 left-6 w-14 h-14 bg-gradient-to-tr from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center z-40 transition-transform duration-200 hover:scale-110 border border-teal-300/30"
            aria-label="Mostrar/Esconder Tabela Periódica"
          >
            <FlaskConical size={28} />
          </button>
          {showPeriodicTable && (
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-45 max-w-[90vw] md:max-w-2xl">
              <PeriodicTable onSelectElement={setHoveredElement} />
            </div>
          )}
          <ElementDetailModal element={hoveredElement} />
        </>
      )}
    </div>
  );
}

