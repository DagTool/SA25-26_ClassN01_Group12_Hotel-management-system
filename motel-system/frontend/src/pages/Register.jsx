import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { User, KeyRound, Mail, Hotel, Hash, Loader2 } from 'lucide-react';

export default function Register() {
  const [role, setRole] = useState('admin');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    hotelName: '',
    inviteCode: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await api.post('/auth/register', { ...formData, role });
      if (res.data.success) {
        setSuccess('Đăng ký thành công! Hãy đăng nhập.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(res.data.message || 'Đăng ký thất bại');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể kết nối đến máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-100 to-surface-200 relative overflow-hidden py-12">
      {/* Background Decorators */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-success-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/20 rounded-full blur-3xl"></div>

      <div className="w-full max-w-lg p-8 glass-panel rounded-2xl relative z-10 transition-all duration-300 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 text-primary-600 mb-4 shadow-inner">
            <Hotel size={32} />
          </div>
          <h2 className="text-3xl font-bold text-surface-900 tracking-tight">Tạo tài khoản mới</h2>
          <p className="text-surface-500 mt-2">Tham gia hệ thống Motel Management</p>
        </div>

        {/* Role Selection */}
        <div className="flex p-1 bg-surface-200 rounded-xl mb-6">
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${role === 'admin' ? 'bg-white text-primary-600 shadow-sm' : 'text-surface-600 hover:text-surface-900'}`}
            onClick={() => setRole('admin')}
          >
            Chủ khách sạn (Admin)
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${role === 'staff' ? 'bg-white text-primary-600 shadow-sm' : 'text-surface-600 hover:text-surface-900'}`}
            onClick={() => setRole('staff')}
          >
            Nhân viên (Staff)
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-danger-500/10 border border-danger-500/20 rounded-lg text-danger-500 text-sm">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-success-500/10 border border-success-500/20 rounded-lg text-success-600 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-surface-800">Tên đăng nhập</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-400">
                <User size={18} />
              </div>
              <input
                type="text"
                name="username"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-surface-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                placeholder="Nhập username..."
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-surface-800">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-400">
                <Mail size={18} />
              </div>
              <input
                type="email"
                name="email"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-surface-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                placeholder="email@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-surface-800">Mật khẩu</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-400">
                <KeyRound size={18} />
              </div>
              <input
                type="password"
                name="password"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-surface-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {role === 'admin' && (
            <div className="space-y-2 animate-fade-in">
              <label className="text-sm font-medium text-surface-800">Tên Khách sạn / Chi nhánh</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-400">
                  <Hotel size={18} />
                </div>
                <input
                  type="text"
                  name="hotelName"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-surface-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                  placeholder="VD: Motel Hương Trà"
                  value={formData.hotelName}
                  onChange={handleChange}
                  required={role === 'admin'}
                />
              </div>
            </div>
          )}

          {role === 'staff' && (
            <div className="space-y-2 animate-fade-in">
              <label className="text-sm font-medium text-surface-800">Mã Mời (Invite Code)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-400">
                  <Hash size={18} />
                </div>
                <input
                  type="text"
                  name="inviteCode"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-surface-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none uppercase"
                  placeholder="INV-XXXXXX"
                  value={formData.inviteCode}
                  onChange={handleChange}
                  required={role === 'staff'}
                />
              </div>
              <p className="text-xs text-surface-500 mt-1">Mã mời có thời hạn 7 ngày do Admin cung cấp.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 mt-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-primary-500/30"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Đăng ký ngay'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <span className="text-surface-500 text-sm">Đã có tài khoản? </span>
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors">
            Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
