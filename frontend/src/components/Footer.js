import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Twitter, Facebook } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-16 bg-[#18181b] border-t border-[rgba(255,0,127,0.15)] pt-10 pb-6" data-testid="footer">
      <div className="max-w-[1200px] mx-auto w-full px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="flex-1">
          <div className="text-xl font-black text-white tracking-[2px] font-display">THE BEAT 515</div>
          <div className="text-[11px] text-[#00F0FF] tracking-[3px] font-bold mt-1">Proud. Loud. Local.</div>
          <p className="text-[13px] text-[#a1a1aa] mt-3 leading-5 max-w-sm">
            Your #1 Top 40 radio station serving the 515 area. Playing the biggest hits, supporting local artists, and keeping the community connected through music.
          </p>
        </div>

        {/* Listen */}
        <div className="flex-1">
          <div className="text-[11px] font-extrabold text-[#FFF000] tracking-[2px] mb-3">LISTEN</div>
          <div className="space-y-2">
            <Link to="/" className="block text-[13px] text-[#a1a1aa] hover:text-white transition-colors">Live Stream</Link>
            <Link to="/schedule" className="block text-[13px] text-[#a1a1aa] hover:text-white transition-colors">Show Schedule</Link>
            <Link to="/" className="block text-[13px] text-[#a1a1aa] hover:text-white transition-colors">Podcasts</Link>
            <Link to="/requests" className="block text-[13px] text-[#a1a1aa] hover:text-white transition-colors">Request Line</Link>
          </div>
        </div>

        {/* Connect */}
        <div className="flex-1">
          <div className="text-[11px] font-extrabold text-[#FFF000] tracking-[2px] mb-3">CONNECT</div>
          <div className="space-y-2">
            <Link to="/station#contact" className="block text-[13px] text-[#a1a1aa] hover:text-white transition-colors">Contact Us</Link>
            <Link to="/station#contact" className="block text-[13px] text-[#a1a1aa] hover:text-white transition-colors">Advertise</Link>
            <Link to="/station#careers" className="block text-[13px] text-[#a1a1aa] hover:text-white transition-colors">Careers</Link>
            <Link to="/" className="block text-[13px] text-[#a1a1aa] hover:text-white transition-colors">Contest Rules</Link>
          </div>
        </div>

        {/* Follow */}
        <div className="flex-1">
          <div className="text-[11px] font-extrabold text-[#FFF000] tracking-[2px] mb-3">FOLLOW US</div>
          <div className="flex gap-2.5">
            {[
              { Icon: Instagram, href: 'https://www.instagram.com/TheBeat515/', label: 'Instagram' },
              { Icon: Twitter, href: 'https://x.com/TheBeat515', label: 'X (Twitter)' },
              { Icon: Facebook, href: 'https://www.facebook.com/TheBeat515/', label: 'Facebook' },
            ].map(({ Icon, href, label }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
              >
                <Icon size={16} className="text-white" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto w-full px-4 sm:px-6 lg:px-8 mt-6 pt-4 border-t border-[rgba(255,255,255,0.1)]">
        <p className="text-xs text-[#71717a] text-center sm:text-left">&copy; 2026 The Beat 515. All rights reserved.</p>
      </div>
    </footer>
  );
}
