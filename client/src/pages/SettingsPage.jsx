import { useAuth } from '../context/AuthContext';

export default function SettingsPage() {
  const { logout } = useAuth();

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pb-16">
      <header className="text-center mb-10 animate-fade-up">
        <h1 className="text-4xl font-bold">Settings</h1>
        <p className="text-sm text-gray-500 mt-2">
          Manage your session and preferences.
        </p>
      </header>

      <div className="nm-flat p-6 space-y-4 animate-fade-up">
        <div className="nm-pressed p-5 rounded-2xl">
          <p className="text-sm font-semibold text-gray-700">Session</p>
          <p className="text-xs text-gray-500 mt-1">
            Auto-logs out after 5 minutes of inactivity.
          </p>
        </div>

        <button
          onClick={logout}
          className="nm-btn w-full py-4 text-base text-red-500 font-bold"
        >
          🚪 Log Out
        </button>
      </div>
    </div>
  );
}
