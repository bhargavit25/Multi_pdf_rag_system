import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Edit2,
  Check,
  Bot,
  Sparkles,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { MessageItem } from '../components/chat/MessageItem';
import { ChatInput } from '../components/chat/ChatInput';
import { Button } from '../components/ui/Button';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export function ChatPage() {
  const { id: routeChatId } = useParams();
  const [searchParams] = useSearchParams();
  const initialDocFilter = searchParams.get('doc') || '';
  const navigate = useNavigate();
  const { showToast } = useToast();

  // State
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(routeChatId || null);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [chatSearch, setChatSearch] = useState('');

  // Document context filter
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(initialDocFilter);

  // Rename state
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitleText, setEditTitleText] = useState('');

  const messagesEndRef = useRef(null);
  const justCreatedSessionIdRef = useRef(null);

  // Fetch document list for scope selection
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await api.get('/documents', { params: { status: 'Ready' } });
        if (res.data?.success) {
          setDocuments(res.data.data.documents || []);
        }
      } catch (err) {
        console.error('Failed to load documents:', err);
      }
    };
    fetchDocs();
  }, []);

  // Fetch all chat sessions
  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await api.get('/chats');
      if (res.data?.success) {
        setSessions(res.data.data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Sync routeChatId with activeSessionId
  useEffect(() => {
    if (routeChatId) {
      setActiveSessionId(routeChatId);
    } else {
      setActiveSessionId(null);
      setActiveSession(null);
      setMessages([]);
    }
  }, [routeChatId]);

  // Load active session messages
  useEffect(() => {
    if (!activeSessionId) return;

    if (justCreatedSessionIdRef.current === activeSessionId) {
      justCreatedSessionIdRef.current = null;
      return;
    }

    const loadSession = async () => {
      try {
        const res = await api.get(`/chats/${activeSessionId}`);
        if (res.data?.success) {
          const s = res.data.data.session;
          setActiveSession(s);
          setMessages(s.messages || []);
        }
      } catch (err) {
        showToast('error', 'Failed to load conversation messages.');
        navigate('/chat', { replace: true });
      }
    };

    loadSession();
  }, [activeSessionId, navigate, showToast]);

  // Scroll to bottom on message update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleNewChat = () => {
    justCreatedSessionIdRef.current = null;
    setActiveSessionId(null);
    setActiveSession(null);
    setMessages([]);
    navigate('/chat');
  };

  const handleSelectSession = (id) => {
    if (id === activeSessionId) return;
    justCreatedSessionIdRef.current = null;
    setActiveSessionId(id);
    navigate(`/chat/${id}`);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg = {
      role: 'user',
      content: trimmed,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const payload = {
        question: trimmed,
        chatId: activeSessionId || undefined,
        documentIds: selectedDocId ? [selectedDocId] : [],
      };

      const res = await api.post('/chat', payload);
      if (res.data?.success) {
        const { chatId, answer, sources } = res.data.data;

        const assistantMsg = {
          role: 'assistant',
          content: answer,
          sources: sources || [],
          createdAt: new Date(),
        };

        setMessages((prev) => [...prev, assistantMsg]);

        if (!activeSessionId) {
          justCreatedSessionIdRef.current = chatId;
          setActiveSessionId(chatId);
          setActiveSession({
            _id: chatId,
            title: trimmed.length > 30 ? `${trimmed.slice(0, 30)}...` : trimmed,
          });
          navigate(`/chat/${chatId}`, { replace: true });
          fetchSessions();
        }
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error communicating with AI service.';
      showToast('error', errorMsg);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Error**: ${errorMsg}. Please verify your documents and try again.`,
          sources: [],
          createdAt: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMessage || loading) return;

    setLoading(true);
    try {
      const res = await api.post('/chat', {
        question: lastUserMessage.content,
        chatId: activeSessionId,
        documentIds: selectedDocId ? [selectedDocId] : [],
      });

      if (res.data?.success) {
        const newAssistantMsg = {
          role: 'assistant',
          content: res.data.data.answer,
          sources: res.data.data.sources || [],
          createdAt: new Date(),
        };

        setMessages((prev) => {
          const list = [...prev];
          const lastIdx = list.map((m) => m.role).lastIndexOf('assistant');
          if (lastIdx !== -1) {
            list[lastIdx] = newAssistantMsg;
            return list;
          }
          return [...list, newAssistantMsg];
        });
      }
    } catch (err) {
      showToast('error', 'Failed to regenerate response');
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (sessionId) => {
    if (!editTitleText.trim()) {
      setEditingChatId(null);
      return;
    }

    try {
      const res = await api.patch(`/chats/${sessionId}`, { title: editTitleText.trim() });
      if (res.data?.success) {
        setSessions((prev) =>
          prev.map((s) => (s._id === sessionId ? { ...s, title: editTitleText.trim() } : s))
        );
        if (activeSession && activeSession._id === sessionId) {
          setActiveSession((prev) => ({ ...prev, title: editTitleText.trim() }));
        }
        showToast('success', 'Chat title updated');
      }
    } catch (err) {
      showToast('error', 'Failed to rename chat');
    } finally {
      setEditingChatId(null);
      setEditTitleText('');
    }
  };

  const handleDeleteChat = async (sessionId, e) => {
    e.stopPropagation();
    try {
      const res = await api.delete(`/chats/${sessionId}`);
      if (res.data?.success) {
        setSessions((prev) => prev.filter((s) => s._id !== sessionId));
        if (activeSessionId === sessionId) {
          handleNewChat();
        }
        showToast('success', 'Chat deleted');
      }
    } catch (err) {
      showToast('error', 'Failed to delete chat');
    }
  };

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(chatSearch.toLowerCase())
  );

  const suggestedQuestions = [
    'Summarize the core topics covered in my uploaded PDFs.',
    'What are the key methodologies or definitions mentioned?',
    'Compare the findings across the documents.',
  ];

  return (
    <div className="flex h-[calc(100vh-6.5rem)] rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      {/* Chats Sidebar */}
      <div className="w-72 shrink-0 border-r border-slate-200 bg-slate-50/70 hidden md:flex flex-col p-4">
        {/* New Chat Button */}
        <button
          type="button"
          onClick={handleNewChat}
          className="flex items-center justify-between w-full p-2.5 rounded-xl bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 text-sm font-semibold transition-all mb-4 group"
        >
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-brand-600 group-hover:rotate-90 transition-transform" />
            <span>New Chat</span>
          </div>
          <span className="text-[10px] bg-brand-200/60 px-1.5 py-0.5 rounded text-brand-800">
            +
          </span>
        </button>

        {/* Chat Search */}
        <div className="relative mb-3">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search chats..."
            value={chatSearch}
            onChange={(e) => setChatSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-brand-500 transition-colors"
          />
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {sessionsLoading ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-slate-200/60 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No conversations found.
            </div>
          ) : (
            filteredSessions.map((s) => {
              const isActive = s._id === activeSessionId;
              const isEditing = editingChatId === s._id;

              return (
                <div
                  key={s._id}
                  onClick={() => handleSelectSession(s._id)}
                  className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-brand-700 font-semibold shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                    {isEditing ? (
                      <input
                        type="text"
                        value={editTitleText}
                        onChange={(e) => setEditTitleText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(s._id);
                          if (e.key === 'Escape') setEditingChatId(null);
                        }}
                        autoFocus
                        className="bg-transparent border-b border-brand-500 text-xs text-slate-900 focus:outline-hidden w-full"
                      />
                    ) : (
                      <span className="truncate">{s.title}</span>
                    )}
                  </div>

                  {/* Action buttons on hover */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isEditing ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRename(s._id);
                        }}
                        className="p-1 hover:text-emerald-600 text-slate-400"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingChatId(s._id);
                            setEditTitleText(s.title);
                          }}
                          className="p-1 hover:text-slate-700 text-slate-400"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteChat(s._id, e)}
                          className="p-1 hover:text-red-600 text-slate-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {/* Chat Header */}
        <div className="h-14 border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base text-slate-800 truncate">
              {activeSession ? activeSession.title : 'New AI Conversation'}
            </h3>
            {selectedDocId && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 font-medium">
                <FileText className="w-3 h-3 text-brand-600" />
                Filtered Scope
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              onClick={handleNewChat}
              className="md:hidden"
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              New
            </Button>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/40">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 border border-brand-200 flex items-center justify-center mb-4 shadow-xs">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">
                Multi-PDF RAG Assistant
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
                Ask questions across all indexed PDFs or select a specific document scope. Answers include exact source filenames and page citations.
              </p>

              {documents.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-left w-full flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">No ready documents found</p>
                    <p className="mt-0.5">Please upload and index PDF documents first to query them.</p>
                  </div>
                </div>
              ) : (
                <div className="w-full space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 text-left">
                    Example Questions:
                  </p>
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setInput(q);
                      }}
                      className="w-full text-left p-3 rounded-xl bg-white border border-slate-200 hover:border-brand-400 hover:bg-brand-50/20 text-xs text-slate-700 hover:text-brand-700 transition-all shadow-xs"
                    >
                      &ldquo;{q}&rdquo;
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <MessageItem
                  key={idx}
                  message={msg}
                  isLast={idx === messages.length - 1}
                  onRegenerate={handleRegenerate}
                  loading={loading}
                />
              ))}

              {loading && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-200 text-slate-500 text-xs shadow-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                  <span>Searching vector database and generating response with citations...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <ChatInput
            input={input}
            setInput={setInput}
            onSend={handleSend}
            loading={loading}
            documents={documents}
            selectedDocId={selectedDocId}
            setSelectedDocId={setSelectedDocId}
            suggestedQuestions={messages.length === 0 ? [] : []}
          />
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
