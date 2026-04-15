import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { getRequestsApi, createRequestApi, getChatApi, sendChatApi } from '../services/api';
import WebNavBar from '../components/Navbar';
import Footer from '../components/Footer';
import { Send, Music } from 'lucide-react';
import { formatTimeCentral } from '../utils/time';

export default function Requests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [chat, setChat] = useState([]);
  const [song, setSong] = useState('');
  const [artist, setArtist] = useState('');
  const [msg, setMsg] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    Promise.all([getRequestsApi(), getChatApi()]).then(([r, c]) => { setRequests(r); setChat(c); });
  }, []);

  useEffect(() => {
    const iv = setInterval(() => getChatApi().then(setChat), 5000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [chat]);

  const getRoleBadgeColor = (role) => {
    switch (role) { case 'admin': return '#FFF000'; case 'dj': return '#FF007F'; case 'editor': return '#00F0FF'; default: return '#71717a'; }
  };

  const submitRequest = async () => {
    if (!song.trim() || !user) return;
    setSubmitting(true);
    try {
      await createRequestApi({ song_title: song, artist, message: msg });
      setSong(''); setArtist(''); setMsg('');
      const [r, c] = await Promise.all([getRequestsApi(), getChatApi()]);
      setRequests(r); setChat(c);
    } catch (e) { alert(e.message); }
    setSubmitting(false);
  };

  const sendChat = async () => {
    if (!chatInput.trim() || !user) return;
    try {
      await sendChatApi(chatInput);
      setChatInput('');
      setChat(await getChatApi());
    } catch (e) { alert(e.message); }
  };

  return (
    <div data-testid="requests-page">
      <WebNavBar />
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <h1 className="text-[24px] sm:text-[28px] font-black text-white tracking-[3px] font-display">REQUEST LINE</h1>
        <p className="text-sm text-[#a1a1aa] mt-1">Make your voice heard on The Beat 515</p>

        <div className="flex flex-col lg:flex-row gap-8 mt-8">
          {/* Request Form */}
          <div className="flex-1">
            <div className="bg-[#18181b] rounded-xl p-6 border border-[rgba(255,255,255,0.1)]" data-testid="request-form">
              <h2 className="text-lg font-bold text-white mb-4">Drop a Request</h2>
              {!user ? (
                <p className="text-[#71717a] text-sm">Please <Link to="/login" className="text-[#FF007F]">sign in</Link> to make requests.</p>
              ) : (
                <>
                  <label className="text-xs font-bold text-[#00F0FF] tracking-[2px] mb-1 block">SONG TITLE *</label>
                  <input value={song} onChange={e => setSong(e.target.value)} data-testid="request-song-input"
                    className="w-full bg-[#09090b] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 text-sm text-white mb-3 focus:border-[#FF007F] focus:outline-none" />
                  <label className="text-xs font-bold text-[#00F0FF] tracking-[2px] mb-1 block">ARTIST</label>
                  <input value={artist} onChange={e => setArtist(e.target.value)} data-testid="request-artist-input"
                    className="w-full bg-[#09090b] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 text-sm text-white mb-3 focus:border-[#FF007F] focus:outline-none" />
                  <label className="text-xs font-bold text-[#00F0FF] tracking-[2px] mb-1 block">MESSAGE</label>
                  <input value={msg} onChange={e => setMsg(e.target.value)} data-testid="request-message-input"
                    className="w-full bg-[#09090b] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 text-sm text-white mb-4 focus:border-[#FF007F] focus:outline-none" />
                  <button onClick={submitRequest} disabled={submitting} data-testid="request-submit-btn"
                    className="w-full bg-[#FF007F] rounded-full py-3.5 flex items-center justify-center gap-2 text-sm font-extrabold text-white tracking-[1px] hover:opacity-90 transition-opacity disabled:opacity-50">
                    <Send size={16} /> {submitting ? 'SENDING...' : 'SEND REQUEST'}
                  </button>
                </>
              )}
            </div>

            {/* Recent Requests */}
            <div className="mt-6">
              <h3 className="text-xs font-extrabold text-[#00F0FF] tracking-[3px] mb-4">RECENT REQUESTS</h3>
              <div className="space-y-2" data-testid="requests-list">
                {requests.slice(0, 8).map(r => (
                  <div key={r.request_id} className="bg-[#18181b] rounded-lg p-4 border border-[rgba(255,255,255,0.1)]" data-testid={`request-item-${r.request_id}`}>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <span className="text-base font-bold text-white">{r.song_title}</span>
                      <span className={`text-[9px] font-extrabold tracking-[1px] px-2 py-0.5 rounded-full
                        ${r.status === 'approved' ? 'bg-[rgba(34,197,94,0.15)] text-green-400' : 'bg-[rgba(255,240,0,0.15)] text-[#FFF000]'}`}>
                        {r.status?.toUpperCase()}
                      </span>
                    </div>
                    {r.artist && <p className="text-sm text-[#a1a1aa] mt-0.5">{r.artist}</p>}
                    {r.message && <p className="text-sm text-[#71717a] italic mt-1">"{r.message}"</p>}
                    <p className="text-xs text-[#71717a] mt-1">&mdash; {r.user_name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Live Chat */}
          <div className="flex-1">
            <h3 className="text-xs font-extrabold text-[#00F0FF] tracking-[3px] mb-4">LIVE CHAT</h3>
            <div className="bg-[#18181b] rounded-xl border border-[rgba(255,255,255,0.1)] h-[420px] sm:h-[500px] flex flex-col overflow-hidden" data-testid="chat-messages">
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {chat.map(m => (
                  <div key={m.message_id}
                    className={`bg-[#09090b] rounded-lg p-3 max-w-[85%] border border-[rgba(255,255,255,0.1)]
                      ${m.user_id === user?.user_id ? 'self-end ml-auto border-[rgba(255,0,127,0.3)]' : ''}`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-bold" style={{ color: getRoleBadgeColor(m.user_role) }}>{m.user_name}</span>
                      {m.user_role !== 'listener' && (
                        <span className="text-[8px] font-extrabold tracking-[1px]" style={{ color: getRoleBadgeColor(m.user_role) }}>
                          {m.user_role?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white leading-[18px]">{m.message}</p>
                    <span className="text-[9px] text-[#71717a] mt-1 block text-right">
                      {formatTimeCentral(m.created_at)}
                    </span>
                  </div>
                ))}
              </div>
              {user ? (
                <div className="flex gap-2 p-3 border-t border-[rgba(255,255,255,0.1)]" data-testid="chat-form">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type a message..."
                    onKeyDown={e => e.key === 'Enter' && sendChat()} data-testid="chat-input"
                    className="flex-1 bg-[#09090b] border border-[rgba(255,255,255,0.1)] rounded-full px-4 py-2.5 text-sm text-white focus:border-[#FF007F] focus:outline-none" />
                  <button onClick={sendChat} data-testid="chat-send-btn"
                    className="w-11 h-11 rounded-full bg-[#FF007F] flex items-center justify-center hover:opacity-90 transition-opacity">
                    <Send size={16} className="text-white" />
                  </button>
                </div>
              ) : (
                <div className="p-3 text-center border-t border-[rgba(255,255,255,0.1)]">
                  <Link to="/login" className="text-[#FF007F] text-sm font-semibold">Sign in to chat</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
