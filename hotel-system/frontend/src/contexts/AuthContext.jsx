import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [hotels, setHotels] = useState([]);   // danh sách hotels admin quản lý
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      api.get('/auth/me')
        .then((res) => {
          if (res.data.success) {
            setUser(res.data.data.user);
            setHotels(res.data.data.hotels || []);
          } else {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
          }
        })
        .catch(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (userData, accessToken, refreshToken, hotelList = []) => {
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    setUser(userData);
    setHotels(hotelList);
  };

  const logout = () => {
    const refreshToken = localStorage.getItem('refreshToken');
    api.post('/auth/logout', { refreshToken }).catch(console.error);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setHotels([]);
  };

  // Admin chuyển sang hotel khác → nhận token mới → cập nhật state
  const switchHotel = async (hotelId) => {
    try {
      const res = await api.post('/auth/switch-hotel', { hotel_id: hotelId });
      if (res.data.success) {
        const { accessToken, refreshToken, user: newUser } = res.data.data;
        localStorage.setItem('accessToken', accessToken);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        setUser(newUser);
        // hotels list không đổi (admin vẫn giữ tất cả)
        return { success: true };
      }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Lỗi kết nối' };
    }
  };

  // Admin tạo hotel mới
  const createHotel = async (hotelName) => {
    try {
      const res = await api.post('/auth/hotels', { hotelName });
      if (res.data.success) {
        // Refresh danh sách hotels
        const hotelsRes = await api.get('/auth/hotels');
        if (hotelsRes.data.success) setHotels(hotelsRes.data.data);
        return { success: true, data: res.data.data };
      }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Lỗi kết nối' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, hotels, login, logout, switchHotel, createHotel, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
