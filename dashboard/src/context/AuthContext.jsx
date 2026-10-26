import { createContext, useContext, useState, useEffect } from 'react';
import { api, setToken, clearToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('tn_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch (_) {}
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await api.auth.login(email, password);
    setToken(data.token);
    localStorage.setItem('tn_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
