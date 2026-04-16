import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  getAdminStatsApi, getAdminUsersApi, getAdminRequestsApi, updateUserApi, deleteUserApi,
  updateRequestStatusApi, deleteRequestApi, createNewsApi, getNewsApi, updateNewsApi, deleteNewsApi,
  updateNowPlayingApi, getPendingCommentsApi, approveCommentApi, deleteCommentApi,
  getScheduleApi, createScheduleSlotApi, updateScheduleSlotApi, deleteScheduleSlotApi,
  getShowsApi, createShowApi, updateShowApi, deleteShowApi,
  getPodcastsApi, createPodcastApi, updatePodcastApi, deletePodcastApi,
  getEventsApi, createEventApi, updateEventApi, deleteEventApi,
  getContestsApi, createContestApi, updateContestApi, deleteContestApi,
  getJobApplicationsApi, updateJobApplicationStatusApi, deleteJobApplicationApi, sendEmailToApplicantApi,
  getRolesApi, getPermissionsApi, createRoleApi, updateRoleApi, deleteRoleApi,
  getPushTokensApi, sendPushNotificationApi, getPushHistoryApi,
  getStreamConfigApi, updateStreamConfigApi, getFavoriteStatsApi,
  getAnalyticsOverviewApi, getUserAnalyticsApi, getTopRatedSongsApi, getMostPlayedSongsApi, getTrendingSongsApi, createAdminUserApi
} from '../services/api';
import WebNavBar from '../components/Navbar';
import {
  LayoutGrid, Radio, Music, Users, FileText, Newspaper, MessageSquare, Calendar,
  Briefcase, Shield, Bell, Gift, Check, X, Trash2, Plus, Edit3, Save, Send, Mail,
  Mic, BarChart3, Heart, TrendingUp, Activity
} from 'lucide-react';
import { formatDateCentral, formatDateTimeCentral } from '../utils/time';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const CATS = ['general','music','events','local','contests'];
const ROLE_OPTIONS = ['listener', 'editor', 'dj', 'admin'];

function getUserRoles(user) {
  if (!user) return [];
  if (Array.isArray(user.roles) && user.roles.length) return user.roles;
  if (user.role) return [user.role];
  return [];
}

