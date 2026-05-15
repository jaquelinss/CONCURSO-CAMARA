import { useState } from 'react';
import Navigation from '../components/Navigation';
import SettingsScreen from '../components/SettingsScreen';
import LessonScreen from '../components/LessonScreen';
import QuizScreen from '../components/QuizScreen';
import WelcomeModal from '../components/WelcomeModal';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { hasSeenWelcome, apiKey } = useAuth();
  const [screen, setScreen] = useState<'settings' | 'lesson' | 'quiz'>('settings');
  const [settings, setSettings] = useState({
    mode: 'Concurso',
    subject: 'Língua Portuguesa',
    model: 'Aula Explicativa',
    difficulty: 'Médio',
    quantity: 5,
    topic: 'Todos',
    subTopic: 'Todos',
    specificTopic: '',
    lessonLevel: 'Introdutória',
  });

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
    </div>
  );
}
