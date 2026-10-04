import { createContext, useContext, useEffect, useState } from 'react';

const SECRET_CODE = '1010';
const AUTH_KEY = 'xmarket-auth';
const SESSION_HOURS = 12;

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);

  // Load auth state on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (raw) {
        const { expiresAt } = JSON.parse(raw);
        if (expiresAt && Date.now() < expiresAt) {
          setAuthed(true);
        } else {
          localStorage.removeItem(AUTH_KEY);
        }
      }
    } catch {
      localStorage.removeItem(AUTH_KEY);
    }
    setReady(true);
  }, []);

  const login = (code) => {
    if (code === SECRET_CODE) {
      const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
      localStorage.setItem(AUTH_KEY, JSON.stringify({ expiresAt }));
      setAuthed(true);
      return { ok: true };
    }
    return { ok: false, error: 'Incorrect code. Please try again.' };
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setAuthed(false);
  };

  return (
    <AuthContext.Provider value={{ authed, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
