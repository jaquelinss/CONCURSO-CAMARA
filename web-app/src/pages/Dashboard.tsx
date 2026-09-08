import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navigation from '../components/Navigation';
import SettingsScreen from '../components/SettingsScreen';
import LessonScreen from '../components/LessonScreen';
import QuizScreen from '../components/QuizScreen';
import TxtQuizImporter from '../components/TxtQuizImporter';
import WelcomeModal from '../components/WelcomeModal';
import { useAuth } from '../contexts/AuthContext';
import { FlaskConical } from 'lucide-react';
import { PeriodicTable, ElementDetailModal } from '../components/PeriodicTable';

const SESSION_SCREEN_KEY = 'dashboard_screen';
const SESSION_SETTINGS_KEY = 'dashboard_settings';

export default function Dashboard() {
  const { hasSeenWelcome, activeApiKey: apiKey } = useAuth();
  const location = useLocation();
  const stateFromNav = location.state as any;

  // Restaurar tela do sessionStorage (persiste F5), mas navegação explícita tem prioridade
  const savedScreen = sessionStorage.getItem(SESSION_SCREEN_KEY) as 'settings' | 'lesson' | 'quiz' | null;
  const savedSettings = (() => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_SETTINGS_KEY) || 'null'); } catch { return null; }
  })();

  const defaultSettings = {
    mode: 'Concurso',
    subject: 'Língua Portuguesa',
    model: 'Aula Explicativa',
    difficulty: 'Médio',
    quantity: 5,
    topic: 'Todos',
    subTopic: 'Todos',
    specificTopic: '',
    lessonLevel: 'Introdutória',
    leiSecaEnabled: true,
  };

  const [screen, setScreen] = useState<'settings' | 'lesson' | 'quiz'>(
    stateFromNav?.mode ? 'settings' : (savedScreen || 'settings')
  );
  const [settings, setSettings] = useState({
    ...defaultSettings,
    ...(savedSettings || {}),
    ...(stateFromNav || {}),
  });

  // Salvar estado no sessionStorage sempre que mudar
  useEffect(() => {
    sessionStorage.setItem(SESSION_SCREEN_KEY, screen);
  }, [screen]);

  useEffect(() => {
    sessionStorage.setItem(SESSION_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (location.state) {
      setSettings((prev: typeof defaultSettings) => ({
        ...prev,
        ...location.state
      }));
      setScreen('settings');
      // Limpar location.state para não replicar em próximos renders
    }
  }, [location.state]);

  const [showPeriodicTable, setShowPeriodicTable] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<any>(null);
  
  const [isImportingTxt, setIsImportingTxt] = useState(false);
  const [importedQuizData, setImportedQuizData] = useState<any>(null);

  const handleStart = () => {
    setImportedQuizData(null); // Clear previous imported data
    if (settings.model === 'Aula Explicativa') {
      setScreen('lesson');
    } else {
      setScreen('quiz');
    }
  };

  const handleQuizReady = (quizData: any) => {
    setSettings((prev: any) => ({
      ...prev,
      subject: quizData.subject,
      topic: quizData.topic,
      model: quizData.model,
      difficulty: quizData.difficulty,
      isImported: true
    }));
    setImportedQuizData(quizData.data);
    setIsImportingTxt(false);
    
    if (quizData.model === 'Aula Explicativa') {
      setScreen('lesson');
    } else {
      setScreen('quiz');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Navigation />
      {!hasSeenWelcome && !apiKey && <WelcomeModal />}
      <main className="flex-grow p-4">
        {screen === 'settings' && (
          <SettingsScreen 
            settings={settings} 
            setSettings={setSettings} 
            onStart={handleStart} 
            onImportTxt={() => setIsImportingTxt(true)}
          />
        )}
        {screen === 'lesson' && (
          <LessonScreen settings={settings} onBack={() => setScreen('settings')} savedData={importedQuizData} />
        )}
        {screen === 'quiz' && (
          <QuizScreen settings={settings} onBack={() => setScreen('settings')} savedData={importedQuizData} />
        )}
      </main>

      {isImportingTxt && (
        <TxtQuizImporter 
          onQuizReady={handleQuizReady} 
          onCancel={() => setIsImportingTxt(false)} 
        />
      )}

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

