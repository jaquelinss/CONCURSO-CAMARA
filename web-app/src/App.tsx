import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { KnowledgeBaseProvider } from './contexts/KnowledgeBaseContext';
import { CustomSubjectsProvider } from './contexts/CustomSubjectsContext';
import { RewardProvider } from './contexts/RewardContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import React, { useState, Suspense, lazy } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SavedContent from './pages/SavedContent';
import ConfigScreen from './pages/ConfigScreen';
import RevisionScreen from './pages/RevisionScreen';
import StudyProgressScreen from './pages/StudyProgressScreen';
import QuestionsDatabase from './pages/QuestionsDatabase';

const StatisticsScreen = lazy(() => import('./pages/StatisticsScreen'));
const ConcursosScreen = lazy(() => import('./pages/ConcursosScreen'));

import ReportButton from './components/ReportButton';
import StickyNotesManager from './components/StickyNotesManager';
import FloatingYouTubePlayer from './components/FloatingYouTubePlayer';
import FocusTimerWidget from './components/FocusTimerWidget';
import TodayStudyButton from './components/TodayStudyButton';
import AITeacherChat from './components/AITeacherChat';
import NavigationTutorial from './components/NavigationTutorial';
import TextSelectionPopover from './components/TextSelectionPopover';
import KnowledgeBaseManager from './components/KnowledgeBaseManager';
import WhiteboardOverlay from './components/WhiteboardOverlay';
import PdfAnnotatorOverlay from './components/PdfAnnotatorOverlay';
import StamperOverlay from './components/StamperOverlay';
import SiteDecorator from './components/SiteDecorator';
import GlobalSplitScreenManager from './components/GlobalSplitScreenManager';
import DigitalNotebook from './components/DigitalNotebook';
import { ChevronRight, ChevronLeft } from 'lucide-react';
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Carregando...</div>;
  return user ? children : <Navigate to="/login" />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/saved" element={<PrivateRoute><SavedContent /></PrivateRoute>} />
      <Route path="/revisions" element={<PrivateRoute><RevisionScreen /></PrivateRoute>} />
      <Route path="/progress" element={<PrivateRoute><StudyProgressScreen /></PrivateRoute>} />
      <Route path="/questions" element={<PrivateRoute><QuestionsDatabase /></PrivateRoute>} />
      <Route path="/statistics" element={<PrivateRoute><ErrorBoundary><Suspense fallback={null}><StatisticsScreen /></Suspense></ErrorBoundary></PrivateRoute>} />
      <Route path="/concursos" element={<PrivateRoute><ErrorBoundary><Suspense fallback={null}><ConcursosScreen /></Suspense></ErrorBoundary></PrivateRoute>} />
      <Route path="/config" element={<PrivateRoute><ConfigScreen /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default function App() {
  const [showTools, setShowTools] = useState(true);

  return (
    <AuthProvider>
      <ThemeProvider>
        <RewardProvider>
          <KnowledgeBaseProvider>
            <CustomSubjectsProvider>
              <Router>
                <div className="relative min-h-screen font-sans transition-colors duration-200 overflow-x-hidden">
                  <AppRoutes />
                
                  <SiteDecorator />
                  <GlobalSplitScreenManager />
                  <ReportButton isHidden={!showTools} />
                  <StickyNotesManager />
                  <FloatingYouTubePlayer />
                  <FocusTimerWidget />
                  <StamperOverlay />
                  <TodayStudyButton isHidden={!showTools} />
                  <AITeacherChat isHidden={!showTools} />
                  <TextSelectionPopover />
                  <KnowledgeBaseManager />
                  <WhiteboardOverlay />
                  <PdfAnnotatorOverlay />
                  <DigitalNotebook />

                  {/* Toggle Tools Button */}
                  <button
                    onClick={() => setShowTools(!showTools)}
                    onTouchEnd={(e) => { e.preventDefault(); setShowTools(!showTools); }}
                    className="fixed bottom-8 right-0 z-[9999] w-10 h-12 sm:w-8 sm:h-10 bg-gray-800/60 hover:bg-gray-800 backdrop-blur-sm text-white rounded-l-lg shadow-lg flex items-center justify-center transition-all cursor-pointer"
                    title={showTools ? "Ocultar ferramentas" : "Mostrar ferramentas"}
                  >
                    {showTools ? <ChevronRight className="w-6 h-6 sm:w-5 sm:h-5" /> : <ChevronLeft className="w-6 h-6 sm:w-5 sm:h-5" />}
                  </button>

                  <NavigationTutorial />
                </div>
              </Router>
            </CustomSubjectsProvider>
          </KnowledgeBaseProvider>
        </RewardProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
