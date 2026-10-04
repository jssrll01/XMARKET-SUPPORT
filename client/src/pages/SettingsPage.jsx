import { useSettings } from '../context/SettingsContext';

export default function SettingsPage() {
  const { settings, update, toggleDark, reset } = useSettings();

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-16">
      <header className="text-center mb-8 animate-fade-up">
        <h1 className="text-3xl font-bold">⚙️ Settings</h1>
        <p className="text-sm text-gray-500 mt-2">
          Customize your sender identity and preferences.
        </p>
      </header>

      <div className="nm-flat p-8 space-y-6 stagger">
        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
            Sender Name
          </label>
          <input
            className="nm-input"
            value={settings.senderName}
            onChange={(e) => update('senderName', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
            Company
          </label>
          <input
            className="nm-input"
            value={settings.senderCompany}
            onChange={(e) => update('senderCompany', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
            Default Signature
          </label>
          <textarea
            rows={4}
            className="nm-input resize-none"
            value={settings.signature}
            onChange={(e) => update('signature', e.target.value)}
          />
        </div>

        {/* Dark mode toggle */}
        <div className="flex items-center justify-between nm-pressed p-5">
          <div>
            <p className="font-semibold">Dark Mode</p>
            <p className="text-xs text-gray-500">Switch between light and dark theme.</p>
          </div>
          <button
            type="button"
            onClick={toggleDark}
            className={`nm-btn !p-2 !w-16 !h-9 !rounded-full transition-all duration-300`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-brand transition-transform duration-300 ${
                settings.darkMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={reset} className="nm-btn text-sm text-red-500">
            🔄 Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
