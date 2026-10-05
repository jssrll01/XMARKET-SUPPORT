import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import PageTransition from './components/PageTransition';
import InstallPrompt from './components/InstallPrompt';
import AuthGate from './components/AuthGate';
import HomePage from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import DriveFilesPage from './pages/DriveFilesPage';
import RevokeAccessPage from './pages/RevokeAccessPage';
import SettingsPage from './pages/SettingsPage';
import { AuthProvider } from './context/AuthContext';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
        <Route path="/upload" element={<PageTransition><UploadPage /></PageTransition>} />
        <Route path="/drive" element={<PageTransition><DriveFilesPage /></PageTransition>} />
        <Route path="/revoke" element={<PageTransition><RevokeAccessPage /></PageTransition>} />
        <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AuthGate>
          <div className="min-h-screen">
            <Navbar />
            <main className="pt-4">
              <AnimatedRoutes />
            </main>
            <InstallPrompt />
          </div>
        </AuthGate>
      </BrowserRouter>
    </AuthProvider>
  );
}
