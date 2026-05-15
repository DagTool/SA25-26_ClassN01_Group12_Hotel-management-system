import React, { useContext } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import {
  LayoutDashboard, Users, DoorOpen, LogOut,
  ReceiptText, Coffee, Building2, ChevronRight, Settings
} from 'lucide-react';

const PAGE_TITLES = {
  '/':         'Sơ đồ phòng',
  '/guests':   'Khách hàng',
  '/rooms':    'Phòng & Giá',
  '/services': 'Dịch vụ',
  '/payments': 'Thanh toán',
  '/settings': 'Cài đặt',
};

export default function Layout() {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  const pageTitle = PAGE_TITLES[location.pathname] || 'Trang chủ';

  const menuItems = [
    { name: 'Sơ đồ phòng', icon: LayoutDashboard, path: '/' },
    { name: 'Khách hàng',  icon: Users,           path: '/guests' },
    { name: 'Phòng & Giá', icon: DoorOpen,        path: '/rooms' },
    { name: 'Dịch vụ',     icon: Coffee,          path: '/services' },
    { name: 'Thanh toán',  icon: ReceiptText,     path: '/payments' },
    { name: 'Cài đặt',     icon: Settings,        path: '/settings' },
  ];

  return (
    <div className="flex h-screen bg-surface-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-surface-950 text-surface-50 flex flex-col shrink-0 z-20">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-surface-800/60">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-2.5 shadow-lg shadow-primary-900/60">
            <Building2 size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide text-white leading-none">Hotel System</p>
            <p className="text-[10px] text-surface-500 font-medium mt-0.5">Management</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-surface-600 mb-2">
            Menu
          </p>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2.5 rounded-xl transition-all duration-150 group text-sm ${
                    isActive
                      ? 'bg-primary-600/20 text-primary-300 font-semibold'
                      : 'text-surface-400 hover:bg-surface-800/60 hover:text-surface-200 font-medium'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={16} className={`mr-3 shrink-0 ${isActive ? 'text-primary-400' : 'text-surface-500 group-hover:text-surface-300'}`} />
                    <span className="flex-1">{item.name}</span>
                    {isActive && <ChevronRight size={14} className="text-primary-400 opacity-60" />}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-surface-800/60">
          <div className="flex items-center px-3 py-2 rounded-xl bg-surface-900/60 mb-1">
            <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="ml-2.5 overflow-hidden">
              <p className="text-xs font-semibold text-surface-200 truncate leading-none">{user?.username}</p>
              <p className="text-[10px] text-surface-500 mt-0.5 truncate capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center px-3 py-2 text-surface-500 hover:text-danger-400 hover:bg-danger-500/10 rounded-xl transition-colors text-xs font-medium"
          >
            <LogOut size={14} className="mr-2.5" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-surface-200 flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center space-x-2">
            <span className="text-surface-400 text-sm">Hotel System</span>
            <ChevronRight size={14} className="text-surface-300" />
            <span className="text-surface-900 text-sm font-semibold">{pageTitle}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-surface-500 bg-surface-100 px-3 py-1.5 rounded-lg font-mono">
              {user?.branch_id?.substring(0, 8)}…
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-surface-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