function hasAnyRole(user, roles) {
  const assigned = getUserRoles(user);
  return roles.some((r) => assigned.includes(r));
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [allNews, setAllNews] = useState([]);
  const [events, setEvents] = useState([]);
  const [contests, setContests] = useState([]);
  const [shows, setShows] = useState([]);
  const [podcasts, setPodcasts] = useState([]);
  const [pendingComments, setPendingComments] = useState([]);
  const [scheduleSlots, setScheduleSlots] = useState([]);
  const [jobApps, setJobApps] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [pushTokens, setPushTokens] = useState({ total: 0 });
  const [pushHistory, setPushHistory] = useState([]);
  const [favoriteStats, setFavoriteStats] = useState({ top_songs: [], total_favorites: 0, unique_users: 0, favorites_last_24h: 0 });
  const [analyticsOverview, setAnalyticsOverview] = useState({});
  const [userAnalytics, setUserAnalytics] = useState({ daily_signups: {} });
  const [topRatedSongs, setTopRatedSongs] = useState([]);
  const [mostPlayedSongs, setMostPlayedSongs] = useState([]);
  const [trendingSongs, setTrendingSongs] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Forms
  const [newsForm, setNewsForm] = useState({ title: '', content: '', category: 'general', summary: '', image_url: '' });
  const [npSong, setNpSong] = useState('');
  const [npArtist, setNpArtist] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [streamStation, setStreamStation] = useState('');
  const [streamTagline, setStreamTagline] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');

  // Modals
  const [editUser, setEditUser] = useState(null);
  const [editNews, setEditNews] = useState(null);
  const [editSchedule, setEditSchedule] = useState(null);
  const [editEvent, setEditEvent] = useState(null);
  const [editContest, setEditContest] = useState(null);
  const [editShow, setEditShow] = useState(null);
  const [editPodcast, setEditPodcast] = useState(null);
  const [emailApp, setEmailApp] = useState(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [newRole, setNewRole] = useState(null);
  const [editRole, setEditRole] = useState(null);
  const [createUserModal, setCreateUserModal] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [st, us, rq, nw, ev, ct, sh, pd, sc, ja, cm, rl, pm] = await Promise.all([
        getAdminStatsApi(), getAdminUsersApi(), getAdminRequestsApi(), getNewsApi(),
        getEventsApi(),
        getContestsApi(true),
        getShowsApi(),
        getPodcastsApi(),
        getScheduleApi(), getJobApplicationsApi(), getPendingCommentsApi(),
        getRolesApi().catch(() => []), getPermissionsApi().catch(() => [])
      ]);
      setStats(st); setUsers(us); setRequests(rq); setAllNews(nw);
      setEvents(ev);
      setContests(ct);
      setShows(sh);
      setPodcasts(pd);
      setScheduleSlots(sc); setJobApps(ja); setPendingComments(cm);
      setRoles(rl); setPermissions(pm);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !hasAnyRole(user, ['admin', 'dj', 'editor'])) { navigate('/'); return; }
    loadData();
  }, [user, authLoading, navigate, loadData]);

  useEffect(() => {
    if (tab === 'push') {
      Promise.all([getPushTokensApi(), getPushHistoryApi()]).then(([t, h]) => { setPushTokens(t); setPushHistory(h); });
    }
    if (tab === 'nowplaying') {
      getStreamConfigApi().then(c => {
        setStreamUrl(c.stream_url || '');
        setStreamStation(c.station_name || '');
        setStreamTagline(c.tagline || '');
        setMaintenanceMode(!!c.maintenance_mode);
        setMaintenanceMessage(c.maintenance_message || '');
      });
    }
    if (tab === 'analytics') {
      setAnalyticsLoading(true);
      Promise.all([
        getFavoriteStatsApi().catch(() => ({ top_songs: [], total_favorites: 0, unique_users: 0, favorites_last_24h: 0 })),
        getAnalyticsOverviewApi().catch(() => ({})),
        getUserAnalyticsApi().catch(() => ({ daily_signups: {} })),
        getTopRatedSongsApi(8).catch(() => []),
        getMostPlayedSongsApi(8).catch(() => []),
        getTrendingSongsApi(8).catch(() => [])
      ]).then(([fav, overview, usersData, rated, played, trending]) => {
        setFavoriteStats(fav);
        setAnalyticsOverview(overview);
        setUserAnalytics(usersData);
        setTopRatedSongs(rated);
        setMostPlayedSongs(played);
        setTrendingSongs(trending);
      }).finally(() => setAnalyticsLoading(false));
    }
  }, [tab]);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const sidebarGroups = [
    { label: null, items: [
      { key: 'overview', label: 'Overview', icon: LayoutGrid, roles: ['admin','dj','editor'] },
      { key: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['admin','dj'] },
    ]},
    { label: 'Broadcast', items: [
      { key: 'nowplaying', label: 'Stream settings', icon: Radio, roles: ['admin','dj'] },
      { key: 'requests', label: 'Requests', icon: Music, roles: ['admin','dj'], showPendingBadge: true },
    ]},
    { label: 'Content', items: [
      { key: 'content', label: 'Publish news', icon: FileText, roles: ['admin','editor'] },
      { key: 'manage-news', label: 'Manage news', icon: Newspaper, roles: ['admin','editor'] },
      { key: 'events', label: 'Upcoming events', icon: Calendar, roles: ['admin'] },
      { key: 'contests', label: 'Contests & giveaways', icon: Gift, roles: ['admin'] },
      { key: 'podcasts-shows', label: 'Podcasts & shows', icon: Mic, roles: ['admin','dj'] },
      { key: 'comments', label: 'Comments', icon: MessageSquare, roles: ['admin','editor'] },
    ]},
    { label: 'Station', items: [
      { key: 'schedule', label: 'Schedule', icon: Calendar, roles: ['admin'] },
      { key: 'jobs', label: 'Job applications', icon: Briefcase, roles: ['admin'] },
    ]},
    { label: 'Administration', items: [
      { key: 'users', label: 'Users', icon: Users, roles: ['admin'] },
      { key: 'roles', label: 'Roles & permissions', icon: Shield, roles: ['admin'] },
      { key: 'push', label: 'Push notifications', icon: Bell, roles: ['admin'] },
    ]},
  ]
    .map(g => ({ ...g, items: g.items.filter(i => hasAnyRole(user, i.roles)) }))
    .filter(g => g.items.length > 0);

  if (authLoading || loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-[#71717a]">Loading...</div>;
  if (!user || !hasAnyRole(user, ['admin', 'dj', 'editor'])) return null;

  // ===== Modal overlay helper =====
  const Modal = ({ show, onClose, title, children }) => {
    if (!show) return null;
    return (
      <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-[#18181b] rounded-xl p-6 w-full max-w-[500px] border border-[rgba(255,255,255,0.1)]" onClick={e => e.stopPropagation()}>
          <h3 className="text-xl font-black text-[#FF007F] tracking-[2px] mb-5">{title}</h3>
          {children}
        </div>
      </div>
    );
  };

  const Label = ({ children }) => <label className="text-[11px] font-bold text-[#00F0FF] tracking-[2px] mb-1.5 mt-4 block">{children}</label>;
  const Input = (props) => <input {...props} className={`w-full bg-[#09090b] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 text-sm text-white focus:border-[#FF007F] focus:outline-none ${props.className||''}`} />;
  const Textarea = (props) => <textarea {...props} className={`w-full bg-[#09090b] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 text-sm text-white focus:border-[#FF007F] focus:outline-none resize-none ${props.className||''}`} />;
  const Btn = ({ children, onClick, pink, className = '' }) => (
    <button onClick={onClick} className={`flex items-center justify-center gap-2 rounded-full py-3 px-6 text-[13px] font-extrabold tracking-[1px] transition-opacity hover:opacity-90 ${pink ? 'bg-[#FF007F] text-white' : 'bg-[#27272a] text-[#a1a1aa]'} ${className}`}>{children}</button>
  );

  // ===== PANELS =====
  const renderOverview = () => (
    <div>
      <h2 className="text-2xl font-extrabold text-white tracking-[1px]">Station Overview</h2>
      <div className="flex flex-wrap gap-3 mt-6" data-testid="admin-stats">
        {[
          { label: 'Total Users', val: stats.total_users, color: '#FF007F' },
          { label: 'News Articles', val: stats.total_news, color: '#00F0FF' },
          { label: 'Total Requests', val: stats.total_requests, color: '#FFF000' },
          { label: 'Pending', val: stats.pending_requests, color: '#f97316' },
          { label: 'Shows', val: stats.total_shows, color: '#22c55e' },
        ].map(s => (
          <div key={s.label} className="bg-[#18181b] rounded-lg p-5 border border-[rgba(255,255,255,0.1)] min-w-[170px] flex-1" data-testid={`stat-${s.label.toLowerCase().replace(/\s/g,'-')}`}>
            <p className="text-3xl font-black text-white">{s.val ?? '...'}</p>
            <p className="text-xs text-[#71717a] mt-1 font-medium">{s.label}</p>
          </div>
        ))}
      </div>
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 bg-[rgba(255,240,0,0.08)] border border-[rgba(255,240,0,0.2)] rounded-xl p-4 mt-4 cursor-pointer" onClick={() => setTab('requests')}>
          <Music size={18} className="text-[#FFF000]" />
          <span className="text-sm font-semibold text-[#FFF000]">{pendingCount} request{pendingCount > 1 ? 's' : ''} awaiting approval</span>
        </div>
      )}
    </div>
  );

  const renderNowPlaying = () => (
    <div>
      <h2 className="text-2xl font-extrabold text-white tracking-[1px]">Stream settings</h2>
      <p className="text-sm text-[#a1a1aa] mt-1 mb-6">Configure your radio stream source for automatic metadata updates.</p>

      <div className="bg-[#18181b] rounded-xl p-6 border border-[rgba(255,255,255,0.1)] mb-6">
        <h3 className="text-lg font-bold text-white mb-1">Stream configuration</h3>
        <p className="text-xs text-[#71717a] mb-4">Enter your Live365, Shoutcast, Icecast, or other streaming URL. The system will automatically fetch now playing metadata from this stream.</p>
        <Label>STREAM URL</Label>
        <Input value={streamUrl} onChange={e => setStreamUrl(e.target.value)} placeholder="https://..." data-testid="stream-url-input" />
        <Label>STATION NAME</Label>
        <Input value={streamStation} onChange={e => setStreamStation(e.target.value)} placeholder="The Beat 515" />
        <Label>TAGLINE</Label>
        <Input value={streamTagline} onChange={e => setStreamTagline(e.target.value)} placeholder="Proud. Loud. Local." />
        <Btn pink className="w-full mt-6" onClick={async () => {
          try {
            const data = {
              maintenance_mode: maintenanceMode,
              maintenance_message: maintenanceMessage.trim(),
            };
            if (streamUrl) data.stream_url = streamUrl;
            if (streamStation) data.station_name = streamStation;
            if (streamTagline) data.tagline = streamTagline;
            await updateStreamConfigApi(data);
            alert('Stream config saved! The player and metadata polling will now use this URL.');
          } catch (e) { alert(e.message); }
        }} data-testid="save-stream-config-btn"><Save size={16} /> SAVE STREAM CONFIG</Btn>
      </div>

      <div className="bg-[#18181b] rounded-xl p-6 border border-[rgba(255,255,255,0.1)] mb-6" data-testid="admin-maintenance-panel">
        <h3 className="text-lg font-bold text-white mb-1">Public site &amp; maintenance</h3>
        <p className="text-xs text-[#71717a] mb-4">
          When maintenance is on, visitors see a maintenance page with the live player and last five songs. Staff can still open <span className="text-[#a1a1aa]">/login</span> and the Admin Panel at <span className="text-[#a1a1aa]">/admin</span>.
        </p>
        <Label>SITE STATUS</Label>
        <div className="flex flex-wrap gap-2 mt-2 mb-4">
          <button
            type="button"
            data-testid="maintenance-off-btn"
            onClick={async () => {
              try {
                await updateStreamConfigApi({ maintenance_mode: false, maintenance_message: maintenanceMessage.trim() });
                setMaintenanceMode(false);
              } catch (e) { alert(e.message); }
            }}
            className={`px-4 py-2 rounded-full text-[11px] font-extrabold tracking-[1px] border transition-colors ${!maintenanceMode ? 'bg-[#00F0FF] border-[#00F0FF] text-[#09090b]' : 'bg-[#09090b] border-[rgba(255,255,255,0.1)] text-[#71717a] hover:text-white'}`}
          >
            LIVE SITE
          </button>
          <button
            type="button"
            data-testid="maintenance-on-btn"
            onClick={async () => {
              try {
                await updateStreamConfigApi({ maintenance_mode: true, maintenance_message: maintenanceMessage.trim() });
                setMaintenanceMode(true);
              } catch (e) { alert(e.message); }
            }}
            className={`px-4 py-2 rounded-full text-[11px] font-extrabold tracking-[1px] border transition-colors ${maintenanceMode ? 'bg-[#FF007F] border-[#FF007F] text-white' : 'bg-[#09090b] border-[rgba(255,255,255,0.1)] text-[#71717a] hover:text-white'}`}
          >
            MAINTENANCE PAGE
          </button>
        </div>
        <Label>MAINTENANCE MESSAGE</Label>
        <Textarea
          rows={4}
          value={maintenanceMessage}
          onChange={e => setMaintenanceMessage(e.target.value)}
          placeholder="Short note shown to listeners (e.g. we're upgrading our website)..."
          data-testid="maintenance-message-input"
        />
        <Btn
          className="w-full mt-3"
          onClick={async () => {
            try {
              await updateStreamConfigApi({ maintenance_mode: maintenanceMode, maintenance_message: maintenanceMessage.trim() });
              alert('Maintenance message saved.');
            } catch (e) { alert(e.message); }
          }}
          data-testid="save-maintenance-message-btn"
        >
          <Save size={16} /> SAVE MESSAGE ONLY
        </Btn>
      </div>

      <div className="bg-[rgba(0,240,255,0.05)] rounded-xl p-5 border border-[rgba(0,240,255,0.15)]">
        <h4 className="text-sm font-bold text-[#00F0FF] mb-1">Automatic updates</h4>
        <p className="text-xs text-[#a1a1aa] leading-relaxed">The now playing information is automatically pulled from your stream every 2 minutes. Song title, artist, and album art will update automatically when detected.</p>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div data-testid="admin-analytics">
      <h2 className="text-2xl font-extrabold text-white tracking-[1px]">Analytics</h2>
      <p className="text-sm text-[#a1a1aa] mt-1 mb-6">Audience growth, engagement, and song trends.</p>
      {analyticsLoading ? (
        <div className="text-[#71717a] py-8">Loading analytics...</div>
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-[#18181b] rounded-lg p-5 border border-[rgba(255,255,255,0.1)]">
          <p className="text-3xl font-black text-white">{analyticsOverview.total_users || 0}</p>
          <p className="text-xs text-[#71717a] mt-1 font-medium">Total Users</p>
        </div>
        <div className="bg-[#18181b] rounded-lg p-5 border border-[rgba(255,255,255,0.1)]">
          <p className="text-3xl font-black text-white">{analyticsOverview.new_users_7d || 0}</p>
          <p className="text-xs text-[#71717a] mt-1 font-medium">New Users (7d)</p>
        </div>
        <div className="bg-[#18181b] rounded-lg p-5 border border-[rgba(255,255,255,0.1)]">
          <p className="text-3xl font-black text-white">{analyticsOverview.total_requests || 0}</p>
          <p className="text-xs text-[#71717a] mt-1 font-medium">Total Requests</p>
        </div>
        <div className="bg-[#18181b] rounded-lg p-5 border border-[rgba(255,255,255,0.1)]">
          <p className="text-3xl font-black text-white">{analyticsOverview.songs_played_today || 0}</p>
          <p className="text-xs text-[#71717a] mt-1 font-medium">Songs Played Today</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-[#18181b] rounded-lg p-5 border border-[rgba(255,255,255,0.1)]">
          <p className="text-3xl font-black text-white">{favoriteStats.total_favorites || 0}</p>
          <p className="text-xs text-[#71717a] mt-1 font-medium">Total Favorites</p>
        </div>
        <div className="bg-[#18181b] rounded-lg p-5 border border-[rgba(255,255,255,0.1)]">
          <p className="text-3xl font-black text-white">{favoriteStats.unique_users || 0}</p>
          <p className="text-xs text-[#71717a] mt-1 font-medium">Users Favoriting</p>
        </div>
        <div className="bg-[#18181b] rounded-lg p-5 border border-[rgba(255,255,255,0.1)]">
          <p className="text-3xl font-black text-white">{favoriteStats.favorites_last_24h || 0}</p>
          <p className="text-xs text-[#71717a] mt-1 font-medium">Last 24 Hours</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-[#18181b] rounded-xl border border-[rgba(255,255,255,0.1)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)]">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Users size={14} className="text-[#00F0FF]" /> Signups (Last 7 Days)</h3>
          </div>
          <div className="p-4 space-y-2">
            {Object.keys(userAnalytics.daily_signups || {}).sort().slice(-7).map((date) => (
              <div key={date} className="flex items-center justify-between text-xs">
                <span className="text-[#a1a1aa]">{date}</span>
                <span className="text-white font-bold">{userAnalytics.daily_signups[date]}</span>
              </div>
            ))}
            {Object.keys(userAnalytics.daily_signups || {}).length === 0 ? (
              <p className="text-[#71717a] text-xs">No signup trend data yet.</p>
            ) : null}
          </div>
        </div>
        <div className="bg-[#18181b] rounded-xl border border-[rgba(255,255,255,0.1)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)]">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Activity size={14} className="text-[#FFF000]" /> Top Favorites Snapshot</h3>
          </div>
          <div className="p-4 space-y-2">
            {(analyticsOverview.top_favorites || []).slice(0, 6).map((item, i) => (
              <div key={`${item.song}-${i}`} className="flex items-center justify-between text-xs gap-2">
                <span className="text-[#a1a1aa] truncate">{item.song}</span>
                <span className="text-[#FFF000] font-bold">{item.count}</span>
              </div>
            ))}
            {(analyticsOverview.top_favorites || []).length === 0 ? (
              <p className="text-[#71717a] text-xs">No top favorite songs yet.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="bg-[#18181b] rounded-xl border border-[rgba(255,255,255,0.1)] overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)]">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><Heart size={14} className="text-[#FF007F]" /> Top Favorited Songs</h3>
        </div>
        {(favoriteStats.top_songs || []).length === 0 ? (
          <p className="text-center text-[#71717a] py-8">No favorite-song data yet.</p>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {favoriteStats.top_songs.map((item, idx) => (
              <div key={`${item.song_title}-${idx}`} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-white font-semibold truncate">{item.song_title}</p>
                  <p className="text-xs text-[#a1a1aa] truncate">{item.artist || 'Unknown artist'}</p>
                </div>
                <span className="text-xs font-extrabold tracking-[1px] text-[#FF007F] bg-[rgba(255,0,127,0.1)] px-2 py-1 rounded-full">{item.favorite_count} FAVORITES</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[#18181b] rounded-xl border border-[rgba(255,255,255,0.1)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)]">
            <h3 className="text-sm font-bold text-white">Top Rated Songs</h3>
          </div>
          <div className="p-3 space-y-2">
            {topRatedSongs.slice(0, 6).map((song, i) => (
              <div key={`${song.song_id}-${i}`} className="text-xs">
                <p className="text-white truncate">{song.song_title}</p>
                <p className="text-[#71717a]">Rating {song.average_rating} ({song.rating_count})</p>
              </div>
            ))}
            {topRatedSongs.length === 0 ? <p className="text-[#71717a] text-xs">No ratings data.</p> : null}
          </div>
        </div>
        <div className="bg-[#18181b] rounded-xl border border-[rgba(255,255,255,0.1)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)]">
            <h3 className="text-sm font-bold text-white">Most Played</h3>
          </div>
          <div className="p-3 space-y-2">
            {mostPlayedSongs.slice(0, 6).map((song, i) => (
              <div key={`${song.song_title}-${song.artist}-${i}`} className="text-xs">
                <p className="text-white truncate">{song.song_title}</p>
                <p className="text-[#71717a]">{song.play_count} plays</p>
              </div>
            ))}
            {mostPlayedSongs.length === 0 ? <p className="text-[#71717a] text-xs">No play count data.</p> : null}
          </div>
        </div>
        <div className="bg-[#18181b] rounded-xl border border-[rgba(255,255,255,0.1)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)]">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><TrendingUp size={13} className="text-[#00F0FF]" /> Trending</h3>
          </div>
          <div className="p-3 space-y-2">
            {trendingSongs.slice(0, 6).map((song, i) => (
              <div key={`${song.song_title}-${song.artist}-${i}`} className="text-xs">
                <p className="text-white truncate">{song.song_title}</p>
                <p className="text-[#71717a]">{song.play_count} this week</p>
              </div>
            ))}
            {trendingSongs.length === 0 ? <p className="text-[#71717a] text-xs">No trending data.</p> : null}
          </div>
        </div>
      </div>
    </div>
  );

  const renderRequests = () => (
    <div data-testid="admin-requests">
      <h2 className="text-2xl font-extrabold text-white tracking-[1px]">Song requests</h2>
      <p className="text-sm text-[#a1a1aa] mt-1 mb-6">Manage pending and completed requests.</p>
      <div className="bg-[#18181b] rounded-xl border border-[rgba(255,255,255,0.1)] overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-white/[0.03] border-b border-[rgba(255,255,255,0.05)]">
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Song</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Artist</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">By</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Status</th>
            <th className="text-right px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Actions</th>
          </tr></thead>
          <tbody>
            {requests.map(r => (
              <tr key={r.request_id} className="border-b border-white/[0.04]" data-testid={`admin-request-${r.request_id}`}>
                <td className="px-4 py-3 text-white font-medium">{r.song_title}</td>
                <td className="px-4 py-3 text-[#a1a1aa]">{r.artist || '—'}</td>
                <td className="px-4 py-3 text-[#a1a1aa]">{r.user_name}</td>
                <td className="px-4 py-3"><span className={`text-[10px] font-extrabold tracking-[1px] px-2 py-0.5 rounded-full ${r.status==='pending'?'bg-[rgba(255,240,0,0.12)] text-[#FFF000]':'bg-[rgba(0,240,255,0.12)] text-[#00F0FF]'}`}>{r.status==='pending'?'PENDING':'PLAYED'}</span></td>
                <td className="px-4 py-3 text-right flex gap-1 justify-end">
                  {r.status === 'pending' && (
                    <button onClick={async () => { await updateRequestStatusApi(r.request_id, 'approved'); loadData(); }} className="text-xs font-semibold text-[#00F0FF] hover:underline" data-testid={`approve-req-${r.request_id}`}>Played</button>
                  )}
                  <button onClick={() => { if (window.confirm(`Delete "${r.song_title}"?`)) { deleteRequestApi(r.request_id).then(loadData); }}} className="text-xs font-semibold text-red-400 hover:underline ml-2" data-testid={`delete-req-${r.request_id}`}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {requests.length === 0 && <p className="text-center text-[#71717a] py-8">No requests</p>}
      </div>
    </div>
  );

  const renderUsers = () => (
    <div data-testid="admin-users">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-[1px]">User management</h2>
          <p className="text-sm text-[#a1a1aa] mt-1">Edit user details, manage roles, or remove accounts.</p>
        </div>
        <Btn pink onClick={() => setCreateUserModal({ name: '', email: '', password: '', role: 'listener', roles: ['listener'] })}>
          <Plus size={16} /> NEW USER
        </Btn>
      </div>
      <div className="bg-[#18181b] rounded-xl border border-[rgba(255,255,255,0.1)] overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-white/[0.03] border-b border-[rgba(255,255,255,0.05)]">
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Name</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Email</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Role</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Joined</th>
            <th className="text-right px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Actions</th>
          </tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.user_id} className="border-b border-white/[0.04]" data-testid={`user-row-${u.user_id}`}>
                <td className="px-4 py-3 text-white font-medium">{u.name}</td>
                <td className="px-4 py-3 text-[#a1a1aa]">{u.email}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {getUserRoles(u).map((roleName) => (
                      <span key={`${u.user_id}-${roleName}`} className={`text-[10px] font-extrabold tracking-[1px] px-2.5 py-1 rounded-full border ${roleName==='admin'?'border-[#FFF000]/30 text-[#FFF000]':roleName==='dj'?'border-[#FF007F]/30 text-[#FF007F]':roleName==='editor'?'border-[#00F0FF]/30 text-[#00F0FF]':'border-[#71717a]/30 text-[#71717a]'}`}>{roleName?.toUpperCase()}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-[#71717a] text-xs">{u.created_at ? formatDateCentral(u.created_at) : ''}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setEditUser({...u, roles: getUserRoles(u)})} className="text-xs text-[#00F0FF] font-semibold hover:underline">Edit</button>
                  {u.user_id !== user.user_id && <button onClick={() => { if (window.confirm(`Delete ${u.name}?`)) deleteUserApi(u.user_id).then(loadData); }} className="text-xs text-red-400 font-semibold hover:underline ml-3">Remove</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderContent = () => (
    <div data-testid="admin-create-news">
      <h2 className="text-2xl font-extrabold text-white tracking-[1px]">Publish news article</h2>
      <p className="text-sm text-[#a1a1aa] mt-1 mb-6">Create and publish news articles.</p>
      <div className="bg-[#18181b] rounded-xl p-6 border border-[rgba(255,255,255,0.1)]">
        <Label>TITLE</Label>
        <Input value={newsForm.title} onChange={e => setNewsForm(p=>({...p,title:e.target.value}))} data-testid="news-title-input" />
        <Label>SUMMARY</Label>
        <Input value={newsForm.summary} onChange={e => setNewsForm(p=>({...p,summary:e.target.value}))} />
        <Label>IMAGE URL</Label>
        <Input value={newsForm.image_url} onChange={e => setNewsForm(p=>({...p,image_url:e.target.value}))} placeholder="https://..." />
        <Label>CONTENT</Label>
        <Textarea rows={6} value={newsForm.content} onChange={e => setNewsForm(p=>({...p,content:e.target.value}))} data-testid="news-content-input" />
        <Label>CATEGORY</Label>
        <div className="flex gap-2 flex-wrap mt-1">
          {CATS.map(c => (
            <button key={c} onClick={() => setNewsForm(p=>({...p,category:c}))} className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-[1px] border ${newsForm.category===c?'bg-[#00F0FF] border-[#00F0FF] text-[#09090b]':'bg-[#09090b] border-[rgba(255,255,255,0.1)] text-[#71717a]'}`}>{c.toUpperCase()}</button>
          ))}
        </div>
        <Btn pink className="w-full mt-6" onClick={async () => {
          if (!newsForm.title||!newsForm.content) return alert('Title and content required');
          try { await createNewsApi(newsForm); setNewsForm({title:'',content:'',category:'general',summary:'',image_url:''}); alert('Published!'); loadData(); } catch(e){ alert(e.message); }
        }} data-testid="news-create-btn"><Plus size={16} /> PUBLISH ARTICLE</Btn>
      </div>
    </div>
  );

  const renderManageNews = () => (
    <div>
      <h2 className="text-2xl font-extrabold text-white tracking-[1px]">Manage news</h2>
      <p className="text-sm text-[#a1a1aa] mt-1 mb-6">View, edit, or delete published articles.</p>
      <div className="bg-[#18181b] rounded-xl border border-[rgba(255,255,255,0.1)] overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-white/[0.03] border-b border-[rgba(255,255,255,0.05)]">
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Title</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Category</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Status</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Published</th>
            <th className="text-right px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Actions</th>
          </tr></thead>
          <tbody>
            {allNews.map(a => (
              <tr key={a.news_id} className="border-b border-white/[0.04]">
                <td className="px-4 py-3 text-white font-medium">{a.title}</td>
                <td className="px-4 py-3 text-[#00F0FF] text-xs font-bold tracking-[1px]">{a.category?.toUpperCase()}</td>
                <td className="px-4 py-3 text-xs">
                  <span className={`font-bold tracking-[1px] ${a.published ? 'text-green-400' : 'text-amber-400'}`}>
                    {a.published ? 'LIVE' : 'DRAFT'}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#71717a] text-xs">{formatDateCentral(a.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setEditNews({...a})} className="text-xs text-[#00F0FF] font-semibold hover:underline">Edit</button>
                  <button onClick={() => { if(window.confirm(`Delete "${a.title}"?`)) deleteNewsApi(a.news_id).then(loadData); }} className="text-xs text-red-400 font-semibold hover:underline ml-3">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {allNews.length === 0 && <p className="text-center text-[#71717a] py-8">No news articles yet</p>}
      </div>
    </div>
  );

  const renderEvents = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-[1px]">Upcoming events</h2>
          <p className="text-sm text-[#a1a1aa] mt-1">Add and manage events shown on the homepage.</p>
        </div>
        <Btn pink onClick={() => setEditEvent({ title: '', description: '', venue: '', date: '', time: '', image_url: '', ticket_url: '' })}>
          <Plus size={16} /> ADD EVENT
        </Btn>
      </div>
      <div className="bg-[#18181b] rounded-xl border border-[rgba(255,255,255,0.1)] overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-white/[0.03] border-b border-[rgba(255,255,255,0.05)]">
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Title</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Venue</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Date</th>
            <th className="text-right px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Actions</th>
          </tr></thead>
          <tbody>
            {events.map(e => (
              <tr key={e.event_id} className="border-b border-white/[0.04]">
                <td className="px-4 py-3 text-white font-medium">{e.title}</td>
                <td className="px-4 py-3 text-[#a1a1aa]">{e.venue || '—'}</td>
                <td className="px-4 py-3 text-[#71717a] text-xs">{e.date || '—'} {e.time ? `at ${e.time}` : ''}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setEditEvent({ ...e })} className="text-xs text-[#00F0FF] font-semibold hover:underline">Edit</button>
                  <button onClick={() => { if (window.confirm(`Delete "${e.title}"?`)) deleteEventApi(e.event_id).then(loadData).catch(err => alert(err.message)); }} className="text-xs text-red-400 font-semibold hover:underline ml-3">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && <p className="text-center text-[#71717a] py-8">No events yet</p>}
      </div>
    </div>
  );

  const renderContests = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-[1px]">Contests & giveaways</h2>
          <p className="text-sm text-[#a1a1aa] mt-1">Add and manage contest promotions shown on the homepage.</p>
        </div>
        <Btn pink onClick={() => setEditContest({ title: '', description: '', prize: '', end_date: '', how_to_enter: '', image_url: '' })}>
          <Plus size={16} /> ADD CONTEST
        </Btn>
      </div>
      <div className="bg-[#18181b] rounded-xl border border-[rgba(255,255,255,0.1)] overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-white/[0.03] border-b border-[rgba(255,255,255,0.05)]">
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Title</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Prize</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">End Date</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Status</th>
            <th className="text-right px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Actions</th>
          </tr></thead>
          <tbody>
            {contests.map(c => (
              <tr key={c.contest_id} className="border-b border-white/[0.04]">
                <td className="px-4 py-3 text-white font-medium">{c.title}</td>
                <td className="px-4 py-3 text-[#a1a1aa]">{c.prize || '—'}</td>
                <td className="px-4 py-3 text-[#71717a] text-xs">{c.end_date || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-extrabold tracking-[1px] px-2 py-0.5 rounded-full ${c.active === false ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                    {c.active === false ? 'INACTIVE' : 'ACTIVE'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={async () => {
                      try {
                        await updateContestApi(c.contest_id, { active: c.active === false });
                        loadData();
                      } catch (err) { alert(err.message); }
                    }}
                    className="text-xs text-[#FFF000] font-semibold hover:underline"
                  >
                    {c.active === false ? 'Activate' : 'Deactivate'}
                  </button>
                  <button onClick={() => setEditContest({ ...c })} className="text-xs text-[#00F0FF] font-semibold hover:underline ml-3">Edit</button>
                  <button onClick={() => { if (window.confirm(`Delete "${c.title}"?`)) deleteContestApi(c.contest_id).then(loadData).catch(err => alert(err.message)); }} className="text-xs text-red-400 font-semibold hover:underline ml-3">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {contests.length === 0 && <p className="text-center text-[#71717a] py-8">No contests yet</p>}
      </div>
    </div>
  );

  const renderPodcastsShows = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-[1px]">Podcasts & Shows</h2>
          <p className="text-sm text-[#a1a1aa] mt-1">Manage all podcast and show entries in one place.</p>
        </div>
        <div className="flex gap-2">
          <Btn onClick={() => setEditShow({ name: '', description: '', dj_id: '', dj_name: '', schedule: '', image_url: '' })}>
            <Plus size={16} /> ADD SHOW
          </Btn>
          <Btn pink onClick={() => setEditPodcast({ title: '', description: '', show_name: '', dj_name: '', duration: '', audio_url: '', image_url: '' })}>
            <Plus size={16} /> ADD PODCAST
          </Btn>
        </div>
      </div>
      <div className="bg-[#18181b] rounded-xl border border-[rgba(255,255,255,0.1)] overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-white/[0.03] border-b border-[rgba(255,255,255,0.05)]">
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Type</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Title</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">DJ</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Details</th>
            <th className="text-right px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Actions</th>
          </tr></thead>
          <tbody>
            {[
              ...shows.map(s => ({
                itemType: 'show',
                id: s.show_id,
                title: s.name,
                dj: s.dj_name || '',
                details: s.schedule || '',
                original: s
              })),
              ...podcasts.map(p => ({
                itemType: 'podcast',
                id: p.podcast_id,
                title: p.title,
                dj: p.dj_name || '',
                details: p.show_name || p.duration || '',
                original: p
              }))
            ].map(item => (
              <tr key={`${item.itemType}-${item.id}`} className="border-b border-white/[0.04]">
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-extrabold tracking-[1px] px-2 py-0.5 rounded-full ${item.itemType === 'show' ? 'bg-[rgba(0,240,255,0.12)] text-[#00F0FF]' : 'bg-[rgba(255,0,127,0.12)] text-[#FF007F]'}`}>
                    {item.itemType.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-white font-medium">{item.title}</td>
                <td className="px-4 py-3 text-[#a1a1aa]">{item.dj || '—'}</td>
                <td className="px-4 py-3 text-[#71717a] text-xs">{item.details || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => item.itemType === 'show' ? setEditShow({ ...item.original }) : setEditPodcast({ ...item.original })}
                    className="text-xs text-[#00F0FF] font-semibold hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete "${item.title}"?`)) {
                        const action = item.itemType === 'show'
                          ? deleteShowApi(item.id)
                          : deletePodcastApi(item.id);
                        action.then(loadData).catch(err => alert(err.message));
                      }
                    }}
                    className="text-xs text-red-400 font-semibold hover:underline ml-3"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(shows.length + podcasts.length) === 0 && <p className="text-center text-[#71717a] py-8">No shows or podcasts yet</p>}
      </div>
    </div>
  );

  const renderComments = () => (
    <div>
      <h2 className="text-2xl font-extrabold text-white tracking-[1px]">Comment Moderation</h2>
      <p className="text-sm text-[#a1a1aa] mt-1 mb-6">Review and approve pending comments. ({pendingComments.length} pending)</p>
      <div className="bg-[#18181b] rounded-xl border border-[rgba(255,255,255,0.1)] overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-white/[0.03] border-b border-[rgba(255,255,255,0.05)]">
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Comment</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">User</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Date</th>
            <th className="text-right px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Actions</th>
          </tr></thead>
          <tbody>
            {pendingComments.map(c => (
              <tr key={c.comment_id} className="border-b border-white/[0.04]">
                <td className="px-4 py-3 text-white max-w-[300px] truncate">{c.content}</td>
                <td className="px-4 py-3 text-[#a1a1aa]">{c.user_name}</td>
                <td className="px-4 py-3 text-[#71717a] text-xs">{formatDateCentral(c.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={async () => { await approveCommentApi(c.comment_id); loadData(); alert('Approved'); }} className="text-xs text-[#00F0FF] font-semibold hover:underline">Approve</button>
                  <button onClick={() => { if(window.confirm(`Delete comment?`)) deleteCommentApi(c.comment_id).then(loadData); }} className="text-xs text-red-400 font-semibold hover:underline ml-3">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pendingComments.length === 0 && <p className="text-center text-[#71717a] py-8">No pending comments</p>}
      </div>
    </div>
  );

  const renderSchedule = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-extrabold text-white tracking-[1px]">Schedule management</h2><p className="text-sm text-[#a1a1aa] mt-1">Manage the weekly on-air schedule.</p></div>
        <Btn pink onClick={() => setEditSchedule({ day_of_week:'Monday', time_slot:'', show_name:'', dj_name:'', description:'' })}><Plus size={16} /> ADD TIME SLOT</Btn>
      </div>
      <div className="bg-[#18181b] rounded-xl border border-[rgba(255,255,255,0.1)] overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-white/[0.03] border-b border-[rgba(255,255,255,0.05)]">
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Day</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Time</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Show</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">DJ</th>
            <th className="text-right px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Actions</th>
          </tr></thead>
          <tbody>
            {scheduleSlots.map(s => (
              <tr key={s.schedule_id} className="border-b border-white/[0.04]">
                <td className="px-4 py-3 text-white">{s.day_of_week}</td>
                <td className="px-4 py-3 text-[#a1a1aa] font-mono text-xs">{s.time_slot}</td>
                <td className="px-4 py-3 text-white font-medium">{s.show_name}</td>
                <td className="px-4 py-3 text-[#a1a1aa]">{s.dj_name}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setEditSchedule({...s})} className="text-xs text-[#00F0FF] font-semibold hover:underline">Edit</button>
                  <button onClick={() => { if(window.confirm(`Delete "${s.show_name}"?`)) deleteScheduleSlotApi(s.schedule_id).then(loadData); }} className="text-xs text-red-400 font-semibold hover:underline ml-3">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {scheduleSlots.length === 0 && <p className="text-center text-[#71717a] py-8">No schedule slots yet</p>}
      </div>
    </div>
  );

  const renderJobs = () => (
    <div>
      <h2 className="text-2xl font-extrabold text-white tracking-[1px]">Job applications</h2>
      <p className="text-sm text-[#a1a1aa] mt-1 mb-6">Review and manage applications.</p>
      <div className="bg-[#18181b] rounded-xl border border-[rgba(255,255,255,0.1)] overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-white/[0.03] border-b border-[rgba(255,255,255,0.05)]">
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Position</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Name</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Email</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Status</th>
            <th className="text-right px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Actions</th>
          </tr></thead>
          <tbody>
            {jobApps.map(a => (
              <tr key={a.application_id} className="border-b border-white/[0.04]">
                <td className="px-4 py-3 text-white">{a.position}</td>
                <td className="px-4 py-3 text-white font-medium">{a.name}</td>
                <td className="px-4 py-3 text-[#a1a1aa]">{a.email}</td>
                <td className="px-4 py-3"><span className={`text-[10px] font-extrabold tracking-[1px] px-2 py-0.5 rounded-full ${a.status==='approved'?'bg-green-500/10 text-green-400':a.status==='rejected'?'bg-red-500/10 text-red-400':'bg-[rgba(255,240,0,0.12)] text-[#FFF000]'}`}>{a.status.toUpperCase()}</span></td>
                <td className="px-4 py-3 text-right flex gap-1 justify-end flex-wrap">
                  {a.status === 'pending' && (<>
                    <button onClick={async () => { await updateJobApplicationStatusApi(a.application_id, 'approved'); loadData(); }} className="text-xs text-green-400 font-semibold hover:underline">Approve</button>
                    <button onClick={async () => { await updateJobApplicationStatusApi(a.application_id, 'rejected'); loadData(); }} className="text-xs text-orange-400 font-semibold hover:underline">Reject</button>
                  </>)}
                  <button onClick={() => { setEmailApp(a); setEmailSubject(''); setEmailMessage(''); }} className="text-xs text-[#00F0FF] font-semibold hover:underline">Email</button>
                  <button onClick={() => { if(window.confirm(`Delete application from ${a.name}?`)) deleteJobApplicationApi(a.application_id).then(loadData); }} className="text-xs text-red-400 font-semibold hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {jobApps.length === 0 && <p className="text-center text-[#71717a] py-8">No applications yet</p>}
      </div>
    </div>
  );

  const renderRoles = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-extrabold text-white tracking-[1px]">Roles & permissions</h2><p className="text-sm text-[#a1a1aa] mt-1">Manage user roles and what they can do.</p></div>
        <Btn pink onClick={() => setNewRole({ name:'', display_name:'', color:'#00f0ff', permissions:[] })}><Plus size={16} /> NEW ROLE</Btn>
      </div>
      <div className="space-y-3">
        {roles.map(r => (
          <div key={r.role_id} className="bg-[#18181b] rounded-xl p-5 border border-[rgba(255,255,255,0.1)]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{r.display_name}</span>
                {r.is_system && <span className="text-[9px] font-extrabold text-[#71717a] tracking-[1px] bg-white/5 px-2 py-0.5 rounded">SYSTEM</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditRole({...r})} className="p-1.5 hover:bg-white/5 rounded"><Edit3 size={14} className="text-[#00F0FF]" /></button>
                {!r.is_system && <button onClick={() => { if(window.confirm(`Delete "${r.display_name}"?`)) deleteRoleApi(r.role_id).then(loadData).catch(e=>alert(e.message)); }} className="p-1.5 hover:bg-white/5 rounded"><Trash2 size={14} className="text-red-400" /></button>}
              </div>
            </div>
            <p className="text-[10px] text-[#71717a] mb-2">ID: {r.role_id}</p>
            <div className="flex flex-wrap gap-1.5">
              {r.permissions?.length > 0 ? r.permissions.map(p => {
                const pi = permissions.find(x => x.key === p);
                return <span key={p} className="text-[10px] font-bold text-[#00F0FF] bg-[rgba(0,240,255,0.08)] px-2 py-0.5 rounded-full">{pi?.label || p}</span>;
              }) : <span className="text-[10px] text-[#71717a]">No permissions</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPush = () => (
    <div>
      <h2 className="text-2xl font-extrabold text-white tracking-[1px]">Push notifications</h2>
      <p className="text-sm text-[#a1a1aa] mt-1 mb-6">Send push notifications to app users.</p>
      <div className="flex gap-3 mb-6">
        <div className="bg-[#18181b] rounded-lg p-5 border border-[rgba(255,255,255,0.1)] flex-1 text-center">
          <p className="text-3xl font-black text-white">{pushTokens.total}</p>
          <p className="text-xs text-[#71717a] tracking-[1px]">REGISTERED DEVICES</p>
        </div>
        <div className="bg-[#18181b] rounded-lg p-5 border border-[rgba(255,255,255,0.1)] flex-1 text-center">
          <p className="text-3xl font-black text-white">{pushHistory.length}</p>
          <p className="text-xs text-[#71717a] tracking-[1px]">NOTIFICATIONS SENT</p>
        </div>
      </div>
      <div className="bg-[#18181b] rounded-xl p-6 border border-[rgba(255,255,255,0.1)] mb-6">
        <h3 className="text-lg font-bold text-white mb-4">Send new notification</h3>
        <Label>TITLE</Label>
        <Input value={pushTitle} onChange={e => setPushTitle(e.target.value)} />
        <Label>MESSAGE</Label>
        <Textarea rows={3} value={pushBody} onChange={e => setPushBody(e.target.value)} />
        <Btn pink className="w-full mt-4" onClick={async () => {
          if(!pushTitle||!pushBody) return alert('Fill in title and message');
          try { const r = await sendPushNotificationApi(pushTitle, pushBody); setPushTitle(''); setPushBody(''); alert(`Sent! Targeted: ${r.tokens_targeted}, Success: ${r.success}`); Promise.all([getPushTokensApi(),getPushHistoryApi()]).then(([t,h])=>{setPushTokens(t);setPushHistory(h);}); } catch(e){ alert(e.message); }
        }}><Send size={16} /> SEND TO ALL DEVICES</Btn>
      </div>
      {pushHistory.length > 0 && (
        <div className="bg-[#18181b] rounded-xl p-6 border border-[rgba(255,255,255,0.1)]">
          <h3 className="text-lg font-bold text-white mb-4">Recent notifications</h3>
          <div className="space-y-3">
            {pushHistory.map((n, i) => (
              <div key={i} className="bg-[#09090b] rounded-lg p-4 border border-[rgba(255,255,255,0.05)]">
                <div className="flex justify-between"><span className="font-bold text-white">{n.title}</span><span className="text-xs text-[#71717a]">{n.result?.success||0}/{(n.result?.success||0)+(n.result?.failed||0)}</span></div>
                <p className="text-sm text-[#a1a1aa] mt-1">{n.body}</p>
                <p className="text-[10px] text-[#71717a] mt-2">{formatDateTimeCentral(n.sent_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const panels = {
    overview: renderOverview,
    analytics: renderAnalytics,
    nowplaying: renderNowPlaying,
    requests: renderRequests,
    users: renderUsers,
    content: renderContent,
    'manage-news': renderManageNews,
    events: renderEvents,
    contests: renderContests,
    'podcasts-shows': renderPodcastsShows,
    comments: renderComments,
    schedule: renderSchedule,
    jobs: renderJobs,
    roles: renderRoles,
    push: renderPush,
  };

  return (
    <div data-testid="admin-page">
      <WebNavBar />
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-52px)]">
        {/* Sidebar */}
        <div className="w-full lg:w-[240px] bg-[#0d0d0f] border-b lg:border-b-0 lg:border-r border-[rgba(255,255,255,0.1)] pt-4 lg:pt-6 px-3 lg:px-4 flex-shrink-0 overflow-x-auto" data-testid="admin-sidebar">
          <div className="flex items-center gap-2.5 px-2 mb-6">
            <Shield size={18} className="text-[#FF007F]" />
            <span className="text-base font-extrabold text-white tracking-[1px]">Admin Panel</span>
          </div>
          {sidebarGroups.map((group, gi) => (
            <div key={group.label ?? `group-${gi}`} className={gi > 0 ? 'mt-1.5 lg:mt-5' : ''}>
              {group.label && (
                <div className="hidden lg:block px-2 mb-2">
                  <span className="text-[10px] font-extrabold text-[#71717a] tracking-[2px]">{group.label}</span>
                </div>
              )}
              <div className="hidden lg:block space-y-0.5">
                {group.items.map(s => (
                  <button key={s.key} type="button" onClick={() => setTab(s.key)} data-testid={`admin-tab-${s.key}`}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg mb-0.5 text-left transition-colors ${tab===s.key?'bg-[rgba(255,0,127,0.1)]':''}`}>
                    <s.icon size={16} className={tab===s.key?'text-[#FF007F]':'text-[#71717a]'} />
                    <span className={`text-sm flex-1 ${tab===s.key?'text-white font-semibold':'text-[#71717a]'}`}>{s.label}</span>
                    {s.showPendingBadge && pendingCount > 0 && (
                      <span className="bg-[#FF007F] text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{pendingCount}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="lg:hidden pb-3">
            <label className="text-[10px] font-extrabold text-[#71717a] tracking-[2px] block mb-2 px-2">NAVIGATE</label>
            <select
              value={tab}
              onChange={(e) => setTab(e.target.value)}
              className="w-full bg-[#18181b] border border-[rgba(255,255,255,0.12)] rounded-lg px-3 py-2.5 text-sm text-white"
              data-testid="admin-tab-select"
            >
              {sidebarGroups.flatMap(g => g.items).map(item => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1000px]">
          {(panels[tab] || renderOverview)()}
        </div>
      </div>

      {/* ===== MODALS ===== */}
      <Modal show={!!editUser} onClose={() => setEditUser(null)} title="Edit User">
        {editUser && (<>
          <Label>NAME</Label>
          <Input value={editUser.name||''} onChange={e => setEditUser({...editUser, name:e.target.value})} />
          <Label>EMAIL</Label>
          <Input value={editUser.email||''} onChange={e => setEditUser({...editUser, email:e.target.value})} />
          <Label>ROLES</Label>
          <div className="flex gap-2 mt-1 flex-wrap">
            {ROLE_OPTIONS.map(r => {
              const selected = (editUser.roles || []).includes(r);
              return (
                <button
                  key={r}
                  onClick={() => {
                    const current = Array.isArray(editUser.roles) ? [...editUser.roles] : [];
                    const has = current.includes(r);
                    const next = has ? current.filter((x) => x !== r) : [...current, r];
                    setEditUser({ ...editUser, roles: next, role: next[0] || 'listener' });
                  }}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-[1px] border ${selected?'bg-[#00F0FF] border-[#00F0FF] text-[#09090b]':'bg-[#09090b] border-[rgba(255,255,255,0.1)] text-[#71717a]'}`}
                >
                  {r.toUpperCase()}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-[#71717a] mt-2">First selected role is used as primary.</p>
          <div className="flex gap-3 mt-6">
            <Btn pink className="flex-1" onClick={async () => {
              try {
                const roles = (editUser.roles || []).length ? editUser.roles : ['listener'];
                await updateUserApi(editUser.user_id, {
                  name: editUser.name,
                  email: editUser.email,
                  role: roles[0],
                  roles
                });
                setEditUser(null);
                loadData();
                alert('Updated!');
              } catch(e){alert(e.message);}
            }}>SAVE</Btn>
            <Btn className="flex-1" onClick={() => setEditUser(null)}>CANCEL</Btn>
          </div>
        </>)}
      </Modal>

      <Modal show={!!editNews} onClose={() => setEditNews(null)} title="Edit News Article">
        {editNews && (<>
          <Label>TITLE</Label>
          <Input value={editNews.title||''} onChange={e => setEditNews({...editNews, title:e.target.value})} />
          <Label>SUMMARY</Label>
          <Textarea rows={3} value={editNews.summary||''} onChange={e => setEditNews({...editNews, summary:e.target.value})} />
          <Label>IMAGE URL</Label>
          <Input value={editNews.image_url||''} onChange={e => setEditNews({...editNews, image_url:e.target.value})} placeholder="https://..." />
          <Label>CONTENT</Label>
          <Textarea rows={5} value={editNews.content||''} onChange={e => setEditNews({...editNews, content:e.target.value})} />
          <Label>CATEGORY</Label>
          <div className="flex gap-2 mt-1">{CATS.map(c => (
            <button key={c} onClick={() => setEditNews({...editNews, category:c})} className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-[1px] border ${editNews.category===c?'bg-[#00F0FF] border-[#00F0FF] text-[#09090b]':'bg-[#09090b] border-[rgba(255,255,255,0.1)] text-[#71717a]'}`}>{c.toUpperCase()}</button>
          ))}</div>
          <Label>STATUS</Label>
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={() => setEditNews({ ...editNews, published: true })}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-[1px] border ${editNews.published !== false ? 'bg-[#00F0FF] border-[#00F0FF] text-[#09090b]' : 'bg-[#09090b] border-[rgba(255,255,255,0.1)] text-[#71717a]'}`}
            >
              LIVE
            </button>
            <button
              type="button"
              onClick={() => setEditNews({ ...editNews, published: false })}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-[1px] border ${editNews.published === false ? 'bg-[#FF007F] border-[#FF007F] text-white' : 'bg-[#09090b] border-[rgba(255,255,255,0.1)] text-[#71717a]'}`}
            >
              DRAFT
            </button>
          </div>
          <div className="flex gap-3 mt-6">
            <Btn pink className="flex-1" onClick={async () => {
              try {
                await updateNewsApi(editNews.news_id, {
                  title: editNews.title,
                  content: editNews.content,
                  category: editNews.category,
                  summary: editNews.summary,
                  image_url: editNews.image_url || '',
                  published: editNews.published !== false
                });
                setEditNews(null);
                loadData();
                alert('Updated!');
              } catch(e){alert(e.message);}
            }}>SAVE</Btn>
            <Btn className="flex-1" onClick={() => setEditNews(null)}>CANCEL</Btn>
          </div>
        </>)}
      </Modal>

      <Modal show={!!editSchedule} onClose={() => setEditSchedule(null)} title={editSchedule?.schedule_id ? 'Edit Time Slot' : 'Add Time Slot'}>
        {editSchedule && (<>
          <Label>DAY OF WEEK</Label>
          <div className="flex gap-1.5 flex-wrap mt-1">{DAYS.map(d => (
            <button key={d} onClick={() => setEditSchedule({...editSchedule, day_of_week:d})} className={`px-2.5 py-1.5 rounded-full text-[10px] font-bold tracking-[1px] border ${editSchedule.day_of_week===d?'bg-[#00F0FF] border-[#00F0FF] text-[#09090b]':'bg-[#09090b] border-[rgba(255,255,255,0.1)] text-[#71717a]'}`}>{d.substring(0,3).toUpperCase()}</button>
          ))}</div>
          <Label>TIME SLOT</Label>
          <Input value={editSchedule.time_slot||''} onChange={e => setEditSchedule({...editSchedule, time_slot:e.target.value})} placeholder="e.g., 6:00 AM - 9:00 AM" />
          <Label>SHOW NAME</Label>
          <Input value={editSchedule.show_name||''} onChange={e => setEditSchedule({...editSchedule, show_name:e.target.value})} />
          <Label>DJ NAME</Label>
          <Input value={editSchedule.dj_name||''} onChange={e => setEditSchedule({...editSchedule, dj_name:e.target.value})} />
          <div className="flex gap-3 mt-6">
            <Btn pink className="flex-1" onClick={async () => {
              try { if(editSchedule.schedule_id) { await updateScheduleSlotApi(editSchedule.schedule_id, editSchedule); } else { await createScheduleSlotApi(editSchedule); } setEditSchedule(null); loadData(); alert('Saved!'); } catch(e){alert(e.message);}
            }}>SAVE</Btn>
            <Btn className="flex-1" onClick={() => setEditSchedule(null)}>CANCEL</Btn>
          </div>
        </>)}
      </Modal>

      <Modal show={!!editEvent} onClose={() => setEditEvent(null)} title={editEvent?.event_id ? 'Edit Event' : 'Add Event'}>
        {editEvent && (<>
          <Label>TITLE</Label>
          <Input value={editEvent.title || ''} onChange={e => setEditEvent({ ...editEvent, title: e.target.value })} />
          <Label>DESCRIPTION</Label>
          <Textarea rows={4} value={editEvent.description || ''} onChange={e => setEditEvent({ ...editEvent, description: e.target.value })} />
          <Label>VENUE</Label>
          <Input value={editEvent.venue || ''} onChange={e => setEditEvent({ ...editEvent, venue: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>DATE (YYYY-MM-DD)</Label>
              <Input value={editEvent.date || ''} onChange={e => setEditEvent({ ...editEvent, date: e.target.value })} />
            </div>
            <div>
              <Label>TIME</Label>
              <Input value={editEvent.time || ''} onChange={e => setEditEvent({ ...editEvent, time: e.target.value })} />
            </div>
          </div>
          <Label>IMAGE URL</Label>
          <Input value={editEvent.image_url || ''} onChange={e => setEditEvent({ ...editEvent, image_url: e.target.value })} />
          <Label>TICKET URL</Label>
          <Input value={editEvent.ticket_url || ''} onChange={e => setEditEvent({ ...editEvent, ticket_url: e.target.value })} />
          <div className="flex gap-3 mt-6">
            <Btn pink className="flex-1" onClick={async () => {
              if (!editEvent.title) return alert('Title is required');
              try {
                const payload = {
                  title: editEvent.title,
                  description: editEvent.description || '',
                  venue: editEvent.venue || '',
                  date: editEvent.date || '',
                  time: editEvent.time || '',
                  image_url: editEvent.image_url || '',
                  ticket_url: editEvent.ticket_url || ''
                };
                if (editEvent.event_id) {
                  await updateEventApi(editEvent.event_id, payload);
                } else {
                  await createEventApi(payload);
                }
                setEditEvent(null);
                loadData();
                alert('Event saved!');
              } catch (e) { alert(e.message); }
            }}>SAVE</Btn>
            <Btn className="flex-1" onClick={() => setEditEvent(null)}>CANCEL</Btn>
          </div>
        </>)}
      </Modal>

      <Modal show={!!editContest} onClose={() => setEditContest(null)} title={editContest?.contest_id ? 'Edit Contest' : 'Add Contest'}>
        {editContest && (<>
          <Label>TITLE</Label>
          <Input value={editContest.title || ''} onChange={e => setEditContest({ ...editContest, title: e.target.value })} />
          <Label>DESCRIPTION</Label>
          <Textarea rows={4} value={editContest.description || ''} onChange={e => setEditContest({ ...editContest, description: e.target.value })} />
          <Label>PRIZE</Label>
          <Input value={editContest.prize || ''} onChange={e => setEditContest({ ...editContest, prize: e.target.value })} />
          <Label>END DATE (YYYY-MM-DD)</Label>
          <Input value={editContest.end_date || ''} onChange={e => setEditContest({ ...editContest, end_date: e.target.value })} />
          <Label>HOW TO ENTER</Label>
          <Textarea rows={3} value={editContest.how_to_enter || ''} onChange={e => setEditContest({ ...editContest, how_to_enter: e.target.value })} />
          <Label>IMAGE URL</Label>
          <Input value={editContest.image_url || ''} onChange={e => setEditContest({ ...editContest, image_url: e.target.value })} />
          <div className="flex gap-3 mt-6">
            <Btn pink className="flex-1" onClick={async () => {
              if (!editContest.title) return alert('Title is required');
              try {
                const payload = {
                  title: editContest.title,
                  description: editContest.description || '',
                  prize: editContest.prize || '',
                  end_date: editContest.end_date || '',
                  how_to_enter: editContest.how_to_enter || '',
                  image_url: editContest.image_url || ''
                };
                if (editContest.contest_id) {
                  await updateContestApi(editContest.contest_id, payload);
                } else {
                  await createContestApi(payload);
                }
                setEditContest(null);
                loadData();
                alert('Contest saved!');
              } catch (e) { alert(e.message); }
            }}>SAVE</Btn>
            <Btn className="flex-1" onClick={() => setEditContest(null)}>CANCEL</Btn>
          </div>
        </>)}
      </Modal>

      <Modal show={!!editShow} onClose={() => setEditShow(null)} title={editShow?.show_id ? 'Edit Show' : 'Add Show'}>
        {editShow && (<>
          <Label>SHOW NAME</Label>
          <Input value={editShow.name || ''} onChange={e => setEditShow({ ...editShow, name: e.target.value })} />
          <Label>DESCRIPTION</Label>
          <Textarea rows={4} value={editShow.description || ''} onChange={e => setEditShow({ ...editShow, description: e.target.value })} />
          <Label>DJ NAME</Label>
          <Input value={editShow.dj_name || ''} onChange={e => setEditShow({ ...editShow, dj_name: e.target.value })} />
          <Label>SCHEDULE</Label>
          <Input value={editShow.schedule || ''} onChange={e => setEditShow({ ...editShow, schedule: e.target.value })} />
          <Label>IMAGE URL</Label>
          <Input value={editShow.image_url || ''} onChange={e => setEditShow({ ...editShow, image_url: e.target.value })} />
          <div className="flex gap-3 mt-6">
            <Btn pink className="flex-1" onClick={async () => {
              if (!editShow.name) return alert('Show name is required');
              try {
                const payload = {
                  name: editShow.name,
                  description: editShow.description || '',
                  dj_id: editShow.dj_id || '',
                  dj_name: editShow.dj_name || '',
                  schedule: editShow.schedule || '',
                  image_url: editShow.image_url || ''
                };
                if (editShow.show_id) {
                  await updateShowApi(editShow.show_id, payload);
                } else {
                  await createShowApi(payload);
                }
                setEditShow(null);
                loadData();
                alert('Show saved!');
              } catch (e) { alert(e.message); }
            }}>SAVE</Btn>
            <Btn className="flex-1" onClick={() => setEditShow(null)}>CANCEL</Btn>
          </div>
        </>)}
      </Modal>

      <Modal show={!!editPodcast} onClose={() => setEditPodcast(null)} title={editPodcast?.podcast_id ? 'Edit Podcast' : 'Add Podcast'}>
        {editPodcast && (<>
          <Label>TITLE</Label>
          <Input value={editPodcast.title || ''} onChange={e => setEditPodcast({ ...editPodcast, title: e.target.value })} />
          <Label>DESCRIPTION</Label>
          <Textarea rows={4} value={editPodcast.description || ''} onChange={e => setEditPodcast({ ...editPodcast, description: e.target.value })} />
          <Label>SHOW NAME</Label>
          <Input value={editPodcast.show_name || ''} onChange={e => setEditPodcast({ ...editPodcast, show_name: e.target.value })} />
          <Label>DJ NAME</Label>
          <Input value={editPodcast.dj_name || ''} onChange={e => setEditPodcast({ ...editPodcast, dj_name: e.target.value })} />
          <Label>DURATION</Label>
          <Input value={editPodcast.duration || ''} onChange={e => setEditPodcast({ ...editPodcast, duration: e.target.value })} />
          <Label>AUDIO URL</Label>
          <Input value={editPodcast.audio_url || ''} onChange={e => setEditPodcast({ ...editPodcast, audio_url: e.target.value })} />
          <Label>IMAGE URL</Label>
          <Input value={editPodcast.image_url || ''} onChange={e => setEditPodcast({ ...editPodcast, image_url: e.target.value })} />
          <div className="flex gap-3 mt-6">
            <Btn pink className="flex-1" onClick={async () => {
              if (!editPodcast.title) return alert('Podcast title is required');
              try {
                const payload = {
                  title: editPodcast.title,
                  description: editPodcast.description || '',
                  show_name: editPodcast.show_name || '',
                  dj_name: editPodcast.dj_name || '',
                  duration: editPodcast.duration || '',
                  audio_url: editPodcast.audio_url || '',
                  image_url: editPodcast.image_url || ''
                };
                if (editPodcast.podcast_id) {
                  await updatePodcastApi(editPodcast.podcast_id, payload);
                } else {
                  await createPodcastApi(payload);
                }
                setEditPodcast(null);
                loadData();
                alert('Podcast saved!');
              } catch (e) { alert(e.message); }
            }}>SAVE</Btn>
            <Btn className="flex-1" onClick={() => setEditPodcast(null)}>CANCEL</Btn>
          </div>
        </>)}
      </Modal>

      <Modal show={!!emailApp} onClose={() => setEmailApp(null)} title="Send Email to Applicant">
        {emailApp && (<>
          <p className="text-sm text-[#a1a1aa] mb-4">To: {emailApp.email}</p>
          <Label>SUBJECT</Label>
          <Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
          <Label>MESSAGE</Label>
          <Textarea rows={4} value={emailMessage} onChange={e => setEmailMessage(e.target.value)} />
          <div className="flex gap-3 mt-6">
            <Btn pink className="flex-1" onClick={async () => {
              if(!emailSubject||!emailMessage) return alert('Fill in all fields');
              try { await sendEmailToApplicantApi(emailApp.application_id, {subject:emailSubject,message:emailMessage}); setEmailApp(null); alert('Email sent!'); } catch(e){alert(e.message);}
            }}><Mail size={16} /> SEND EMAIL</Btn>
            <Btn className="flex-1" onClick={() => setEmailApp(null)}>CANCEL</Btn>
          </div>
        </>)}
      </Modal>

      <Modal show={!!newRole} onClose={() => setNewRole(null)} title="Create New Role">
        {newRole && (<>
          <Label>ROLE ID (lowercase, no spaces)</Label>
          <Input value={newRole.name||''} onChange={e => setNewRole({...newRole, name:e.target.value})} />
          <Label>DISPLAY NAME</Label>
          <Input value={newRole.display_name||''} onChange={e => setNewRole({...newRole, display_name:e.target.value})} />
          <Label>PERMISSIONS</Label>
          <div className="space-y-2 mt-2 max-h-[300px] overflow-y-auto">
            {permissions.map(p => (
              <label key={p.key} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border ${newRole.permissions?.includes(p.key)?'bg-[rgba(0,240,255,0.08)] border-[rgba(0,240,255,0.3)]':'bg-[#09090b] border-[rgba(255,255,255,0.05)]'}`}>
                <input type="checkbox" checked={newRole.permissions?.includes(p.key)} onChange={() => {
                  const perms = [...(newRole.permissions||[])];
                  const i = perms.indexOf(p.key);
                  if(i>-1) perms.splice(i,1); else perms.push(p.key);
                  setNewRole({...newRole, permissions:perms});
                }} className="accent-[#00F0FF]" />
                <div><p className="text-sm text-white font-medium">{p.label}</p><p className="text-[10px] text-[#71717a]">{p.description}</p></div>
              </label>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <Btn pink className="flex-1" onClick={async () => {
              if(!newRole.name||!newRole.display_name) return alert('Fill in name and display name');
              try { await createRoleApi(newRole); setNewRole(null); loadData(); alert('Role created!'); } catch(e){alert(e.message);}
            }}>CREATE ROLE</Btn>
            <Btn className="flex-1" onClick={() => setNewRole(null)}>CANCEL</Btn>
          </div>
        </>)}
      </Modal>

      <Modal show={!!editRole} onClose={() => setEditRole(null)} title="Edit Role">
        {editRole && (<>
          <Label>DISPLAY NAME</Label>
          <Input value={editRole.display_name||''} onChange={e => setEditRole({...editRole, display_name:e.target.value})} />
          <Label>PERMISSIONS</Label>
          <div className="space-y-2 mt-2 max-h-[300px] overflow-y-auto">
            {permissions.map(p => (
              <label key={p.key} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border ${editRole.permissions?.includes(p.key)?'bg-[rgba(0,240,255,0.08)] border-[rgba(0,240,255,0.3)]':'bg-[#09090b] border-[rgba(255,255,255,0.05)]'}`}>
                <input type="checkbox" checked={editRole.permissions?.includes(p.key)} onChange={() => {
                  const perms = [...(editRole.permissions||[])];
                  const i = perms.indexOf(p.key);
                  if(i>-1) perms.splice(i,1); else perms.push(p.key);
                  setEditRole({...editRole, permissions:perms});
                }} className="accent-[#00F0FF]" />
                <div><p className="text-sm text-white font-medium">{p.label}</p><p className="text-[10px] text-[#71717a]">{p.description}</p></div>
              </label>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <Btn pink className="flex-1" onClick={async () => {
              try { await updateRoleApi(editRole.role_id, {display_name:editRole.display_name,color:editRole.color,permissions:editRole.permissions}); setEditRole(null); loadData(); alert('Updated!'); } catch(e){alert(e.message);}
            }}>SAVE CHANGES</Btn>
            <Btn className="flex-1" onClick={() => setEditRole(null)}>CANCEL</Btn>
          </div>
        </>)}
      </Modal>

      <Modal show={!!createUserModal} onClose={() => setCreateUserModal(null)} title="Create New User">
        {createUserModal && (<>
          <Label>NAME</Label>
          <Input value={createUserModal.name || ''} onChange={e => setCreateUserModal({ ...createUserModal, name: e.target.value })} />
          <Label>EMAIL</Label>
          <Input type="email" value={createUserModal.email || ''} onChange={e => setCreateUserModal({ ...createUserModal, email: e.target.value })} />
          <Label>TEMP PASSWORD</Label>
          <Input
            type="password"
            value={createUserModal.password || ''}
            minLength={10}
            onChange={e => setCreateUserModal({ ...createUserModal, password: e.target.value })}
            placeholder="At least 10 characters"
          />
          <Label>ROLES</Label>
          <div className="flex gap-2 mt-1 flex-wrap">
            {ROLE_OPTIONS.map(r => {
              const selected = (createUserModal.roles || []).includes(r);
              return (
                <button
                  key={r}
                  onClick={() => {
                    const current = Array.isArray(createUserModal.roles) ? [...createUserModal.roles] : [];
                    const has = current.includes(r);
                    const next = has ? current.filter((x) => x !== r) : [...current, r];
                    const normalized = next.length ? next : ['listener'];
                    setCreateUserModal({ ...createUserModal, roles: normalized, role: normalized[0] });
                  }}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-[1px] border ${selected?'bg-[#00F0FF] border-[#00F0FF] text-[#09090b]':'bg-[#09090b] border-[rgba(255,255,255,0.1)] text-[#71717a]'}`}
                >
                  {r.toUpperCase()}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-[#71717a] mt-2">First selected role is used as primary.</p>
          <div className="flex gap-3 mt-6">
            <Btn pink className="flex-1" onClick={async () => {
              if (!createUserModal.name || !createUserModal.email || !createUserModal.password) {
                alert('Name, email, and password are required.');
                return;
              }
              try {
                const roles = (createUserModal.roles || []).length ? createUserModal.roles : ['listener'];
                await createAdminUserApi({
                  name: createUserModal.name.trim(),
                  email: createUserModal.email.trim(),
                  password: createUserModal.password,
                  role: roles[0],
                  roles
                });
                setCreateUserModal(null);
                loadData();
                alert('User created!');
              } catch (e) { alert(e.message); }
            }}>CREATE USER</Btn>
            <Btn className="flex-1" onClick={() => setCreateUserModal(null)}>CANCEL</Btn>
          </div>
        </>)}
      </Modal>
    </div>
  );
}
