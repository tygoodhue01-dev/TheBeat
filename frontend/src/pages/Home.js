import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import WebNavBar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  getNowPlayingApi, getNewsApi, getEventsApi,
  getContestsApi, getPodcastsApi, getDjsApi, getStreamConfigApi, getScheduleApi, subscribeNewsletterApi, getMyFavoritesApi, toggleSongFavoriteApi, mediaUrl
} from '../services/api';
import { Play, Pause, Share2, Music, Clock, Cloud, Headphones, Calendar, Mail, Heart } from 'lucide-react';
import { getCentralNowParts, getMonthDayFromIsoDate } from '../utils/time';
import { getSharedAudio, applyVolumeToElement } from '../utils/streamAudio';
import StreamVolumeBar from '../components/StreamVolumeBar';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEATHER_CODE_LABELS = {
  0: 'Clear sky',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  95: 'Thunderstorm'
};
const DAY_INDEX = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6
};

function normalizeDayIndex(dayValue) {
  if (!dayValue || typeof dayValue !== 'string') return null;
  const normalized = dayValue.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(DAY_INDEX, normalized) ? DAY_INDEX[normalized] : null;
}

/** Minutes from midnight for first h:mm AM/PM in the slot string */
function parseStartMinutes(timeSlot) {
  if (!timeSlot || typeof timeSlot !== 'string') return null;
  const m = timeSlot.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2] || '0', 10);
  const ap = m[3] ? m[3].toUpperCase() : null;

  if (ap) {
    if (ap === 'PM' && h !== 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
  } else if (h > 23 || min > 59) {
    return null;
  }

  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function formatDisplayTime(timeSlot) {
  if (!timeSlot) return '';
  const m = timeSlot.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i);
  return m ? m[1].replace(/\s+/g, ' ') : timeSlot.split('-')[0]?.trim() || timeSlot;
}

function createSongFavoriteId(songTitle, artist) {
  const raw = `${songTitle || ''}::${artist || ''}`.trim().toLowerCase();
  return raw.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'now-playing-track';
}

/** Next upcoming slot using Central Time; compares start time only */
function getNextShow(schedule) {
  if (!schedule?.length) return null;
  const now = getCentralNowParts();
  const nowMin = now.hour * 60 + now.minute;
  const todayIdx = now.dayIndex;
  const nowAbsolute = todayIdx * 1440 + nowMin;

  const validSlots = schedule
    .map((s) => ({
      ...s,
      dayIdx: normalizeDayIndex(s.day_of_week),
      startMin: parseStartMinutes(s.time_slot)
    }))
    .filter((s) => s.dayIdx !== null && s.startMin !== null && s.show_name);

  if (!validSlots.length) return null;

  // Only show slots that are still ahead in the current schedule window.
  // If all configured slots are behind "now", return null so UI falls back.
  const upcoming = validSlots
    .map((slot) => ({ slot, slotAbsolute: slot.dayIdx * 1440 + slot.startMin }))
    .filter(({ slotAbsolute }) => slotAbsolute > nowAbsolute)
    .sort((a, b) => a.slotAbsolute - b.slotAbsolute);

  if (!upcoming.length) return null;
  const best = upcoming[0];
  return {
    showName: best.slot.show_name,
    timeLabel: formatDisplayTime(best.slot.time_slot)
  };
}

