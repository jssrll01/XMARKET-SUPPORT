import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import PageTransition from './components/PageTransition';
import InstallPrompt from './components/InstallPrompt';
import AuthGate from './components/AuthGate';
import HomePage from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import ReceiptPage from './pages/ReceiptPage';
import WebsitePage from './pages/WebsitePage';
import SettingsPage from './pages/SettingsPage';
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider } from './context/AuthContext';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
        <Route path="/upload" element={<PageTransition><UploadPage /></PageTransition>} />
        <Route path="/receipt" element={<PageTransition><ReceiptPage /></PageTransition>} />
        <Route path="/website" element={<PageTransition><WebsitePage /></PageTransition>} />
        <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
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
      </SettingsProvider>
    </AuthProvider>
  );
}
