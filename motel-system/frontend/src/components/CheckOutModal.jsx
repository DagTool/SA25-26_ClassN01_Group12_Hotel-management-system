import React, { useState, useEffect, useContext } from 'react';
import { X, CreditCard, Clock, CheckCircle2, Loader2, AlertCircle, Banknote, Smartphone } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

const formatVND = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n ?? 0);
const formatDate = (d) => d ? new Date(d).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

export default function CheckOutModal({ isOpen, onClose, selectedRoom, onCheckOutSuccess }) {
  const { user } = useContext(AuthContext);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [bookingInfo, setBookingInfo] = useState(null);
  const [receipt, setReceipt]       = useState(null);
  const [payMethod, setPayMethod]   = useState('cash');

  useEffect(() => {
    if (isOpen && selectedRoom) {
      setReceipt(null); setError(''); setPayMethod('cash');
      fetchActiveBooking();
    }
  }, [isOpen, selectedRoom]);

  const fetchActiveBooking = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/bookings?branch_id=${user.branch_id}&status=active`);
      if (res.data.success) {
        const b = res.data.data.find((x) => x.room_id === selectedRoom.id);
        setBookingInfo(b || null);
        if (!b) setError('Không tìm thấy booking active cho phòng này.');
      }
    } catch (err) { setError('Lỗi khi tải booking.'); }
    finally { setLoading(false); }
  };

  const handleCheckOut = async () => {
    if (!bookingInfo) return;
    setError(''); setLoading(true);
    try {
      // Route: POST /api/bookings/:id/check-out
      const res = await api.post(`/bookings/${bookingInfo.id}/check-out`);
      if (res.data.success) {
        setReceipt(res.data.receipt);
        // Optionally create a payment record
        try {
          await api.post('/payments', {
            branch_id: user.branch_id,
            booking_id: bookingInfo.id,
            amount: res.data.receipt?.total ?? res.data.receipt?.room_price,
            method: payMethod,
          });
        } catch (_) {
          // Payment creation is best-effort; don't block checkout
          console.warn('Payment record creation failed');
        }
      } else {
        setError(res.data.message || 'Thanh toán thất bại');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi Check-out');
    } finally { setLoading(false); }
  };

  const handleFinish = () => {
    onCheckOutSuccess();
    setReceipt(null); setBookingInfo(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 bg-surface-50 rounded-t-2xl">
          <div>
            <h2 className="font-bold text-surface-900">Trả phòng {selectedRoom?.room_number}</h2>
            <p className="text-xs text-surface-500 mt-0.5">Thanh toán & Trả phòng</p>
          </div>
          {!receipt && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-200 text-surface-400 transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 flex items-center gap-2 text-danger-600 bg-danger-50 border border-danger-100 rounded-lg text-sm">
              <AlertCircle size={16} className="shrink-0" />{error}
            </div>
          )}

          {loading && !bookingInfo ? (
            <div className="flex justify-center py-10">
              <Loader2 size={28} className="animate-spin text-primary-400" />
            </div>
          ) : !receipt ? (
            bookingInfo && (
              <div className="space-y-4">
                {/* Booking info */}
                <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-500">Check-in:</span>
                    <span className="font-semibold text-surface-800">{formatDate(bookingInfo.check_in)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-500">Hình thức:</span>
                    <span className="font-semibold text-surface-800 capitalize">
                      {bookingInfo.booking_type === 'hourly' ? 'Theo giờ' : bookingInfo.booking_type === 'daily' ? 'Theo ngày' : 'Qua đêm'}
                    </span>
                  </div>
                </div>

                {/* Payment method */}
                <div>
                  <label className="block text-xs font-semibold text-surface-600 mb-2">Phương thức thanh toán</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'cash',     label: 'Tiền mặt',      icon: Banknote },
                      { key: 'transfer', label: 'Chuyển khoản',  icon: Smartphone },
                      { key: 'card',     label: 'Thẻ ngân hàng', icon: CreditCard },
                    ].map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => setPayMethod(key)}
                        className={`p-2.5 rounded-xl border-2 text-center transition-all ${payMethod === key ? 'border-primary-500 bg-primary-50' : 'border-surface-200 hover:border-surface-300'}`}
                      >
                        <Icon size={16} className={`mx-auto mb-1 ${payMethod === key ? 'text-primary-600' : 'text-surface-400'}`} />
                        <p className={`text-[10px] font-semibold ${payMethod === key ? 'text-primary-700' : 'text-surface-600'}`}>{label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-warning-50 border border-warning-200 rounded-xl text-xs text-warning-700 flex items-start gap-2">
                  <Clock size={14} className="shrink-0 mt-0.5" />
                  <span>Hệ thống sẽ tự tính tiền chính xác dựa trên thời gian thực tế khi bấm Thanh toán.</span>
                </div>
              </div>
            )
          ) : (
            /* Receipt */
            <div className="space-y-5 text-center animate-fade-in">
              <div className="flex justify-center">
                <div className="w-14 h-14 bg-success-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-success-500" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-surface-900">Check-out thành công!</h3>
                <p className="text-xs text-surface-500 mt-1">Phòng đang được chuyển sang trạng thái dọn dẹp</p>
              </div>
              <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 text-left space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Thời gian ở:</span>
                  <span className="font-semibold text-surface-800">{receipt.stay_duration_hours} giờ</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Tiền phòng:</span>
                  <span className="font-semibold text-surface-800">{formatVND(receipt.room_price)}</span>
                </div>
                {receipt.service_price > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-500">Tiền dịch vụ:</span>
                    <span className="font-semibold text-surface-800">{formatVND(receipt.service_price)}</span>
                  </div>
                )}
                <div className="border-t border-surface-200 pt-2.5 flex justify-between items-center">
                  <span className="font-bold text-surface-900">Tổng cộng:</span>
                  <span className="text-xl font-bold text-primary-600">{formatVND(receipt.total ?? receipt.room_price)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-100 bg-surface-50 rounded-b-2xl flex justify-end gap-3">
          {!receipt ? (
            <>
              <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">Hủy</button>
              <button
                onClick={handleCheckOut}
                disabled={loading || !bookingInfo}
                className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <CreditCard size={13} />}
                Thanh toán
              </button>
            </>
          ) : (
            <button onClick={handleFinish} className="btn-primary w-full text-sm py-2.5 bg-success-600 hover:bg-success-700">
              Hoàn tất
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
