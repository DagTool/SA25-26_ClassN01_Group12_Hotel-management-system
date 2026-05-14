import React, { useState, useEffect, useContext } from 'react';
import { X, CreditCard, Clock, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

export default function CheckOutModal({ isOpen, onClose, selectedRoom, onCheckOutSuccess }) {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [bookingInfo, setBookingInfo] = useState(null);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    if (isOpen && selectedRoom) {
      fetchActiveBooking();
    }
  }, [isOpen, selectedRoom]);

  const fetchActiveBooking = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/bookings?branch_id=${user.branch_id}&status=active`);
      if (res.data.success) {
        // Find the active booking for the selected room
        const activeBooking = res.data.data.find(b => b.room_id === selectedRoom.id);
        if (activeBooking) {
          setBookingInfo(activeBooking);
        } else {
          setError('Không tìm thấy thông tin đặt phòng hợp lệ cho phòng này.');
        }
      }
    } catch (err) {
      setError('Lỗi khi tải thông tin đặt phòng.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!bookingInfo) return;
    setError('');
    setLoading(true);
    
    try {
      const res = await api.post(`/bookings/${bookingInfo.id}/checkout`);
      if (res.data.success) {
        setReceipt(res.data.receipt);
      } else {
        setError(res.data.message || 'Thanh toán thất bại');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi Check-out');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    onCheckOutSuccess();
    setReceipt(null);
    setBookingInfo(null);
    onClose();
  };

  if (!isOpen) return null;

  const formatPrice = (price) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-200 flex justify-between items-center bg-surface-50">
          <div>
            <h2 className="text-xl font-bold text-surface-900">Trả phòng {selectedRoom?.room_number}</h2>
            <p className="text-sm text-surface-500 capitalize">Thanh toán & Trả phòng</p>
          </div>
          {!receipt && (
            <button onClick={onClose} className="p-2 text-surface-400 hover:text-surface-700 hover:bg-surface-200 rounded-full transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 flex items-center text-danger-600 bg-danger-50 border border-danger-100 rounded-lg text-sm">
              <AlertCircle size={18} className="mr-2 shrink-0" />
              {error}
            </div>
          )}

          {loading && !bookingInfo && !error ? (
            <div className="flex justify-center py-8">
              <Loader2 size={32} className="animate-spin text-primary-500" />
            </div>
          ) : !receipt ? (
            bookingInfo && (
              <div className="space-y-4">
                <div className="bg-surface-50 p-4 rounded-xl border border-surface-200">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-surface-500">Giờ Check-in:</span>
                    <span className="font-semibold text-surface-900">{formatDate(bookingInfo.check_in)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-500">Hình thức thuê:</span>
                    <span className="font-semibold text-surface-900 capitalize">{bookingInfo.booking_type === 'hourly' ? 'Theo giờ' : 'Theo ngày'}</span>
                  </div>
                </div>

                <div className="p-4 bg-primary-50 border border-primary-100 rounded-xl">
                  <p className="text-sm text-primary-600 font-medium mb-1 flex items-center">
                    <Clock size={16} className="mr-1" /> Xác nhận kết thúc thời gian thuê phòng?
                  </p>
                  <p className="text-xs text-surface-500">
                    Sau khi Check-out, hệ thống sẽ tính toán chính xác số tiền dựa trên thời gian thực tế.
                  </p>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-6 text-center animate-fade-in">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={32} className="text-success-500" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-surface-900">Check-out Thành công</h3>
                <p className="text-surface-500 text-sm mt-1">Phòng đang được chuyển sang trạng thái dọn dẹp</p>
              </div>

              <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 text-left space-y-3">
                <div className="flex justify-between">
                  <span className="text-surface-500">Thời gian ở:</span>
                  <span className="font-semibold">{receipt.stay_duration_hours} giờ</span>
                </div>
                <div className="border-t border-surface-200 pt-3 flex justify-between items-center">
                  <span className="text-surface-700 font-medium">Tổng tiền phòng:</span>
                  <span className="text-xl font-bold text-primary-600">{formatPrice(receipt.room_price)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-200 bg-surface-50 flex justify-end space-x-3">
          {!receipt ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-surface-600 hover:text-surface-900 font-medium hover:bg-surface-200 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleCheckOut}
                disabled={loading || !bookingInfo}
                className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium shadow-sm flex items-center disabled:opacity-70"
              >
                {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <CreditCard size={18} className="mr-2" />}
                Thanh toán
              </button>
            </>
          ) : (
            <button
              onClick={handleFinish}
              className="px-6 py-2 bg-success-600 hover:bg-success-700 text-white rounded-lg font-medium shadow-sm w-full"
            >
              Hoàn tất
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
