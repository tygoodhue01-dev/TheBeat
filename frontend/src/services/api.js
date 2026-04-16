const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

async function readJsonResponse(res, fallback) {
  try {
    if (!res || !res.ok) return fallback;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}

async function publicGetJson(path, fallback) {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    return await readJsonResponse(res, fallback);
  } catch {
    return fallback;
  }
}

/** Full URL for uploaded files or relative paths stored on the API (e.g. /uploads/avatars/...) */
export function mediaUrl(pathOrUrl, version = '') {
  if (!pathOrUrl) return '';
  const base = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/$/, '');
  const raw = String(pathOrUrl).replace(/\\/g, '/');
  let built = '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const parsed = new URL(raw);
      // If avatar/media points to an old host, keep only known upload paths and rebuild from current backend URL.
      const uploadsIdx = parsed.pathname.indexOf('/uploads/');
      if (uploadsIdx !== -1) {
        built = `${base}${parsed.pathname.substring(uploadsIdx)}`;
      } else {
        built = raw;
      }
    } catch (_) {
      built = raw;
    }
  } else {
    const uploadsIdx = raw.indexOf('/uploads/');
    const normalized = uploadsIdx !== -1 ? raw.substring(uploadsIdx) : raw;
    const p = normalized.startsWith('/') ? normalized : `/${normalized}`;
    built = `${base}${p}`;
  }
  if (!version) return built;
  const sep = built.includes('?') ? '&' : '?';
  return `${built}${sep}v=${encodeURIComponent(version)}`;
}

function getToken() {
  return localStorage.getItem('access_token');
}
function getRefreshToken() {
  return localStorage.getItem('refresh_token');
}

async function authFetch(url, options = {}) {
  let token = getToken();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = { ...(options.headers || {}) };
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    const rt = getRefreshToken();
    if (rt) {
      const rr = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST', headers: { Authorization: `Bearer ${rt}`, 'Content-Type': 'application/json' }
      });
      if (rr.ok) {
        const d = await rr.json();
        localStorage.setItem('access_token', d.access_token);
        headers['Authorization'] = `Bearer ${d.access_token}`;
        return fetch(url, { ...options, headers });
      }
    }
  }
  return res;
}

function fmtErr(d) {
  if (!d) return 'Something went wrong.';
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map(e => e?.msg || JSON.stringify(e)).join(' ');
  if (d.msg) return d.msg;
  return String(d);
}

// Auth
export async function loginApi(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(fmtErr(data.detail));
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);
  return data.user;
}

export async function registerApi(email, password, name) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(fmtErr(data.detail));
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);
  return data.user;
}

export async function getMeApi() {
  const res = await authFetch(`${API_BASE}/auth/me`);
  if (!res.ok) return null;
  return res.json();
}

