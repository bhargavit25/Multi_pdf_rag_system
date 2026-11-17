import React from 'react';
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Sparkles,
  HelpCircle,
  Layers,
  History,
  Settings,
  LogOut,
  Upload,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NavLink as RouterNavLink, useNavigate as useRouterNavigate } from 'react-router-dom';

export function Sidebar({ mobileOpen, setMobileOpen, onUploadClick }) {
  const { user, logout } = useAuth();
  const navigate = useRouterNavigate();

  const navSections = [
    {
      title: 'WORKSPACE',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'My Documents', path: '/documents', icon: FileText },
        { label: 'AI Chat', path: '/chat', icon: MessageSquare },
      ],
    },
    {
      title: 'AI LEARNING TOOLS',
      items: [
        { label: 'Summarization', path: '/summarize', icon: Sparkles },
        { label: 'Quiz Generator', path: '/quiz', icon: HelpCircle },
        { label: 'Flashcards', path: '/flashcards', icon: Layers },
        { label: 'Learning History', path: '/history', icon: History },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { label: 'Settings', path: '/settings', icon: Settings },
      ],
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-64 p-4 select-none">
      {/* Brand Logo */}
      <div className="flex items-center gap-3 px-2 py-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-md shadow-brand-500/20 text-white font-bold text-lg">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            PDF<span className="text-brand-600">RAG</span>
            <span className="text-[10px] uppercase font-bold bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded border border-brand-200">
              AI
            </span>
          </h1>
          <p className="text-xs text-slate-500">Study & Research Platform</p>
        </div>
      </div>

      {/* Prominent Upload PDF Button */}
      <button
        type="button"
        onClick={() => {
          if (setMobileOpen) setMobileOpen(false);
          if (onUploadClick) onUploadClick();
        }}
        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 mb-5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm hover:shadow transition-all active:scale-[0.98]"
      >
        <Upload className="w-4 h-4" />
        <span>Upload PDF</span>
      </button>

      {/* Navigation Sections */}
      <div className="space-y-4 flex-1 overflow-y-auto pr-1">
        {navSections.map((sec, idx) => (
          <div key={idx} className="space-y-1">
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {sec.title}
            </p>
            {sec.items.map((item) => {
              const Icon = item.icon;
              return (
                <RouterNavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen && setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 font-semibold border border-brand-200 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </RouterNavLink>
              );
            })}
          </div>
        ))}
      </div>

      {/* User profile & Logout */}
      <div className="pt-3 border-t border-slate-200">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-sm shrink-0 border border-brand-200">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">{user?.name || 'User'}</p>
              <p className="text-[11px] text-slate-500 truncate">{user?.email || ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
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
