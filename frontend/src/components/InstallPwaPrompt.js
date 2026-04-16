import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

export default function InstallPwaPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [status, setStatus] = useState({
    browser: 'unknown',
    isAndroid: false,
    isHttps: false,
    hasSwSupport: false,
    swRegistered: false,
    manifestLinked: false,
    promptAvailable: false,
    isStandalone: false
  });

  const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const isAndroid = /android/i.test(window.navigator.userAgent);
  const browserName = /chrome/i.test(window.navigator.userAgent) ? 'Chrome' : 'Other';

  const runDiagnostics = async (incomingPromptEvent) => {
    const hasSwSupport = 'serviceWorker' in navigator;
    let swRegistered = false;
    if (hasSwSupport) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        swRegistered = !!reg;
      } catch (_) {
        swRegistered = false;
      }
    }
    const manifestLinked = !!document.querySelector('link[rel="manifest"]');
    const currentlyStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
    const httpsOrLocal = window.location.protocol === 'https:' || window.location.hostname === 'localhost';

    setStatus({
      browser: browserName,
      isAndroid,
      isHttps: httpsOrLocal,
      hasSwSupport,
      swRegistered,
      manifestLinked,
      promptAvailable: !!incomingPromptEvent,
      isStandalone: currentlyStandalone
    });
  };

  useEffect(() => {
    runDiagnostics(promptEvent);
  }, [promptEvent]);

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setPromptEvent(event);
      runDiagnostics(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      runDiagnostics(null);
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
              onClick={() => setShowDebug(true)}
              className="mt-3 w-full rounded-full border border-white/15 bg-transparent py-2.5 text-xs font-extrabold tracking-[1px] text-[#00F0FF] hover:bg-white/5"
            >
              OPEN PWA DEBUG PANEL
            </button>
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

      {showDebug && (
        <div className="fixed inset-0 z-[270] bg-black/75 flex items-center justify-center p-4" onClick={() => setShowDebug(false)}>
          <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#18181b] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-white mb-3">PWA Debug Panel</h3>
            <div className="space-y-2 text-xs text-[#a1a1aa]">
              <p><span className="text-white font-semibold">Browser:</span> {status.browser}</p>
              <p><span className="text-white font-semibold">Android:</span> {status.isAndroid ? 'yes' : 'no'}</p>
              <p><span className="text-white font-semibold">HTTPS/localhost:</span> {status.isHttps ? 'yes' : 'no'}</p>
              <p><span className="text-white font-semibold">Service Worker support:</span> {status.hasSwSupport ? 'yes' : 'no'}</p>
              <p><span className="text-white font-semibold">Service Worker registered:</span> {status.swRegistered ? 'yes' : 'no'}</p>
              <p><span className="text-white font-semibold">Manifest linked:</span> {status.manifestLinked ? 'yes' : 'no'}</p>
              <p><span className="text-white font-semibold">Install prompt event available:</span> {status.promptAvailable ? 'yes' : 'no'}</p>
              <p><span className="text-white font-semibold">Already standalone:</span> {status.isStandalone ? 'yes' : 'no'}</p>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => runDiagnostics(promptEvent)}
                className="flex-1 rounded-full bg-[#00F0FF] py-2.5 text-xs font-extrabold tracking-[1px] text-[#09090b] hover:opacity-90"
              >
                RUN CHECK AGAIN
              </button>
              <button
                type="button"
                onClick={() => setShowDebug(false)}
                className="flex-1 rounded-full bg-[#27272a] py-2.5 text-xs font-extrabold tracking-[1px] text-white hover:opacity-90"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
