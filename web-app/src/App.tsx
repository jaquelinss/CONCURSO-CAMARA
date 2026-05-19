import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SavedContent from './pages/SavedContent';
import ConfigScreen from './pages/ConfigScreen';
import RevisionScreen from './pages/RevisionScreen';
import StudyProgressScreen from './pages/StudyProgressScreen';
import ReportButton from './components/ReportButton';
import StickyNotesManager from './components/StickyNotesManager';
import TodayStudyButton from './components/TodayStudyButton';

import React from 'react';

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
      <Route path="/config" element={<PrivateRoute><ConfigScreen /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <div className="min-h-screen font-sans transition-colors duration-200">
            <AppRoutes />
            <ReportButton />
            <StickyNotesManager />
            <TodayStudyButton />
          </div>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}
