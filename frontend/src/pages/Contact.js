import React from 'react';
import { Link } from 'react-router-dom';
import WebNavBar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Contact() {
  return (
    <div data-testid="contact-page">
      <WebNavBar />
      <main className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-[26px] sm:text-[30px] font-black text-white tracking-[2px] font-display">CONTACT</h1>
        <p className="text-sm text-[#a1a1aa] mt-3 leading-relaxed">
          Reach out to The Beat 515 for programming, events, and partnerships.
        </p>
        <div className="mt-6 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#18181b] p-5">
          <p className="text-[#a1a1aa] text-sm leading-relaxed">
            Phone, email, and social links are all listed in the station contact section.
          </p>
          <Link to="/station#contact" className="inline-flex mt-4 rounded-full bg-[#FF007F] px-4 py-2 text-xs font-extrabold tracking-[1px] text-white hover:opacity-90">
            VIEW CONTACT OPTIONS
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
