import React, { useState, useContext, useRef, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Building2, ChevronDown, Plus, Check, Loader2 } from 'lucide-react';

export default function HotelSwitcher() {
  const { user, hotels, switchHotel, createHotel } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newHotelName, setNewHotelName] = useState('');
  const [switching, setSwitching] = useState(null); // hotel_id đang switch
  const [error, setError] = useState('');
  const ref = useRef(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user || user.role !== 'admin') return null;

  const currentHotel = hotels.find(h => h.id === user.hotel_id);

  const handleSwitch = async (hotelId) => {
    if (hotelId === user.hotel_id) { setOpen(false); return; }
    setSwitching(hotelId);
    setError('');
    const result = await switchHotel(hotelId);
    setSwitching(null);
    if (result?.success === false) setError(result.message);
    else { setOpen(false); window.location.reload(); } // reload để refresh toàn bộ data
  };

  const handleCreate = async () => {
    if (!newHotelName.trim()) return;
    setSwitching('new');
    setError('');
    const result = await createHotel(newHotelName.trim());
    setSwitching(null);
    if (result?.success === false) {
      setError(result.message);
    } else {
      setNewHotelName('');
      setCreating(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 transition-colors text-sm text-white w-full"
      >
        <Building2 size={14} className="text-primary-400 shrink-0" />
        <span className="flex-1 text-left truncate font-medium">
          {currentHotel?.name || 'Chọn hotel'}
        </span>
        <ChevronDown size={14} className={`text-surface-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-surface-900 border border-surface-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-surface-500 px-2 py-1 mb-1">
              Hotels của bạn ({hotels.length})
            </p>

            {hotels.map((hotel) => (
              <button
                key={hotel.id}
                onClick={() => handleSwitch(hotel.id)}
                disabled={switching === hotel.id}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-surface-700 transition-colors text-left"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${hotel.id === user.hotel_id ? 'bg-primary-600' : 'bg-surface-700'}`}>
                  {switching === hotel.id
                    ? <Loader2 size={13} className="animate-spin text-white" />
                    : <Building2 size={13} className="text-white" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{hotel.name}</p>
                  <p className="text-[11px] text-surface-500">{hotel.branch_count} chi nhánh</p>
                </div>
                {hotel.id === user.hotel_id && (
                  <Check size={14} className="text-primary-400 shrink-0" />
                )}
              </button>
            ))}

            <div className="border-t border-surface-700 mt-1 pt-1">
              {!creating ? (
                <button
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-surface-700 transition-colors text-surface-400 hover:text-white"
                >
                  <Plus size={14} />
                  <span className="text-sm">Thêm hotel mới</span>
                </button>
              ) : (
                <div className="p-2 space-y-2">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Tên hotel mới..."
                    value={newHotelName}
                    onChange={(e) => setNewHotelName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
                    className="w-full px-3 py-2 text-sm bg-surface-800 border border-surface-600 rounded-lg text-white placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleCreate}
                      disabled={switching === 'new' || !newHotelName.trim()}
                      className="flex-1 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs rounded-lg font-medium transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      {switching === 'new' ? <Loader2 size={12} className="animate-spin" /> : 'Tạo'}
                    </button>
                    <button
                      onClick={() => { setCreating(false); setNewHotelName(''); }}
                      className="flex-1 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-300 text-xs rounded-lg transition-colors"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <p className="text-xs text-danger-400 px-3 py-1">{error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
