import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import {
  Coffee, Plus, Edit2, Trash2, X, Loader2,
  ToggleLeft, ToggleRight, Tag, RefreshCw
} from 'lucide-react';

const EMPTY_FORM = { name: '', description: '', price: '' };

function ServiceModal({ service, onClose, onSaved, branchId }) {
  const [form, setForm] = useState(service ? { name: service.name, description: service.description || '', price: service.price } : EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.name || !form.price) { setError('Tên và giá là bắt buộc'); return; }
    setLoading(true); setError('');
    try {
      const payload = { ...form, price: Number(form.price) };
      if (service) await api.put(`/services/${service.id}`, payload);
      else          await api.post('/services', { branch_id: branchId, ...payload });
      onSaved(); onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h3 className="font-bold text-surface-900">{service ? 'Cập nhật dịch vụ' : 'Thêm dịch vụ mới'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="p-3 bg-danger-50 text-danger-600 text-sm rounded-lg border border-danger-100">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1.5">Tên dịch vụ *</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Giặt ủi, Nước suối..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1.5">Mô tả</label>
            <textarea className="input-field resize-none" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả ngắn về dịch vụ..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1.5">Đơn giá (đ) *</label>
            <input className="input-field" type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="50000" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-surface-100 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Hủy</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary flex items-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            {service ? 'Lưu' : 'Thêm dịch vụ'}
          </button>
        </div>
      </div>
    </div>
  );
}

const formatVND = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n ?? 0);

export default function ServicesPage() {
  const { user } = useContext(AuthContext);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalService, setModalService] = useState(undefined);
  const [toggleLoading, setToggleLoading] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/services?branch_id=${user.branch_id}`);
      if (res.data.success) setServices(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Also fetch inactive services by calling a broader API — services API only returns active ones.
  // We'll show them by keeping local state when we update is_active.
  useEffect(() => { fetchServices(); }, [user]);

  const toggleActive = async (svc) => {
    setToggleLoading(svc.id);
    try {
      await api.put(`/services/${svc.id}`, { is_active: !svc.is_active });
      fetchServices();
    } catch (err) { console.error(err); }
    finally { setToggleLoading(null); }
  };

  const deleteService = async (svc) => {
    if (!confirm(`Vô hiệu hóa dịch vụ "${svc.name}"?`)) return;
    setDeleteLoading(svc.id);
    try {
      await api.delete(`/services/${svc.id}`);
      fetchServices();
    } catch (err) { alert(err.response?.data?.message || 'Không thể xóa'); }
    finally { setDeleteLoading(null); }
  };

  const totalActive = services.filter((s) => s.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coffee size={20} className="text-primary-600" />
          <h1 className="text-lg font-bold text-surface-900">Dịch vụ</h1>
          <span className="badge badge-primary ml-1">{totalActive} đang hoạt động</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchServices} className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2">
            <RefreshCw size={13} />
          </button>
          <button onClick={() => setModalService(null)} className="btn-primary flex items-center gap-2">
            <Plus size={15} />
            Thêm dịch vụ
          </button>
        </div>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : services.length === 0 ? (
        <div className="card p-12 text-center text-surface-400">
          <Coffee size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Chưa có dịch vụ nào</p>
          <button onClick={() => setModalService(null)} className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus size={15} />Thêm dịch vụ đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {services.map((svc) => (
            <div key={svc.id} className={`card p-5 transition-all duration-150 hover:shadow-md ${!svc.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                    <Tag size={14} className="text-primary-600" />
                  </div>
                  <span className={`text-xs font-semibold ${svc.is_active ? 'badge-success' : 'badge-surface'} badge`}>
                    {svc.is_active ? 'Hoạt động' : 'Tạm dừng'}
                  </span>
                </div>
              </div>
              <h3 className="font-bold text-surface-900 mb-1">{svc.name}</h3>
              {svc.description && <p className="text-xs text-surface-500 mb-3 line-clamp-2">{svc.description}</p>}
              <p className="text-lg font-bold text-primary-600 mb-4">{formatVND(svc.price)}</p>

              <div className="flex items-center gap-2 pt-3 border-t border-surface-100">
                <button
                  onClick={() => setModalService(svc)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-surface-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <Edit2 size={12} />Sửa
                </button>
                <button
                  onClick={() => toggleActive(svc)}
                  disabled={toggleLoading === svc.id}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-surface-600 hover:text-warning-600 hover:bg-warning-50 rounded-lg transition-colors"
                >
                  {toggleLoading === svc.id
                    ? <Loader2 size={12} className="animate-spin" />
                    : svc.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  {svc.is_active ? 'Tắt' : 'Bật'}
                </button>
                <button
                  onClick={() => deleteService(svc)}
                  disabled={deleteLoading === svc.id}
                  className="p-1.5 text-surface-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                >
                  {deleteLoading === svc.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalService !== undefined && (
        <ServiceModal
          service={modalService}
          branchId={user.branch_id}
          onClose={() => setModalService(undefined)}
          onSaved={fetchServices}
        />
      )}
    </div>
  );
}
