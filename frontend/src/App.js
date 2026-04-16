import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { getStreamConfigApi } from './services/api';
import { isStaffUser } from './utils/staff';
import Home from './pages/Home';
import News from './pages/News';
import NewsDetail from './pages/NewsDetail';
import Requests from './pages/Requests';
import Rewards from './pages/Rewards';
import Profile from './pages/Profile';
import AccountSettings from './pages/AccountSettings';
import Admin from './pages/Admin';
import Schedule from './pages/Schedule';
import Login from './pages/Login';
import Register from './pages/Register';
import Station from './pages/Station';
import RecentlyPlayed from './pages/RecentlyPlayed';
import Events from './pages/Events';
import Maintenance from './pages/Maintenance';
import InstallPwaPrompt from './components/InstallPwaPrompt';

const BG_SHELL = 'min-h-screen text-white font-body bg-beat-bg bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(255,0,127,0.14),transparent_50%),radial-gradient(ellipse_80%_50%_at_100%_50%,rgba(0,240,255,0.08),transparent_45%),radial-gradient(ellipse_60%_40%_at_0%_80%,rgba(255,240,0,0.06),transparent_40%)]';

function maintenanceModeOn(cfg) {
  const m = cfg?.maintenance_mode;
  if (m === true || m === 1) return true;
  if (m === false || m === 0 || m == null) return false;
  if (typeof m === 'string') return ['1', 'true', 'yes', 'on'].includes(m.toLowerCase());
  return false;
}

function MaintenanceGate({ children }) {
  const location = useLocation();
  const { user } = useAuth();
  const [maintenance, setMaintenance] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      getStreamConfigApi()
        .then((c) => {
          if (!cancelled) setMaintenance(maintenanceModeOn(c));
        })
        .catch(() => {
          if (!cancelled) setMaintenance(false);
        });
    };
    load();
    const iv = setInterval(load, 30000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      clearInterval(iv);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const path = location.pathname;
  const allowDuringMaintenance = path === '/login' || path === '/admin';
  const staffBypass = isStaffUser(user);

  if (maintenance === null) {
    return (
      <div className={`${BG_SHELL} flex items-center justify-center`}>
        <p className="text-sm text-[#71717a]">Loading…</p>
      </div>
    );
  }

  if (maintenance && !allowDuringMaintenance && !staffBypass) {
    return <Maintenance />;
  }

  return children;
}

function AppRoutes() {
  return (
    <div className={BG_SHELL}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/news" element={<News />} />
        <Route path="/news/:id" element={<NewsDetail />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/account" element={<AccountSettings />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/station" element={<Station />} />
        <Route path="/about" element={<Navigate to="/station#about" replace />} />
        <Route path="/careers" element={<Navigate to="/station#careers" replace />} />
        <Route path="/contact" element={<Navigate to="/station#contact" replace />} />
        <Route path="/leaderboard" element={<Navigate to="/rewards?tab=leaderboard" replace />} />
        <Route path="/recently-played" element={<RecentlyPlayed />} />
        <Route path="/events" element={<Events />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MaintenanceGate>
          <AppRoutes />
          <InstallPwaPrompt />
        </MaintenanceGate>
      </AuthProvider>
    </BrowserRouter>
  );
}
