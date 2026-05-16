import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import {
  Users, Search, UserPlus, Edit2, ShieldOff, Shield,
  X, Loader2, Phone, CreditCard, Star, AlertTriangle
} from 'lucide-react';

const EMPTY_FORM = { full_name: '', phone: '', id_number: '' };

function GuestModal({ guest, onClose, onSaved, branchId }) {
  const [form, setForm] = useState(guest ? { full_name: guest.full_name, phone: guest.phone || '', id_number: guest.id_number || '' } : EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.full_name.trim()) { setError('Vui lòng nhập họ tên'); return; }
    setError(''); setLoading(true);
    try {
      if (guest) {
        await api.put(`/guests/${guest.id}`, form);
      } else {
        await api.post('/guests', { branch_id: branchId, ...form });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h3 className="font-bold text-surface-900">{guest ? 'Cập nhật khách hàng' : 'Thêm khách mới'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="p-3 bg-danger-50 text-danger-600 text-sm rounded-lg border border-danger-100">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1.5">Họ và tên *</label>
            <input className="input-field" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Nguyễn Văn A" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1.5">Số điện thoại</label>
            <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0901234567" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1.5">CCCD / Passport</label>
            <input className="input-field" value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} placeholder="001099012345" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-surface-100 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Hủy</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary flex items-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            {guest ? 'Lưu thay đổi' : 'Thêm khách'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GuestsPage() {
  const { user } = useContext(AuthContext);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalGuest, setModalGuest] = useState(undefined); // undefined=closed, null=new, obj=edit
  const [blacklistLoading, setBlacklistLoading] = useState(null);

  const fetchGuests = async (q = '') => {
    setLoading(true);
    try {
      const url = `/guests?branch_id=${user.branch_id}${q ? `&search=${encodeURIComponent(q)}` : ''}`;
      const res = await api.get(url);
      if (res.data.success) setGuests(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGuests(); }, [user]);

  useEffect(() => {
    const t = setTimeout(() => fetchGuests(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const toggleBlacklist = async (guest) => {
    setBlacklistLoading(guest.id);
    try {
      await api.patch(`/guests/${guest.id}/blacklist`, { is_blacklisted: !guest.is_blacklisted });
      fetchGuests(search);
    } catch (err) {
      console.error(err);
    } finally {
      setBlacklistLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-primary-600" />
          <h1 className="text-lg font-bold text-surface-900">Khách hàng</h1>
          <span className="badge badge-primary ml-1">{guests.length}</span>
        </div>
        <button onClick={() => setModalGuest(null)} className="btn-primary flex items-center gap-2">
          <UserPlus size={15} />
          Thêm khách
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            className="input-field pl-9"
            placeholder="Tìm theo tên, SĐT, số CCCD..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : guests.length === 0 ? (
          <div className="text-center py-16 text-surface-400">
            <Users size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Không tìm thấy khách hàng</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50/80">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Khách hàng</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Liên hệ</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">CCCD</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Điểm thưởng</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Trạng thái</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {guests.map((g) => (
                  <tr key={g.id} className={`hover:bg-surface-50/60 transition-colors ${g.is_blacklisted ? 'bg-danger-50/40' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {g.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-surface-900">{g.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-surface-600">
                        <Phone size={12} className="text-surface-400" />
                        {g.phone || <span className="text-surface-300 italic text-xs">Chưa có</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-surface-600">
                        <CreditCard size={12} className="text-surface-400" />
                        <span className="font-mono text-xs">{g.id_number || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 text-warning-600">
                        <Star size={12} />
                        <span className="font-semibold">{g.loyalty_points ?? 0}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {g.is_blacklisted
                        ? <span className="badge badge-danger flex items-center gap-1 w-fit"><AlertTriangle size={10} />Blacklist</span>
                        : <span className="badge badge-success">Hoạt động</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setModalGuest(g)}
                          className="p-1.5 rounded-lg hover:bg-primary-50 text-surface-400 hover:text-primary-600 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => toggleBlacklist(g)}
                          disabled={blacklistLoading === g.id}
                          className={`p-1.5 rounded-lg transition-colors ${g.is_blacklisted ? 'hover:bg-success-50 text-danger-400 hover:text-success-600' : 'hover:bg-danger-50 text-surface-400 hover:text-danger-600'}`}
                          title={g.is_blacklisted ? 'Gỡ blacklist' : 'Thêm vào blacklist'}
                        >
                          {blacklistLoading === g.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : g.is_blacklisted ? <Shield size={14} /> : <ShieldOff size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalGuest !== undefined && (
        <GuestModal
          guest={modalGuest}
          branchId={user.branch_id}
          onClose={() => setModalGuest(undefined)}
          onSaved={() => fetchGuests(search)}
        />
      )}
    </div>
  );
}
