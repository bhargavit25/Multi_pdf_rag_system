import React, { useState, useEffect } from 'react';
import {
  FileText,
  MessageSquare,
  Layers,
  HardDrive,
  Upload,
  ArrowRight,
  Sparkles,
  Clock,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { Link, useOutletContext } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { StatCardSkeleton, TableRowSkeleton } from '../components/ui/Skeletons';
import { formatBytes, formatDate, formatRelativeTime } from '../utils/formatters';
import api from '../services/api';

export function DashboardPage() {
  const { openUploadModal } = useOutletContext() || {};
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await api.get('/stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const handleUpdate = () => fetchStats();
    window.addEventListener('documents-updated', handleUpdate);
    return () => window.removeEventListener('documents-updated', handleUpdate);
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-brand-950/80 via-slate-900 to-indigo-950/60 border border-brand-500/20 shadow-2xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient from-brand-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Semantic Vector Retrieval Active</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Multi-PDF RAG Workspace
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Upload PDFs to automatically extract text, preserve page numbers, generate high-dimensional embeddings, and chat with precise citations.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              variant="primary"
              icon={Upload}
              onClick={openUploadModal}
            >
              Upload PDF Documents
            </Button>
            <Link to="/chat">
              <Button variant="secondary" icon={MessageSquare}>
                Open AI Chat
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Indexed PDFs
                </span>
                <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {stats?.totalDocuments || 0}
                </span>
                <span className="text-xs text-emerald-400 font-medium">
                  {stats?.readyDocuments || 0} ready
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Across all uploaded files</p>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Conversations
                </span>
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {stats?.totalChats || 0}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {stats?.totalMessages || 0} msgs
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Active RAG sessions</p>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Vector Chunks
                </span>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {stats?.totalChunks || 0}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {stats?.totalPages || 0} pages
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Stored in vector database</p>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Document Storage
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <HardDrive className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {formatBytes(stats?.totalSizeBytes || 0)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Processed storage volume</p>
            </div>
          </>
        )}
      </div>

      {/* Two Column Layout: Recent Documents & Recent Conversations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Documents Table */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-400" />
              <span>Recent Documents</span>
            </h3>
            <Link
              to="/documents"
              className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1 hover:underline"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px] tracking-wider">
                  <th className="pb-3 px-3 font-semibold">Document</th>
                  <th className="pb-3 px-3 font-semibold">Pages</th>
                  <th className="pb-3 px-3 font-semibold">Size</th>
                  <th className="pb-3 px-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <>
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                  </>
                ) : !stats?.recentDocuments || stats.recentDocuments.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-400 text-xs">
                      No documents uploaded yet.{' '}
                      <button
                        onClick={openUploadModal}
                        className="text-brand-400 font-semibold hover:underline ml-1"
                      >
                        Upload your first PDF
                      </button>
                    </td>
                  </tr>
                ) : (
                  stats.recentDocuments.map((doc) => (
                    <tr key={doc._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-slate-200 truncate max-w-[200px] sm:max-w-xs">
                            {doc.filename}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-400">{doc.pageCount || '-'}</td>
                      <td className="py-3 px-3 text-slate-400">{formatBytes(doc.fileSize)}</td>
                      <td className="py-3 px-3">
                        <Badge status={doc.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Conversations */}
        <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>Recent Chats</span>
            </h3>
            <Link
              to="/history"
              className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1 hover:underline"
            >
              <span>History</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2 flex-1">
            {!stats?.recentChats || stats.recentChats.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No recent conversations.
                <div className="mt-3">
                  <Link to="/chat">
                    <Button variant="secondary" size="sm">
                      Start a Conversation
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              stats.recentChats.map((chat) => (
                <Link
                  key={chat.id}
                  to={`/chat/${chat.id}`}
                  className="block p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800/70 border border-slate-800/80 hover:border-slate-700 transition-all group"
                >
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                    {chat.title}
                  </p>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                    <span>{chat.messageCount} messages</span>
                    <span>{formatRelativeTime(chat.updatedAt)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
