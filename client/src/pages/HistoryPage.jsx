import React, { useState, useEffect } from 'react';
import {
  History,
  MessageSquare,
  Search,
  Trash2,
  Calendar,
  Clock,
  ArrowRight,
  ExternalLink,
  Edit2,
  Check,
  Plus,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import { formatDate, formatRelativeTime } from '../utils/formatters';
import api from '../services/api';

export function HistoryPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteSession, setDeleteSession] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const { showToast } = useToast();
  const navigate = useNavigate();

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/chats');
      if (res.data.success) {
        setSessions(res.data.data.sessions);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleDelete = async () => {
    if (!deleteSession) return;
    try {
      const res = await api.delete(`/chats/${deleteSession._id}`);
      if (res.data.success) {
        setSessions((prev) => prev.filter((s) => s._id !== deleteSession._id));
        showToast('Conversation deleted', 'success');
        setDeleteSession(null);
      }
    } catch {
      showToast('Failed to delete conversation', 'error');
    }
  };

  const handleRename = async (sessionId) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    try {
      const res = await api.patch(`/chats/${sessionId}`, { title: editTitle.trim() });
      if (res.data.success) {
        setSessions((prev) =>
          prev.map((s) => (s._id === sessionId ? { ...s, title: editTitle.trim() } : s))
        );
        showToast('Title updated', 'success');
      }
    } catch {
      showToast('Failed to rename conversation', 'error');
    } finally {
      setEditingId(null);
      setEditTitle('');
    }
  };

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-400" />
            <span>Chat Session History</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            View, search, rename, and resume your previous AI document conversations.
          </p>
        </div>

        <Link to="/chat">
          <Button variant="primary" size="sm" icon={Plus}>
            Start New Chat
          </Button>
        </Link>
      </div>

      {/* Search Input */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search conversation topics and titles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Conversations Grid / List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-400 animate-pulse text-sm">
            Loading your conversation history...
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center border border-slate-800 text-slate-400">
            <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No conversations found</p>
            <p className="text-xs text-slate-500 mt-1">
              {search ? 'Try adjusting your search terms' : 'Start your first RAG chat now!'}
            </p>
            <div className="mt-4">
              <Link to="/chat">
                <Button variant="secondary" size="sm">
                  Start Chat
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isEditing = editingId === session._id;

            return (
              <div
                key={session._id}
                className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0 mt-0.5">
                    <MessageSquare className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="flex items-center gap-2 max-w-md">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(session._id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          autoFocus
                          className="bg-slate-950 border border-brand-500 rounded-lg px-2.5 py-1 text-sm text-white w-full focus:outline-none"
                        />
                        <button
                          onClick={() => handleRename(session._id)}
                          className="p-1.5 text-emerald-400 hover:bg-slate-800 rounded-lg"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <h4 className="text-sm sm:text-base font-bold text-white truncate group-hover:text-brand-300 transition-colors">
                        {session.title}
                      </h4>
                    )}

                    {session.lastMessage && (
                      <p className="text-xs text-slate-400 truncate mt-1">
                        "{session.lastMessage}"
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(session.updatedAt)}
                      </span>
                      <span>•</span>
                      <span>{session.messageCount} messages</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(session._id);
                        setEditTitle(session.title);
                      }}
                      title="Rename Title"
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setDeleteSession(session)}
                    title="Delete Conversation"
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <Link to={`/chat/${session._id}`}>
                    <Button variant="secondary" size="sm" icon={ArrowRight}>
                      Continue
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteSession)}
        onClose={() => setDeleteSession(null)}
        title="Delete Conversation"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Are you sure you want to delete <strong>"{deleteSession?.title}"</strong>? All messages and citations in this thread will be permanently removed.
          </p>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteSession(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
