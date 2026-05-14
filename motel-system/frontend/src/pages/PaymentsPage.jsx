import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import {
  ReceiptText, CheckCircle2, XCircle, Clock,
  TrendingUp, RefreshCw, ChevronDown, Loader2,
  CreditCard, Banknote, Smartphone
} from 'lucide-react';

const METHOD_LABELS = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Thẻ ngân hàng' };
const METHOD_ICONS  = { cash: Banknote, transfer: Smartphone, card: CreditCard };

const STATUS_CONFIG = {
  pending: { label: 'Chờ xác nhận', cls: 'badge-warning', icon: Clock },
  success: { label: 'Thành công',   cls: 'badge-success', icon: CheckCircle2 },
  failed:  { label: 'Thất bại',     cls: 'badge-danger',  icon: XCircle },
};

const formatVND = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n ?? 0);
const formatDate = (d) => d ? new Date(d).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

export default function PaymentsPage() {
  const { user } = useContext(AuthContext);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [tab, setTab] = useState('list'); // 'list' | 'report'

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payments?branch_id=${user.branch_id}`);
      if (res.data.success) setPayments(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchReport = async () => {
    try {
      const res = await api.get(`/payments/report?branch_id=${user.branch_id}`);
      if (res.data.success) setSummary(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchPayments();
    fetchReport();
  }, [user]);

  const handleAction = async (payment, action) => {
    setActionLoading(payment.id + action);
    try {
      await api.patch(`/payments/${payment.id}/${action}`);
      fetchPayments();
      fetchReport();
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally { setActionLoading(null); }
  };

  const pending = payments.filter((p) => p.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ReceiptText size={20} className="text-primary-600" />
          <h1 className="text-lg font-bold text-surface-900">Thanh toán</h1>
          {pending > 0 && <span className="badge badge-warning ml-1">{pending} chờ xác nhận</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { fetchPayments(); fetchReport(); }} className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5 border-l-4 border-l-success-500">
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1">Tổng doanh thu</p>
            <p className="text-2xl font-bold text-success-600">{formatVND(summary.summary?.total_revenue)}</p>
            <p className="text-xs text-surface-400 mt-1">{summary.summary?.total_transactions} giao dịch thành công</p>
          </div>
          <div className="card p-5 border-l-4 border-l-warning-500">
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1">Đang chờ</p>
            <p className="text-2xl font-bold text-warning-600">{formatVND(summary.summary?.pending_amount)}</p>
            <p className="text-xs text-surface-400 mt-1">{pending} giao dịch chưa xác nhận</p>
          </div>
          <div className="card p-5 border-l-4 border-l-primary-500">
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1">Tổng giao dịch</p>
            <p className="text-2xl font-bold text-primary-600">{payments.length}</p>
            <p className="text-xs text-surface-400 mt-1">Tất cả trạng thái</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-surface-100 bg-surface-50/80 flex items-center gap-2">
          <TrendingUp size={14} className="text-surface-400" />
          <h2 className="text-xs font-semibold text-surface-600 uppercase tracking-wide">Lịch sử giao dịch</h2>
        </div>
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-16 text-surface-400">
            <ReceiptText size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Chưa có giao dịch nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Mã GD</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Booking</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Số tiền</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Phương thức</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Trạng thái</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Thời gian</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {payments.map((p) => {
                  const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.pending;
                  const StatusIcon = cfg.icon;
                  const MethodIcon = METHOD_ICONS[p.method] ?? CreditCard;
                  return (
                    <tr key={p.id} className="hover:bg-surface-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-surface-500">{p.id.substring(0, 8)}…</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-surface-600">{p.booking_id?.substring(0, 8)}…</td>
                      <td className="px-5 py-3.5 font-bold text-surface-900">{formatVND(p.amount)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-surface-600">
                          <MethodIcon size={13} className="text-surface-400" />
                          <span className="text-xs">{METHOD_LABELS[p.method] ?? p.method}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`badge ${cfg.cls} flex items-center gap-1 w-fit`}>
                          <StatusIcon size={10} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-surface-500">{formatDate(p.created_at)}</td>
                      <td className="px-5 py-3.5">
                        {p.status === 'pending' && (
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => handleAction(p, 'confirm')}
                              disabled={!!actionLoading}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-success-700 bg-success-50 hover:bg-success-100 rounded-lg transition-colors border border-success-200"
                            >
                              {actionLoading === p.id + 'confirm' ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                              Xác nhận
                            </button>
                            <button
                              onClick={() => handleAction(p, 'fail')}
                              disabled={!!actionLoading}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-danger-700 bg-danger-50 hover:bg-danger-100 rounded-lg transition-colors border border-danger-200"
                            >
                              {actionLoading === p.id + 'fail' ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                              Từ chối
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
