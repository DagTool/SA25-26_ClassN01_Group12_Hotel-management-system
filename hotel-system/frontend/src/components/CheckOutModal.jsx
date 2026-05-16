import React, { useState, useEffect, useContext } from 'react';
import { X, CreditCard, Clock, CheckCircle2, Loader2, AlertCircle, Banknote, Smartphone, Coffee, Plus, List, Trash2 } from 'lucide-react';
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
  const [activeTab, setActiveTab]   = useState('checkout'); // 'checkout' or 'services'
  
  // Services State
  const [availableServices, setAvailableServices] = useState([]);
  const [bookingServices, setBookingServices] = useState([]);
  const [addingService, setAddingService] = useState(false);

  useEffect(() => {
    if (isOpen && selectedRoom) {
      setReceipt(null); setError(''); setPayMethod('cash'); setActiveTab('checkout');
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
        if (b) {
          fetchServicesData(b.id);
        } else {
          setError('Không tìm thấy booking active cho phòng này.');
        }
      }
    } catch (err) { setError('Lỗi khi tải booking.'); }
    finally { setLoading(false); }
  };

  const fetchServicesData = async (bookingId) => {
    try {
      const [allRes, addedRes] = await Promise.all([
        api.get(`/services?branch_id=${user.branch_id}`),
        api.get(`/services/booking/${bookingId}`)
      ]);
      if (allRes.data.success) setAvailableServices(allRes.data.data);
      if (addedRes.data.success) setBookingServices(addedRes.data.data);
    } catch (err) {
      console.error('Failed to load services', err);
    }
  };

  const handleAddService = async (serviceId) => {
    if (!bookingInfo) return;
    setAddingService(true);
    try {
      await api.post(`/services/booking/${bookingInfo.id}`, {
        service_id: serviceId,
        quantity: 1
      });
      await fetchServicesData(bookingInfo.id);
    } catch (err) {
      setError('Lỗi khi thêm dịch vụ.');
    } finally {
      setAddingService(false);
    }
  };

  const handleDeleteService = async (bookingServiceId) => {
    if (!bookingInfo) return;
    try {
      await api.delete(`/services/booking/${bookingInfo.id}/services/${bookingServiceId}`);
      await fetchServicesData(bookingInfo.id);
    } catch (err) {
      setError('Lỗi khi xóa dịch vụ.');
    }
  };

  const handleCheckOut = async () => {
    if (!bookingInfo) return;
    setError(''); setLoading(true);
    try {
      const res = await api.post(`/bookings/${bookingInfo.id}/check-out`);
      if (res.data.success) {
        setReceipt(res.data.receipt);
        try {
          await api.post('/payments', {
            branch_id: user.branch_id,
            booking_id: bookingInfo.id,
            amount: res.data.receipt?.total_amount ?? res.data.receipt?.room_price,
            method: payMethod,
          });
        } catch (_) {
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

  const totalServiceCost = bookingServices.reduce((sum, item) => sum + Number(item.total_price), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl animate-slide-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 bg-surface-50 rounded-t-2xl shrink-0">
          <div>
            <h2 className="font-bold text-surface-900">Phòng {selectedRoom?.room_number}</h2>
            <p className="text-xs text-surface-500 mt-0.5">Quản lý phòng đang sử dụng</p>
          </div>
          {!receipt && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-200 text-surface-400 transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Tabs */}
        {!receipt && bookingInfo && (
          <div className="flex border-b border-surface-200 shrink-0">
            <button 
              onClick={() => setActiveTab('checkout')}
              className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'checkout' ? 'border-primary-500 text-primary-700' : 'border-transparent text-surface-500 hover:text-surface-700 hover:bg-surface-50'}`}
            >
              <CreditCard size={16} className="inline mr-2" />
              Thanh toán
            </button>
            <button 
              onClick={() => setActiveTab('services')}
              className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 flex items-center justify-center ${activeTab === 'services' ? 'border-primary-500 text-primary-700' : 'border-transparent text-surface-500 hover:text-surface-700 hover:bg-surface-50'}`}
            >
              <Coffee size={16} className="mr-2" />
              Thêm dịch vụ
              {bookingServices.length > 0 && (
                <span className="ml-2 bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full">{bookingServices.length}</span>
              )}
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
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
            bookingInfo && activeTab === 'checkout' ? (
              <div className="space-y-4 animate-fade-in">
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
                  {totalServiceCost > 0 && (
                    <div className="flex justify-between text-sm border-t border-surface-200 pt-2 mt-2">
                      <span className="text-surface-500">Đã gọi DV:</span>
                      <span className="font-semibold text-surface-800">{formatVND(totalServiceCost)}</span>
                    </div>
                  )}
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
            ) : bookingInfo && activeTab === 'services' ? (
              <div className="space-y-6 animate-fade-in">
                {/* Available Services */}
                <div>
                  <h3 className="text-sm font-bold text-surface-700 mb-3">Menu Dịch Vụ</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {availableServices.map(svc => (
                      <div key={svc.id} className="border border-surface-200 rounded-xl p-3 flex flex-col justify-between hover:border-primary-300 transition-colors bg-white">
                        <div>
                          <p className="font-semibold text-sm text-surface-900">{svc.name}</p>
                          <p className="text-xs text-surface-500 font-medium mb-2">{formatVND(svc.price)}</p>
                        </div>
                        <button 
                          onClick={() => handleAddService(svc.id)}
                          disabled={addingService}
                          className="w-full py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors disabled:opacity-50"
                        >
                          <Plus size={14} className="mr-1" /> Thêm
                        </button>
                      </div>
                    ))}
                  </div>
                  {availableServices.length === 0 && (
                    <p className="text-sm text-surface-500 italic text-center py-4 border border-dashed border-surface-300 rounded-xl">Không có dịch vụ nào khả dụng.</p>
                  )}
                </div>

                {/* Added Services */}
                <div>
                  <h3 className="text-sm font-bold text-surface-700 mb-3 flex items-center">
                    <List size={16} className="mr-2 text-surface-400" />
                    Đã gọi ({bookingServices.length})
                  </h3>
                  {bookingServices.length > 0 ? (
                    <div className="bg-surface-50 border border-surface-200 rounded-xl divide-y divide-surface-200">
                      {bookingServices.map((item, idx) => (
                        <div key={idx} className="p-3 flex justify-between items-center text-sm group">
                          <div>
                            <p className="font-semibold text-surface-900">{item.name}</p>
                            <p className="text-xs text-surface-500">{item.quantity} x {formatVND(item.price)}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="font-bold text-surface-800">{formatVND(item.total_price)}</p>
                            <button
                              onClick={() => handleDeleteService(item.id)}
                              className="text-surface-300 hover:text-danger-500 transition-colors opacity-0 group-hover:opacity-100"
                              title="Xóa dịch vụ"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="p-3 flex justify-between items-center bg-surface-100 rounded-b-xl">
                        <span className="font-semibold text-surface-700 text-sm">Tổng cộng</span>
                        <span className="font-bold text-primary-700">{formatVND(totalServiceCost)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-surface-500 italic text-center py-4 bg-surface-50 rounded-xl">Chưa có dịch vụ nào được gọi.</p>
                  )}
                </div>
              </div>
            ) : null
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
                  <span className="font-bold text-surface-900">Tổng thanh toán:</span>
                  <span className="text-xl font-bold text-primary-600">{formatVND(receipt.total_amount ?? receipt.room_price)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-100 bg-surface-50 rounded-b-2xl flex justify-end gap-3 shrink-0">
          {!receipt ? (
            activeTab === 'checkout' ? (
              <>
                <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">Hủy</button>
                <button
                  onClick={handleCheckOut}
                  disabled={loading || !bookingInfo}
                  className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <CreditCard size={13} />}
                  Thanh toán & Trả phòng
                </button>
              </>
            ) : (
              <button onClick={() => setActiveTab('checkout')} className="btn-primary text-sm px-4 py-2">Xong</button>
            )
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
