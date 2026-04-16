/** Primary site navigation for navbar categories */
export const MAIN_NAV_LINKS = [
  { type: 'link', to: '/', label: 'HOME' },
  { type: 'link', to: '/news', label: 'NEWS' },
  {
    type: 'dropdown',
    label: 'DISCOVER',
    items: [
      { to: '/events', label: 'EVENTS' },
      { to: '/station', label: 'STATION' },
      { to: '/about', label: 'ABOUT' },
      { to: '/careers', label: 'CAREERS' },
      { to: '/contact', label: 'CONTACT' },
    ],
  },
  {
    type: 'dropdown',
    label: 'LISTEN',
    items: [
      { to: '/requests', label: 'REQUEST LINE' },
      { to: '/schedule', label: 'SCHEDULE' },
      { to: '/recently-played', label: 'RECENTLY PLAYED' },
      { to: '/leaderboard', label: 'LEADERBOARD' },
    ],
  },
];

/** Extra public pages often linked from the app */
export const MORE_SITE_LINKS = [
  { to: '/rewards', label: 'REWARDS' },
  { to: '/rewards?tab=leaderboard', label: 'LEADERBOARD' },
  { to: '/recently-played', label: 'RECENTLY PLAYED' },
];
