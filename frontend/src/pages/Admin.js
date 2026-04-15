import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  getAdminStatsApi, getAdminUsersApi, getAdminRequestsApi, updateUserApi, deleteUserApi,
  updateRequestStatusApi, deleteRequestApi, createNewsApi, getNewsApi, updateNewsApi, deleteNewsApi,
  updateNowPlayingApi, getPendingCommentsApi, approveCommentApi, deleteCommentApi,
  getScheduleApi, createScheduleSlotApi, updateScheduleSlotApi, deleteScheduleSlotApi,
  getEventsApi, createEventApi, updateEventApi, deleteEventApi,
  getJobApplicationsApi, updateJobApplicationStatusApi, deleteJobApplicationApi, sendEmailToApplicantApi,
  getRolesApi, getPermissionsApi, createRoleApi, updateRoleApi, deleteRoleApi,
  getPushTokensApi, sendPushNotificationApi, getPushHistoryApi,
  getStreamConfigApi, updateStreamConfigApi
} from '../services/api';
import WebNavBar from '../components/Navbar';
import {
  LayoutGrid, Radio, Music, Users, FileText, Newspaper, MessageSquare, Calendar,
  Briefcase, Shield, Bell, ChevronLeft, Check, X, Trash2, Plus, Edit3, Save, Send, Mail
} from 'lucide-react';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const CATS = ['general','music','events','local','contests'];

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [allNews, setAllNews] = useState([]);
  const [events, setEvents] = useState([]);
  const [pendingComments, setPendingComments] = useState([]);
  const [scheduleSlots, setScheduleSlots] = useState([]);
  const [jobApps, setJobApps] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [pushTokens, setPushTokens] = useState({ total: 0 });
  const [pushHistory, setPushHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [newsForm, setNewsForm] = useState({ title: '', content: '', category: 'general', summary: '' });
  const [npSong, setNpSong] = useState('');
  const [npArtist, setNpArtist] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [streamStation, setStreamStation] = useState('');
  const [streamTagline, setStreamTagline] = useState('');
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');

  // Modals
  const [editUser, setEditUser] = useState(null);
  const [editNews, setEditNews] = useState(null);
  const [editSchedule, setEditSchedule] = useState(null);
  const [editEvent, setEditEvent] = useState(null);
  const [emailApp, setEmailApp] = useState(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [newRole, setNewRole] = useState(null);
  const [editRole, setEditRole] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [st, us, rq, nw, ev, sc, ja, cm, rl, pm] = await Promise.all([
        getAdminStatsApi(), getAdminUsersApi(), getAdminRequestsApi(), getNewsApi(),
        getEventsApi(),
        getScheduleApi(), getJobApplicationsApi(), getPendingCommentsApi(),
        getRolesApi().catch(() => []), getPermissionsApi().catch(() => [])
      ]);
      setStats(st); setUsers(us); setRequests(rq); setAllNews(nw);
      setEvents(ev);
      setScheduleSlots(sc); setJobApps(ja); setPendingComments(cm);
      setRoles(rl); setPermissions(pm);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !['admin','dj','editor'].includes(user.role)) { navigate('/'); return; }
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
      });
    }
  }, [tab]);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  // Sidebar items
  const sidebar = [
    { key: 'overview', label: 'Overview', icon: LayoutGrid, roles: ['admin','dj','editor'] },
    { key: 'nowplaying', label: 'Stream Settings', icon: Radio, roles: ['admin','dj'] },
    { key: 'requests', label: 'Requests', icon: Music, roles: ['admin','dj'] },
    { key: 'users', label: 'Users', icon: Users, roles: ['admin'] },
    { key: 'content', label: 'Publish News', icon: FileText, roles: ['admin','editor'] },
    { key: 'manage-news', label: 'Manage News', icon: Newspaper, roles: ['admin','editor'] },
    { key: 'events', label: 'Upcoming Events', icon: Calendar, roles: ['admin'] },
    { key: 'comments', label: 'Comments', icon: MessageSquare, roles: ['admin','editor'] },
    { key: 'schedule', label: 'Schedule', icon: Calendar, roles: ['admin'] },
    { key: 'jobs', label: 'Job Applications', icon: Briefcase, roles: ['admin'] },
    { key: 'roles', label: 'Roles & Permissions', icon: Shield, roles: ['admin'] },
    { key: 'push', label: 'Push Notifications', icon: Bell, roles: ['admin'] },
  ].filter(s => s.roles.includes(user?.role));

  if (authLoading || loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-[#71717a]">Loading...</div>;
  if (!user || !['admin','dj','editor'].includes(user.role)) return null;

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
      <h2 className="text-2xl font-extrabold text-white tracking-[1px]">Stream Settings</h2>
      <p className="text-sm text-[#a1a1aa] mt-1 mb-6">Configure your radio stream source for automatic metadata updates.</p>

      {/* Stream URL Config */}
      <div className="bg-[#18181b] rounded-xl p-6 border border-[rgba(255,255,255,0.1)] mb-6">
        <h3 className="text-lg font-bold text-white mb-1">Stream Configuration</h3>
        <p className="text-xs text-[#71717a] mb-4">Enter your Live365, Shoutcast, Icecast, or other streaming URL. The system will automatically fetch now playing metadata from this stream.</p>
        <Label>STREAM URL</Label>
        <Input value={streamUrl} onChange={e => setStreamUrl(e.target.value)} placeholder="https://..." data-testid="stream-url-input" />
        <Label>STATION NAME</Label>
        <Input value={streamStation} onChange={e => setStreamStation(e.target.value)} placeholder="The Beat 515" />
        <Label>TAGLINE</Label>
        <Input value={streamTagline} onChange={e => setStreamTagline(e.target.value)} placeholder="Proud. Loud. Local." />
        <Btn pink className="w-full mt-6" onClick={async () => {
          try {
            const data = {};
            if (streamUrl) data.stream_url = streamUrl;
            if (streamStation) data.station_name = streamStation;
            if (streamTagline) data.tagline = streamTagline;
            await updateStreamConfigApi(data);
            alert('Stream config saved! The player and metadata polling will now use this URL.');
          } catch (e) { alert(e.message); }
        }} data-testid="save-stream-config-btn"><Save size={16} /> SAVE STREAM CONFIG</Btn>
      </div>

      {/* Info Card */}
      <div className="bg-[rgba(0,240,255,0.05)] rounded-xl p-5 border border-[rgba(0,240,255,0.15)]">
        <h4 className="text-sm font-bold text-[#00F0FF] mb-1">Automatic Updates</h4>
        <p className="text-xs text-[#a1a1aa] leading-relaxed">The now playing information is automatically pulled from your stream every 2 minutes. Song title, artist, and album art will update automatically when detected.</p>
      </div>
    </div>
  );

  const renderRequests = () => (
    <div data-testid="admin-requests">
      <h2 className="text-2xl font-extrabold text-white tracking-[1px]">Song Requests</h2>
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
      <h2 className="text-2xl font-extrabold text-white tracking-[1px]">User Management</h2>
      <p className="text-sm text-[#a1a1aa] mt-1 mb-6">Edit user details, manage roles, or remove accounts.</p>
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
                <td className="px-4 py-3"><span className={`text-[10px] font-extrabold tracking-[1px] px-2.5 py-1 rounded-full border ${u.role==='admin'?'border-[#FFF000]/30 text-[#FFF000]':u.role==='dj'?'border-[#FF007F]/30 text-[#FF007F]':u.role==='editor'?'border-[#00F0FF]/30 text-[#00F0FF]':'border-[#71717a]/30 text-[#71717a]'}`}>{u.role?.toUpperCase()}</span></td>
                <td className="px-4 py-3 text-[#71717a] text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString() : ''}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setEditUser({...u})} className="text-xs text-[#00F0FF] font-semibold hover:underline">Edit</button>
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
      <h2 className="text-2xl font-extrabold text-white tracking-[1px]">Publish News Article</h2>
      <p className="text-sm text-[#a1a1aa] mt-1 mb-6">Create and publish news articles.</p>
      <div className="bg-[#18181b] rounded-xl p-6 border border-[rgba(255,255,255,0.1)]">
        <Label>TITLE</Label>
        <Input value={newsForm.title} onChange={e => setNewsForm(p=>({...p,title:e.target.value}))} data-testid="news-title-input" />
        <Label>SUMMARY</Label>
        <Input value={newsForm.summary} onChange={e => setNewsForm(p=>({...p,summary:e.target.value}))} />
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
          try { await createNewsApi(newsForm); setNewsForm({title:'',content:'',category:'general',summary:''}); alert('Published!'); loadData(); } catch(e){ alert(e.message); }
        }} data-testid="news-create-btn"><Plus size={16} /> PUBLISH ARTICLE</Btn>
      </div>
    </div>
  );

  const renderManageNews = () => (
    <div>
      <h2 className="text-2xl font-extrabold text-white tracking-[1px]">Manage News</h2>
      <p className="text-sm text-[#a1a1aa] mt-1 mb-6">View, edit, or delete published articles.</p>
      <div className="bg-[#18181b] rounded-xl border border-[rgba(255,255,255,0.1)] overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-white/[0.03] border-b border-[rgba(255,255,255,0.05)]">
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Title</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Category</th>
            <th className="text-left px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Published</th>
            <th className="text-right px-4 py-3 text-[11px] font-bold text-[#71717a] tracking-[1px]">Actions</th>
          </tr></thead>
          <tbody>
            {allNews.map(a => (
              <tr key={a.news_id} className="border-b border-white/[0.04]">
                <td className="px-4 py-3 text-white font-medium">{a.title}</td>
                <td className="px-4 py-3 text-[#00F0FF] text-xs font-bold tracking-[1px]">{a.category?.toUpperCase()}</td>
                <td className="px-4 py-3 text-[#71717a] text-xs">{new Date(a.created_at).toLocaleDateString()}</td>
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
          <h2 className="text-2xl font-extrabold text-white tracking-[1px]">Upcoming Events</h2>
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
                <td className="px-4 py-3 text-[#71717a] text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
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
        <div><h2 className="text-2xl font-extrabold text-white tracking-[1px]">Schedule Management</h2><p className="text-sm text-[#a1a1aa] mt-1">Manage the weekly on-air schedule.</p></div>
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
      <h2 className="text-2xl font-extrabold text-white tracking-[1px]">Job Applications</h2>
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
        <div><h2 className="text-2xl font-extrabold text-white tracking-[1px]">Roles & Permissions</h2><p className="text-sm text-[#a1a1aa] mt-1">Manage user roles and what they can do.</p></div>
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
      <h2 className="text-2xl font-extrabold text-white tracking-[1px]">Push Notifications</h2>
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
        <h3 className="text-lg font-bold text-white mb-4">Send New Notification</h3>
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
          <h3 className="text-lg font-bold text-white mb-4">Recent Notifications</h3>
          <div className="space-y-3">
            {pushHistory.map((n, i) => (
              <div key={i} className="bg-[#09090b] rounded-lg p-4 border border-[rgba(255,255,255,0.05)]">
                <div className="flex justify-between"><span className="font-bold text-white">{n.title}</span><span className="text-xs text-[#71717a]">{n.result?.success||0}/{(n.result?.success||0)+(n.result?.failed||0)}</span></div>
                <p className="text-sm text-[#a1a1aa] mt-1">{n.body}</p>
                <p className="text-[10px] text-[#71717a] mt-2">{new Date(n.sent_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const panels = { overview: renderOverview, nowplaying: renderNowPlaying, requests: renderRequests, users: renderUsers, content: renderContent, 'manage-news': renderManageNews, events: renderEvents, comments: renderComments, schedule: renderSchedule, jobs: renderJobs, roles: renderRoles, push: renderPush };

  return (
    <div data-testid="admin-page">
      <WebNavBar />
      <div className="flex min-h-[calc(100vh-52px)]">
        {/* Sidebar */}
        <div className="w-[240px] bg-[#0d0d0f] border-r border-[rgba(255,255,255,0.1)] pt-6 px-4 flex-shrink-0" data-testid="admin-sidebar">
          <div className="flex items-center gap-2.5 px-2 mb-6">
            <Shield size={18} className="text-[#FF007F]" />
            <span className="text-base font-extrabold text-white tracking-[1px]">Dashboard</span>
          </div>
          {sidebar.map(s => (
            <button key={s.key} onClick={() => setTab(s.key)} data-testid={`admin-tab-${s.key}`}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg mb-1 text-left transition-colors ${tab===s.key?'bg-[rgba(255,0,127,0.1)]':''}`}>
              <s.icon size={16} className={tab===s.key?'text-[#FF007F]':'text-[#71717a]'} />
              <span className={`text-sm flex-1 ${tab===s.key?'text-white font-semibold':'text-[#71717a]'}`}>{s.label}</span>
              {s.key==='requests'&&pendingCount>0&&<span className="bg-[#FF007F] text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{pendingCount}</span>}
            </button>
          ))}
          <div className="h-px bg-[rgba(255,255,255,0.1)] my-4" />
          <Link to="/" className="flex items-center gap-3 px-3 py-3 text-[#71717a] hover:text-white transition-colors">
            <ChevronLeft size={16} /><span className="text-sm">Back to Site</span>
          </Link>
        </div>

        {/* Main content */}
        <div className="flex-1 p-8 max-w-[1000px]">
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
          <Label>ROLE</Label>
          <div className="flex gap-2 mt-1">{['listener','editor','dj','admin'].map(r => (
            <button key={r} onClick={() => setEditUser({...editUser, role:r})} className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-[1px] border ${editUser.role===r?'bg-[#00F0FF] border-[#00F0FF] text-[#09090b]':'bg-[#09090b] border-[rgba(255,255,255,0.1)] text-[#71717a]'}`}>{r.toUpperCase()}</button>
          ))}</div>
          <div className="flex gap-3 mt-6">
            <Btn pink className="flex-1" onClick={async () => { try { await updateUserApi(editUser.user_id, {name:editUser.name,email:editUser.email,role:editUser.role}); setEditUser(null); loadData(); alert('Updated!'); } catch(e){alert(e.message);} }}>SAVE</Btn>
            <Btn className="flex-1" onClick={() => setEditUser(null)}>CANCEL</Btn>
          </div>
        </>)}
      </Modal>

      <Modal show={!!editNews} onClose={() => setEditNews(null)} title="Edit News Article">
        {editNews && (<>
          <Label>TITLE</Label>
          <Input value={editNews.title||''} onChange={e => setEditNews({...editNews, title:e.target.value})} />
          <Label>CONTENT</Label>
          <Textarea rows={5} value={editNews.content||''} onChange={e => setEditNews({...editNews, content:e.target.value})} />
          <Label>CATEGORY</Label>
          <div className="flex gap-2 mt-1">{CATS.map(c => (
            <button key={c} onClick={() => setEditNews({...editNews, category:c})} className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-[1px] border ${editNews.category===c?'bg-[#00F0FF] border-[#00F0FF] text-[#09090b]':'bg-[#09090b] border-[rgba(255,255,255,0.1)] text-[#71717a]'}`}>{c.toUpperCase()}</button>
          ))}</div>
          <div className="flex gap-3 mt-6">
            <Btn pink className="flex-1" onClick={async () => { try { await updateNewsApi(editNews.news_id, {title:editNews.title,content:editNews.content,category:editNews.category,summary:editNews.summary}); setEditNews(null); loadData(); alert('Updated!'); } catch(e){alert(e.message);} }}>SAVE</Btn>
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
    </div>
  );
}
