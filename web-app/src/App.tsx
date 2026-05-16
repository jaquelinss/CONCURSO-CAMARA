import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SavedContent from './pages/SavedContent';
import ConfigScreen from './pages/ConfigScreen';
import RevisionScreen from './pages/RevisionScreen';
import ReportButton from './components/ReportButton';

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
      <Route path="/config" element={<PrivateRoute><ConfigScreen /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-100 text-gray-900 font-sans">
          <AppRoutes />
          <ReportButton />
        </div>
      </Router>
    </AuthProvider>
  );
}
