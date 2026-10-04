import { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isStandalone = window.navigator.standalone === true;
    if (isIOS && !isStandalone) {
      setIosHint(true);
      setVisible(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') setVisible(false);
    setDeferred(null);
  };

  const dismiss = () => setVisible(false);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] animate-fade-up">
      <div className="nm-flat p-4 flex items-center gap-3 max-w-md mx-auto">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center
                        bg-gradient-to-br from-brand to-brand-dark text-white text-xl shrink-0">
          🛒
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-700">Install XMARKET</p>
          <p className="text-xs text-gray-500">
            {iosHint
              ? 'Tap Share → "Add to Home Screen"'
              : 'Add to your home screen for quick access'}
          </p>
        </div>
        {!iosHint && (
          <button onClick={install} className="nm-btn !py-2 !px-3 text-xs">
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          className="text-gray-400 hover:text-gray-600 text-sm px-1"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
