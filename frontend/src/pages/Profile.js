import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import WebNavBar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  // Profile is now handled by the drawer in the Navbar.
  // If someone navigates directly to /profile, redirect home (the drawer can be opened from nav)
  useEffect(() => {
    if (!authLoading && user) navigate('/');
  }, [user, authLoading, navigate]);

  return (
    <div data-testid="profile-page">
      <WebNavBar />
      <div className="max-w-[600px] mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-[#71717a]">
        Redirecting...
      </div>
      <Footer />
    </div>
  );
}
