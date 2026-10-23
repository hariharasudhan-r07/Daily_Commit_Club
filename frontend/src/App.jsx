import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import MembersPage from './pages/MembersPage';
import CoffeePage from './pages/CoffeePage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import Navbar from './components/Navbar';
import { Coffee } from 'lucide-react';

function AuthenticatedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030d08] flex flex-col items-center justify-center gap-4 p-4 font-sans-clean">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.3)] flex items-center justify-center animate-pulse">
          <Coffee className="w-7 h-7 text-emerald-400 stroke-[2.2]" />
        </div>
        <div className="text-xs font-semibold text-emerald-300 tracking-wider uppercase flex items-center gap-2">
          <span>Initializing Commit Club</span>
          <span className="pixel-dot"></span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-[#030d08] flex flex-col font-sans-clean w-full selection:bg-[#10b981] selection:text-[#030d08]">
      <Navbar />
      <main className="page">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/coffee" element={<CoffeePage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </BrowserRouter>
  );
}
