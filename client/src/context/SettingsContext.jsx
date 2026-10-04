import { createContext, useContext, useEffect, useState } from 'react';

const DEFAULT = {
  senderName: 'Agent Astra',
  senderCompany: 'XMARKET',
  signature: 'Best regards,\nAgent Astra\nXMARKET Support',
  darkMode: false,
};

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('xmsupport-settings') || '{}');
      return { ...DEFAULT, ...stored };
    } catch {
      return DEFAULT;
    }
  });

  useEffect(() => {
    localStorage.setItem('xmsupport-settings', JSON.stringify(settings));
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  const update = (key, value) =>
    setSettings((s) => ({ ...s, [key]: value }));

  const toggleDark = () =>
    setSettings((s) => ({ ...s, darkMode: !s.darkMode }));

  const reset = () => setSettings(DEFAULT);

  return (
    <SettingsContext.Provider value={{ settings, update, toggleDark, reset }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
