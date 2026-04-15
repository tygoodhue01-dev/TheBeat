import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getRecentlyPlayedApi, getMyFavoritesApi, toggleSongFavoriteApi } from '../services/api';
import { Clock, Music, Heart } from 'lucide-react';
import WebNavBar from '../components/Navbar';
import Footer from '../components/Footer';
import { formatTimeCentral } from '../utils/time';

function createSongFavoriteId(songTitle, artist) {
  const raw = `${songTitle || ''}::${artist || ''}`.trim().toLowerCase();
  return raw.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'song';
}

export default function RecentlyPlayed() {
  const { user } = useAuth();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favoriteSongIds, setFavoriteSongIds] = useState(new Set());
  const [updatingFavoriteId, setUpdatingFavoriteId] = useState('');

  useEffect(() => { getRecentlyPlayedApi(50).then(d => { setSongs(d); setLoading(false); }); }, []);
  useEffect(() => {
    if (!user) {
      setFavoriteSongIds(new Set());
      return;
    }
    getMyFavoritesApi().then((items) => {
      setFavoriteSongIds(new Set(
        items
          .filter((i) => i.type === 'song')
          .flatMap((i) => {
            const stableId = createSongFavoriteId(i.song_title, i.artist);
            return [i.song_id, stableId].filter(Boolean);
          })
      ));
    }).catch(() => setFavoriteSongIds(new Set()));
  }, [user]);

  const toggleFavorite = async (song) => {
    if (!user || updatingFavoriteId) return;
    const songId = createSongFavoriteId(song?.song_title, song?.artist);
    if (!songId) return;
    setUpdatingFavoriteId(songId);
    const currentlyFav = favoriteSongIds.has(songId);
    const next = new Set(favoriteSongIds);
    if (currentlyFav) next.delete(songId); else next.add(songId);
    setFavoriteSongIds(next);
    try {
      const res = await toggleSongFavoriteApi(songId, song.song_title || '', song.artist || '');
      setFavoriteSongIds((prev) => {
        const merged = new Set(prev);
        if (res.favorited) merged.add(songId); else merged.delete(songId);
        return merged;
      });
    } catch (_) {
      setFavoriteSongIds(favoriteSongIds);
    } finally {
      setUpdatingFavoriteId('');
    }
  };

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
            {songs.map((s, i) => {
              const stableSongId = createSongFavoriteId(s.song_title, s.artist);
              const isFavorite = favoriteSongIds.has(stableSongId);
              return (
              <div key={stableSongId || i} className="bg-[#18181b] rounded-lg px-4 sm:px-5 py-3 flex items-center gap-3 sm:gap-4 border border-[rgba(255,255,255,0.1)] hover:bg-[#27272a] transition-colors" data-testid={`song-item-${i}`}>
                <div className="w-10 h-10 rounded-lg bg-[rgba(255,0,127,0.1)] flex items-center justify-center flex-shrink-0">
                  <Music size={16} className="text-[#FF007F]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{s.song_title}</p>
                  <p className="text-xs text-[#a1a1aa]">{s.artist}</p>
                </div>
                <span className="text-[10px] text-[#71717a] font-mono flex-shrink-0 hidden sm:inline">
                  {s.played_at ? formatTimeCentral(s.played_at) : ''}
                </span>
                {user ? (
                  <button
                    type="button"
                    onClick={() => toggleFavorite(s)}
                    disabled={updatingFavoriteId === stableSongId}
                    className="w-8 h-8 rounded-full bg-white/5 border border-[rgba(255,255,255,0.1)] flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-50"
                    data-testid={`favorite-toggle-${stableSongId}`}
                    aria-label="Toggle favorite"
                  >
                    <Heart
                      size={15}
                      className={isFavorite ? 'text-[#FF007F] fill-[#FF007F]' : 'text-[#71717a]'}
                    />
                  </button>
                ) : null}
              </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
