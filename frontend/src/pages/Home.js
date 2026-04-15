import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import WebNavBar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  getNowPlayingApi, getNewsApi, getShowsApi, getEventsApi,
  getContestsApi, getPodcastsApi, getDjsApi, getStreamConfigApi
} from '../services/api';
import { Play, Pause, Share2, Music, Clock, Cloud, Mic2, Headphones } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const [np, setNp] = useState({ song_title: 'The Beat 515', artist: 'Live Radio', dj_name: 'AutoDJ' });
  const [news, setNews] = useState([]);
  const [shows, setShows] = useState([]);
  const [events, setEvents] = useState([]);
  const [contests, setContests] = useState([]);
  const [podcasts, setPodcasts] = useState([]);
  const [djs, setDjs] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const audioRef = useRef(null);

  useEffect(() => {
    Promise.all([
      getNowPlayingApi(), getNewsApi(), getShowsApi(),
      getEventsApi(), getContestsApi(), getPodcastsApi(),
      getDjsApi(), getStreamConfigApi()
    ]).then(([npD, n, s, e, c, p, d, sc]) => {
      setNp(npD); setNews(n); setShows(s);
      setEvents(e); setContests(c); setPodcasts(p); setDjs(d);
      setStreamUrl(sc.stream_url || 'https://das-edge62-live365-dal03.cdnstream.com/a55796');
    });
    const iv = setInterval(() => getNowPlayingApi().then(setNp), 15000);
    return () => clearInterval(iv);
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(streamUrl);
    }
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play().catch(() => {}); }
    setPlaying(!playing);
  };

  const shareSong = () => {
    if (navigator.share) {
      navigator.share({ title: 'Now Playing on The Beat 515', text: `Now Playing: ${np.song_title} by ${np.artist}` });
    }
  };

  return (
    <div data-testid="home-page">
      <WebNavBar />

      {/* ===== HERO SECTION ===== */}
      <section className="relative h-[420px] overflow-hidden" data-testid="hero-section">
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

        <div className="absolute inset-0 max-w-[1200px] mx-auto w-full flex items-center justify-between px-8">
          {/* Left side */}
          <div className="flex-1" data-testid="hero-left">
            <div className="inline-flex items-center bg-[rgba(255,240,0,0.18)] px-3.5 py-1.5 rounded-full mb-4">
              <div className="w-2 h-2 rounded-full bg-[#FFF000] mr-1.5 animate-pulse" />
              <span className="text-[11px] font-extrabold text-[#FFF000] tracking-[3px]">ON AIR NOW</span>
            </div>
            <h1 className="text-[48px] font-black text-white tracking-[-1px] leading-tight" data-testid="hero-now-playing-title">
              {(!np.song_title || np.song_title.toLowerCase() === 'unknown') ? 'The Beat 515' : np.song_title}
            </h1>
            <p className="text-[22px] text-[#a1a1aa] mt-1" data-testid="now-playing-artist">
              {(!np.song_title || np.song_title.toLowerCase() === 'unknown') ? 'Now Streaming Live' : np.artist}
            </p>
            <p className="text-sm text-[#71717a] mt-2 mb-6">
              {(!np.song_title || np.song_title.toLowerCase() === 'unknown') ? 'Tune in for the hottest hits' : `with ${np.dj_name || 'AutoDJ'}`}
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button onClick={togglePlay} data-testid="play-pause-btn"
                className="flex items-center gap-2 bg-[#FF007F] rounded-full px-7 py-3.5 text-[13px] font-extrabold text-white tracking-[1px] hover:opacity-90 transition-opacity">
                {playing ? <Pause size={16} /> : <Play size={16} />}
                {playing ? 'PAUSE' : 'LISTEN LIVE'}
              </button>
              <button onClick={shareSong} data-testid="share-btn"
                className="flex items-center gap-2 bg-transparent border border-[rgba(0,240,255,0.3)] rounded-full px-5 py-3.5 text-[12px] font-bold text-[#00F0FF] tracking-[1px] hover:bg-[rgba(0,240,255,0.1)] transition-colors">
                <Share2 size={14} /> SHARE
              </button>
              <Link to="/requests" data-testid="hero-request-btn"
                className="flex items-center gap-2 bg-transparent border border-[rgba(255,0,127,0.4)] rounded-full px-5 py-3.5 text-[12px] font-bold text-[#FF007F] tracking-[1px] hover:bg-[rgba(255,0,127,0.1)] transition-colors">
                <Music size={14} /> REQUEST A SONG
              </Link>
              <Link to="/recently-played" data-testid="hero-recently-played"
                className="flex items-center gap-2 bg-[rgba(255,255,255,0.05)] rounded-full px-5 py-3.5 text-[12px] font-bold text-[#00F0FF] tracking-[1px] hover:bg-[rgba(255,255,255,0.1)] transition-colors">
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

      {/* ===== WEATHER WIDGET ===== */}
      <div className="max-w-[1200px] mx-auto px-8 mt-6">
        <div className="bg-[#18181b] rounded-xl border border-[rgba(255,255,255,0.1)] px-5 py-3.5 flex items-center gap-3 w-fit" data-testid="weather-widget">
          <Cloud size={24} className="text-[#FFF000]" />
          <div>
            <span className="text-lg font-bold">82&deg;F </span>
            <span className="text-[#00F0FF] text-sm font-bold">Des Moines</span>
            <div className="text-xs text-[#a1a1aa]">Overcast</div>
            <div className="text-xs text-[#71717a]">Feels like 84&deg; &bull; Humidity 40%</div>
          </div>
        </div>
      </div>

      {/* ===== DJS ===== */}
      {(shows.length > 0 || djs.length > 0) && (
        <section className="max-w-[1200px] mx-auto px-8 mt-12" data-testid="shows-section">
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-[22px] font-black text-white tracking-[2px] font-display">DJS</h2>
            <span className="text-[13px] text-[#71717a]">Meet your on-air talent</span>
          </div>
          <div className="flex flex-wrap gap-5">
            {shows.map(sh => (
              <div key={sh.show_id} className="w-[23%] min-w-[200px] bg-[#18181b] rounded-lg overflow-hidden border border-[rgba(255,255,255,0.1)]" data-testid={`show-card-${sh.show_id}`}>
                {sh.image_url ? (
                  <img src={sh.image_url} alt={sh.name} className="w-full h-[140px] object-cover" />
                ) : (
                  <div className="w-full h-[140px] bg-[#27272a] flex items-center justify-center">
                    <Mic2 size={32} className="text-[#71717a]" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-base font-bold text-white">{sh.name}</h3>
                  <p className="text-xs text-[#00F0FF] mt-1">{sh.schedule}</p>
                  <p className="text-xs text-[#71717a] mt-1">{sh.dj_name}</p>
                  <p className="text-xs text-[#a1a1aa] mt-2 leading-[18px] line-clamp-3">{sh.description}</p>
                </div>
              </div>
            ))}
            {djs.map(d => (
              <div key={d.user_id} className="w-[23%] min-w-[200px] bg-[#18181b] rounded-lg p-5 flex flex-col items-center border border-[rgba(255,255,255,0.1)]" data-testid={`dj-card-${d.user_id}`}>
                <div className="w-16 h-16 rounded-full bg-[#FF007F] flex items-center justify-center mb-3">
                  <span className="text-[28px] font-black text-white">{d.name?.charAt(0)}</span>
                </div>
                <h3 className="text-base font-bold text-white">{d.name}</h3>
                <p className="text-xs text-[#a1a1aa] text-center mt-2 leading-[18px]">{d.bio}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== NEWS + SIDEBAR ===== */}
      <div className="max-w-[1200px] mx-auto px-8 mt-12 flex flex-col lg:flex-row gap-8">
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
          <div className="flex gap-4">
            {news.slice(1, 4).map(a => (
              <Link key={a.news_id} to={`/news/${a.news_id}`}
                className="flex-1 bg-[#18181b] rounded-lg overflow-hidden border border-[rgba(255,255,255,0.1)] group" data-testid={`news-card-${a.news_id}`}>
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
              <h3 className="text-xs font-extrabold text-[#FFF000] tracking-[2px] mb-4">UPCOMING EVENTS</h3>
              {events.map(e => (
                <div key={e.event_id} className="flex items-center gap-3 mb-4 last:mb-0" data-testid={`event-${e.event_id}`}>
                  <div className="w-12 h-12 rounded-lg bg-[rgba(255,0,127,0.1)] flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-[#FF007F] tracking-[1px]">
                      {e.date ? new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : ''}
                    </span>
                    <span className="text-xl font-black text-white">
                      {e.date ? new Date(e.date + 'T00:00:00').getDate() : ''}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{e.title}</h4>
                    <p className="text-xs text-[#a1a1aa] mt-0.5">{e.venue}</p>
                    <p className="text-[11px] text-[#71717a] mt-0.5">{e.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== PODCASTS & SHOWS ===== */}
      {podcasts.length > 0 && (
        <section className="max-w-[1200px] mx-auto px-8 mt-12" data-testid="podcasts-section">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-[22px] font-black text-white tracking-[2px] font-display">PODCASTS & SHOWS</h2>
              <p className="text-[13px] text-[#71717a] mt-1">Catch up on what you missed</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-5">
            {podcasts.map(p => (
              <div key={p.podcast_id} className="w-[23%] min-w-[200px] bg-[#18181b] rounded-lg overflow-hidden border border-[rgba(255,255,255,0.1)]" data-testid={`podcast-${p.podcast_id}`}>
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

      <Footer />
    </div>
  );
}
