import { createContext, useContext, useEffect, useRef, useState } from 'react';

const SECRET_CODE = '1010';
const AUTH_KEY = 'xmarket-auth';
const SESSION_HOURS = 12;
const INACTIVITY_MS = 5 * 60 * 1000; // 5 minutes

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);
  const [autoLoggedOut, setAutoLoggedOut] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (raw) {
        const { expiresAt } = JSON.parse(raw);
        if (expiresAt && Date.now() < expiresAt) setAuthed(true);
        else localStorage.removeItem(AUTH_KEY);
      }
    } catch { localStorage.removeItem(AUTH_KEY); }
    setReady(true);
  }, []);

  // Inactivity timer
  useEffect(() => {
    if (!authed) return;
    const reset = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setAutoLoggedOut(true);
        logout();
      }, INACTIVITY_MS);
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => {
      clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [authed]);

  const login = (code) => {
    if (code === SECRET_CODE) {
      const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
      localStorage.setItem(AUTH_KEY, JSON.stringify({ expiresAt }));
      setAuthed(true);
      setAutoLoggedOut(false);
      return { ok: true };
    }
    return { ok: false, error: 'Incorrect code.' };
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setAuthed(false);
  };

  return (
    <AuthContext.Provider value={{ authed, ready, login, logout, autoLoggedOut, setAutoLoggedOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
