import React, { useState, useEffect, useContext } from 'react';
import { X, Search, UserPlus, Clock, Sun, Loader2 } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

const formatVND = (n) => new Intl.NumberFormat('vi-VN').format(n ?? 0) + 'đ';

export default function CheckInModal({ isOpen, onClose, selectedRoom, onCheckInSuccess }) {
  const { user } = useContext(AuthContext);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [guests, setGuests] = useState([]);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [isNewGuest, setIsNewGuest] = useState(false);
  const [newGuestData, setNewGuestData] = useState({ full_name: '', phone: '', id_number: '' });
  const [bookingType, setBookingType] = useState('hourly');

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setStep(1); setError(''); setSearchQuery('');
      setGuests([]); setSelectedGuest(null);
      setIsNewGuest(false); setNewGuestData({ full_name: '', phone: '', id_number: '' });
      setBookingType('hourly');
    }
  }, [isOpen]);

  // Debounced guest search
  useEffect(() => {
    if (searchQuery.length < 2) { setGuests([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/guests?branch_id=${user.branch_id}&search=${encodeURIComponent(searchQuery)}`);
        if (res.data.success) setGuests(res.data.data);
      } catch (err) { console.error(err); }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery, user.branch_id]);

  const handleGuestNext = async () => {
    setError('');
    if (isNewGuest) {
      if (!newGuestData.full_name.trim()) { setError('Vui lòng nhập họ tên'); return; }
      setLoading(true);
      try {
        const res = await api.post('/guests', { branch_id: user.branch_id, ...newGuestData });
        if (res.data.success) { setSelectedGuest(res.data.data); setStep(2); }
      } catch (err) { setError(err.response?.data?.message || 'Không thể tạo khách hàng'); }
      finally { setLoading(false); }
    } else {
      if (!selectedGuest) { setError('Vui lòng chọn khách hàng'); return; }
      setStep(2);
    }
  };

  const handleCheckIn = async () => {
    setError(''); setLoading(true);
    try {
      // API path: POST /api/bookings/check-in (from bookingRoutes)
      const res = await api.post('/bookings/check-in', {
        branch_id: user.branch_id,
        room_id: selectedRoom.id,
        guest_id: selectedGuest.id,
        created_by: user.id,
        booking_type: bookingType,
      });
      if (res.data.success) {
        onCheckInSuccess();
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Check-in thất bại');
    } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 bg-surface-50 rounded-t-2xl">
          <div>
            <h2 className="font-bold text-surface-900">Nhận phòng {selectedRoom?.room_number}</h2>
            <p className="text-xs text-surface-500 mt-0.5 capitalize">
              {selectedRoom?.type} · Tầng {selectedRoom?.floor}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-200 text-surface-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center px-6 pt-4 pb-2 gap-2">
          {['Chọn khách', 'Xác nhận'].map((label, i) => (
            <React.Fragment key={i}>
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${step === i + 1 ? 'text-primary-600' : step > i + 1 ? 'text-success-600' : 'text-surface-400'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === i + 1 ? 'bg-primary-600 text-white' : step > i + 1 ? 'bg-success-500 text-white' : 'bg-surface-200 text-surface-400'}`}>
                  {i + 1}
                </div>
                {label}
              </div>
              {i < 1 && <div className={`flex-1 h-px ${step > 1 ? 'bg-success-300' : 'bg-surface-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && <div className="mb-4 p-3 bg-danger-50 text-danger-600 text-sm rounded-lg border border-danger-100">{error}</div>}

          {step === 1 ? (
            <div className="space-y-5 animate-fade-in">
              {/* Toggle new/existing */}
              <div className="flex gap-2 p-1 bg-surface-100 rounded-xl">
                <button
                  onClick={() => setIsNewGuest(false)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${!isNewGuest ? 'bg-white text-primary-700 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}
                >
                  <Search size={13} />Tìm khách cũ
                </button>
                <button
                  onClick={() => setIsNewGuest(true)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${isNewGuest ? 'bg-white text-primary-700 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}
                >
                  <UserPlus size={13} />Khách mới
                </button>
              </div>

              {!isNewGuest ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                    <input
                      className="input-field pl-9"
                      placeholder="Tên, SĐT, CCCD..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  {guests.length > 0 && (
                    <div className="border border-surface-200 rounded-xl overflow-hidden divide-y divide-surface-100 max-h-44 overflow-y-auto">
                      {guests.map((g) => (
                        <div
                          key={g.id}
                          onClick={() => setSelectedGuest(g)}
                          className={`p-3 cursor-pointer hover:bg-surface-50 transition-colors flex items-center gap-3 ${selectedGuest?.id === g.id ? 'bg-primary-50 border-l-4 border-primary-500' : ''}`}
                        >
                          <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {g.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-surface-900">{g.full_name}</p>
                            <p className="text-xs text-surface-500">{g.phone || '—'} · {g.id_number || '—'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedGuest && (
                    <div className="p-3 bg-primary-50 border border-primary-200 rounded-xl flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {selectedGuest.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-primary-900">{selectedGuest.full_name}</p>
                        <p className="text-xs text-primary-600">{selectedGuest.phone}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {[['Họ và tên *', 'full_name', 'text', 'Nguyễn Văn A'], ['SĐT', 'phone', 'tel', '0901234567'], ['CCCD / Passport', 'id_number', 'text', '001099012345']].map(([label, key, type, ph]) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-surface-600 mb-1.5">{label}</label>
                      <input type={type} className="input-field" placeholder={ph} value={newGuestData[key]} onChange={(e) => setNewGuestData({ ...newGuestData, [key]: e.target.value })} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5 animate-fade-in">
              {/* Guest info */}
              <div className="p-3 bg-surface-50 border border-surface-200 rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold shrink-0">
                  {selectedGuest?.full_name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-surface-900 text-sm">{selectedGuest?.full_name}</p>
                  <p className="text-xs text-surface-500">{selectedGuest?.phone}</p>
                </div>
              </div>

              {/* Booking type */}
              <div>
                <label className="block text-xs font-semibold text-surface-600 mb-2">Hình thức thuê</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'hourly', label: 'Theo giờ', icon: Clock, price: formatVND(selectedRoom?.hourly_base_price) + ' / giờ đầu' },
                    { key: 'daily',  label: 'Theo ngày', icon: Sun,  price: formatVND(selectedRoom?.base_price) + ' / ngày' },
                  ].map(({ key, label, icon: Icon, price }) => (
                    <button
                      key={key}
                      onClick={() => setBookingType(key)}
                      className={`p-3.5 rounded-xl border-2 text-left transition-all ${bookingType === key ? 'border-primary-500 bg-primary-50' : 'border-surface-200 hover:border-surface-300'}`}
                    >
                      <Icon size={16} className={`mb-2 ${bookingType === key ? 'text-primary-600' : 'text-surface-400'}`} />
                      <p className={`text-sm font-bold ${bookingType === key ? 'text-primary-900' : 'text-surface-700'}`}>{label}</p>
                      <p className="text-xs text-surface-500 mt-0.5">{price}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-100 bg-surface-50 rounded-b-2xl flex justify-between items-center">
          <div>
            {step === 2 && (
              <button onClick={() => setStep(1)} className="text-sm text-surface-500 hover:text-surface-700 font-medium transition-colors">
                ← Quay lại
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">Hủy</button>
            {step === 1 ? (
              <button onClick={handleGuestNext} disabled={loading} className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
                {loading && <Loader2 size={13} className="animate-spin" />}
                Tiếp tục →
              </button>
            ) : (
              <button onClick={handleCheckIn} disabled={loading} className="btn-primary bg-success-600 hover:bg-success-700 flex items-center gap-2 text-sm px-4 py-2">
                {loading && <Loader2 size={13} className="animate-spin" />}
                Xác nhận Check-in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
