import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, Radio, Music, Wrench, Mail, Lock, LogIn, Shield } from 'lucide-react';
import {
  getStreamConfigApi,
  getNowPlayingApi,
  getRecentlyPlayedApi,
} from '../services/api';
import StreamVolumeBar from '../components/StreamVolumeBar';
import { getSharedAudio, applyVolumeToElement } from '../utils/streamAudio';
import { formatTimeCentral } from '../utils/time';
import { useAuth } from '../contexts/AuthContext';
import { isStaffUser } from '../utils/staff';

const DEFAULT_STREAM = 'https://das-edge62-live365-dal03.cdnstream.com/a55796';

export default function Maintenance() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffError, setStaffError] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);

  const [streamUrl, setStreamUrl] = useState('');
  const [stationName, setStationName] = useState('The Beat 515');
  const [tagline, setTagline] = useState('Proud. Loud. Local.');
  const [message, setMessage] = useState('');
  const [np, setNp] = useState({ song_title: 'The Beat 515', artist: 'Live Radio' });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    Promise.all([getStreamConfigApi(), getNowPlayingApi(), getRecentlyPlayedApi(5)])
      .then(([cfg, npData, songs]) => {
        setStreamUrl(cfg.stream_url || DEFAULT_STREAM);
        setStationName(cfg.station_name || 'The Beat 515');
        setTagline(cfg.tagline || 'Proud. Loud. Local.');
        setMessage((cfg.maintenance_message || '').trim() || "We're making things sound even better. Thanks for your patience.");
        setNp(npData || { song_title: 'The Beat 515', artist: 'Live Radio' });
        setRecent(Array.isArray(songs) ? songs.slice(0, 5) : []);
      })
      .finally(() => setLoading(false));

    const ivNp = setInterval(() => getNowPlayingApi().then(setNp), 15000);
    const ivRp = setInterval(
      () => getRecentlyPlayedApi(5).then((s) => setRecent(Array.isArray(s) ? s.slice(0, 5) : [])),
      60000
    );
    return () => {
      clearInterval(ivNp);
      clearInterval(ivRp);
    };
  }, []);

  useEffect(() => {
    const shared = getSharedAudio();
    if (!shared) return undefined;
    audioRef.current = shared;
    applyVolumeToElement(shared);

    const sync = () => setPlaying(!shared.paused && !shared.ended);
    sync();
    shared.addEventListener('play', sync);
    shared.addEventListener('pause', sync);
    shared.addEventListener('ended', sync);
    return () => {
      shared.removeEventListener('play', sync);
      shared.removeEventListener('pause', sync);
      shared.removeEventListener('ended', sync);
    };
  }, []);

  useEffect(() => {
    const shared = audioRef.current;
    if (!shared || !streamUrl) return;
    if (!shared.src) {
      shared.src = streamUrl;
      return;
    }
    if (shared.paused && shared.src !== streamUrl) {
      shared.src = streamUrl;
    }
  }, [streamUrl]);

  const togglePlay = () => {
    const shared = audioRef.current || getSharedAudio();
    if (!shared || !streamUrl) return;
    audioRef.current = shared;
    if (!shared.src || (shared.paused && shared.src !== streamUrl)) {
      shared.src = streamUrl;
    }
    if (!shared.paused && !shared.ended) shared.pause();
    else shared.play().catch(() => {});
  };

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setStaffError('');
    setStaffLoading(true);
    try {
      const u = await login(staffEmail, staffPassword);
      if (!isStaffUser(u)) {
        await logout();
        setStaffError('Only station staff can access the site right now. Use an admin, DJ, or editor account.');
        return;
      }
      navigate('/', { replace: true });
    } catch (err) {
      setStaffError(err.message || 'Could not sign in');
    } finally {
      setStaffLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-beat-bg bg-[radial-gradient(ellipse_100%_80%_at_50%_-10%,rgba(255,0,127,0.12),transparent_50%),radial-gradient(ellipse_80%_50%_at_100%_60%,rgba(0,240,255,0.06),transparent_45%)]"
      data-testid="maintenance-page"
    >
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(255,240,0,0.12)] border border-[rgba(255,240,0,0.25)]">
            <Wrench size={18} className="text-[#FFF000]" />
            <span className="text-[11px] font-extrabold text-[#FFF000] tracking-[3px]">MAINTENANCE</span>
          </div>
        </div>

        <h1 className="text-center font-display text-3xl sm:text-4xl font-black text-white tracking-tight">
          {stationName}
        </h1>
        <p className="text-center text-sm text-[#00F0FF] font-bold tracking-[2px] mt-2">{tagline}</p>
        <p className="text-center text-sm text-[#a1a1aa] mt-6 leading-relaxed px-2">{loading ? 'Loading…' : message}</p>

        <div className="mt-8 rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[#18181b]/90 backdrop-blur-md p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-2 mb-4">
            <Radio size={20} className="text-[#FF007F]" />
            <span className="text-xs font-extrabold text-[#71717a] tracking-[2px]">LIVE STREAM</span>
          </div>

          <p className="text-lg font-bold text-white truncate">
            {(!np.song_title || np.song_title.toLowerCase() === 'unknown') ? stationName : np.song_title}
          </p>
          <p className="text-sm text-[#a1a1aa] truncate mt-0.5">
            {(!np.song_title || np.song_title.toLowerCase() === 'unknown') ? 'Tune in below' : np.artist}
          </p>

          <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              data-testid="maintenance-play-btn"
              className="flex items-center justify-center gap-2 bg-[#FF007F] rounded-full px-6 py-3 text-[12px] font-extrabold text-white tracking-[1px] hover:opacity-90 transition-opacity shrink-0"
            >
              {playing ? <Pause size={18} /> : <Play size={18} />}
              {playing ? 'PAUSE' : 'LISTEN LIVE'}
            </button>
            <StreamVolumeBar className="flex-1 justify-center sm:justify-start" />
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#121214] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Music size={18} className="text-[#00F0FF]" />
            <span className="text-xs font-extrabold text-[#71717a] tracking-[2px]">LAST 5 PLAYED</span>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-[#71717a] text-center py-4">No recent tracks yet.</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((s, i) => (
                <li
                  key={`${s.song_title}-${s.artist}-${i}`}
                  className="flex items-center gap-3 bg-[#18181b] rounded-lg px-3 py-2.5 border border-[rgba(255,255,255,0.06)]"
                >
                  <span className="text-[10px] font-mono text-[#71717a] w-5 text-right">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{s.song_title}</p>
                    <p className="text-xs text-[#71717a] truncate">{s.artist}</p>
                  </div>
                  <span className="text-[10px] text-[#52525b] font-mono shrink-0 hidden sm:inline">
                    {s.played_at ? formatTimeCentral(s.played_at) : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-[rgba(0,240,255,0.2)] bg-[#18181b]/95 backdrop-blur-md p-5 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.4)]" data-testid="maintenance-staff-login">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={18} className="text-[#00F0FF]" />
            <span className="text-xs font-extrabold text-[#00F0FF] tracking-[2px]">STAFF ACCESS</span>
          </div>
          <p className="text-[11px] text-[#71717a] mb-4 leading-relaxed">
            Sign in with an admin, DJ, or editor account to use the full site during maintenance. Listener accounts cannot sign in here.
          </p>
          <form onSubmit={handleStaffLogin} className="space-y-3">
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
              <input
                type="email"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                placeholder="Staff email"
                required
                autoComplete="username"
                className="w-full bg-[#09090b] border border-[rgba(255,255,255,0.12)] rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-[#52525b] focus:border-[#00F0FF] focus:outline-none"
                data-testid="maintenance-staff-email"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
              <input
                type="password"
                value={staffPassword}
                onChange={(e) => setStaffPassword(e.target.value)}
                placeholder="Password"
                required
                autoComplete="current-password"
                className="w-full bg-[#09090b] border border-[rgba(255,255,255,0.12)] rounded-lg pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-[#52525b] focus:border-[#00F0FF] focus:outline-none"
                data-testid="maintenance-staff-password"
              />
            </div>
            {staffError ? (
              <p className="text-xs text-red-400" data-testid="maintenance-staff-error">{staffError}</p>
            ) : null}
            <button
              type="submit"
              disabled={staffLoading}
              className="w-full py-2.5 rounded-lg bg-[#FF007F] text-white text-sm font-bold tracking-[0.5px] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="maintenance-staff-submit"
            >
              <LogIn size={16} />
              {staffLoading ? 'Signing in…' : 'Sign in as staff'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
