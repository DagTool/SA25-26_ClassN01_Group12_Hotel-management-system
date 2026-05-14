import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import { BedDouble, CheckCircle2, AlertCircle, Clock, PlusCircle } from 'lucide-react';
import CheckInModal from '../components/CheckInModal';
import CheckOutModal from '../components/CheckOutModal';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    fetchRooms();
  }, [user]);

  const fetchRooms = async () => {
    try {
      const res = await api.get(`/rooms?branch_id=${user.branch_id}`);
      if (res.data.success) {
        setRooms(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-success-50 border-success-200 text-success-700 shadow-success-500/20';
      case 'occupied': return 'bg-danger-50 border-danger-200 text-danger-700 shadow-danger-500/20';
      case 'cleaning': return 'bg-warning-50 border-warning-200 text-warning-700 shadow-warning-500/20';
      default: return 'bg-surface-100 border-surface-200 text-surface-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available': return <CheckCircle2 size={18} className="text-success-500" />;
      case 'occupied': return <AlertCircle size={18} className="text-danger-500" />;
      case 'cleaning': return <Clock size={18} className="text-warning-500" />;
      default: return <BedDouble size={18} className="text-surface-400" />;
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handleRoomClick = (room) => {
    setSelectedRoom(room);
    if (room.status === 'available') {
      setIsCheckInOpen(true);
    } else if (room.status === 'occupied') {
      setIsCheckOutOpen(true);
    }
  };

  const handleGlobalCheckIn = () => {
    const availableRoom = rooms.find(r => r.status === 'available');
    if (availableRoom) {
      setSelectedRoom(availableRoom);
      setIsCheckInOpen(true);
    } else {
      alert('Không còn phòng trống!');
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-center">
          <h3 className="text-surface-500 text-sm font-medium">Tổng số phòng</h3>
          <p className="text-3xl font-bold text-surface-900 mt-2">{rooms.length}</p>
        </div>
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-center border-l-4 border-l-success-500">
          <h3 className="text-surface-500 text-sm font-medium">Phòng trống</h3>
          <p className="text-3xl font-bold text-success-600 mt-2">
            {rooms.filter(r => r.status === 'available').length}
          </p>
        </div>
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-center border-l-4 border-l-danger-500">
          <h3 className="text-surface-500 text-sm font-medium">Đang có khách</h3>
          <p className="text-3xl font-bold text-danger-600 mt-2">
            {rooms.filter(r => r.status === 'occupied').length}
          </p>
        </div>
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-center border-l-4 border-l-warning-500">
          <h3 className="text-surface-500 text-sm font-medium">Đang dọn dẹp</h3>
          <p className="text-3xl font-bold text-warning-600 mt-2">
            {rooms.filter(r => r.status === 'cleaning').length}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex space-x-4 mb-6">
        <button 
          onClick={handleGlobalCheckIn}
          className="flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          <PlusCircle size={18} className="mr-2" />
          Nhận phòng (Check-in)
        </button>
      </div>

      {/* Room Grid */}
      <h2 className="text-xl font-bold text-surface-800 mb-4">Sơ đồ phòng</h2>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {rooms.map((room) => (
            <div 
              key={room.id} 
              onClick={() => handleRoomClick(room)}
              className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:scale-105 cursor-pointer shadow-sm hover:shadow-xl ${getStatusColor(room.status)}`}
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">{room.room_number}</h3>
                    <p className="text-sm opacity-80 capitalize font-medium">{room.type}</p>
                  </div>
                  <div className="p-2 bg-white/50 rounded-full backdrop-blur-sm">
                    {getStatusIcon(room.status)}
                  </div>
                </div>
                <div className="space-y-1 mt-6">
                  <div className="flex justify-between text-sm">
                    <span className="opacity-80">Giá ngày:</span>
                    <span className="font-semibold">{formatPrice(room.base_price)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="opacity-80">Giá giờ:</span>
                    <span className="font-semibold">{formatPrice(room.hourly_base_price)}</span>
                  </div>
                </div>
              </div>
              {room.status === 'occupied' && (
                <div className="absolute bottom-0 left-0 right-0 bg-danger-500/10 backdrop-blur-md p-2 text-center border-t border-danger-500/20">
                  <span className="text-xs font-bold text-danger-700 uppercase tracking-wider">Thanh toán</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <CheckInModal 
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        selectedRoom={selectedRoom}
        onCheckInSuccess={() => fetchRooms()}
      />

      <CheckOutModal 
        isOpen={isCheckOutOpen}
        onClose={() => setIsCheckOutOpen(false)}
        selectedRoom={selectedRoom}
        onCheckOutSuccess={() => fetchRooms()}
      />
    </div>
  );
}
