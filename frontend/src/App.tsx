import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TransferProvider } from './context/TransferContext';

// Pages
import { LandingPage } from './pages/landing/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { CreatePinPage } from './pages/auth/CreatePinPage';
import { VerifyPinPage } from './pages/auth/VerifyPinPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

// Dashboard
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardHome } from './pages/dashboard/DashboardHome';
import { FilesPage } from './pages/dashboard/FilesPage';
import { TextSharingPage } from './pages/dashboard/TextSharingPage';
import { LinksPage } from './pages/dashboard/LinksPage';
import { ActivityPage } from './pages/dashboard/ActivityPage';
import { SettingsPage } from './pages/dashboard/SettingsPage';
import { UdharPage } from './pages/dashboard/UdharPage';
import { CodeStudioPage } from './pages/dashboard/CodeStudioPage';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, hasPin, isPinVerified, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070B] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-400 font-mono">Initializing secure workspace...</span>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPin) {
    return <Navigate to="/create-pin" replace />;
  }

  if (!isPinVerified) {
    return <Navigate to="/verify-pin" replace />;
  }

  return <>{children}</>;
};

// PIN Setup Guard
const RequireAuthForPin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isLoading } = useAuth();
  if (isLoading) return null;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TransferProvider>
          <Routes>
            {/* Public Marketing & Auth */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* PIN Handshake Flows */}
            <Route
              path="/create-pin"
              element={
                <RequireAuthForPin>
                  <CreatePinPage />
                </RequireAuthForPin>
              }
            />
            <Route
              path="/verify-pin"
              element={
                <RequireAuthForPin>
                  <VerifyPinPage />
                </RequireAuthForPin>
              }
            />

            {/* Protected Workspace Layout */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardHome />} />
              <Route path="/udhar" element={<UdharPage />} />
              <Route path="/code" element={<CodeStudioPage />} />
              <Route path="/files" element={<FilesPage />} />
              <Route path="/text" element={<TextSharingPage />} />
              <Route path="/links" element={<LinksPage />} />
              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              {/* Redirects for removed routes */}
              <Route path="/send" element={<Navigate to="/files" replace />} />
              <Route path="/receive" element={<Navigate to="/files" replace />} />
              <Route path="/devices" element={<Navigate to="/dashboard" replace />} />
              <Route path="/transfers" element={<Navigate to="/activity" replace />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </TransferProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
