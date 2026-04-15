/** Single shared HTMLAudioElement for the live stream across pages */

export const THEBEAT_VOLUME_STORAGE_KEY = 'thebeat_stream_volume';

export function getSharedAudio() {
  if (typeof window === 'undefined') return null;
  if (!window.__THEBEAT_SHARED_AUDIO__) {
    const a = new Audio();
    a.preload = 'none';
    window.__THEBEAT_SHARED_AUDIO__ = a;
  }
  return window.__THEBEAT_SHARED_AUDIO__;
}

export function getStoredVolume() {
  try {
    const v = parseFloat(localStorage.getItem(THEBEAT_VOLUME_STORAGE_KEY) || '0.85');
    if (Number.isFinite(v)) return Math.min(1, Math.max(0, v));
  } catch (_) { /* ignore */ }
  return 0.85;
}

export function setStoredVolume(v) {
  const clamped = Math.min(1, Math.max(0, v));
  try {
    localStorage.setItem(THEBEAT_VOLUME_STORAGE_KEY, String(clamped));
  } catch (_) { /* ignore */ }
  return clamped;
}

export function applyVolumeToElement(audio) {
  if (!audio) return;
  audio.volume = getStoredVolume();
}
