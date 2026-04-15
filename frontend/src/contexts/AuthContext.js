import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMeApi, loginApi, registerApi, logoutApi } from '../services/api';

const AuthContext = createContext({
  user: null, loading: true,
  login: async () => {}, register: async () => {}, logout: async () => {}, refresh: async () => {}
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const u = await getMeApi();
      setUser(u);
    } catch { setUser(null); } finally { setLoading(false); }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const login = async (email, password) => {
    const u = await loginApi(email, password);
    setUser(u);
    return u;
  };
  const register = async (email, password, name) => { const u = await registerApi(email, password, name); setUser(u); };
  const logout = async () => { await logoutApi(); setUser(null); };
  const refresh = async () => { await checkAuth(); };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
