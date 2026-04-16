import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { mediaUrl } from '../services/api';
import { User, Menu, X, ChevronDown } from 'lucide-react';
import ProfileDrawer from './ProfileDrawer';
import { MAIN_NAV_LINKS } from '../config/navLinks';

export default function WebNavBar() {
  const { user } = useAuth();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDesktopDropdown, setOpenDesktopDropdown] = useState(null);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [avatarFallbackData, setAvatarFallbackData] = useState(false);

  useEffect(() => {
    setAvatarBroken(false);
    setAvatarFallbackData(false);
  }, [user?.avatar_url, user?.avatar_data_url, user?.updated_at]);

  useEffect(() => {
    setOpenDesktopDropdown(null);
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  const links = MAIN_NAV_LINKS;
  const flatMobileLinks = links.flatMap((item) => (item.type === 'dropdown' ? item.items : [item]));
  const mobilePrimary = [
    { to: '/', label: 'HOME' },
    { to: '/news', label: 'NEWS' },
    { to: '/requests', label: 'REQUESTS' },
    { to: '/schedule', label: 'SCHEDULE' },
  ];
  const mobilePrimaryPaths = new Set(mobilePrimary.map((item) => item.to));
  const mobileMoreLinks = flatMobileLinks.filter((item) => !mobilePrimaryPaths.has(item.to));

  const isActivePath = (to) => {
    const pathOnly = to.split('?')[0];
    return location.pathname === pathOnly || (pathOnly === '/' && location.pathname === '/');
  };

  const isDropdownActive = (items = []) => items.some((item) => isActivePath(item.to));

  return (
    <>
      <nav className="sticky top-0 z-[100] glass border-b border-[rgba(255,0,127,0.12)] shadow-[0_4px_24px_rgba(0,0,0,0.35)]" data-testid="main-navbar">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF007F]/50 to-transparent pointer-events-none" aria-hidden />
        <div className="max-w-[1200px] mx-auto w-full flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
          <Link to="/" className="flex items-center group" data-testid="nav-logo">
            <span className="text-[18px] sm:text-[22px] font-black text-[#FF007F] tracking-[2px] font-display transition-colors group-hover:text-[#FF3399]">THE BEAT </span>
            <span className="text-[18px] sm:text-[22px] font-black text-white tracking-[2px] font-display">515</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => {
              if (l.type === 'dropdown') {
                const active = isDropdownActive(l.items);
                const open = openDesktopDropdown === l.label;
                return (
                  <div
                    key={l.label}
                    className="relative"
                    onMouseEnter={() => setOpenDesktopDropdown(l.label)}
                    onMouseLeave={() => setOpenDesktopDropdown((prev) => (prev === l.label ? null : prev))}
                  >
                    <button
                      type="button"
                      className={`text-xs font-bold tracking-[2px] py-1 transition-colors relative inline-flex items-center gap-1 ${active ? 'text-white after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-gradient-to-r after:from-[#FF007F] after:to-[#00F0FF]' : 'text-[#a1a1aa] hover:text-white'}`}
                      data-testid={`nav-${l.label.toLowerCase().replace(/\s/g, '-')}`}
                    >
                      {l.label}
                      <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && (
                      <div className="absolute left-0 top-full pt-1 min-w-[190px]">
                        <div className="rounded-xl border border-[rgba(255,255,255,0.12)] bg-[#111113] p-2 shadow-xl">
                        {l.items.map((item) => {
                          const subActive = isActivePath(item.to);
                          return (
                            <Link
                              key={item.to}
                              to={item.to}
                              className={`block rounded-lg px-3 py-2 text-[11px] font-bold tracking-[1.2px] transition-colors ${subActive ? 'bg-[rgba(255,0,127,0.12)] text-white' : 'text-[#a1a1aa] hover:bg-white/5 hover:text-white'}`}
                              data-testid={`nav-dropdown-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                            >
                              {item.label}
                            </Link>
                          );
                        })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              const active = isActivePath(l.to);
              return (
                <Link key={l.to} to={l.to} data-testid={`nav-${l.label.toLowerCase().replace(/\s/g, '-')}`}
                  className={`text-xs font-bold tracking-[2px] py-1 transition-colors relative
                    ${active ? 'text-white after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-gradient-to-r after:from-[#FF007F] after:to-[#00F0FF]' : 'text-[#a1a1aa] hover:text-white'}`}>
                  {l.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="md:hidden w-9 h-9 rounded-full bg-white/5 flex items-center justify-center"
              onClick={() => setMobileMenuOpen((v) => !v)}
              data-testid="nav-mobile-menu-toggle"
              aria-label="Open navigation menu"
            >
              {mobileMenuOpen ? <X size={16} className="text-white" /> : <Menu size={16} className="text-white" />}
            </button>
            {!user ? (
              <Link to="/login" data-testid="nav-login"
                className="flex items-center gap-1.5 bg-[#FF007F] rounded-full px-3 sm:px-5 py-2 sm:py-2.5 text-[11px] sm:text-xs font-extrabold text-white tracking-[1px] hover:opacity-90 transition-opacity">
                <User size={14} /> SIGN IN
              </Link>
            ) : (
              <button onClick={() => setProfileOpen(true)} data-testid="nav-profile" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                {user.avatar_url && !avatarBroken ? (
                  <img
                    src={avatarFallbackData && user.avatar_data_url ? user.avatar_data_url : mediaUrl(user.avatar_url, user.updated_at || user.user_id)}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border border-[rgba(255,255,255,0.15)]"
                    onError={() => {
                      if (!avatarFallbackData && user.avatar_data_url) {
                        setAvatarFallbackData(true);
                        return;
                      }
                      setAvatarBroken(true);
                    }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#FF007F] flex items-center justify-center">
                    <span className="text-white font-extrabold text-sm">{user.name?.charAt(0)}</span>
                  </div>
                )}
                <span className="text-white font-semibold text-sm hidden sm:inline">{user.name}</span>
              </button>
            )}
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-[210] bg-black/65" onClick={() => setMobileMenuOpen(false)}>
            <div className="absolute left-0 right-0 bottom-[72px] mx-3 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#0d0d0f] px-4 py-3 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-extrabold tracking-[1.5px] text-[#71717a]">MORE</p>
                <button type="button" onClick={() => setMobileMenuOpen(false)} className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
                  <X size={14} className="text-white" />
                </button>
              </div>
            <div className="grid grid-cols-2 gap-2">
              {mobileMoreLinks.map(l => {
                const active = isActivePath(l.to);
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid={`nav-mobile-${l.label.toLowerCase().replace(/\s/g, '-')}`}
                    className={`text-[11px] font-bold tracking-[1.2px] py-2.5 px-3 rounded-lg text-center transition-colors border ${active ? 'text-white border-[#FF007F]/45 bg-[rgba(255,0,127,0.12)]' : 'text-[#a1a1aa] border-[rgba(255,255,255,0.1)] hover:text-white'}`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </div>
          </div>
        )}
      </nav>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[200] border-t border-[rgba(255,255,255,0.1)] bg-[#0d0d0f]/95 backdrop-blur px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2">
        <div className="grid grid-cols-5 gap-1">
          {mobilePrimary.map((item) => {
            const active = isActivePath(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                data-testid={`bottom-nav-${item.label.toLowerCase()}`}
                className={`rounded-lg px-1 py-2 text-center text-[10px] font-extrabold tracking-[1px] transition-colors ${active ? 'text-white bg-[rgba(255,0,127,0.16)]' : 'text-[#a1a1aa]'}`}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            data-testid="bottom-nav-more"
            className={`rounded-lg px-1 py-2 text-center text-[10px] font-extrabold tracking-[1px] transition-colors ${mobileMenuOpen ? 'text-white bg-[rgba(0,240,255,0.16)]' : 'text-[#a1a1aa]'}`}
          >
            MORE
          </button>
        </div>
      </div>

      <div className="md:hidden h-[76px]" aria-hidden />

      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
