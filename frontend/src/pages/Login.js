import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn } from 'lucide-react';
import WebNavBar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Login() {
  const { login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!authLoading && user) navigate('/'); }, [user, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div data-testid="login-page">
      <WebNavBar />
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold">Welcome Back</h1>
          <p className="text-zinc-500 text-sm mt-2">Sign in to The Beat 515</p>
        </div>
        <div className="glass rounded-2xl p-5 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm placeholder:text-zinc-600 focus:border-beat-pink focus:outline-none transition-colors"
                data-testid="login-email-input" />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm placeholder:text-zinc-600 focus:border-beat-pink focus:outline-none transition-colors"
                data-testid="login-password-input" />
            </div>
            {error && <p className="text-red-400 text-xs" data-testid="login-error">{error}</p>}
            <button type="submit" disabled={loading} data-testid="login-submit-btn"
              className="w-full py-3 rounded-lg bg-beat-pink text-white font-semibold text-sm hover:bg-beat-pinkLight transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              <LogIn size={16} /> {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-sm text-zinc-500 mt-6">
            Don't have an account? <Link to="/register" className="text-beat-pink hover:text-beat-pinkLight" data-testid="login-register-link">Sign Up</Link>
          </p>
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
}
