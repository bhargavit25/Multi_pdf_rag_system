import React, { useState, useEffect } from 'react';
import { Menu, Cpu, Upload } from 'lucide-react';
import { useLocation } from 'react-router-dom';
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

  const getPageInfo = () => {
    const p = location.pathname;
    if (p === '/dashboard') return { title: 'Overview Dashboard', subtitle: 'Platform statistics and recent learning activities' };
    if (p === '/documents') return { title: 'My Documents Library', subtitle: 'Manage, inspect, and index your PDF documents' };
    if (p.startsWith('/chat')) return { title: 'AI Document Assistant', subtitle: 'Grounded conversation with page citations' };
    if (p === '/summarize') return { title: 'AI PDF Summarization', subtitle: 'Generate structured summaries from your uploaded PDFs' };
    if (p === '/quiz') return { title: 'AI Quiz Generator', subtitle: 'Create interactive practice quizzes with feedback' };
    if (p === '/flashcards') return { title: 'AI Flashcards Studio', subtitle: 'Master key concepts with active-recall flashcards' };
    if (p === '/history') return { title: 'Learning History', subtitle: 'Review all past chats, summaries, quizzes, and flashcards' };
    if (p === '/settings' || p === '/profile') return { title: 'Settings & Model Config', subtitle: 'Configure LLM providers and personal preferences' };
    return { title: 'Multi-PDF RAG Platform', subtitle: 'AI-powered study & research platform' };
  };

  const pageInfo = getPageInfo();

  return (
    <header className="h-16 border-b border-slate-200/90 bg-white/85 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
            {pageInfo.title}
          </h2>
          <p className="text-xs text-slate-500 hidden sm:block">
            {pageInfo.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* System Health Indicators */}
        <div className="hidden sm:flex items-center gap-2.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-medium text-slate-500">DB:</span>
            <span className="text-[11px] font-semibold text-emerald-600">Online</span>
          </div>

          <span className="text-slate-300">|</span>

          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-brand-600" />
            <span className="text-[11px] font-medium text-slate-500">Vector:</span>
            <span className="text-[11px] font-semibold text-brand-700">
              {health?.vectorStore?.info?.provider || 'Ready'}
            </span>
          </div>
        </div>

        {/* Upload Button */}
        {onUploadClick && (
          <button
            onClick={onUploadClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs hover:shadow transition-all active:scale-[0.98]"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload PDF</span>
          </button>
        )}
      </div>
    </header>
  );
}
