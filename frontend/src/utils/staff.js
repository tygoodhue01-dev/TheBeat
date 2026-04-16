/** Matches Admin Panel access: admin, DJ, or editor — not listeners. */
export function isStaffUser(user) {
  if (!user) return false;
  const roles = Array.isArray(user.roles) && user.roles.length ? user.roles : [user.role || 'listener'];
  return roles.some((r) => ['admin', 'dj', 'editor'].includes(r));
}
