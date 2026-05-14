import React, { useState, useEffect, useContext } from 'react';
import { X, Search, UserPlus, Clock, Loader2 } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

export default function CheckInModal({ isOpen, onClose, selectedRoom, onCheckInSuccess }) {
  const { user } = useContext(AuthContext);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Guest State
  const [searchQuery, setSearchQuery] = useState('');
  const [guests, setGuests] = useState([]);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [isNewGuest, setIsNewGuest] = useState(false);
  const [newGuestData, setNewGuestData] = useState({ full_name: '', phone: '', id_number: '' });

  // Booking State
  const [bookingType, setBookingType] = useState('hourly');

  // Search Guests
  useEffect(() => {
    if (searchQuery.length > 2) {
      const delaySearch = setTimeout(async () => {
        try {
          const res = await api.get(`/guests?branch_id=${user.branch_id}&search=${searchQuery}`);
          if (res.data.success) {
            setGuests(res.data.data);
          }
        } catch (err) {
          console.error(err);
        }
      }, 500);
      return () => clearTimeout(delaySearch);
    } else {
      setGuests([]);
    }
  }, [searchQuery, user.branch_id]);

  const handleGuestSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    let guestId = selectedGuest?.id;

    if (isNewGuest) {
      if (!newGuestData.full_name) {
        setError('Vui lòng nhập tên khách hàng');
        return;
      }
      setLoading(true);
      try {
        const res = await api.post('/guests', {
          branch_id: user.branch_id,
          ...newGuestData
        });
        if (res.data.success) {
          guestId = res.data.data.id;
          setSelectedGuest(res.data.data);
          setStep(2);
        }
      } catch (err) {
        setError('Không thể tạo khách hàng mới');
      } finally {
        setLoading(false);
      }
    } else {
      if (!guestId) {
        setError('Vui lòng chọn khách hàng');
        return;
      }
      setStep(2);
    }
  };

  const handleCheckIn = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/bookings/checkin', {
        branch_id: user.branch_id,
        room_id: selectedRoom.id,
        guest_id: selectedGuest.id,
        created_by: user.id,
        booking_type: bookingType
      });
      if (res.data.success) {
        onCheckInSuccess();
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Check-in thất bại');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-200 flex justify-between items-center bg-surface-50">
          <div>
            <h2 className="text-xl font-bold text-surface-900">Nhận phòng {selectedRoom?.room_number}</h2>
            <p className="text-sm text-surface-500 capitalize">Hạng phòng: {selectedRoom?.type}</p>
          </div>
          <button onClick={onClose} className="p-2 text-surface-400 hover:text-surface-700 hover:bg-surface-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-danger-50 text-danger-600 rounded-lg text-sm border border-danger-100">
              {error}
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-6 animate-fade-in">
              {/* Step 1: Guest Selection */}
              <div className="flex items-center space-x-4 mb-4">
                <button
                  type="button"
                  className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors ${!isNewGuest ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-600/20' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}
                  onClick={() => setIsNewGuest(false)}
                >
                  <Search size={16} className="inline mr-2" />
                  Tìm khách cũ
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors ${isNewGuest ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-600/20' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}
                  onClick={() => setIsNewGuest(true)}
                >
                  <UserPlus size={16} className="inline mr-2" />
                  Thêm khách mới
                </button>
              </div>

              {!isNewGuest ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-3 text-surface-400" />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="Tìm theo tên, SĐT, CCCD..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  {guests.length > 0 && (
                    <div className="border border-surface-200 rounded-xl overflow-hidden divide-y divide-surface-100 max-h-48 overflow-y-auto">
                      {guests.map(g => (
                        <div 
                          key={g.id} 
                          onClick={() => setSelectedGuest(g)}
                          className={`p-3 cursor-pointer hover:bg-surface-50 transition-colors ${selectedGuest?.id === g.id ? 'bg-primary-50 border-l-4 border-primary-500' : ''}`}
                        >
                          <p className="font-medium text-surface-900">{g.full_name}</p>
                          <p className="text-xs text-surface-500">SĐT: {g.phone || 'N/A'} - CCCD: {g.id_number || 'N/A'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Họ và tên *</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                      value={newGuestData.full_name}
                      onChange={(e) => setNewGuestData({...newGuestData, full_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Số điện thoại</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                      value={newGuestData.phone}
                      onChange={(e) => setNewGuestData({...newGuestData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Số CCCD / Passport</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                      value={newGuestData.id_number}
                      onChange={(e) => setNewGuestData({...newGuestData, id_number: e.target.value})}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Step 2: Booking Details */}
              <div className="bg-surface-50 p-4 rounded-xl border border-surface-200">
                <h3 className="text-sm font-bold text-surface-500 uppercase tracking-wider mb-2">Thông tin khách hàng</h3>
                <p className="font-semibold text-surface-900">{selectedGuest?.full_name}</p>
                <p className="text-sm text-surface-600">{selectedGuest?.phone || selectedGuest?.id_number}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">Hình thức thuê phòng</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBookingType('hourly')}
                    className={`p-3 rounded-xl border text-left transition-all ${bookingType === 'hourly' ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500/20' : 'border-surface-200 hover:border-surface-300'}`}
                  >
                    <Clock size={18} className={`mb-2 ${bookingType === 'hourly' ? 'text-primary-600' : 'text-surface-400'}`} />
                    <p className="font-semibold text-surface-900 text-sm">Theo Giờ</p>
                    <p className="text-xs text-surface-500">{new Intl.NumberFormat('vi-VN').format(selectedRoom?.hourly_base_price)}đ / giờ đầu</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingType('daily')}
                    className={`p-3 rounded-xl border text-left transition-all ${bookingType === 'daily' ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500/20' : 'border-surface-200 hover:border-surface-300'}`}
                  >
                    <Clock size={18} className={`mb-2 ${bookingType === 'daily' ? 'text-primary-600' : 'text-surface-400'}`} />
                    <p className="font-semibold text-surface-900 text-sm">Theo Ngày</p>
                    <p className="text-xs text-surface-500">{new Intl.NumberFormat('vi-VN').format(selectedRoom?.base_price)}đ / ngày</p>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-200 bg-surface-50 flex justify-end space-x-3">
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-surface-600 hover:text-surface-900 font-medium"
            >
              Quay lại
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-surface-600 hover:text-surface-900 font-medium hover:bg-surface-200 rounded-lg transition-colors"
          >
            Hủy
          </button>
          {step === 1 ? (
            <button
              onClick={handleGuestSubmit}
              disabled={loading}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium shadow-sm flex items-center disabled:opacity-70"
            >
              {loading && <Loader2 size={16} className="animate-spin mr-2" />}
              Tiếp tục
            </button>
          ) : (
            <button
              onClick={handleCheckIn}
              disabled={loading}
              className="px-6 py-2 bg-success-600 hover:bg-success-700 text-white rounded-lg font-medium shadow-sm shadow-success-500/20 flex items-center disabled:opacity-70"
            >
              {loading && <Loader2 size={16} className="animate-spin mr-2" />}
              Xác nhận Check-in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
