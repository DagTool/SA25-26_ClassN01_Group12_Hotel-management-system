import React, { useContext } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { LayoutDashboard, Users, DoorOpen, LogOut, ReceiptText, Coffee } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useContext(AuthContext);

  const menuItems = [
    { name: 'Sơ đồ phòng', icon: <LayoutDashboard size={20} />, path: '/' },
    { name: 'Khách hàng', icon: <Users size={20} />, path: '/guests' },
    { name: 'Phòng & Giá', icon: <DoorOpen size={20} />, path: '/rooms' },
    { name: 'Dịch vụ', icon: <Coffee size={20} />, path: '/services' },
    { name: 'Thanh toán', icon: <ReceiptText size={20} />, path: '/payments' },
  ];

  return (
    <div className="flex h-screen bg-surface-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-surface-900 text-surface-50 flex flex-col shadow-2xl z-20 transition-all duration-300">
        <div className="p-6 flex items-center justify-center border-b border-surface-800">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-primary-500/50">
            <DoorOpen size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-wide">Motel<span className="text-primary-400">Sys</span></h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-500/30' 
                    : 'text-surface-300 hover:bg-surface-800 hover:text-white'
                }`
              }
            >
              <span className="mr-3">{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-surface-800">
          <div className="flex items-center px-4 py-3 bg-surface-800 rounded-xl mb-3">
            <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center font-bold text-white shadow-sm">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.username}</p>
              <p className="text-xs text-surface-400 truncate">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center px-4 py-2 text-surface-300 hover:text-danger-400 hover:bg-danger-500/10 rounded-xl transition-colors"
          >
            <LogOut size={18} className="mr-3" />
            <span className="font-medium">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-surface-200 flex items-center justify-between px-8 z-10 shadow-sm">
          <h2 className="text-xl font-semibold text-surface-800">Trang chủ</h2>
          <div className="flex items-center space-x-4">
            <div className="px-3 py-1 bg-primary-50 text-primary-700 text-sm font-medium rounded-full border border-primary-100">
              Chi nhánh: {user?.branch_id?.substring(0,8)}...
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 to-transparent pointer-events-none"></div>
          <div className="relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
