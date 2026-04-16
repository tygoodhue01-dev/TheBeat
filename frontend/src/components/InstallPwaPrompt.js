import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

export default function InstallPwaPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(false);

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

  if (!promptEvent || installed) return null;

  return (
    <button
      type="button"
      onClick={handleInstall}
      className="fixed bottom-4 right-4 z-[250] flex items-center gap-2 rounded-full bg-[#FF007F] px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-[#FF007F]/30 hover:opacity-90"
      data-testid="pwa-install-btn"
    >
      <Download size={14} />
      Install App
    </button>
  );
}
