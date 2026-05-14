import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import {
  DoorOpen, Plus, Edit2, Trash2, X, Loader2,
  BedDouble, RefreshCw, CheckCircle2, AlertCircle, Clock, Wrench
} from 'lucide-react';
import CheckInModal from '../components/CheckInModal';
import CheckOutModal from '../components/CheckOutModal';

const STATUS_OPTIONS = [
  { value: 'available', label: 'Phòng trống', cls: 'badge-success' },
  { value: 'occupied', label: 'Đang có khách', cls: 'badge-danger' },
  { value: 'cleaning', label: 'Đang dọn dẹp', cls: 'badge-warning' },
  { value: 'maintenance', label: 'Bảo trì', cls: 'badge-surface' },
];

const ROOM_TYPES = ['single', 'double', 'triple', 'suite', 'vip'];

const EMPTY_FORM = {
  room_number: '', floor: 1, type: 'single',
  base_price: '', hourly_base_price: '', hourly_extra_price: '',
};

function RoomModal({ room, onClose, onSaved, branchId }) {
  const [form, setForm] = useState(
    room
      ? { room_number: room.room_number, floor: room.floor, type: room.type, base_price: room.base_price, hourly_base_price: room.hourly_base_price, hourly_extra_price: room.hourly_extra_price }
      : EMPTY_FORM
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.room_number || !form.base_price) { setError('Điền đầy đủ thông tin bắt buộc'); return; }
    setLoading(true); setError('');
    try {
      const payload = { ...form, floor: Number(form.floor), base_price: Number(form.base_price), hourly_base_price: Number(form.hourly_base_price), hourly_extra_price: Number(form.hourly_extra_price) };
      if (room) await api.put(`/rooms/${room.id}`, payload);
      else await api.post('/rooms', { branch_id: branchId, ...payload });
      onSaved(); onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h3 className="font-bold text-surface-900">{room ? 'Cập nhật phòng' : 'Thêm phòng mới'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="p-3 bg-danger-50 text-danger-600 text-sm rounded-lg border border-danger-100">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1.5">Số phòng *</label>
              <input className="input-field" value={form.room_number} onChange={(e) => set('room_number', e.target.value)} placeholder="101" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1.5">Tầng *</label>
              <input className="input-field" type="number" min="1" value={form.floor} onChange={(e) => set('floor', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1.5">Loại phòng</label>
            <select className="input-field" value={form.type} onChange={(e) => set('type', e.target.value)}>
              {ROOM_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1.5">Giá ngày (đ) *</label>
              <input className="input-field" type="number" min="0" value={form.base_price} onChange={(e) => set('base_price', e.target.value)} placeholder="200000" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1.5">Giá giờ đầu (đ)</label>
              <input className="input-field" type="number" min="0" value={form.hourly_base_price} onChange={(e) => set('hourly_base_price', e.target.value)} placeholder="60000" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1.5">Giá giờ thêm (đ)</label>
              <input className="input-field" type="number" min="0" value={form.hourly_extra_price} onChange={(e) => set('hourly_extra_price', e.target.value)} placeholder="20000" />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-surface-100 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Hủy</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary flex items-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            {room ? 'Lưu' : 'Thêm phòng'}
          </button>
        </div>
      </div>
    </div>
  );
}

const formatVND = (n) => new Intl.NumberFormat('vi-VN').format(n ?? 0) + 'đ';

export default function RoomsPage() {
  const { user } = useContext(AuthContext);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalRoom, setModalRoom] = useState(undefined);
  const [selectedOpRoom, setSelectedOpRoom] = useState(null);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [filterFloor, setFilterFloor] = useState('all');

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/rooms?branch_id=${user.branch_id}`);
      if (res.data.success) setRooms(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRooms(); }, [user]);

  const updateStatus = async (room, newStatus) => {
    if (room.status === newStatus) return;

    if (newStatus === 'occupied') {
      if (room.status !== 'available') {
        alert('Chỉ có thể check-in khi phòng đang trống');
        return;
      }
      setSelectedOpRoom(room);
      setIsCheckInOpen(true);
      return;
    }

    if (room.status === 'occupied' && newStatus === 'available') {
      setSelectedOpRoom(room);
      setIsCheckOutOpen(true);
      return;
    }

    setStatusLoading(room.id);
    try {
      await api.patch(`/rooms/${room.id}/status`, { status: newStatus });
      fetchRooms();
    } catch (err) { console.error(err); }
    finally { setStatusLoading(null); }
  };

  const deleteRoom = async (room) => {
    if (!confirm(`Xóa phòng ${room.room_number}?`)) return;
    setDeleteLoading(room.id);
    try {
      await api.delete(`/rooms/${room.id}`);
      fetchRooms();
    } catch (err) { alert(err.response?.data?.message || 'Không thể xóa'); }
    finally { setDeleteLoading(null); }
  };

  const floors = [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b);
  const displayed = filterFloor === 'all' ? rooms : rooms.filter((r) => r.floor === Number(filterFloor));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DoorOpen size={20} className="text-primary-600" />
          <h1 className="text-lg font-bold text-surface-900">Phòng & Giá</h1>
          <span className="badge badge-primary ml-1">{rooms.length} phòng</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchRooms} className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2">
            <RefreshCw size={13} />
          </button>
          <button onClick={() => setModalRoom(null)} className="btn-primary flex items-center gap-2">
            <Plus size={15} />
            Thêm phòng
          </button>
        </div>
      </div>

      {/* Floor filter */}
      {floors.length > 1 && (
        <div className="flex gap-2">
          <button onClick={() => setFilterFloor('all')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterFloor === 'all' ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>
            Tất cả
          </button>
          {floors.map((f) => (
            <button key={f} onClick={() => setFilterFloor(String(f))} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterFloor === String(f) ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>
              Tầng {f}
            </button>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 text-surface-400">
            <BedDouble size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Chưa có phòng nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50/80">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Phòng</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Loại</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Giá ngày</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Giờ đầu</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Giờ thêm</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Trạng thái</th>
                  <th className="px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {displayed.map((room) => (
                  <tr key={room.id} className="hover:bg-surface-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-surface-900">
                      {room.room_number}
                      <span className="ml-2 text-xs text-surface-400 font-normal">T{room.floor}</span>
                    </td>
                    <td className="px-5 py-3.5 capitalize text-surface-600">{room.type}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-surface-700 font-semibold">{formatVND(room.base_price)}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-surface-700">{formatVND(room.hourly_base_price)}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-surface-700">{formatVND(room.hourly_extra_price)}</td>
                    <td className="px-5 py-3.5">
                      <select
                        value={room.status}
                        onChange={(e) => updateStatus(room, e.target.value)}
                        disabled={statusLoading === room.id}
                        className={`text-xs border rounded-lg px-2 py-1 focus:outline-none cursor-pointer ${
                          room.status === 'available' ? 'bg-success-50 text-success-700 border-success-200' :
                          room.status === 'occupied' ? 'bg-danger-50 text-danger-700 border-danger-200' :
                          room.status === 'cleaning' ? 'bg-warning-50 text-warning-700 border-warning-200' :
                          'bg-surface-100 text-surface-700 border-surface-200'
                        }`}
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                      {/* Thêm nút quản lý nhanh nếu phòng đang có khách */}
                      {room.status === 'occupied' && (
                        <button 
                          onClick={() => { setSelectedOpRoom(room); setIsCheckOutOpen(true); }}
                          className="ml-2 text-[10px] font-medium bg-primary-50 text-primary-600 px-2 py-0.5 rounded hover:bg-primary-100 transition-colors"
                        >
                          Quản lý
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setModalRoom(room)} className="p-1.5 rounded-lg hover:bg-primary-50 text-surface-400 hover:text-primary-600 transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => deleteRoom(room)}
                          disabled={deleteLoading === room.id || room.status === 'occupied'}
                          className="p-1.5 rounded-lg hover:bg-danger-50 text-surface-400 hover:text-danger-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={room.status === 'occupied' ? 'Không thể xóa phòng đang có khách' : 'Xóa phòng'}
                        >
                          {deleteLoading === room.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
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

      {modalRoom !== undefined && (
        <RoomModal
          room={modalRoom}
          branchId={user.branch_id}
          onClose={() => setModalRoom(undefined)}
          onSaved={fetchRooms}
        />
      )}

      {isCheckInOpen && selectedOpRoom && (
        <CheckInModal
          isOpen={isCheckInOpen}
          onClose={() => { setIsCheckInOpen(false); setSelectedOpRoom(null); }}
          selectedRoom={selectedOpRoom}
          onCheckInSuccess={() => { setIsCheckInOpen(false); fetchRooms(); }}
        />
      )}

      {isCheckOutOpen && selectedOpRoom && (
        <CheckOutModal
          isOpen={isCheckOutOpen}
          onClose={() => { setIsCheckOutOpen(false); setSelectedOpRoom(null); }}
          selectedRoom={selectedOpRoom}
          onCheckOutSuccess={() => { setIsCheckOutOpen(false); fetchRooms(); }}
        />
      )}
    </div>
  );
}
