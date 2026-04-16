import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

export default function InstallPwaPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setPromptEvent(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  };

  if (installed || isStandalone) return null;

  return (
    <>
      <button
        type="button"
        onClick={promptEvent ? handleInstall : () => setShowHelp(true)}
        className="fixed bottom-4 right-4 z-[250] flex items-center gap-2 rounded-full bg-[#FF007F] px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-[#FF007F]/30 hover:opacity-90"
        data-testid="pwa-install-btn"
      >
        <Download size={14} />
        Install App
      </button>

      {showHelp && (
        <div className="fixed inset-0 z-[260] bg-black/75 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#18181b] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-white mb-2">Install The Beat 515</h3>
            {isIos ? (
              <p className="text-sm text-[#a1a1aa] leading-relaxed">
                On iPhone/iPad, open this site in Safari, tap the Share icon, then tap <span className="text-white font-semibold">Add to Home Screen</span>.
              </p>
            ) : (
              <p className="text-sm text-[#a1a1aa] leading-relaxed">
                If the browser did not show the install prompt, open the browser menu (three dots) and choose
                <span className="text-white font-semibold"> Install app</span> or <span className="text-white font-semibold">Add to Home screen</span>.
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="mt-4 w-full rounded-full bg-[#27272a] py-2.5 text-xs font-extrabold tracking-[1px] text-white hover:opacity-90"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </>
  );
}
