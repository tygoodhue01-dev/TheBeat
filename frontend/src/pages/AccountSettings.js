import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { changeMyEmailApi, changeMyPasswordApi } from '../services/api';
import WebNavBar from '../components/Navbar';
import Footer from '../components/Footer';
import { Mail, Lock, KeyRound, ArrowLeft } from 'lucide-react';

export default function AccountSettings() {
  const { user, loading: authLoading, refresh } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [emailCurrentPw, setEmailCurrentPw] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [emailOk, setEmailOk] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [pwOk, setPwOk] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  const onEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailErr('');
    setEmailOk('');
    setEmailLoading(true);
    try {
      await changeMyEmailApi(email.trim(), emailCurrentPw);
      setEmailCurrentPw('');
      setEmailOk('Email updated. You stay signed in with your new address.');
      await refresh();
    } catch (err) {
      setEmailErr(err.message || 'Could not update email');
    }
    setEmailLoading(false);
  };

  const onPasswordSubmit = async (e) => {
    e.preventDefault();
    setPwErr('');
    setPwOk('');
    if (newPw !== confirmPw) {
      setPwErr('New passwords do not match');
      return;
    }
    setPwLoading(true);
    try {
      await changeMyPasswordApi(curPw, newPw);
      setCurPw('');
      setNewPw('');
      setConfirmPw('');
      setPwOk('Password updated.');
    } catch (err) {
      setPwErr(err.message || 'Could not update password');
    }
    setPwLoading(false);
  };

  if (authLoading || !user) {
    return (
      <div data-testid="account-settings-page">
        <WebNavBar />
        <div className="min-h-[50vh] flex items-center justify-center text-sm text-zinc-500">Loading…</div>
        <Footer />
      </div>
    );
  }

  return (
    <div data-testid="account-settings-page">
      <WebNavBar />
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-white tracking-wide mb-6"
          data-testid="account-back-link"
        >
          <ArrowLeft size={14} /> Back
        </Link>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold mb-1">Account</h1>
        <p className="text-zinc-500 text-sm mb-8">Update your email or password. You can do this here without using the admin dashboard.</p>

        <div className="glass rounded-2xl p-5 sm:p-8 mb-6">
          <h2 className="text-sm font-extrabold tracking-[2px] text-zinc-400 mb-4">EMAIL</h2>
          <form onSubmit={onEmailSubmit} className="space-y-4" data-testid="account-email-form">
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm placeholder:text-zinc-600 focus:border-beat-pink focus:outline-none transition-colors"
                data-testid="account-email-input"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                value={emailCurrentPw}
                onChange={(e) => setEmailCurrentPw(e.target.value)}
                placeholder="Current password"
                required
                autoComplete="current-password"
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm placeholder:text-zinc-600 focus:border-beat-pink focus:outline-none transition-colors"
                data-testid="account-email-current-password"
              />
            </div>
            {emailErr && <p className="text-red-400 text-xs" data-testid="account-email-error">{emailErr}</p>}
            {emailOk && <p className="text-emerald-400 text-xs" data-testid="account-email-success">{emailOk}</p>}
            <button
              type="submit"
              disabled={emailLoading}
              className="w-full py-3 rounded-lg bg-beat-pink text-white font-semibold text-sm hover:bg-beat-pinkLight transition-all disabled:opacity-50"
              data-testid="account-email-submit"
            >
              {emailLoading ? 'Saving…' : 'Update email'}
            </button>
          </form>
        </div>

        <div className="glass rounded-2xl p-5 sm:p-8">
          <h2 className="text-sm font-extrabold tracking-[2px] text-zinc-400 mb-4">PASSWORD</h2>
          <p className="text-xs text-zinc-500 mb-4">At least 10 characters, with letters and numbers.</p>
          <form onSubmit={onPasswordSubmit} className="space-y-4" data-testid="account-password-form">
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                value={curPw}
                onChange={(e) => setCurPw(e.target.value)}
                placeholder="Current password"
                required
                autoComplete="current-password"
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm placeholder:text-zinc-600 focus:border-beat-pink focus:outline-none transition-colors"
                data-testid="account-password-current"
              />
            </div>
            <div className="relative">
              <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="New password"
                required
                autoComplete="new-password"
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm placeholder:text-zinc-600 focus:border-beat-pink focus:outline-none transition-colors"
                data-testid="account-password-new"
              />
            </div>
            <div className="relative">
              <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Confirm new password"
                required
                autoComplete="new-password"
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm placeholder:text-zinc-600 focus:border-beat-pink focus:outline-none transition-colors"
                data-testid="account-password-confirm"
              />
            </div>
            {pwErr && <p className="text-red-400 text-xs" data-testid="account-password-error">{pwErr}</p>}
            {pwOk && <p className="text-emerald-400 text-xs" data-testid="account-password-success">{pwOk}</p>}
            <button
              type="submit"
              disabled={pwLoading}
              className="w-full py-3 rounded-lg bg-[#18181b] border border-white/10 text-white font-semibold text-sm hover:border-beat-pink/50 transition-all disabled:opacity-50"
              data-testid="account-password-submit"
            >
              {pwLoading ? 'Updating…' : 'Change password'}
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}
