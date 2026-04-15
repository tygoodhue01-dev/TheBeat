import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { updateProfileApi, uploadAvatarApi, getMyPointsApi, getMyFavoritesApi, getMyStatsApi, mediaUrl } from '../services/api';
import { X, Edit3, Save, LogOut, Music, Gift, Calendar, Shield, Star, Mic2, Headphones, Camera } from 'lucide-react';

export default function ProfileDrawer({ open, onClose }) {
  const { user, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [stats, setStats] = useState({});
  const [points, setPoints] = useState({ points: 0 });
  const [favorites, setFavorites] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showAllFavorites, setShowAllFavorites] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (open && user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setEditing(false);
      setShowAllFavorites(false);
      Promise.all([
        getMyStatsApi().catch(() => ({})),
        getMyPointsApi().catch(() => ({ points: 0 })),
        getMyFavoritesApi().catch(() => [])
      ]).then(([s, p, f]) => { setStats(s); setPoints(p); setFavorites(f); });
    }
  }, [open, user]);

  if (!open || !user) return null;

  const userRoles = Array.isArray(user?.roles) && user.roles.length ? user.roles : [user?.role || 'listener'];

  const getRoleBadge = (role) => {
    const badges = {
      admin: { label: 'ADMIN', color: '#FFF000', icon: Shield },
      dj: { label: 'DJ', color: '#FF007F', icon: Mic2 },
      editor: { label: 'EDITOR', color: '#00F0FF', icon: Edit3 },
      listener: { label: 'LISTENER', color: '#71717a', icon: Headphones }
    };
    return badges[role] || badges.listener;
  };

  const badge = getRoleBadge(userRoles[0]);
  const BadgeIcon = badge.icon;

  const handleSave = async () => {
    try {
      await updateProfileApi({ name, bio });
      await refresh();
      setEditing(false);
    } catch (e) { alert(e.message); }
  };

  const onPickAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      await uploadAvatarApi(file);
      await refresh();
    } catch (err) {
      alert(err.message || 'Upload failed');
    }
    setUploading(false);
  };

  const avatarSrc = user.avatar_url ? mediaUrl(user.avatar_url) : null;
  const visibleFavorites = showAllFavorites ? favorites : favorites.slice(0, 2);

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/');
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[200] bg-black/60" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="fixed top-0 right-0 z-[201] w-full max-w-[400px] h-full bg-[#0d0d0f] border-l border-[rgba(255,255,255,0.1)] overflow-y-auto animate-slide-in-right"
        data-testid="profile-drawer">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.08)]">
          <span className="text-sm font-bold text-[#a1a1aa] tracking-[2px]">PROFILE</span>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors" data-testid="profile-drawer-close">
            <X size={16} className="text-[#a1a1aa]" />
          </button>
        </div>

        <div className="p-6">
          {/* Avatar + Info */}
          <div className="flex items-center gap-4 mb-5">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-full bg-[#27272a] flex items-center justify-center border-[3px] overflow-hidden" style={{ borderColor: badge.color }}>
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-black text-white">{user.name?.charAt(0)?.toUpperCase()}</span>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onPickAvatar} data-testid="profile-avatar-input" />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#FF007F] flex items-center justify-center border-2 border-[#0d0d0f] hover:opacity-90 disabled:opacity-50"
                title="Upload profile photo"
                data-testid="profile-avatar-upload-btn"
              >
                <Camera size={12} className="text-white" />
              </button>
            </div>
            <div className="flex-1">
              {editing ? (
                <input value={name} onChange={e => setName(e.target.value)} data-testid="profile-name-input"
                  className="text-lg font-extrabold text-white bg-transparent border-b-2 border-[#FF007F] py-1 w-full focus:outline-none" />
              ) : (
                <h2 className="text-lg font-extrabold text-white">{user.name}</h2>
              )}
              <p className="text-sm text-[#71717a] mt-0.5">{user.email}</p>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border mt-1.5" style={{ borderColor: badge.color + '40' }}>
                <BadgeIcon size={10} style={{ color: badge.color }} />
                <span className="text-[10px] font-extrabold tracking-[1px]" style={{ color: badge.color }}>{badge.label}</span>
              </div>
              {userRoles.length > 1 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {userRoles.slice(1).map((r) => {
                    const rb = getRoleBadge(r);
                    return (
                      <span key={r} className="text-[9px] font-extrabold tracking-[1px] px-2 py-0.5 rounded-full border" style={{ borderColor: `${rb.color}40`, color: rb.color }}>
                        {rb.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            {!editing && (
              <button onClick={() => setEditing(true)} className="w-9 h-9 rounded-full bg-[rgba(255,0,127,0.15)] flex items-center justify-center" data-testid="profile-edit-btn">
                <Edit3 size={14} className="text-[#FF007F]" />
              </button>
            )}
          </div>

          {/* Bio edit */}
          {editing && (
            <div className="mb-5">
              <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Write a bio..." rows={3} data-testid="profile-bio-input"
                className="w-full bg-[#18181b] border border-[rgba(255,255,255,0.1)] rounded-lg p-3 text-sm text-white resize-none focus:border-[#FF007F] focus:outline-none" />
              <div className="flex gap-2 mt-2 justify-end">
                <button onClick={() => { setEditing(false); setName(user.name || ''); setBio(user.bio || ''); }}
                  className="px-4 py-2 rounded-full bg-[#27272a] text-xs font-semibold text-[#a1a1aa]">Cancel</button>
                <button onClick={handleSave} data-testid="profile-save-btn"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FF007F] text-xs font-bold text-white">
                  <Save size={12} /> Save
                </button>
              </div>
            </div>
          )}

          {!editing && user.bio && (
            <p className="text-sm text-[#a1a1aa] leading-relaxed mb-5">{user.bio}</p>
          )}

          {/* Stats Row */}
          <div className="flex items-center justify-between bg-[#18181b] rounded-lg p-3 mb-5 border border-[rgba(255,255,255,0.08)]">
            {[
              { val: favorites.length || stats.favorites || 0, label: 'Favorites' },
              { val: stats.requests_made || 0, label: 'Requests' },
              { val: stats.songs_rated || 0, label: 'Rated' },
              { val: points.points || 0, label: 'Points' },
            ].map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <div className="w-px h-8 bg-[rgba(255,255,255,0.08)]" />}
                <div className="flex-1 text-center">
                  <p className="text-base font-extrabold text-white">{s.val}</p>
                  <p className="text-[9px] text-[#71717a] uppercase tracking-wider">{s.label}</p>
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Favorites */}
          {favorites.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#a1a1aa] tracking-[2px]">MY FAVORITES</span>
                <span className="text-[10px] font-bold text-[#71717a]">{favorites.length}</span>
              </div>
              {visibleFavorites.map((f, i) => (
                <div key={i} className="flex items-center bg-[#18181b] rounded-lg p-3 mb-1.5 border border-[rgba(255,255,255,0.05)]">
                  <div className="w-6 h-6 rounded-full bg-[rgba(255,0,127,0.15)] flex items-center justify-center mr-2.5">
                    <span className="text-[9px] font-extrabold text-[#FF007F]">{i + 1}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{f.song_title}</p>
                    <p className="text-[10px] text-[#71717a]">{f.artist}</p>
                  </div>
                </div>
              ))}
              {favorites.length > 2 && (
                <button
                  type="button"
                  onClick={() => setShowAllFavorites((v) => !v)}
                  className="mt-1 text-[11px] font-bold text-[#00F0FF] hover:underline"
                  data-testid="profile-favorites-toggle"
                >
                  {showAllFavorites ? 'Show less' : `View more (${favorites.length - 2})`}
                </button>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="mb-5">
            <span className="text-[10px] font-extrabold text-[#a1a1aa] tracking-[2px] mb-2 block">QUICK ACTIONS</span>

            {userRoles.some((r) => ['admin', 'dj', 'editor'].includes(r)) && (
              <Link to="/admin" onClick={onClose} className="flex items-center bg-[#18181b] rounded-lg p-3 mb-1.5 border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,0,127,0.2)] transition-colors">
                <div className="w-9 h-9 rounded-lg bg-[rgba(255,0,127,0.1)] flex items-center justify-center mr-3"><Shield size={15} className="text-[#FF007F]" /></div>
                <div><p className="text-sm font-semibold text-white">Dashboard</p><p className="text-[10px] text-[#71717a]">Manage station content</p></div>
              </Link>
            )}

            {[
              { to: '/requests', icon: Music, color: '#00F0FF', title: 'Request a Song', sub: 'Get your favorites on air' },
              { to: '/rewards', icon: Gift, color: '#FFF000', title: 'Rewards', sub: 'Redeem points for prizes' },
              { to: '/schedule', icon: Calendar, color: '#FF007F', title: 'Show Schedule', sub: "See what's coming up" },
            ].map(a => (
              <Link key={a.to} to={a.to} onClick={onClose} className="flex items-center bg-[#18181b] rounded-lg p-3 mb-1.5 border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.15)] transition-colors">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mr-3" style={{ backgroundColor: a.color + '15' }}>
                  <a.icon size={15} style={{ color: a.color }} />
                </div>
                <div><p className="text-sm font-semibold text-white">{a.title}</p><p className="text-[10px] text-[#71717a]">{a.sub}</p></div>
              </Link>
            ))}
          </div>

          {/* Sign Out */}
          <button onClick={handleLogout} data-testid="profile-logout-btn"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg border border-[rgba(239,68,68,0.3)] text-red-400 font-semibold text-sm hover:bg-red-500/10 transition-colors">
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right { animation: slide-in-right 0.25s ease-out; }
      `}</style>
    </>
  );
}
