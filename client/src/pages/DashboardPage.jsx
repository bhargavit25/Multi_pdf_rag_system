import React, { useState, useEffect } from 'react';
import {
  FileText,
  MessageSquare,
  Sparkles,
  Layers,
  HelpCircle,
  Upload,
  ArrowRight,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { Link, useOutletContext } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { StatCardSkeleton, TableRowSkeleton } from '../components/ui/Skeletons';
import { formatBytes, formatRelativeTime, formatDate } from '../utils/formatters';
import api from '../services/api';

export function DashboardPage() {
  const { openUploadModal } = useOutletContext() || {};
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await api.get('/stats');
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 bg-linear-to-r from-brand-600 to-indigo-700 text-white shadow-md">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-white text-xs font-semibold mb-3 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-brand-200" />
            <span>AI Learning & Semantic Vector RAG Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Multi-PDF RAG Learning Workspace
          </h1>
          <p className="mt-2 text-sm text-brand-100 leading-relaxed">
            Upload PDFs to extract knowledge, run semantic chat with exact page citations, generate structured summaries, test your comprehension with AI quizzes, and practice with flashcards.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              icon={<Upload className="w-4 h-4 text-brand-700" />}
              onClick={openUploadModal}
              className="bg-white text-brand-700 hover:bg-brand-50 font-semibold shadow-xs"
            >
              Upload PDF
            </Button>
            <Link to="/chat">
              <Button
                variant="outline"
                icon={<MessageSquare className="w-4 h-4 text-white" />}
                className="border-white/40 text-white hover:bg-white/15 hover:border-white"
              >
                Ask AI Assistant
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 6 Real KPI Metric Cards */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Platform Metrics
          </h2>
          <span className="text-xs text-slate-400">Live data from your workspace</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {loading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              {/* Total Uploaded PDFs */}
              <div className="card p-4 border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 truncate">Total PDFs</span>
                  <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {stats?.totalDocuments || 0}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 truncate">Uploaded files</p>
              </div>

              {/* Ready / Processed Documents */}
              <div className="card p-4 border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 truncate">Processed</span>
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-600">
                  {stats?.readyDocuments || 0}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 truncate">Indexed & ready for AI</p>
              </div>

              {/* Chat Sessions */}
              <div className="card p-4 border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 truncate">AI Chats</span>
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {stats?.totalChats || 0}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 truncate">{stats?.totalMessages || 0} total messages</p>
              </div>

              {/* Summaries Generated */}
              <div className="card p-4 border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 truncate">Summaries</span>
                  <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {stats?.totalSummaries || 0}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 truncate">Generated overviews</p>
              </div>

              {/* Quizzes Generated */}
              <div className="card p-4 border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 truncate">Quizzes</span>
                  <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {stats?.totalQuizzes || 0}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 truncate">Comprehension tests</p>
              </div>

              {/* Flashcards Created */}
              <div className="card p-4 border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 truncate">Flashcards</span>
                  <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {stats?.totalFlashcards || 0}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 truncate">{stats?.totalFlashcardSets || 0} card sets</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="card p-5 border border-slate-200 bg-white shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <button
            onClick={openUploadModal}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 hover:border-brand-400 hover:bg-brand-50/30 text-slate-700 transition-all group"
          >
            <div className="p-2 rounded-lg bg-blue-50 text-brand-600 group-hover:scale-110 transition-transform mb-2">
              <Upload className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold group-hover:text-brand-700">Upload PDF</span>
          </button>

          <Link
            to="/chat"
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 hover:border-brand-400 hover:bg-brand-50/30 text-slate-700 transition-all group"
          >
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform mb-2">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold group-hover:text-indigo-700">Ask AI</span>
          </Link>

          <Link
            to="/summarize"
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 hover:border-brand-400 hover:bg-brand-50/30 text-slate-700 transition-all group"
          >
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform mb-2">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold group-hover:text-amber-700">Generate Summary</span>
          </Link>

          <Link
            to="/quiz"
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 hover:border-brand-400 hover:bg-brand-50/30 text-slate-700 transition-all group"
          >
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform mb-2">
              <HelpCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold group-hover:text-purple-700">Create Quiz</span>
          </Link>

          <Link
            to="/flashcards"
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 hover:border-brand-400 hover:bg-brand-50/30 text-slate-700 transition-all group"
          >
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600 group-hover:scale-110 transition-transform mb-2">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold group-hover:text-rose-700">Practice Flashcards</span>
          </Link>
        </div>
      </div>

      {/* Two Column Layout: Recent Documents & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Documents Table (2 Cols) */}
        <div className="lg:col-span-2 card p-5 sm:p-6 border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-600" />
              <span>Recent Documents</span>
            </h3>
            <Link
              to="/documents"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 hover:underline"
            >
              <span>View all ({stats?.totalDocuments || 0})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[11px] tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-3 font-semibold">Document</th>
                  <th className="py-2.5 px-3 font-semibold">Pages</th>
                  <th className="py-2.5 px-3 font-semibold">Size</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Quick AI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <>
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                  </>
                ) : !stats?.recentDocuments || stats.recentDocuments.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-500 text-xs">
                      No documents uploaded yet.{' '}
                      <button
                        onClick={openUploadModal}
                        className="text-brand-600 font-semibold hover:underline ml-1"
                      >
                        Upload your first PDF
                      </button>
                    </td>
                  </tr>
                ) : (
                  stats.recentDocuments.map((doc) => {
                    const isReady = doc.status?.toLowerCase() === 'ready';
                    const docName = doc.filename || doc.name || 'Untitled PDF';

                    return (
                      <tr key={doc._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1.5 rounded-lg bg-red-50 text-red-600 border border-red-100 shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <span className="font-medium text-slate-800 truncate max-w-[180px] sm:max-w-xs" title={docName}>
                              {docName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium">{doc.pageCount || '-'}</td>
                        <td className="py-3 px-3 text-slate-500">{formatBytes(doc.fileSize)}</td>
                        <td className="py-3 px-3">
                          <Badge
                            variant={
                              isReady
                                ? 'success'
                                : doc.status?.toLowerCase() === 'processing'
                                ? 'warning'
                                : 'neutral'
                            }
                          >
                            {doc.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {isReady ? (
                            <div className="inline-flex items-center gap-1 justify-end">
                              <Link
                                to={`/chat?doc=${doc._id}`}
                                title="Chat"
                                className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </Link>
                              <Link
                                to={`/summarize?doc=${doc._id}`}
                                title="Summarize"
                                className="p-1.5 rounded-md text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </Link>
                              <Link
                                to={`/quiz?doc=${doc._id}`}
                                title="Quiz"
                                className="p-1.5 rounded-md text-slate-500 hover:text-purple-600 hover:bg-purple-50"
                              >
                                <HelpCircle className="w-3.5 h-3.5" />
                              </Link>
                              <Link
                                to={`/flashcards?doc=${doc._id}`}
                                title="Flashcards"
                                className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                              >
                                <Layers className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">Processing...</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity Feed (1 Col) */}
        <div className="card p-5 sm:p-6 border border-slate-200 bg-white shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" />
              <span>Recent Activity</span>
            </h3>
            <Link
              to="/history"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 hover:underline"
            >
              <span>All History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[360px] pr-1">
            {/* Merge top activities across tools */}
            {(() => {
              const acts = [];
              if (stats?.recentActivity?.chats) {
                stats.recentActivity.chats.forEach((c) =>
                  acts.push({
                    type: 'chat',
                    title: c.title,
                    subtitle: `${c.messageCount} messages`,
                    date: c.updatedAt,
                    link: `/chat/${c.id}`,
                    icon: MessageSquare,
                    color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
                  })
                );
              }
              if (stats?.recentActivity?.summaries) {
                stats.recentActivity.summaries.forEach((s) =>
                  acts.push({
                    type: 'summary',
                    title: s.title,
                    subtitle: `${s.type} summary`,
                    date: s.createdAt,
                    link: `/history?tab=summaries`,
                    icon: Sparkles,
                    color: 'text-amber-600 bg-amber-50 border-amber-100',
                  })
                );
              }
              if (stats?.recentActivity?.quizzes) {
                stats.recentActivity.quizzes.forEach((q) =>
                  acts.push({
                    type: 'quiz',
                    title: q.title,
                    subtitle: q.status === 'completed' ? `Score: ${q.percentage}%` : 'In progress',
                    date: q.createdAt,
                    link: `/quiz?id=${q.id}`,
                    icon: HelpCircle,
                    color: 'text-purple-600 bg-purple-50 border-purple-100',
                  })
                );
              }
              if (stats?.recentActivity?.flashcards) {
                stats.recentActivity.flashcards.forEach((f) =>
                  acts.push({
                    type: 'flashcard',
                    title: f.title,
                    subtitle: `${f.totalCards} cards (${f.knownCount || 0} known)`,
                    date: f.createdAt,
                    link: `/flashcards?id=${f.id}`,
                    icon: Layers,
                    color: 'text-rose-600 bg-rose-50 border-rose-100',
                  })
                );
              }

              // Sort descending by date
              acts.sort((a, b) => new Date(b.date) - new Date(a.date));

              if (acts.length === 0) {
                return (
                  <div className="py-12 text-center text-xs text-slate-400">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No recent activity found.
                  </div>
                );
              }

              return acts.slice(0, 6).map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={idx}
                    to={item.link}
                    className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all group"
                  >
                    <div className={`p-1.5 rounded-lg border shrink-0 ${item.color}`}>
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-brand-600">
                        {item.title}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
                        <span className="capitalize">{item.subtitle}</span>
                        <span>{formatRelativeTime(item.date)}</span>
                      </div>
                    </div>
                  </Link>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
