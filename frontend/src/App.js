import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Home from './pages/Home';
import News from './pages/News';
import NewsDetail from './pages/NewsDetail';
import Requests from './pages/Requests';
import Rewards from './pages/Rewards';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Schedule from './pages/Schedule';
import Login from './pages/Login';
import Register from './pages/Register';
import Station from './pages/Station';
import RecentlyPlayed from './pages/RecentlyPlayed';
import Events from './pages/Events';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-[#09090b] text-white font-body">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/news" element={<News />} />
            <Route path="/news/:id" element={<NewsDetail />} />
            <Route path="/requests" element={<Requests />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/profile" element={<Profile />} />
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
      </AuthProvider>
    </BrowserRouter>
  );
}
