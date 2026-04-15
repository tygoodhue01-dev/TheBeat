const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

/** Full URL for uploaded files or relative paths stored on the API (e.g. /uploads/avatars/...) */
export function mediaUrl(pathOrUrl) {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl;
  const base = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/$/, '');
  const p = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${p}`;
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
  const res = await fetch(`${API_BASE}/news${q}`);
  if (!res.ok) return [];
  return res.json();
}
export async function getNewsDetailApi(id) {
  const res = await fetch(`${API_BASE}/news/${id}`);
  if (!res.ok) throw new Error('Not found');
  return res.json();
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
  const res = await fetch(`${API_BASE}/requests`);
  if (!res.ok) return [];
  return res.json();
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
  const res = await fetch(`${API_BASE}/requests/chat`);
  if (!res.ok) return [];
  return res.json();
}
export async function sendChatApi(message) {
  const res = await authFetch(`${API_BASE}/requests/chat`, { method: 'POST', body: JSON.stringify({ message }) });
  const r = await res.json();
  if (!res.ok) throw new Error(fmtErr(r.detail));
  return r;
}

// Shows
export async function getShowsApi() {
  const res = await fetch(`${API_BASE}/shows`);
  if (!res.ok) return [];
  return res.json();
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
export async function getNowPlayingApi() {
  const res = await fetch(`${API_BASE}/now-playing`);
  if (!res.ok) return { song_title: 'The Beat 515', artist: 'Live Radio' };
  return res.json();
}
export async function updateNowPlayingApi(data) {
  const res = await authFetch(`${API_BASE}/now-playing`, { method: 'PUT', body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

// Stream Config
export async function getStreamConfigApi() {
  const res = await fetch(`${API_BASE}/stream-config`);
  if (!res.ok) return { stream_url: '', station_name: 'The Beat 515', tagline: 'Proud. Loud. Local.' };
  return res.json();
}
export async function updateStreamConfigApi(data) {
  const res = await authFetch(`${API_BASE}/stream-config`, { method: 'PUT', body: JSON.stringify(data) });
  if (!res.ok) throw new Error('Failed to update stream config');
  return res.json();
}

// Admin
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

// Rewards
export async function getRewardsApi() {
  const res = await fetch(`${API_BASE}/rewards`);
  if (!res.ok) return [];
  return res.json();
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
  const res = await fetch(`${API_BASE}/rewards/leaderboard`);
  if (!res.ok) return [];
  return res.json();
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
  const res = await fetch(`${API_BASE}/events`);
  if (!res.ok) return [];
  return res.json();
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
  const res = await fetch(`${API_BASE}/contests${q}`);
  if (!res.ok) return [];
  return res.json();
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
  const res = await fetch(`${API_BASE}/podcasts`);
  if (!res.ok) return [];
  return res.json();
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
  const res = await fetch(`${API_BASE}/recently-played?limit=${limit}`);
  if (!res.ok) return [];
  return res.json();
}

// Schedule
export async function getScheduleApi() {
  const res = await fetch(`${API_BASE}/schedule`);
  if (!res.ok) return [];
  return res.json();
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
export async function getMyStatsApi() {
  const res = await authFetch(`${API_BASE}/users/me/stats`);
  if (!res.ok) return {};
  return res.json();
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
  const res = await fetch(`${API_BASE}/polls`);
  if (!res.ok) return [];
  return res.json();
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
  const res = await fetch(`${API_BASE}/djs`);
  if (!res.ok) return [];
  return res.json();
}
