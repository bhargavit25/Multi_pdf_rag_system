import React, { useState, useEffect } from 'react';
import {
  History,
  MessageSquare,
  Sparkles,
  HelpCircle,
  Layers,
  Search,
  Trash2,
  Clock,
  ArrowRight,
  Edit2,
  Check,
  RotateCcw,
  Download,
  Copy,
  ExternalLink,
  BookOpen,
  Eye,
  Award,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import { formatRelativeTime, formatDate } from '../utils/formatters';
import api from '../services/api';

export function HistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'chats';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [search, setSearch] = useState('');
  const { showToast } = useToast();

  // Data states
  const [chats, setChats] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [flashcardSets, setFlashcardSets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Rename chat state
  const [editingChatId, setEditingChatId] = useState(null);
  const [newChatTitle, setNewChatTitle] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null); // { type, id, title }
  const [deleting, setDeleting] = useState(false);

  // Preview modal for summaries & quizzes
  const [previewSummary, setPreviewSummary] = useState(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Sync tab with URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Fetch all learning history
  const fetchAllHistory = async () => {
    setLoading(true);
    try {
      const [chatsRes, summariesRes, quizzesRes, flashcardsRes] = await Promise.allSettled([
        api.get('/chats'),
        api.get('/summaries'),
        api.get('/quizzes'),
        api.get('/flashcards'),
      ]);

      if (chatsRes.status === 'fulfilled' && chatsRes.value.data?.success) {
        setChats(chatsRes.value.data.data.sessions || []);
      }
      if (summariesRes.status === 'fulfilled' && summariesRes.value.data?.success) {
        setSummaries(summariesRes.value.data.data.summaries || []);
      }
      if (quizzesRes.status === 'fulfilled' && quizzesRes.value.data?.success) {
        setQuizzes(quizzesRes.value.data.data.quizzes || []);
      }
      if (flashcardsRes.status === 'fulfilled' && flashcardsRes.value.data?.success) {
        setFlashcardSets(flashcardsRes.value.data.data.flashcardSets || []);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllHistory();
  }, []);

  // Delete handler
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const { type, id } = deleteTarget;
      if (type === 'chat') {
        await api.delete(`/chats/${id}`);
        setChats((prev) => prev.filter((item) => item._id !== id));
      } else if (type === 'summary') {
        await api.delete(`/summaries/${id}`);
        setSummaries((prev) => prev.filter((item) => item._id !== id));
      } else if (type === 'quiz') {
        await api.delete(`/quizzes/${id}`);
        setQuizzes((prev) => prev.filter((item) => item._id !== id));
      } else if (type === 'flashcard') {
        await api.delete(`/flashcards/${id}`);
        setFlashcardSets((prev) => prev.filter((item) => item._id !== id));
      }

      showToast('success', `${deleteTarget.title} deleted successfully.`);
      setDeleteTarget(null);
    } catch (err) {
      showToast('error', 'Failed to delete item.');
    } finally {
      setDeleting(false);
    }
  };

  // Rename Chat
  const handleSaveChatTitle = async (chatId) => {
    if (!newChatTitle.trim()) {
      setEditingChatId(null);
      return;
    }
    try {
      await api.patch(`/chats/${chatId}`, { title: newChatTitle.trim() });
      setChats((prev) =>
        prev.map((c) => (c._id === chatId ? { ...c, title: newChatTitle.trim() } : c))
      );
      showToast('success', 'Chat renamed.');
    } catch (err) {
      showToast('error', 'Failed to rename chat.');
    } finally {
      setEditingChatId(null);
      setNewChatTitle('');
    }
  };

  // Summary copy & download
  const handleCopySummary = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    showToast('success', 'Summary copied to clipboard!');
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleDownloadSummary = (summary) => {
    const element = document.createElement('a');
    const file = new Blob([summary.content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${summary.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast('success', 'Summary downloaded as text file.');
  };

  // Filtered lists
  const query = search.toLowerCase();
  const filteredChats = chats.filter((c) => c.title.toLowerCase().includes(query));
  const filteredSummaries = summaries.filter(
    (s) =>
      s.title.toLowerCase().includes(query) ||
      s.summaryType.toLowerCase().includes(query) ||
      s.documentNames?.some((d) => d.toLowerCase().includes(query))
  );
  const filteredQuizzes = quizzes.filter(
    (q) =>
      q.title.toLowerCase().includes(query) ||
      q.difficulty.toLowerCase().includes(query) ||
      q.documentNames?.some((d) => d.toLowerCase().includes(query))
  );
  const filteredFlashcards = flashcardSets.filter(
    (f) =>
      f.title.toLowerCase().includes(query) ||
      f.documentNames?.some((d) => d.toLowerCase().includes(query))
  );

  const tabs = [
    { id: 'chats', label: 'AI Chats', count: chats.length, icon: MessageSquare, color: 'text-indigo-600' },
    { id: 'summaries', label: 'Summaries', count: summaries.length, icon: Sparkles, color: 'text-amber-600' },
    { id: 'quizzes', label: 'Quizzes', count: quizzes.length, icon: HelpCircle, color: 'text-purple-600' },
    { id: 'flashcards', label: 'Flashcards', count: flashcardSets.length, icon: Layers, color: 'text-rose-600' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <History className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Learning History</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Access, review, search, and continue your past chats, summaries, quizzes, and flashcard sets.
          </p>
        </div>
      </div>

      {/* Tabs & Search Navigation */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-full md:w-auto overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? tab.color : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-slate-100 text-slate-700' : 'bg-slate-200/70 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Real-time search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-brand-500 shadow-xs transition-colors"
          />
        </div>
      </div>

      {/* Tab Content Display */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card p-5 border border-slate-200 bg-white animate-pulse h-36 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {/* 1. CHATS TAB */}
            {activeTab === 'chats' && (
              filteredChats.length === 0 ? (
                <EmptyHistoryState
                  icon={MessageSquare}
                  title="No chat sessions found"
                  desc="Start a conversation with your documents to build your chat history."
                  actionLabel="Start AI Chat"
                  actionLink="/chat"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredChats.map((c) => (
                    <div
                      key={c._id}
                      className="card p-5 border border-slate-200 bg-white hover:border-indigo-300 transition-all shadow-xs flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingChatId(c._id);
                                setNewChatTitle(c.title);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                              title="Rename"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ type: 'chat', id: c._id, title: c.title })}
                              className="p-1 text-slate-400 hover:text-red-600 rounded-md"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {editingChatId === c._id ? (
                          <div className="flex items-center gap-1.5 my-2">
                            <input
                              type="text"
                              value={newChatTitle}
                              onChange={(e) => setNewChatTitle(e.target.value)}
                              className="text-xs font-semibold text-slate-800 border-b border-brand-500 bg-transparent px-1 py-0.5 w-full focus:outline-hidden"
                            />
                            <button
                              onClick={() => handleSaveChatTitle(c._id)}
                              className="p-1 text-emerald-600 hover:text-emerald-700"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <h3 className="text-sm font-bold text-slate-800 truncate" title={c.title}>
                            {c.title}
                          </h3>
                        )}

                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          <span>{formatRelativeTime(c.updatedAt)}</span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                        <span className="text-xs font-medium text-slate-500">
                          {c.messages?.length || 0} messages
                        </span>
                        <Link
                          to={`/chat/${c._id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                        >
                          <span>Resume Chat</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* 2. SUMMARIES TAB */}
            {activeTab === 'summaries' && (
              filteredSummaries.length === 0 ? (
                <EmptyHistoryState
                  icon={Sparkles}
                  title="No saved summaries found"
                  desc="Generate short, detailed, or chapter-wise summaries from your PDFs."
                  actionLabel="Generate Summary"
                  actionLink="/summarize"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSummaries.map((s) => (
                    <div
                      key={s._id}
                      className="card p-5 border border-slate-200 bg-white hover:border-amber-300 transition-all shadow-xs flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="neutral" className="capitalize text-[10px]">
                              {s.summaryType}
                            </Badge>
                            <button
                              onClick={() => setDeleteTarget({ type: 'summary', id: s._id, title: s.title })}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 rounded-md transition-opacity"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h3 className="text-sm font-bold text-slate-800 line-clamp-2" title={s.title}>
                          {s.title}
                        </h3>

                        <p className="text-xs text-slate-500 mt-1 truncate">
                          {s.documentNames?.join(', ') || 'Document'}
                        </p>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">{formatDate(s.createdAt)}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleDownloadSummary(s)}
                            icon={<Download className="w-3 h-3" />}
                          >
                            TXT
                          </Button>
                          <Button
                            size="xs"
                            variant="primary"
                            onClick={() => setPreviewSummary(s)}
                            icon={<Eye className="w-3 h-3" />}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* 3. QUIZZES TAB */}
            {activeTab === 'quizzes' && (
              filteredQuizzes.length === 0 ? (
                <EmptyHistoryState
                  icon={HelpCircle}
                  title="No past quizzes found"
                  desc="Generate quizzes with multiple-choice, true/false, or mixed questions to test comprehension."
                  actionLabel="Create Quiz"
                  actionLink="/quiz"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredQuizzes.map((q) => (
                    <div
                      key={q._id}
                      className="card p-5 border border-slate-200 bg-white hover:border-purple-300 transition-all shadow-xs flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="p-2 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
                            <HelpCircle className="w-4 h-4" />
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge
                              variant={
                                q.status === 'completed'
                                  ? q.percentage >= 70
                                    ? 'success'
                                    : 'warning'
                                  : 'neutral'
                              }
                            >
                              {q.status === 'completed' ? `${q.percentage}%` : 'In Progress'}
                            </Badge>
                            <button
                              onClick={() => setDeleteTarget({ type: 'quiz', id: q._id, title: q.title })}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 rounded-md transition-opacity"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h3 className="text-sm font-bold text-slate-800 line-clamp-2" title={q.title}>
                          {q.title}
                        </h3>

                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <span className="capitalize">{q.difficulty}</span>
                          <span>•</span>
                          <span>{q.documentNames?.join(', ') || 'Documents'}</span>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">{formatDate(q.createdAt)}</span>
                        <Link to={`/quiz?id=${q._id}`}>
                          <Button size="xs" variant="primary" icon={<RotateCcw className="w-3 h-3" />}>
                            {q.status === 'completed' ? 'Review & Retake' : 'Continue'}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* 4. FLASHCARDS TAB */}
            {activeTab === 'flashcards' && (
              filteredFlashcards.length === 0 ? (
                <EmptyHistoryState
                  icon={Layers}
                  title="No flashcard sets found"
                  desc="Create interactive 3D flashcard decks with citations from your documents."
                  actionLabel="Generate Flashcards"
                  actionLink="/flashcards"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredFlashcards.map((f) => (
                    <div
                      key={f._id}
                      className="card p-5 border border-slate-200 bg-white hover:border-rose-300 transition-all shadow-xs flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-700">
                              {f.totalCards} cards
                            </span>
                            <button
                              onClick={() => setDeleteTarget({ type: 'flashcard', id: f._id, title: f.title })}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 rounded-md transition-opacity"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h3 className="text-sm font-bold text-slate-800 line-clamp-2" title={f.title}>
                          {f.title}
                        </h3>

                        <p className="text-xs text-slate-500 mt-1 truncate">
                          {f.documentNames?.join(', ') || 'Documents'}
                        </p>

                        <div className="flex items-center gap-2 mt-3 text-xs">
                          <span className="text-emerald-600 font-semibold">{f.knownCount || 0} known</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-amber-600 font-semibold">{f.needPracticeCount || 0} review</span>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">{formatDate(f.createdAt)}</span>
                        <Link to={`/flashcards?id=${f._id}`}>
                          <Button size="xs" variant="primary" icon={<Layers className="w-3 h-3" />}>
                            Practice Deck
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* Summary View Modal */}
      <Modal
        isOpen={Boolean(previewSummary)}
        onClose={() => setPreviewSummary(null)}
        title={previewSummary?.title || 'Summary View'}
        maxWidth="max-w-3xl"
      >
        {previewSummary && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="font-semibold text-slate-700">Type:</span>{' '}
                <span className="capitalize text-slate-900">{previewSummary.summaryType}</span>
                <span className="mx-2 text-slate-300">•</span>
                <span className="font-semibold text-slate-700">Source:</span>{' '}
                <span>{previewSummary.documentNames?.join(', ')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => handleCopySummary(previewSummary.content)}
                  icon={copiedSummary ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                >
                  {copiedSummary ? 'Copied' : 'Copy'}
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => handleDownloadSummary(previewSummary)}
                  icon={<Download className="w-3 h-3" />}
                >
                  Download
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white max-h-[500px] overflow-y-auto markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {previewSummary.content}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={`Confirm Delete`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <strong>"{deleteTarget?.title}"</strong>? This action cannot be undone.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={confirmDelete}
              loading={deleting}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function EmptyHistoryState({ icon, title, desc, actionLabel, actionLink }) {
  const Icon = typeof icon === 'function' ? icon : null;

  return (
    <div className="card p-12 text-center border border-slate-200 bg-white max-w-md mx-auto shadow-xs">
      <div className="p-3 rounded-full bg-slate-100 text-slate-400 w-12 h-12 flex items-center justify-center mx-auto mb-3">
        {React.isValidElement(icon) ? icon : Icon ? <Icon className="w-6 h-6" /> : null}
      </div>
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 mb-4">{desc}</p>
      <Link to={actionLink}>
        <Button size="sm" variant="primary">
          {actionLabel}
        </Button>
      </Link>
    </div>
  );
}

export default HistoryPage;
