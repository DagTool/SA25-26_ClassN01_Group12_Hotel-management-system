import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import { KeyRound, User, Loader2, Hotel } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { username, password });
      if (res.data.success) {
        login(res.data.data.user, res.data.data.accessToken);
        navigate('/');
      } else {
        setError(res.data.message || 'Đăng nhập thất bại');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể kết nối đến máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-100 to-surface-200 relative overflow-hidden">
      {/* Background Decorators */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/20 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md p-8 glass-panel rounded-2xl relative z-10 transition-all duration-300 hover:shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 text-primary-600 mb-4 shadow-inner">
            <Hotel size={32} />
          </div>
          <h2 className="text-3xl font-bold text-surface-900 tracking-tight">Motel Management</h2>
          <p className="text-surface-500 mt-2">Đăng nhập để quản lý hệ thống của bạn</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-danger-500/10 border border-danger-500/20 rounded-lg text-danger-500 text-sm flex items-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-surface-800">Tên đăng nhập</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-400">
                <User size={18} />
              </div>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-surface-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                placeholder="Nhập username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-surface-800">Mật khẩu</label>
              <a href="#" className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">Quên mật khẩu?</a>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-400">
                <KeyRound size={18} />
              </div>
              <input
                type="password"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-surface-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-primary-500/30"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Đăng nhập'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <span className="text-surface-500 text-sm">Chưa có tài khoản? </span>
          <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors">
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
