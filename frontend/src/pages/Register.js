import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, UserPlus } from 'lucide-react';
import WebNavBar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Register() {
  const { register, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!authLoading && user) navigate('/'); }, [user, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await register(email, password, name);
      navigate('/');
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div data-testid="register-page">
      <WebNavBar />
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold">Join The Beat</h1>
          <p className="text-zinc-500 text-sm mt-2">Create your account and start requesting songs</p>
        </div>
        <div className="glass rounded-2xl p-5 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Display Name" required
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm placeholder:text-zinc-600 focus:border-beat-pink focus:outline-none transition-colors"
                data-testid="register-name-input" />
            </div>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm placeholder:text-zinc-600 focus:border-beat-pink focus:outline-none transition-colors"
                data-testid="register-email-input" />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm placeholder:text-zinc-600 focus:border-beat-pink focus:outline-none transition-colors"
                data-testid="register-password-input" />
            </div>
            {error && <p className="text-red-400 text-xs" data-testid="register-error">{error}</p>}
            <button type="submit" disabled={loading} data-testid="register-submit-btn"
              className="w-full py-3 rounded-lg bg-beat-pink text-white font-semibold text-sm hover:bg-beat-pinkLight transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              <UserPlus size={16} /> {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-zinc-500 mt-6">
            Already have an account? <Link to="/login" className="text-beat-pink hover:text-beat-pinkLight" data-testid="register-login-link">Sign In</Link>
          </p>
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
}
