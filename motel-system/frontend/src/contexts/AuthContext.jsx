import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      // Validate token by fetching current user
      api.get('/auth/me')
        .then((res) => {
          if (res.data.success) {
            setUser(res.data.data.user);
          } else {
            localStorage.removeItem('accessToken');
          }
        })
        .catch(() => {
          localStorage.removeItem('accessToken');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('accessToken', token);
    setUser(userData);
  };

  const logout = () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      // Note: Backend might require refreshToken to logout, adjusting based on actual payload
      api.post('/auth/logout').catch(console.error);
    }
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
