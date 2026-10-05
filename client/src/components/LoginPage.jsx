import { useRef, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 10;

export default function LoginPage() {
  const { login, autoLoggedOut, setAutoLoggedOut } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const inputRef = useRef(null);

  // Tick clock while locked out
  useEffect(() => {
    if (!lockUntil) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [lockUntil]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const locked = lockUntil > now;
  const lockRemaining = locked ? Math.ceil((lockUntil - now) / 1000) : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (locked) return;

    const result = login(code.trim());

    if (result.ok) {
      // Success — the AuthGate will unmount this component
      return;
    }

    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setCode('');

    if (nextAttempts >= MAX_ATTEMPTS) {
      setLockUntil(Date.now() + LOCKOUT_SECONDS * 1000);
      setError(`Too many attempts. Try again in ${LOCKOUT_SECONDS}s.`);
      setAttempts(0);
    } else {
      setError(`Incorrect code. ${MAX_ATTEMPTS - nextAttempts} attempts left.`);
    }

    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleChange = (e) => {
    // Digits only, max 6 chars
    const v = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(v);
    if (error) setError('');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-up">
          <div className="w-20 h-20 mx-auto mb-5 rounded-3xl flex items-center justify-center
                          bg-gradient-to-br from-brand to-brand-dark
                          shadow-lg shadow-blue-500/30">
            <span className="text-3xl font-black text-white">XM</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-700">
            XMARKET <span className="text-brand">Support</span>
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Enter your access code to continue
          </p>
          {autoLoggedOut && (
            <p className="text-xs text-red-500 mt-3 bg-red-50 rounded-lg px-3 py-2 animate-fade-up">
              ⏱️ Auto-logged out after 5 minutes of inactivity.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="nm-flat p-8 space-y-5 animate-fade-up">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-3 text-center">
              Access Code
            </label>
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              value={code}
              onChange={handleChange}
              disabled={locked}
              placeholder="••••"
              className="nm-input !text-center !text-2xl !tracking-[0.6em] !font-bold
                         disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={locked || code.length === 0}
            className="nm-btn w-full py-4 text-base disabled:opacity-50"
          >
            {locked ? `🔒 Locked (${lockRemaining}s)` : '→ Enter'}
          </button>

          {error && (
            <p className="text-center text-sm font-semibold text-red-500 animate-fade-up">
              {error}
            </p>
          )}

          <p className="text-center text-[11px] text-gray-400 pt-2">
            Authorized access only
          </p>
        </form>
      </div>
    </div>
  );
}