export default function Home() {
  const { user } = useAuth();
  const [np, setNp] = useState({ song_title: 'The Beat 515', artist: 'Live Radio', dj_name: 'AutoDJ' });
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [favoriteSongIds, setFavoriteSongIds] = useState(new Set());
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [favoriteToast, setFavoriteToast] = useState('');
  const [news, setNews] = useState([]);
  const [events, setEvents] = useState([]);
  const [contests, setContests] = useState([]);
  const [podcasts, setPodcasts] = useState([]);
  const [djs, setDjs] = useState([]);
  const [brokenDjAvatars, setBrokenDjAvatars] = useState(new Set());
  const [djStartIndex, setDjStartIndex] = useState(0);
  const [schedule, setSchedule] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const [weather, setWeather] = useState({
    tempF: '--',
    feelsLikeF: '--',
    humidity: '--',
    condition: 'Loading...'
  });
  const audioRef = useRef(null);

  const nextShow = useMemo(() => getNextShow(schedule), [schedule]);
  const hasDjSlideshow = djs.length > 4;
  const visibleDjs = useMemo(() => {
    if (!hasDjSlideshow) return djs;
    return Array.from({ length: 4 }, (_, i) => djs[(djStartIndex + i) % djs.length]).filter(Boolean);
  }, [djs, hasDjSlideshow, djStartIndex]);
  const currentSongFavoriteId = useMemo(
    () => createSongFavoriteId(np.song_title, np.artist),
    [np.song_title, np.artist]
  );
  const isCurrentFavorite = favoriteSongIds.has(currentSongFavoriteId);
  const homeUpcomingEvents = useMemo(() => events.slice(0, 4), [events]);

  useEffect(() => {
    Promise.all([
      getNowPlayingApi(), getNewsApi(),
      getEventsApi(), getContestsApi(), getPodcastsApi(),
      getDjsApi(), getStreamConfigApi(), getScheduleApi()
    ]).then(([npD, n, e, c, p, d, sc, sch]) => {
      setNp(npD); setNews(n);
      setEvents(e); setContests(c); setPodcasts(p); setDjs(d);
      setSchedule(Array.isArray(sch) ? sch : []);
      setStreamUrl(sc.stream_url || 'https://das-edge62-live365-dal03.cdnstream.com/a55796');
    });
    const iv = setInterval(() => getNowPlayingApi().then(setNp), 15000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadWeather = async () => {
      try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=41.5868&longitude=-93.625&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code&temperature_unit=fahrenheit');
        if (!res.ok) return;
        const data = await res.json();
        const current = data?.current;
        if (!current || cancelled) return;
        setWeather({
          tempF: Math.round(current.temperature_2m ?? 0),
          feelsLikeF: Math.round(current.apparent_temperature ?? 0),
          humidity: Math.round(current.relative_humidity_2m ?? 0),
          condition: WEATHER_CODE_LABELS[current.weather_code] || 'Current conditions'
        });
      } catch (_) {
        // Keep previous weather values when fetch fails.
      }
    };

    loadWeather();
    const iv = setInterval(loadWeather, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    const shared = getSharedAudio();
    if (!shared) return undefined;
    audioRef.current = shared;
    applyVolumeToElement(shared);

    const syncPlaying = () => setPlaying(!shared.paused && !shared.ended);
    syncPlaying();
    shared.addEventListener('play', syncPlaying);
    shared.addEventListener('pause', syncPlaying);
    shared.addEventListener('ended', syncPlaying);

    return () => {
      shared.removeEventListener('play', syncPlaying);
      shared.removeEventListener('pause', syncPlaying);
      shared.removeEventListener('ended', syncPlaying);
    };
  }, []);

  useEffect(() => {
    const shared = audioRef.current;
    if (!shared || !streamUrl) return;
    if (!shared.src) {
      shared.src = streamUrl;
      return;
    }
    // Avoid switching source mid-play unless it's actually a different URL and currently paused.
    if (shared.paused && shared.src !== streamUrl) {
      shared.src = streamUrl;
    }
  }, [streamUrl]);

  useEffect(() => {
    setBrokenDjAvatars(new Set());
  }, [djs.length]);

  useEffect(() => {
    setDjStartIndex(0);
  }, [djs.length]);

  useEffect(() => {
    if (!hasDjSlideshow) return undefined;
    const iv = setInterval(() => {
      setDjStartIndex((idx) => (idx + 1) % djs.length);
    }, 6000);
    return () => clearInterval(iv);
  }, [hasDjSlideshow, djs.length]);

  useEffect(() => {
    if (!user) {
      setFavoriteSongIds(new Set());
      return;
    }
    getMyFavoritesApi().then((items) => {
      setFavoriteSongIds(new Set(
        items
          .filter((i) => i.type === 'song')
          .flatMap((i) => [i.song_id, i.song_key, createSongFavoriteId(i.song_title, i.artist)].filter(Boolean))
      ));
    }).catch(() => setFavoriteSongIds(new Set()));
  }, [user]);

  const togglePlay = () => {
    const shared = audioRef.current || getSharedAudio();
    if (!shared) return;
    audioRef.current = shared;
    if (streamUrl && (!shared.src || (shared.paused && shared.src !== streamUrl))) {
      shared.src = streamUrl;
    }
    if (!shared.paused && !shared.ended) {
      shared.pause();
    } else {
      shared.play().catch(() => {});
    }
  };

  const shareSong = () => {
    if (navigator.share) {
      navigator.share({ title: 'Now Playing on The Beat 515', text: `Now Playing: ${np.song_title} by ${np.artist}` });
    }
  };

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    const email = newsletterEmail.trim();
    if (!email) {
      setNewsletterStatus('Please enter an email address.');
      return;
    }
    setNewsletterLoading(true);
    setNewsletterStatus('');
    try {
      const result = await subscribeNewsletterApi(email);
      setNewsletterStatus(result?.message || 'Thanks for subscribing!');
      setNewsletterEmail('');
    } catch (err) {
      setNewsletterStatus(err.message || 'Unable to subscribe right now.');
    } finally {
      setNewsletterLoading(false);
    }
  };

  const handleToggleCurrentFavorite = async () => {
    if (!user || !currentSongFavoriteId || favoriteLoading) return;
    setFavoriteLoading(true);
    const previous = new Set(favoriteSongIds);
    const optimistic = new Set(favoriteSongIds);
    if (optimistic.has(currentSongFavoriteId)) optimistic.delete(currentSongFavoriteId);
    else optimistic.add(currentSongFavoriteId);
    setFavoriteSongIds(optimistic);
    try {
      const result = await toggleSongFavoriteApi(currentSongFavoriteId, np.song_title || '', np.artist || '');
      setFavoriteSongIds((curr) => {
        const next = new Set(curr);
        if (result?.favorited) next.add(currentSongFavoriteId);
        else next.delete(currentSongFavoriteId);
        return next;
      });
      setFavoriteToast(result?.favorited ? 'Added to favorites' : 'Removed from favorites');
    } catch (_) {
      setFavoriteSongIds(previous);
      setFavoriteToast('Could not update favorite right now');
    } finally {
      setFavoriteLoading(false);
      setTimeout(() => setFavoriteToast(''), 2200);
    }
  };

  return (
    <div data-testid="home-page">
      <WebNavBar />

      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-[520px] sm:min-h-[460px] lg:h-[420px] overflow-hidden" data-testid="hero-section">
        {/* Background gradient + visual */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#1a0a1a] to-[#09090b]" />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(255,0,127,0.08) 30%, rgba(0,240,255,0.05) 60%, transparent 100%)'
        }} />
        {/* Decorative waveform lines */}
        <div className="absolute inset-0 opacity-20" style={{
          background: `repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,0,127,0.3) 2px, rgba(255,0,127,0.3) 3px)`,
          backgroundSize: '20px 100%',
          maskImage: 'radial-gradient(ellipse 80% 70% at 60% 50%, black 30%, transparent 70%)'
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FF007F] via-[#00F0FF] to-[#FFF000]" />

        <div className="absolute inset-0 max-w-[1200px] mx-auto w-full flex items-center justify-between px-4 sm:px-6 lg:px-8 py-8 sm:py-0">
          {/* Left side */}
          <div className="flex-1" data-testid="hero-left">
            <div className="inline-flex items-center bg-[rgba(255,240,0,0.18)] px-3.5 py-1.5 rounded-full mb-4">
              <div className="w-2 h-2 rounded-full bg-[#FFF000] mr-1.5 animate-pulse" />
              <span className="text-[11px] font-extrabold text-[#FFF000] tracking-[3px]">ON AIR NOW</span>
            </div>
            <h1 className="text-[34px] sm:text-[42px] lg:text-[48px] font-black text-white tracking-[-1px] leading-tight" data-testid="hero-now-playing-title">
              {(!np.song_title || np.song_title.toLowerCase() === 'unknown') ? 'The Beat 515' : np.song_title}
            </h1>
            <p className="text-[18px] sm:text-[20px] lg:text-[22px] text-[#a1a1aa] mt-1" data-testid="now-playing-artist">
              {(!np.song_title || np.song_title.toLowerCase() === 'unknown') ? 'Now Streaming Live' : np.artist}
            </p>
            <p className="text-sm text-[#71717a] mt-2 mb-6">
              {(!np.song_title || np.song_title.toLowerCase() === 'unknown') ? 'Tune in for the hottest hits' : `with ${np.dj_name || 'AutoDJ'}`}
            </p>
            {user ? (
              <button
                type="button"
                onClick={handleToggleCurrentFavorite}
                disabled={favoriteLoading}
                className="inline-flex items-center gap-2 mb-5 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] rounded-full px-3.5 py-2 text-[11px] font-bold tracking-[1px] text-[#a1a1aa] hover:text-white hover:border-[rgba(255,0,127,0.35)] transition-colors disabled:opacity-50"
                data-testid="now-playing-favorite-btn"
              >
                <Heart size={14} className={isCurrentFavorite ? 'text-[#FF007F] fill-[#FF007F]' : 'text-[#a1a1aa]'} />
                {isCurrentFavorite ? 'FAVORITED' : 'FAVORITE SONG'}
              </button>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <button onClick={togglePlay} data-testid="play-pause-btn"
                className="flex items-center gap-2 bg-[#FF007F] rounded-full px-5 sm:px-7 py-3 text-[12px] sm:text-[13px] font-extrabold text-white tracking-[1px] hover:opacity-90 transition-opacity">
                {playing ? <Pause size={16} /> : <Play size={16} />}
                {playing ? 'PAUSE' : 'LISTEN LIVE'}
              </button>
              <StreamVolumeBar />
              <button onClick={shareSong} data-testid="share-btn"
                className="flex items-center gap-2 bg-transparent border border-[rgba(0,240,255,0.3)] rounded-full px-4 sm:px-5 py-3 text-[11px] sm:text-[12px] font-bold text-[#00F0FF] tracking-[1px] hover:bg-[rgba(0,240,255,0.1)] transition-colors">
                <Share2 size={14} /> SHARE
              </button>
              <Link to="/recently-played" data-testid="hero-recently-played"
                className="flex items-center gap-2 bg-[rgba(255,255,255,0.05)] rounded-full px-4 sm:px-5 py-3 text-[11px] sm:text-[12px] font-bold text-[#00F0FF] tracking-[1px] hover:bg-[rgba(255,255,255,0.1)] transition-colors">
                <Clock size={14} /> Recently Played
              </Link>
            </div>
          </div>

          {/* Right side - PROUD. LOUD. LOCAL. */}
          <div className="hidden lg:flex flex-col items-end">
            <span className="text-[64px] font-black text-white/[0.06] tracking-[8px] leading-[70px] font-display">PROUD.</span>
            <span className="text-[64px] font-black text-white/[0.06] tracking-[8px] leading-[70px] font-display">LOUD.</span>
            <span className="text-[64px] font-black text-white/[0.06] tracking-[8px] leading-[70px] font-display">LOCAL.</span>
          </div>
        </div>
      </section>

      {/* ===== WEATHER + NEXT SHOW ===== */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 mt-6 flex flex-wrap gap-4 items-stretch justify-center">
        <div className="bg-[#18181b] rounded-xl border border-[rgba(255,255,255,0.1)] px-5 py-4 sm:py-3.5 flex flex-col sm:flex-row items-center text-center sm:text-left gap-2 sm:gap-3 w-full sm:w-fit" data-testid="weather-widget">
          <Cloud size={24} className="text-[#FFF000] shrink-0" />
          <div>
            <span className="text-lg font-bold">{weather.tempF}&deg;F </span>
            <span className="text-[#00F0FF] text-sm font-bold">Des Moines</span>
            <div className="text-xs text-[#a1a1aa]">{weather.condition}</div>
            <div className="text-xs text-[#71717a]">Feels like {weather.feelsLikeF}&deg; &bull; Humidity {weather.humidity}%</div>
          </div>
        </div>
        <Link
          to="/schedule"
          data-testid="next-show-widget"
          className="bg-[#18181b] rounded-xl border border-[rgba(255,255,255,0.1)] px-5 py-4 sm:py-3.5 flex flex-col sm:flex-row items-center text-center sm:text-left gap-2 sm:gap-3 w-full sm:w-fit max-w-full hover:border-[rgba(0,240,255,0.22)] transition-colors group"
        >
          <Calendar size={24} className="text-[#FF007F] shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold text-[#71717a] tracking-[2px]">UP NEXT</div>
            {nextShow ? (
              <p className="text-sm font-bold text-white mt-1 leading-snug">
                <span className="text-[#a1a1aa] font-semibold">Next: </span>
                <span className="text-white">{nextShow.showName}</span>
                {nextShow.timeLabel ? (
                  <span className="text-[#00F0FF]"> · {nextShow.timeLabel} CT</span>
                ) : null}
              </p>
            ) : (
              <p className="text-sm font-bold text-white mt-1">
                <span className="text-[#a1a1aa] font-semibold group-hover:text-[#00F0FF] transition-colors">View full schedule</span>
                <span className="text-[#71717a] font-normal text-xs block mt-0.5">Weekly lineup &amp; show times</span>
              </p>
            )}
          </div>
        </Link>
        <div
          className="bg-[#18181b] rounded-xl border border-[rgba(255,255,255,0.1)] px-5 py-4 sm:py-3.5 flex flex-col sm:flex-row items-center text-center sm:text-left gap-2 sm:gap-3 w-full sm:w-fit max-w-full"
          data-testid="newsletter-widget"
        >
          <Mail size={24} className="text-[#00F0FF] shrink-0" />
          <div className="min-w-0 w-full sm:w-auto">
            <div className="text-[10px] font-extrabold text-[#71717a] tracking-[2px]">NEWSLETTER</div>
            <form className="mt-1.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-center" onSubmit={handleNewsletterSubmit}>
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Your email"
                className="bg-[#09090b] border border-[rgba(255,255,255,0.15)] rounded-md px-2.5 py-1.5 text-xs text-white placeholder:text-[#71717a] focus:outline-none focus:border-[rgba(0,240,255,0.45)] w-full sm:w-auto"
                aria-label="Email address for newsletter"
              />
              <button
                type="submit"
                className="bg-[#00F0FF] text-[#09090b] text-[11px] font-extrabold tracking-[1px] rounded-md px-3 py-1.5 hover:opacity-90 transition-opacity disabled:opacity-50 w-full sm:w-auto"
                disabled={newsletterLoading}
              >
                {newsletterLoading ? 'SENDING...' : 'SUBSCRIBE'}
              </button>
            </form>
            {newsletterStatus ? (
              <p className="text-[11px] text-[#a1a1aa] mt-1">{newsletterStatus}</p>
            ) : null}
          </div>
        </div>
        <div
          className="bg-[#18181b] rounded-xl border border-[rgba(255,255,255,0.1)] px-5 py-4 sm:py-3.5 flex flex-col sm:flex-row items-center text-center sm:text-left gap-2 sm:gap-3 w-full sm:w-fit max-w-full"
          data-testid="donate-widget"
        >
          <Heart size={24} className="text-[#FFF000] shrink-0" />
          <div>
            <div className="text-[10px] font-extrabold text-[#71717a] tracking-[2px]">SUPPORT THE STATION</div>
            <a
              href="/rewards"
              className="inline-flex items-center justify-center mt-1.5 bg-[#FF007F] rounded-md px-3.5 py-1.5 text-[11px] font-extrabold text-white tracking-[1px] hover:opacity-90 transition-opacity min-w-[130px]"
            >
              DONATE
            </a>
          </div>
        </div>
      </div>

      {/* ===== DJS ===== */}
      {djs.length > 0 && (
        <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 mt-12" data-testid="shows-section">
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-[22px] font-black text-white tracking-[2px] font-display">DJS</h2>
            <div className="flex items-center gap-3">
              {hasDjSlideshow ? (
                <div className="flex items-center gap-2" data-testid="dj-slideshow-controls">
                  <button
                    type="button"
                    onClick={() => setDjStartIndex((idx) => (idx - 1 + djs.length) % djs.length)}
                    className="w-8 h-8 rounded-full border border-[rgba(255,255,255,0.2)] text-[#a1a1aa] hover:text-white hover:border-[rgba(255,0,127,0.45)] transition-colors"
                    aria-label="Previous DJs"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => setDjStartIndex((idx) => (idx + 1) % djs.length)}
                    className="w-8 h-8 rounded-full border border-[rgba(255,255,255,0.2)] text-[#a1a1aa] hover:text-white hover:border-[rgba(255,0,127,0.45)] transition-colors"
                    aria-label="Next DJs"
                  >
                    →
                  </button>
                </div>
              ) : null}
              <span className="text-[13px] text-[#71717a]">Meet your on-air talent</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {visibleDjs.map(d => (
              <div key={d.user_id} className="bg-[#18181b] rounded-lg p-5 flex flex-col items-center border border-[rgba(255,255,255,0.1)]" data-testid={`dj-card-${d.user_id}`}>
                {d.avatar_url && !brokenDjAvatars.has(d.user_id) ? (
                  <img
                    src={d.avatar_data_url || mediaUrl(d.avatar_url, d.updated_at || d.user_id)}
                    alt={d.name}
                    className="w-16 h-16 rounded-full object-cover mb-3 border border-[rgba(255,255,255,0.2)]"
                    onError={() => setBrokenDjAvatars((prev) => new Set(prev).add(d.user_id))}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#FF007F] flex items-center justify-center mb-3">
                    <span className="text-[28px] font-black text-white">{d.name?.charAt(0)}</span>
                  </div>
                )}
                <h3 className="text-base font-bold text-white">{d.name}</h3>
                <p className="text-[10px] font-bold text-[#00F0FF] tracking-[1px] mt-1">DJ</p>
                <p className="text-xs text-[#a1a1aa] text-center mt-2 leading-[18px]">{d.bio}</p>
              </div>
            ))}
          </div>
          {hasDjSlideshow ? (
            <div className="flex justify-center gap-1.5 mt-4">
              {djs.map((dj, idx) => (
                <button
                  key={`dj-dot-${dj.user_id || idx}`}
                  type="button"
                  onClick={() => setDjStartIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-colors ${djStartIndex === idx ? 'bg-[#FF007F]' : 'bg-white/25 hover:bg-white/45'}`}
                  aria-label={`Go to DJ ${idx + 1}`}
                />
              ))}
            </div>
          ) : null}
        </section>
      )}

      {/* ===== NEWS + SIDEBAR ===== */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 mt-12 flex flex-col lg:flex-row gap-8">
        {/* Main: News */}
        <div className="flex-[2]">
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-[22px] font-black text-white tracking-[2px] font-display">LATEST NEWS</h2>
            <Link to="/news" className="text-xs font-bold text-[#FF007F] tracking-[1px] hover:opacity-80" data-testid="view-all-news">VIEW ALL</Link>
          </div>

          {/* Featured article */}
          {news.length > 0 && (
            <Link to={`/news/${news[0].news_id}`} className="block rounded-xl overflow-hidden h-[300px] relative mb-5 group" data-testid="featured-news">
              {news[0].image_url ? (
                <img src={news[0].image_url} alt={news[0].title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#27272a]" />
              )}
              <div className="absolute inset-0 bg-black/50" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <span className="text-[11px] font-bold text-[#00F0FF] tracking-[2px]">{news[0].category?.toUpperCase()}</span>
                <h3 className="text-[28px] font-extrabold text-white mt-1.5 group-hover:text-[#FF007F] transition-colors">{news[0].title}</h3>
                <p className="text-sm text-white/70 mt-2 leading-5">{news[0].summary}</p>
              </div>
            </Link>
          )}

          {/* News grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {news.slice(1, 4).map(a => (
              <Link key={a.news_id} to={`/news/${a.news_id}`}
                className="bg-[#18181b] rounded-lg overflow-hidden border border-[rgba(255,255,255,0.1)] group" data-testid={`news-card-${a.news_id}`}>
                {a.image_url && (
                  <img src={a.image_url} alt={a.title} className="w-full h-[120px] object-cover" />
                )}
                <div className="p-4">
                  <span className="text-[10px] font-bold text-[#00F0FF] tracking-[2px]">{a.category?.toUpperCase()}</span>
                  <h4 className="text-sm font-bold text-white mt-1 group-hover:text-[#FF007F] transition-colors line-clamp-2">{a.title}</h4>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex-1">
          {/* Contests */}
          {contests.length > 0 && (
            <div className="bg-[#18181b] rounded-xl p-5 border border-[rgba(255,255,255,0.1)] mb-5" data-testid="contests-sidebar">
              <h3 className="text-xs font-extrabold text-[#FFF000] tracking-[2px] mb-4">CONTESTS & GIVEAWAYS</h3>
              {contests.map(c => (
                <div key={c.contest_id} className="flex items-start mb-4 pb-4 border-b border-[rgba(255,255,255,0.1)] last:border-0 last:mb-0 last:pb-0" data-testid={`contest-${c.contest_id}`}>
                  <div className="ml-1">
                    <h4 className="text-sm font-bold text-white">{c.title}</h4>
                    <p className="text-xs text-[#FF007F] mt-0.5">{c.prize}</p>
                    <p className="text-[11px] text-[#71717a] mt-1">Ends: {c.end_date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Events */}
          {events.length > 0 && (
            <div className="bg-[#18181b] rounded-xl p-5 border border-[rgba(255,255,255,0.1)]" data-testid="events-sidebar">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-extrabold text-[#FFF000] tracking-[2px]">UPCOMING EVENTS</h3>
                <Link to="/events" className="text-[10px] font-extrabold text-[#00F0FF] tracking-[1px] hover:opacity-80">
                  VIEW ALL
                </Link>
              </div>
              {homeUpcomingEvents.map(e => {
                const eventDate = getMonthDayFromIsoDate(e.date);
                return (
                <div key={e.event_id} className="flex items-center gap-3 mb-4 last:mb-0" data-testid={`event-${e.event_id}`}>
                  <div className="w-12 h-12 rounded-lg bg-[rgba(255,0,127,0.1)] flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-[#FF007F] tracking-[1px]">
                      {eventDate.monthShort}
                    </span>
                    <span className="text-xl font-black text-white">
                      {eventDate.day || ''}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{e.title}</h4>
                    <p className="text-xs text-[#a1a1aa] mt-0.5">{e.venue}</p>
                    <p className="text-[11px] text-[#71717a] mt-0.5">{e.time ? `${e.time} CT` : ''}</p>
                  </div>
                </div>
              );})}
            </div>
          )}
        </div>
      </div>

      {/* ===== PODCASTS & SHOWS ===== */}
      {podcasts.length > 0 && (
        <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 mt-12" data-testid="podcasts-section">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-[22px] font-black text-white tracking-[2px] font-display">PODCASTS & SHOWS</h2>
              <p className="text-[13px] text-[#71717a] mt-1">Catch up on what you missed</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {podcasts.map(p => (
              <div key={p.podcast_id} className="bg-[#18181b] rounded-lg overflow-hidden border border-[rgba(255,255,255,0.1)]" data-testid={`podcast-${p.podcast_id}`}>
                {p.image_url ? (
                  <img src={p.image_url} alt={p.title} className="w-full h-[130px] object-cover" />
                ) : (
                  <div className="w-full h-[130px] bg-[#27272a] flex items-center justify-center">
                    <Headphones size={32} className="text-[#71717a]" />
                  </div>
                )}
                <div className="p-3.5">
                  <span className="text-[10px] font-bold text-[#00F0FF] tracking-[1px]">{p.show_name}</span>
                  <h4 className="text-sm font-bold text-white mt-1">{p.title}</h4>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[11px] text-[#71717a]">{p.duration}</span>
                    <span className="text-[11px] text-[#71717a]">&bull; {p.dj_name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {favoriteToast ? (
        <div className="fixed bottom-4 right-4 z-[120] bg-[#18181b] border border-[rgba(255,255,255,0.15)] rounded-lg px-3.5 py-2 text-xs font-bold text-white tracking-[0.8px] shadow-lg">
          {favoriteToast}
        </div>
      ) : null}

      <Footer />
    </div>
  );
}
