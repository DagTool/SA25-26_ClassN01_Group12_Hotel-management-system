import React, { useState, useEffect, useContext } from 'react';
import { Settings, Copy, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';

export default function SettingsPage() {
  const { user } = useContext(AuthContext);
  const [branchData, setBranchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const fetchBranchSettings = async () => {
    try {
      const response = await api.get('/auth/branch');
      if (response.data.success) {
        setBranchData(response.data.data);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranchSettings();
  }, []);

  const handleCopy = () => {
    if (branchData?.invite_code) {
      navigator.clipboard.writeText(branchData.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRefreshCode = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn tạo mã mời mới? Mã cũ sẽ không còn hiệu lực.')) return;
    
    setRefreshing(true);
    try {
      const response = await api.post('/auth/branch/refresh-invite');
      if (response.data.success) {
        setBranchData(response.data.data);
      } else {
        alert(response.data.message);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi kết nối máy chủ');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const isExpired = branchData?.invite_code_expires_at && new Date(branchData.invite_code_expires_at) < new Date();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-900 flex items-center">
          <Settings className="mr-3 text-primary-600" /> Cài đặt hệ thống
        </h1>
      </div>

      {error && (
        <div className="bg-danger-50 text-danger-600 p-4 rounded-xl flex items-center">
          <AlertCircle className="mr-2 h-5 w-5" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-surface-200 overflow-hidden">
        <div className="p-6 border-b border-surface-200 bg-surface-50">
          <h2 className="text-lg font-semibold text-surface-900">Chi nhánh: {branchData?.name || 'Đang tải...'}</h2>
          <p className="text-surface-500 text-sm mt-1">Quản lý các thiết lập dành cho chi nhánh này.</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Invite Code Section (Admin only) */}
          {user?.role === 'admin' ? (
            <div>
              <h3 className="text-md font-semibold text-surface-800 mb-3">Mã mời nhân viên</h3>
              <p className="text-sm text-surface-500 mb-4">
                Sử dụng mã này để mời nhân viên (lễ tân, quản lý) tạo tài khoản và tham gia vào chi nhánh của bạn.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex-1 max-w-sm">
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={branchData?.invite_code || ''}
                      className="w-full pl-4 pr-12 py-3 bg-surface-100 border border-surface-200 rounded-xl text-surface-900 font-mono font-bold tracking-wider focus:outline-none"
                    />
                    <button
                      onClick={handleCopy}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-surface-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Sao chép"
                    >
                      {copied ? <CheckCircle2 size={18} className="text-success-500" /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={handleRefreshCode}
                  disabled={refreshing}
                  className="flex items-center px-4 py-3 bg-surface-900 text-white rounded-xl hover:bg-surface-800 transition-colors text-sm font-medium disabled:opacity-70"
                >
                  <RefreshCw size={16} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Tạo mã mới
                </button>
              </div>
              
              {branchData?.invite_code_expires_at && (
                <p className={`text-sm mt-3 flex items-center ${isExpired ? 'text-danger-500 font-medium' : 'text-surface-500'}`}>
                  {isExpired ? <AlertCircle size={14} className="mr-1.5" /> : null}
                  Hạn sử dụng: {new Date(branchData.invite_code_expires_at).toLocaleString('vi-VN')}
                  {isExpired && ' (Đã hết hạn)'}
                </p>
              )}
            </div>
          ) : (
            <div>
              <h3 className="text-md font-semibold text-surface-800 mb-3">Mã mời nhân viên</h3>
              <p className="text-sm text-surface-500 mb-4 italic">
                Chỉ quản trị viên (Admin) mới có quyền xem và quản lý mã mời nhân viên.
              </p>
            </div>
          )}
          
          <hr className="border-surface-200" />
          
          {/* Other settings can go here */}
          <div>
            <h3 className="text-md font-semibold text-surface-800 mb-3">Thông tin khác</h3>
            <p className="text-sm text-surface-500 mb-4">Các tính năng cấu hình đang được phát triển...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