export async function logoutApi() {
  await authFetch(`${API_BASE}/auth/logout`, { method: 'POST' }).catch(() => {});
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

// News
export async function getNewsApi(category) {
  const q = category ? `?category=${category}` : '';
  const data = await publicGetJson(`/news${q}`, []);
  return Array.isArray(data) ? data : [];
}
export async function getNewsDetailApi(id) {
  try {
    const res = await fetch(`${API_BASE}/news/${id}`);
    if (!res.ok) throw new Error('Not found');
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) throw new Error('Not found');
    return await res.json();
  } catch {
    throw new Error('Not found');
  }
}
export async function createNewsApi(data) {
  const res = await authFetch(`${API_BASE}/news`, { method: 'POST', body: JSON.stringify(data) });
  const r = await res.json();
  if (!res.ok) throw new Error(fmtErr(r.detail));
  return r;
}
export async function deleteNewsApi(id) {
  const res = await authFetch(`${API_BASE}/news/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

// Requests
export async function getRequestsApi() {
  const data = await publicGetJson('/requests', []);
  return Array.isArray(data) ? data : [];
}
export async function createRequestApi(data) {
  const res = await authFetch(`${API_BASE}/requests`, { method: 'POST', body: JSON.stringify(data) });
  const r = await res.json();
  if (!res.ok) throw new Error(fmtErr(r.detail));
  return r;
}
export async function getAdminRequestsApi(status) {
  const q = status ? `?status=${status}` : '';
  const res = await authFetch(`${API_BASE}/admin/requests${q}`);
  if (!res.ok) return [];
  return res.json();
}
export async function updateRequestStatusApi(id, status) {
  const res = await authFetch(`${API_BASE}/requests/${id}/status?status=${status}`, { method: 'PUT' });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}
export async function deleteRequestApi(id) {
  const res = await authFetch(`${API_BASE}/requests/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

// Chat
export async function getChatApi() {
  const data = await publicGetJson('/requests/chat', []);
  return Array.isArray(data) ? data : [];
}
export async function sendChatApi(message) {
  const res = await authFetch(`${API_BASE}/requests/chat`, { method: 'POST', body: JSON.stringify({ message }) });
  const r = await res.json();
  if (!res.ok) throw new Error(fmtErr(r.detail));
  return r;
}

// Shows
export async function getShowsApi() {
  const data = await publicGetJson('/shows', []);
  return Array.isArray(data) ? data : [];
}
export async function createShowApi(data) {
  const res = await authFetch(`${API_BASE}/shows`, { method: 'POST', body: JSON.stringify(data) });
  const r = await res.json();
  if (!res.ok) throw new Error(fmtErr(r.detail));
  return r;
}
export async function updateShowApi(showId, data) {
  const res = await authFetch(`${API_BASE}/shows/${showId}`, { method: 'PUT', body: JSON.stringify(data) });
  const r = await res.json();
  if (!res.ok) throw new Error(fmtErr(r.detail));
  return r;
}
export async function deleteShowApi(showId) {
  const res = await authFetch(`${API_BASE}/shows/${showId}`, { method: 'DELETE' });
  const r = await res.json();
  if (!res.ok) throw new Error(fmtErr(r.detail));
  return r;
}

// Now Playing
const NOW_PLAYING_DEFAULT = { song_title: 'The Beat 515', artist: 'Live Radio' };
export async function getNowPlayingApi() {
  const data = await publicGetJson('/now-playing', NOW_PLAYING_DEFAULT);
  if (!data || typeof data !== 'object') return { ...NOW_PLAYING_DEFAULT };
  return { ...NOW_PLAYING_DEFAULT, ...data };
}
export async function updateNowPlayingApi(data) {
  const res = await authFetch(`${API_BASE}/now-playing`, { method: 'PUT', body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

// Stream Config
const STREAM_CONFIG_DEFAULT = {
  stream_url: '',
  station_name: 'The Beat 515',
  tagline: 'Proud. Loud. Local.',
  maintenance_mode: false,
  maintenance_message: '',
};
export async function getStreamConfigApi() {
  const data = await publicGetJson('/stream-config', { ...STREAM_CONFIG_DEFAULT });
  if (!data || typeof data !== 'object') return { ...STREAM_CONFIG_DEFAULT };
  return { ...STREAM_CONFIG_DEFAULT, ...data };
}
export async function updateStreamConfigApi(data) {
  const res = await authFetch(`${API_BASE}/stream-config`, { method: 'PUT', body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to update stream config');
  return res.json();
}

// Admin Panel (API routes under /admin)
export async function getAdminUsersApi() {
  const res = await authFetch(`${API_BASE}/admin/users`);
  if (!res.ok) return [];
  return res.json();
}
export async function getAdminStatsApi() {
  const res = await authFetch(`${API_BASE}/admin/stats`);
  if (!res.ok) return {};
  return res.json();
}
export async function updateUserApi(id, data) {
  const res = await authFetch(`${API_BASE}/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}
export async function deleteUserApi(id) {
  const res = await authFetch(`${API_BASE}/admin/users/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}
export async function createAdminUserApi(data) {
  const res = await authFetch(`${API_BASE}/admin/users`, { method: 'POST', body: JSON.stringify(data) });
  const r = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(fmtErr(r.detail));
  return r;
}

// Rewards
export async function getRewardsApi() {
  const data = await publicGetJson('/rewards', []);
  return Array.isArray(data) ? data : [];
}
export async function getMyPointsApi() {
  const res = await authFetch(`${API_BASE}/rewards/my-points`);
  if (!res.ok) return { points: 0, lifetime_points: 0 };
  return res.json();
}
export async function getMyHistoryApi() {
  const res = await authFetch(`${API_BASE}/rewards/my-history`);
  if (!res.ok) return [];
  return res.json();
}
export async function getLeaderboardApi() {
  const data = await publicGetJson('/rewards/leaderboard', []);
  return Array.isArray(data) ? data : [];
}
export async function dailyCheckInApi() {
  const res = await authFetch(`${API_BASE}/rewards/check-in`, { method: 'POST' });
  const d = await res.json();
  if (!res.ok) throw new Error(fmtErr(d.detail));
  return d;
}
export async function redeemRewardApi(rewardId) {
  const res = await authFetch(`${API_BASE}/rewards/redeem`, { method: 'POST', body: JSON.stringify({ reward_id: rewardId }) });
  const d = await res.json();
  if (!res.ok) throw new Error(fmtErr(d.detail));
  return d;
}

// Events, Contests, Podcasts
export async function getEventsApi() {
  const data = await publicGetJson('/events', []);
  return Array.isArray(data) ? data : [];
}
export async function createEventApi(data) {
  const res = await authFetch(`${API_BASE}/events`, { method: 'POST', body: JSON.stringify(data) });
  const r = await res.json();
  if (!res.ok) throw new Error(fmtErr(r.detail));
  return r;
}
export async function updateEventApi(eventId, data) {
  const res = await authFetch(`${API_BASE}/events/${eventId}`, { method: 'PUT', body: JSON.stringify(data) });
  const r = await res.json();
  if (!res.ok) throw new Error(fmtErr(r.detail));
  return r;
}
export async function deleteEventApi(eventId) {
  const res = await authFetch(`${API_BASE}/events/${eventId}`, { method: 'DELETE' });
  const r = await res.json();
  if (!res.ok) throw new Error(fmtErr(r.detail));
  return r;
}
export async function getContestsApi(includeInactive = false) {
  const q = includeInactive ? '?include_inactive=true' : '';
  const data = await publicGetJson(`/contests${q}`, []);
  return Array.isArray(data) ? data : [];
}
export async function createContestApi(data) {
  const res = await authFetch(`${API_BASE}/contests`, { method: 'POST', body: JSON.stringify(data) });
  const r = await res.json();
  if (!res.ok) throw new Error(fmtErr(r.detail));
  return r;
}
export async function updateContestApi(contestId, data) {
  const res = await authFetch(`${API_BASE}/contests/${contestId}`, { method: 'PUT', body: JSON.stringify(data) });
  const r = await res.json();
  if (!res.ok) throw new Error(fmtErr(r.detail));
  return r;
}
export async function deleteContestApi(contestId) {
  const res = await authFetch(`${API_BASE}/contests/${contestId}`, { method: 'DELETE' });
  const r = await res.json();
  if (!res.ok) throw new Error(fmtErr(r.detail));
  return r;
}
export async function getPodcastsApi() {
  const data = await publicGetJson('/podcasts', []);
  return Array.isArray(data) ? data : [];
}
export async function createPodcastApi(data) {
  const res = await authFetch(`${API_BASE}/podcasts`, { method: 'POST', body: JSON.stringify(data) });
  const r = await res.json();
  if (!res.ok) throw new Error(fmtErr(r.detail));
  return r;
}
export async function updatePodcastApi(podcastId, data) {
  const res = await authFetch(`${API_BASE}/podcasts/${podcastId}`, { method: 'PUT', body: JSON.stringify(data) });
  const r = await res.json();
  if (!res.ok) throw new Error(fmtErr(r.detail));
  return r;
}
export async function deletePodcastApi(podcastId) {
  const res = await authFetch(`${API_BASE}/podcasts/${podcastId}`, { method: 'DELETE' });
  const r = await res.json();
  if (!res.ok) throw new Error(fmtErr(r.detail));
  return r;
}

// Recently Played
export async function getRecentlyPlayedApi(limit = 50) {
  const data = await publicGetJson(`/recently-played?limit=${limit}`, []);
  return Array.isArray(data) ? data : [];
}

// Schedule
export async function getScheduleApi() {
  const data = await publicGetJson('/schedule', []);
  return Array.isArray(data) ? data : [];
}
export async function createScheduleSlotApi(data) {
  const res = await authFetch(`${API_BASE}/admin/schedule`, { method: 'POST', body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}
export async function deleteScheduleSlotApi(id) {
  const res = await authFetch(`${API_BASE}/admin/schedule/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}
export async function updateScheduleSlotApi(id, data) {
  const res = await authFetch(`${API_BASE}/admin/schedule/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

// Profile
export async function updateProfileApi(data) {
  const res = await authFetch(`${API_BASE}/users/me/profile`, { method: 'PUT', body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

export async function changeMyEmailApi(email, currentPassword) {
  const res = await authFetch(`${API_BASE}/users/me/email`, {
    method: 'PUT',
    body: JSON.stringify({ email, current_password: currentPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(fmtErr(data.detail));
  if (data.access_token) localStorage.setItem('access_token', data.access_token);
  if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
  return data.user;
}

export async function changeMyPasswordApi(currentPassword, newPassword) {
  const res = await authFetch(`${API_BASE}/users/me/password`, {
    method: 'PUT',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(fmtErr(data.detail));
  return data;
}

export async function uploadAvatarApi(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await authFetch(`${API_BASE}/users/me/avatar`, { method: 'POST', body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(fmtErr(data.detail));
  return data;
}
export async function getMyFavoritesApi() {
  const res = await authFetch(`${API_BASE}/users/me/favorites`);
  if (!res.ok) return [];
  return res.json();
}
export async function toggleSongFavoriteApi(songId, songTitle = '', artist = '') {
  const q = new URLSearchParams({ song_title: songTitle, artist });
  const res = await authFetch(`${API_BASE}/songs/${songId}/favorite?${q.toString()}`, { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(fmtErr(data.detail || data.message));
  return data;
}
export async function deleteSongFavoriteApi(songId, songTitle = '', artist = '', songKey = '') {
  const q = new URLSearchParams({ song_title: songTitle, artist, song_key: songKey });
  const res = await authFetch(`${API_BASE}/songs/${songId}/favorite?${q.toString()}`, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(fmtErr(data.detail || data.message));
  return data;
}
export async function getMyStatsApi() {
  const res = await authFetch(`${API_BASE}/users/me/stats`);
  if (!res.ok) return {};
  return res.json();
}
export async function getFavoriteStatsApi() {
  const res = await authFetch(`${API_BASE}/admin/favorites/stats`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(fmtErr(data.detail || data.message));
  return data;
}
export async function getAnalyticsOverviewApi() {
  const res = await authFetch(`${API_BASE}/analytics/overview`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(fmtErr(data.detail || data.message));
  return data;
}
export async function getUserAnalyticsApi() {
  const res = await authFetch(`${API_BASE}/analytics/users`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(fmtErr(data.detail || data.message));
  return data;
}
export async function getTopRatedSongsApi(limit = 10) {
  const data = await publicGetJson(`/charts/top-rated?limit=${limit}`, []);
  return Array.isArray(data) ? data : [];
}
export async function getMostPlayedSongsApi(limit = 10) {
  const data = await publicGetJson(`/charts/most-played?limit=${limit}`, []);
  return Array.isArray(data) ? data : [];
}
export async function getTrendingSongsApi(limit = 10) {
  const data = await publicGetJson(`/charts/trending?limit=${limit}`, []);
  return Array.isArray(data) ? data : [];
}

// Job Applications
export async function submitJobApplicationApi(data) {
  const res = await fetch(`${API_BASE}/job-applications`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}
export async function getJobApplicationsApi() {
  const res = await authFetch(`${API_BASE}/admin/job-applications`);
  if (!res.ok) return [];
  return res.json();
}
export async function updateJobApplicationStatusApi(id, status) {
  const res = await authFetch(`${API_BASE}/admin/job-applications/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

// Polls
export async function getPollsApi() {
  const data = await publicGetJson('/polls', []);
  return Array.isArray(data) ? data : [];
}
export async function votePollApi(pollId, optionIndex) {
  const res = await authFetch(`${API_BASE}/polls/${pollId}/vote`, { method: 'POST', body: JSON.stringify({ option_index: optionIndex }) });
  const d = await res.json();
  if (!res.ok) throw new Error(fmtErr(d.detail));
  return d;
}

// Comments moderation
export async function getPendingCommentsApi() {
  const res = await authFetch(`${API_BASE}/admin/comments/pending`);
  if (!res.ok) return [];
  return res.json();
}
export async function approveCommentApi(commentId) {
  const res = await authFetch(`${API_BASE}/admin/comments/${commentId}/approve`, { method: 'PUT' });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}
export async function deleteCommentApi(commentId) {
  const res = await authFetch(`${API_BASE}/admin/comments/${commentId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

// Public comments (news/show/event)
export async function getCommentsApi(postType, postId) {
  const data = await publicGetJson(`/comments/${encodeURIComponent(postType)}/${encodeURIComponent(postId)}`, []);
  return Array.isArray(data) ? data : [];
}
export async function createCommentApi(data) {
  const res = await authFetch(`${API_BASE}/comments`, { method: 'POST', body: JSON.stringify(data) });
  const r = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(fmtErr(r.detail));
  return r;
}

// News update
export async function updateNewsApi(newsId, data) {
  const res = await authFetch(`${API_BASE}/news/${newsId}`, { method: 'PUT', body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

// Roles & Permissions
export async function getRolesApi() {
  const res = await authFetch(`${API_BASE}/admin/roles`);
  if (!res.ok) return [];
  return res.json();
}
export async function getPermissionsApi() {
  const res = await authFetch(`${API_BASE}/admin/permissions`);
  if (!res.ok) return [];
  return res.json();
}
export async function createRoleApi(data) {
  const res = await authFetch(`${API_BASE}/admin/roles`, { method: 'POST', body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}
export async function updateRoleApi(roleId, data) {
  const res = await authFetch(`${API_BASE}/admin/roles/${roleId}`, { method: 'PUT', body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}
export async function deleteRoleApi(roleId) {
  const res = await authFetch(`${API_BASE}/admin/roles/${roleId}`, { method: 'DELETE' });
  if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Failed'); }
  return res.json();
}

// Push Notifications
export async function getPushTokensApi() {
  const res = await authFetch(`${API_BASE}/admin/push/tokens`);
  if (!res.ok) return { total: 0, tokens: [] };
  return res.json();
}
export async function sendPushNotificationApi(title, body, target = 'all') {
  const res = await authFetch(`${API_BASE}/admin/push/send`, { method: 'POST', body: JSON.stringify({ title, body, target }) });
  if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Failed'); }
  return res.json();
}
export async function getPushHistoryApi() {
  const res = await authFetch(`${API_BASE}/admin/push/history`);
  if (!res.ok) return [];
  return res.json();
}

// Email to applicant
export async function sendEmailToApplicantApi(appId, emailData) {
  const res = await authFetch(`${API_BASE}/admin/job-applications/${appId}/send-email`, { method: 'POST', body: JSON.stringify(emailData) });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

export async function deleteJobApplicationApi(appId) {
  const res = await authFetch(`${API_BASE}/admin/job-applications/${appId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

// DJs
export async function getDjsApi() {
  const data = await publicGetJson('/djs', []);
  return Array.isArray(data) ? data : [];
}
export async function getDjDetailApi(userId) {
  try {
    const res = await fetch(`${API_BASE}/djs/${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error('Not found');
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) throw new Error('Not found');
    return await res.json();
  } catch {
    throw new Error('DJ not found');
  }
}

// Newsletter
export async function subscribeNewsletterApi(email, name = '') {
  const res = await fetch(`${API_BASE}/newsletter/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(fmtErr(data.detail || data.message));
  return data;
}
