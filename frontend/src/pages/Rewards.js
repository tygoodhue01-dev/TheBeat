import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useSearchParams } from 'react-router-dom';
import { getRewardsApi, getMyPointsApi, getMyHistoryApi, getLeaderboardApi, dailyCheckInApi, redeemRewardApi } from '../services/api';
import WebNavBar from '../components/Navbar';
import Footer from '../components/Footer';
import { Gift, Star, Zap, MessageCircle, CheckCircle, Music, Trophy } from 'lucide-react';

const ICONS = { megaphone: Zap, flash: Zap, star: Star, 'shield-checkmark': CheckCircle, ticket: Gift, people: Trophy };

export default function Rewards() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [tab, setTab] = useState(
    ['rewards', 'leaderboard', 'history'].includes(tabFromUrl) ? tabFromUrl : 'rewards'
  );
  const [rewards, setRewards] = useState([]);
  const [points, setPoints] = useState({ points: 0, lifetime_points: 0 });
  const [history, setHistory] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && ['rewards', 'leaderboard', 'history'].includes(t)) setTab(t);
  }, [searchParams]);

  useEffect(() => {
    Promise.all([getRewardsApi(), getLeaderboardApi()]).then(([r, lb]) => { setRewards(r); setLeaders(lb); });
    if (user) { Promise.all([getMyPointsApi(), getMyHistoryApi()]).then(([p, h]) => { setPoints(p); setHistory(h); }); }
  }, [user]);

  const changeTab = (t) => {
    setTab(t);
    setSearchParams(t === 'rewards' ? {} : { tab: t });
  };

  const reload = () => {
    getMyPointsApi().then(setPoints);
    getMyHistoryApi().then(setHistory);
    getLeaderboardApi().then(setLeaders);
  };

  const checkIn = async () => {
    if (!user) return;
    setCheckingIn(true);
    try { await dailyCheckInApi(); reload(); alert('Check-in complete! +25 points'); } catch (e) { alert(e.message); }
    setCheckingIn(false);
  };

  const redeem = async (r) => {
    if (!user) return;
    if (!window.confirm(`Spend ${r.points_cost} points for "${r.name}"?`)) return;
    try { await redeemRewardApi(r.reward_id); reload(); alert(`Redeemed: ${r.name}!`); } catch (e) { alert(e.message); }
  };

  return (
    <div data-testid="rewards-page">
      <WebNavBar />
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <h1 className="text-[24px] sm:text-[28px] font-black text-white tracking-[3px] font-display">REWARDS</h1>
        <p className="text-sm text-[#a1a1aa] mt-1">Earn points. Get perks.</p>

        {/* Points Banner */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center bg-[#18181b] rounded-xl p-4 sm:p-6 mt-6 border border-[rgba(255,240,0,0.2)] gap-4 sm:gap-0" data-testid="points-display">
          <div className="flex-1 text-center">
            <p className="text-4xl font-black text-white mt-1">{user ? points.points : 0}</p>
            <p className="text-xs font-bold text-[#FFF000] tracking-[2px]">POINTS</p>
          </div>
          <div className="hidden sm:block w-px h-[50px] bg-[rgba(255,255,255,0.1)] mx-4" />
          <div className="flex-1 text-center">
            <p className="text-xl font-bold text-[#a1a1aa]">{user ? points.lifetime_points : 0}</p>
            <p className="text-xs text-[#71717a] tracking-[1px]">LIFETIME</p>
          </div>
          <button onClick={checkIn} disabled={checkingIn} data-testid="daily-checkin-btn"
            className="flex items-center gap-1.5 bg-[#FFF000] rounded-full px-3.5 py-2.5 text-xs font-extrabold text-[#09090b] tracking-[1px] hover:opacity-90 disabled:opacity-50">
            <CheckCircle size={14} /> {checkingIn ? '...' : 'CHECK IN'}
          </button>
        </div>

        {/* How to Earn */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-6 mb-4">
          {[{ pts: '+10', label: 'Request', icon: Music }, { pts: '+5', label: 'Chat', icon: MessageCircle }, { pts: '+25', label: 'Check-In', icon: CheckCircle }].map(e => (
            <div key={e.label} className="text-center">
              <e.icon size={20} className="mx-auto text-[#FF007F]" />
              <p className="text-sm font-extrabold text-white mt-1">{e.pts}</p>
              <p className="text-xs text-[#71717a]">{e.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex bg-[#18181b] rounded-full p-1 mb-6" data-testid="rewards-tabs">
          {['rewards', 'leaderboard', 'history'].map(t => (
            <button key={t} onClick={() => changeTab(t)}
              className={`flex-1 py-2.5 rounded-full text-xs font-bold tracking-[1px] text-center transition-all
                ${tab === t ? 'bg-[#FF007F] text-white' : 'text-[#71717a] hover:text-white'}`}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {tab === 'rewards' && (
          <div className="flex flex-wrap gap-4" data-testid="rewards-catalog">
            {rewards.map(r => {
              const Icon = ICONS[r.icon] || Gift;
              return (
                <div key={r.reward_id} className="w-full sm:w-[48%] bg-[#18181b] rounded-lg p-6 border border-[rgba(255,255,255,0.1)]" data-testid={`reward-${r.reward_id}`}>
                  <div className="w-[52px] h-[52px] rounded-full bg-[rgba(255,0,127,0.1)] flex items-center justify-center mb-3">
                    <Icon size={22} className="text-[#FF007F]" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{r.name}</h3>
                  <p className="text-sm text-[#a1a1aa] leading-[18px] mb-4">{r.description}</p>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <Star size={14} className="text-[#FFF000]" />
                      <span className="text-sm font-extrabold text-[#FFF000]">{r.points_cost}</span>
                    </div>
                    <button onClick={() => redeem(r)} disabled={!user || points.points < r.points_cost}
                      className={`px-4 py-2 rounded-full text-xs font-extrabold tracking-[1px] transition-all
                        ${user && points.points >= r.points_cost ? 'bg-[#FF007F] text-white hover:opacity-90' : 'bg-[#FF007F]/40 text-white/50 cursor-not-allowed'}`}
                      data-testid={`redeem-btn-${r.reward_id}`}>
                      REDEEM
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'leaderboard' && (
          <div className="space-y-2" data-testid="leaderboard-list">
            {leaders.map((l, i) => (
              <div key={l.user_id} className="flex items-center bg-[#18181b] rounded-lg p-4 border border-[rgba(255,255,255,0.1)]" data-testid={`leaderboard-entry-${i}`}>
                <span className="text-lg font-black text-[#71717a] w-9">#{i + 1}</span>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-white">{l.name}</span>
                  <span className="text-[9px] text-[#71717a] tracking-[1px] ml-2">{l.role?.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-[#FFF000]" />
                  <span className="text-sm font-bold text-[#FFF000]">{l.lifetime_points}</span>
                </div>
              </div>
            ))}
            {leaders.length === 0 && <p className="text-center text-[#71717a] py-10">No leaders yet. Be the first!</p>}
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-2" data-testid="points-history">
            {!user ? (
              <div className="text-center py-10">
                <p className="text-[#71717a] mb-4">Sign in to see your history</p>
                <Link to="/login" className="bg-[#FF007F] text-white rounded-full px-6 py-3 text-sm font-extrabold tracking-[1px]">SIGN IN</Link>
              </div>
            ) : history.length === 0 ? (
              <p className="text-center text-[#71717a] py-10">No activity yet. Start earning!</p>
            ) : (
              history.map(tx => (
                <div key={tx.transaction_id} className="flex items-center justify-between bg-[#18181b] rounded-lg p-4 border border-[rgba(255,255,255,0.1)]">
                  <div>
                    <p className="text-sm text-white">{tx.description}</p>
                    <p className="text-xs text-[#71717a] mt-0.5">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-lg font-extrabold ${tx.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.points > 0 ? '+' : ''}{tx.points}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
