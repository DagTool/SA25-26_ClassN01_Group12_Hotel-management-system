import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import {
  BedDouble, CheckCircle2, AlertCircle, Clock,
  PlusCircle, Wrench, RefreshCw, Layers
} from 'lucide-react';
import CheckInModal from '../components/CheckInModal';
import CheckOutModal from '../components/CheckOutModal';

const STATUS_CONFIG = {
  available:   { label: 'Phòng trống',    color: 'text-success-700', bg: 'bg-success-50',  border: 'border-success-200',  dot: 'bg-success-500',  icon: CheckCircle2 },
  occupied:    { label: 'Đang có khách', color: 'text-danger-700',  bg: 'bg-danger-50',   border: 'border-danger-200',   dot: 'bg-danger-500',   icon: AlertCircle },
  cleaning:    { label: 'Đang dọn dẹp', color: 'text-warning-700', bg: 'bg-warning-50',  border: 'border-warning-200',  dot: 'bg-warning-500',  icon: Clock },
  maintenance: { label: 'Bảo trì',       color: 'text-surface-600', bg: 'bg-surface-100', border: 'border-surface-300',  dot: 'bg-surface-400',  icon: Wrench },
};

const formatVND = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n ?? 0);

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [isCheckInOpen, setIsCheckInOpen]   = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => { fetchRooms(); }, [user]);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/rooms?branch_id=${user.branch_id}`);
      if (res.data.success) setRooms(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomClick = async (room) => {
    if (room.status === 'cleaning' || room.status === 'maintenance') {
      const nextStatus = room.status === 'cleaning' ? 'available' : 'available';
      if (window.confirm(`Đánh dấu phòng ${room.room_number} đã sẵn sàng (Phòng trống)?`)) {
        try {
          await api.patch(`/rooms/${room.id}/status`, { status: nextStatus });
          fetchRooms();
        } catch (err) {
          alert('Lỗi cập nhật trạng thái phòng');
        }
      }
      return;
    }
    setSelectedRoom(room);
    if (room.status === 'available') setIsCheckInOpen(true);
    else if (room.status === 'occupied') setIsCheckOutOpen(true);
  };

  const statuses = ['available', 'occupied', 'cleaning', 'maintenance'];
  const counts = statuses.reduce((acc, s) => {
    acc[s] = rooms.filter((r) => r.status === s).length;
    return acc;
  }, {});

  const displayed = filter === 'all' ? rooms : rooms.filter((r) => r.status === filter);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statuses.map((s) => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          return (
            <button
              key={s}
              onClick={() => setFilter(filter === s ? 'all' : s)}
              className={`card p-5 text-left hover:shadow-md transition-all duration-150 cursor-pointer
                ${filter === s ? `ring-2 ring-primary-500 ${cfg.bg}` : 'hover:-translate-y-0.5'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                  <Icon size={16} className={cfg.color} />
                </div>
                <span className={`text-2xl font-bold ${cfg.color}`}>{counts[s]}</span>
              </div>
              <p className="text-xs font-medium text-surface-500">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-surface-400" />
          <h2 className="text-sm font-semibold text-surface-700">
            {filter === 'all' ? `Tất cả phòng (${rooms.length})` : `${STATUS_CONFIG[filter]?.label} (${counts[filter]})`}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchRooms} className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2">
            <RefreshCw size={13} />
            Làm mới
          </button>
          <button
            onClick={() => {
              const room = rooms.find((r) => r.status === 'available');
              if (room) { setSelectedRoom(room); setIsCheckInOpen(true); }
              else alert('Không còn phòng trống!');
            }}
            className="btn-primary flex items-center gap-1.5 text-xs px-3 py-2"
          >
            <PlusCircle size={13} />
            Nhận phòng
          </button>
        </div>
      </div>

      {/* Room Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="card p-12 text-center text-surface-400">
          <BedDouble size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Không có phòng nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {displayed.map((room) => {
            const cfg = STATUS_CONFIG[room.status] ?? STATUS_CONFIG.maintenance;
            const Icon = cfg.icon;
            const clickable = room.status === 'available' || room.status === 'occupied';
            return (
              <div
                key={room.id}
                onClick={() => handleRoomClick(room)}
                className={`card p-4 border-2 transition-all duration-200
                  ${cfg.border} ${cfg.bg}
                  ${clickable ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : 'opacity-70 cursor-default'}`}
              >
                {/* Room number + status */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-xl font-bold text-surface-900 leading-none">{room.room_number}</p>
                    <p className="text-[10px] text-surface-500 mt-1 font-medium uppercase tracking-wide">
                      Tầng {room.floor}
                    </p>
                  </div>
                  <div className={`p-1.5 rounded-lg ${cfg.bg} border ${cfg.border}`}>
                    <Icon size={14} className={cfg.color} />
                  </div>
                </div>

                {/* Type badge */}
                <div className="mb-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.color} border ${cfg.border} capitalize`}>
                    {room.type || 'Phòng đơn'}
                  </span>
                </div>

                {/* Price */}
                <div className="space-y-1 pt-2 border-t border-current/10">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-surface-500">Ngày</span>
                    <span className="font-semibold text-surface-700">{formatVND(room.base_price)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-surface-500">Giờ đầu</span>
                    <span className="font-semibold text-surface-700">{formatVND(room.hourly_base_price)}</span>
                  </div>
                </div>

                {/* CTA strip */}
                {room.status === 'available' && (
                  <div className="mt-3 text-center">
                    <span className="text-[10px] font-bold text-success-600 uppercase tracking-wider">
                      Nhấn để nhận phòng
                    </span>
                  </div>
                )}
                {room.status === 'occupied' && (
                  <div className="mt-3 text-center">
                    <span className="text-[10px] font-bold text-danger-600 uppercase tracking-wider">
                      Nhấn để thanh toán
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        selectedRoom={selectedRoom}
        onCheckInSuccess={fetchRooms}
      />
      <CheckOutModal
        isOpen={isCheckOutOpen}
        onClose={() => setIsCheckOutOpen(false)}
        selectedRoom={selectedRoom}
        onCheckOutSuccess={fetchRooms}
      />
    </div>
  );
}
