import React, { useState, useEffect } from 'react';
import { getRecentlyPlayedApi } from '../services/api';
import { Clock, Music } from 'lucide-react';
import WebNavBar from '../components/Navbar';
import Footer from '../components/Footer';

export default function RecentlyPlayed() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getRecentlyPlayedApi(50).then(d => { setSongs(d); setLoading(false); }); }, []);

  return (
    <div data-testid="recently-played-page">
      <WebNavBar />
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <h1 className="text-[24px] sm:text-[28px] font-black text-white tracking-[3px] font-display flex items-center gap-3">
          <Clock size={24} className="text-[#00F0FF]" /> RECENTLY PLAYED
        </h1>
        <p className="text-sm text-[#a1a1aa] mt-1 mb-6">Songs recently aired on The Beat 515</p>

        {loading ? (
          <div className="text-center py-16 text-[#71717a]">Loading...</div>
        ) : songs.length === 0 ? (
          <div className="text-center py-16 text-[#71717a]">No recently played songs available yet.</div>
        ) : (
          <div className="space-y-2" data-testid="recently-played-list">
            {songs.map((s, i) => (
              <div key={i} className="bg-[#18181b] rounded-lg px-4 sm:px-5 py-3 flex items-center gap-3 sm:gap-4 border border-[rgba(255,255,255,0.1)] hover:bg-[#27272a] transition-colors" data-testid={`song-item-${i}`}>
                <div className="w-10 h-10 rounded-lg bg-[rgba(255,0,127,0.1)] flex items-center justify-center flex-shrink-0">
                  <Music size={16} className="text-[#FF007F]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{s.song_title}</p>
                  <p className="text-xs text-[#a1a1aa]">{s.artist}</p>
                </div>
                <span className="text-[10px] text-[#71717a] font-mono flex-shrink-0 hidden sm:inline">
                  {s.played_at ? new Date(s.played_at).toLocaleTimeString() : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
