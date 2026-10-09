import React from 'react';
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  History,
  User as UserIcon,
  LogOut,
  Sparkles,
  Plus,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NavLink as RouterNavLink, useNavigate as useRouterNavigate } from 'react-router-dom';

export function Sidebar({ mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth();
  const navigate = useRouterNavigate();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Documents', path: '/documents', icon: FileText },
    { label: 'RAG Chat', path: '/chat', icon: MessageSquare },
    { label: 'Chat History', path: '/history', icon: History },
    { label: 'Settings & Profile', path: '/profile', icon: UserIcon },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navContent = (
    <div className="flex flex-col h-full bg-slate-900/90 border-r border-slate-800/80 backdrop-blur-xl w-64 p-4 select-none">
      {/* Brand Logo */}
      <div className="flex items-center gap-3 px-2 py-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-brand-500/30 text-white font-bold text-lg">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
            PDF<span className="text-brand-400">RAG</span>
            <span className="text-[10px] uppercase font-semibold bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded border border-brand-500/30">
              AI
            </span>
          </h1>
          <p className="text-xs text-slate-400">Multi-Doc Intelligence</p>
        </div>
      </div>

      {/* Quick Action: Start New Chat */}
      <RouterNavLink
        to="/chat"
        onClick={() => setMobileOpen && setMobileOpen(false)}
        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 mb-6 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-md shadow-brand-600/20 transition-all active:scale-[0.98]"
      >
        <Plus className="w-4 h-4" />
        <span>New Chat</span>
      </RouterNavLink>

      {/* Navigation Links */}
      <div className="space-y-1.5 flex-1">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Menu
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <RouterNavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen && setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-600/15 text-brand-300 border border-brand-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </RouterNavLink>
          );
        })}
      </div>

      {/* User info & Logout */}
      <div className="pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/60 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-sm shrink-0 border border-indigo-500/30">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'User'}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email || ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block shrink-0 sticky top-0 h-screen z-20">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 w-64 max-w-[80vw] h-full animate-slide-up">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
