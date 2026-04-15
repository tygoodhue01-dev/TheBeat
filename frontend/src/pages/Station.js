import React, { useState, useEffect, useRef } from 'react';
import { Radio, Mic2, Users, Heart, Briefcase, Send, CheckCircle, Phone, Mail, MapPin } from 'lucide-react';
import WebNavBar from '../components/Navbar';
import Footer from '../components/Footer';
import { submitJobApplicationApi } from '../services/api';

const SECTIONS = [
  { id: 'about', label: 'ABOUT' },
  { id: 'careers', label: 'CAREERS' },
  { id: 'contact', label: 'CONTACT' },
];

const positions = ['DJ / On-Air Talent', 'News Editor', 'Social Media Manager', 'Event Coordinator', 'Sales Representative', 'Other'];

export default function Station() {
  const [form, setForm] = useState({ position: '', name: '', email: '', phone: '', cover_letter: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const aboutRef = useRef(null);
  const careersRef = useRef(null);
  const contactRef = useRef(null);

  const scrollTo = (id) => {
    const map = { about: aboutRef, careers: careersRef, contact: contactRef };
    const el = map[id]?.current;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    const hash = (window.location.hash || '').replace(/^#/, '');
    if (hash && ['about', 'careers', 'contact'].includes(hash)) {
      setTimeout(() => scrollTo(hash), 100);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await submitJobApplicationApi(form);
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div data-testid="station-page">
      <WebNavBar />
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <h1 className="text-[24px] sm:text-[28px] font-black text-white tracking-[3px] font-display">STATION</h1>
        <p className="text-sm text-[#a1a1aa] mt-1 mb-6">About us, careers, and contact in one place.</p>

        <div className="flex flex-wrap gap-2 mb-10 sticky top-[52px] z-10 bg-[#09090b]/95 py-2 -mx-2 px-2 border-b border-[rgba(255,255,255,0.06)]">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollTo(s.id)}
              className="px-4 py-2 rounded-full text-[11px] font-extrabold tracking-[2px] bg-[#18181b] border border-[rgba(255,255,255,0.1)] text-[#a1a1aa] hover:text-white hover:border-[#FF007F]/40 transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* About */}
        <section ref={aboutRef} id="about" className="scroll-mt-24 mb-16">
          <h2 className="text-xl font-black text-white tracking-[2px] font-display mb-2">ABOUT</h2>
          <p className="text-lg text-[#FF007F] font-display font-bold mb-6">Proud. Loud. Local.</p>
          <div className="space-y-4">
            {[
              { icon: Radio, color: '#FF007F', title: 'Our Station', text: 'The Beat 515 is your premier Top 40 radio station, broadcasting live from the heart of the 515 area code. We bring you the hottest hits, breaking music news, and unforgettable events that keep our community connected through music.' },
              { icon: Mic2, color: '#00F0FF', title: 'Our DJs', text: 'Our talented lineup of DJs brings personality, energy, and passion to every show. From morning drives to late-night sessions, our on-air talent keeps the music flowing and the vibes right.' },
              { icon: Users, color: '#FFF000', title: 'Our Community', text: "We're more than a radio station; we're a community. Through our rewards program, live events, and interactive request line, we keep listeners engaged and give back to the community that supports us." },
              { icon: Heart, color: '#ef4444', title: 'Our Mission', text: 'To deliver the best Top 40 music experience while championing local artists, supporting community events, and creating meaningful connections through the power of music.' },
            ].map((s) => (
              <div key={s.title} className="bg-[#18181b] rounded-xl p-4 sm:p-6 border border-[rgba(255,255,255,0.1)]">
                <div className="flex items-center gap-3 mb-3">
                  <s.icon size={20} style={{ color: s.color }} />
                  <h3 className="font-display font-bold text-lg">{s.title}</h3>
                </div>
                <p className="text-sm text-[#a1a1aa] leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Careers */}
        <section ref={careersRef} id="careers" className="scroll-mt-24 mb-16">
          <h2 className="text-xl font-black text-white tracking-[2px] font-display flex items-center gap-3 mb-2">
            <Briefcase size={24} className="text-[#FF007F]" /> CAREERS
          </h2>
          <p className="text-sm text-[#a1a1aa] mb-6">Join the team at The Beat 515</p>
          {submitted ? (
            <div className="text-center py-12" data-testid="careers-success">
              <CheckCircle size={48} className="mx-auto text-green-400 mb-4" />
              <p className="text-lg font-bold font-display mb-2">Application Submitted!</p>
              <p className="text-[#71717a]">Thank you for your interest. We&apos;ll review your application and get back to you soon.</p>
            </div>
          ) : (
            <div className="bg-[#18181b] rounded-xl p-4 sm:p-6 border border-[rgba(255,255,255,0.1)]">
              <form onSubmit={handleSubmit} className="space-y-3" data-testid="careers-form">
                <select
                  value={form.position}
                  onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
                  required
                  data-testid="careers-position-select"
                  className="w-full bg-[#09090b] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 text-sm text-white focus:outline-none"
                >
                  <option value="" className="bg-[#09090b]">Select Position *</option>
                  {positions.map((p) => (
                    <option key={p} value={p} className="bg-[#09090b]">
                      {p}
                    </option>
                  ))}
                </select>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Full Name *"
                  required
                  data-testid="careers-name-input"
                  className="w-full bg-[#09090b] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 text-sm text-white placeholder:text-[#71717a] focus:border-[#FF007F] focus:outline-none"
                />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="Email *"
                  required
                  data-testid="careers-email-input"
                  className="w-full bg-[#09090b] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 text-sm text-white placeholder:text-[#71717a] focus:border-[#FF007F] focus:outline-none"
                />
                <input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="Phone *"
                  required
                  data-testid="careers-phone-input"
                  className="w-full bg-[#09090b] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 text-sm text-white placeholder:text-[#71717a] focus:border-[#FF007F] focus:outline-none"
                />
                <textarea
                  value={form.cover_letter}
                  onChange={(e) => setForm((p) => ({ ...p, cover_letter: e.target.value }))}
                  placeholder="Cover Letter *"
                  required
                  rows={5}
                  data-testid="careers-cover-letter-input"
                  className="w-full bg-[#09090b] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 text-sm text-white placeholder:text-[#71717a] focus:border-[#FF007F] focus:outline-none resize-none"
                />
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <button
                  type="submit"
                  data-testid="careers-submit-btn"
                  className="w-full bg-[#FF007F] rounded-full py-3.5 flex items-center justify-center gap-2 text-sm font-extrabold text-white tracking-[1px] hover:opacity-90"
                >
                  <Send size={16} /> Submit Application
                </button>
              </form>
            </div>
          )}
        </section>

        {/* Contact */}
        <section ref={contactRef} id="contact" className="scroll-mt-24">
          <h2 className="text-xl font-black text-white tracking-[2px] font-display mb-2">CONTACT</h2>
          <p className="text-sm text-[#a1a1aa] mb-6">Get in touch with The Beat 515</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: Radio, color: '#FF007F', bg: 'rgba(255,0,127,0.1)', title: 'Studio Line', sub: 'Call in during live shows', val: '(515) 515-BEAT' },
              { icon: Mail, color: '#00F0FF', bg: 'rgba(0,240,255,0.1)', title: 'Email', sub: 'General inquiries', val: 'info@thebeat515.com' },
              { icon: MapPin, color: '#FFF000', bg: 'rgba(255,240,0,0.1)', title: 'Location', sub: 'Visit our studio', val: '515 Main Street\nDes Moines, IA 50309' },
              { icon: Phone, color: '#22c55e', bg: 'rgba(34,197,94,0.1)', title: 'Business', sub: 'Advertising & partnerships', val: 'ads@thebeat515.com' },
            ].map((c) => (
              <div key={c.title} className="bg-[#18181b] rounded-xl p-6 border border-[rgba(255,255,255,0.1)]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: c.bg }}>
                    <c.icon size={18} style={{ color: c.color }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{c.title}</h3>
                    <p className="text-xs text-[#a1a1aa]">{c.sub}</p>
                  </div>
                </div>
                <p className="font-mono whitespace-pre-line" style={{ color: c.color }}>
                  {c.val}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
