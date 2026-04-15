import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { mediaUrl } from '../services/api';
import { User, Menu, X } from 'lucide-react';
import ProfileDrawer from './ProfileDrawer';
import { MAIN_NAV_LINKS } from '../config/navLinks';

export default function WebNavBar() {
  const { user } = useAuth();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const links = MAIN_NAV_LINKS;

  return (
    <>
      <nav className="sticky top-0 z-[100] bg-[rgba(9,9,11,0.95)] border-b border-[rgba(255,0,127,0.15)]" data-testid="main-navbar">
        <div className="max-w-[1200px] mx-auto w-full flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
          <Link to="/" className="flex items-center" data-testid="nav-logo">
            <span className="text-[18px] sm:text-[22px] font-black text-[#FF007F] tracking-[2px] font-display">THE BEAT </span>
            <span className="text-[18px] sm:text-[22px] font-black text-white tracking-[2px] font-display">515</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {links.map(l => {
              const pathOnly = l.to.split('?')[0];
              const active = location.pathname === pathOnly || (pathOnly === '/' && location.pathname === '/');
              return (
              <Link key={l.to} to={l.to} data-testid={`nav-${l.label.toLowerCase().replace(/\s/g, '-')}`}
                className={`text-xs font-bold tracking-[2px] py-1 transition-colors
                  ${active ? 'text-white' : 'text-[#a1a1aa] hover:text-white'}`}>
                {l.label}
              </Link>
            );})}
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
                {user.avatar_url ? (
                  <img src={mediaUrl(user.avatar_url)} alt="" className="w-8 h-8 rounded-full object-cover border border-[rgba(255,255,255,0.15)]" />
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
          <div className="md:hidden border-t border-[rgba(255,255,255,0.08)] px-4 sm:px-6 py-3 bg-[#0d0d0f]">
            <div className="grid grid-cols-2 gap-2">
              {links.map(l => {
                const pathOnly = l.to.split('?')[0];
                const active = location.pathname === pathOnly || (pathOnly === '/' && location.pathname === '/');
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
        )}
      </nav>

      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
