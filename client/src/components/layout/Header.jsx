import React, { useState, useEffect } from 'react';
import { Menu, Database, Cpu, Sparkles, Upload } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../services/api';

export function Header({ setMobileOpen, onUploadClick }) {
  const location = useLocation();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await api.get('/health');
        if (res.data.success) {
          setHealth(res.data.data);
        }
      } catch {
        // silent
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return 'Overview Dashboard';
      case '/documents':
        return 'Document Library';
      case '/chat':
        return 'AI Assistant Chat';
      case '/history':
        return 'Conversation History';
      case '/profile':
        return 'Settings & Model Configuration';
      default:
        if (location.pathname.startsWith('/chat/')) return 'Conversation';
        return 'Multi-PDF RAG';
    }
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {getPageTitle()}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* System Health Indicators */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/70 border border-slate-800 text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-medium text-slate-400">DB:</span>
            <span className="text-[11px] font-semibold text-emerald-400">Online</span>
          </div>

          <span className="text-slate-700">|</span>

          <div className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-brand-400" />
            <span className="text-[11px] font-medium text-slate-400">Vector:</span>
            <span className="text-[11px] font-semibold text-brand-300">
              {health?.vectorStore?.info?.provider || 'Active'}
            </span>
          </div>
        </div>

        {/* Upload Button */}
        {onUploadClick && (
          <button
            onClick={onUploadClick}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-brand-600/90 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm shadow-brand-500/20 transition-all active:scale-[0.98]"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload PDF</span>
          </button>
        )}
      </div>
    </header>
  );
}
