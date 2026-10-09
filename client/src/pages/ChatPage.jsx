import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  Bot,
  Sparkles,
  Layers,
  FileText,
  Loader2,
  AlertCircle,
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

  // Fetch document list for scope selection
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await api.get('/documents', { params: { status: 'Ready' } });
        if (res.data.success) {
          setDocuments(res.data.data.documents);
        }
      } catch {
        // silent
      }
    };
    fetchDocs();
  }, []);

  // Fetch all chat sessions
  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await api.get('/chats');
      if (res.data.success) {
        setSessions(res.data.data.sessions);
      }
    } catch {
      // silent
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

  // Fetch active session messages
  useEffect(() => {
    if (!activeSessionId) {
      setActiveSession(null);
      setMessages([]);
      return;
    }

    const fetchSessionDetails = async () => {
      try {
        const res = await api.get(`/chats/${activeSessionId}`);
        if (res.data.success) {
          setActiveSession(res.data.data.session);
          setMessages(res.data.data.session.messages || []);
        }
      } catch {
        showToast('Failed to load chat session', 'error');
      }
    };

    fetchSessionDetails();
  }, [activeSessionId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleNewChat = () => {
    setActiveSessionId(null);
    setActiveSession(null);
    setMessages([]);
    navigate('/chat');
  };

  const handleSendMessage = async () => {
    const questionText = input.trim();
    if (!questionText || loading) return;

    // Optimistic user message
    const tempUserMsg = {
      role: 'user',
      content: questionText,
      sources: [],
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInput('');
    setLoading(true);

    try {
      const payload = {
        question: questionText,
        chatId: activeSessionId || undefined,
        documentIds: selectedDocId ? [selectedDocId] : [],
      };

      const res = await api.post('/chat', payload);
      if (res.data.success) {
        const { chatId, answer, sources, title } = res.data.data;

        const assistantMsg = {
          role: 'assistant',
          content: answer,
          sources: sources || [],
          createdAt: new Date(),
        };

        setMessages((prev) => [...prev, assistantMsg]);

        // If this was a new chat, update session list and URL
        if (!activeSessionId) {
          setActiveSessionId(chatId);
          navigate(`/chat/${chatId}`, { replace: true });
          fetchSessions();
        }
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error communicating with AI service.';
      showToast(errorMsg, 'error');
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
    // Find the last user message
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMessage || loading) return;

    setLoading(true);
    try {
      const res = await api.post('/chat', {
        question: lastUserMessage.content,
        chatId: activeSessionId,
        documentIds: selectedDocId ? [selectedDocId] : [],
      });

      if (res.data.success) {
        const newAssistantMsg = {
          role: 'assistant',
          content: res.data.data.answer,
          sources: res.data.data.sources || [],
          createdAt: new Date(),
        };

        // Replace the last assistant message
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
      showToast('Failed to regenerate response', 'error');
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
      if (res.data.success) {
        setSessions((prev) =>
          prev.map((s) => (s._id === sessionId ? { ...s, title: editTitleText.trim() } : s))
        );
        if (activeSession && activeSession._id === sessionId) {
          setActiveSession((prev) => ({ ...prev, title: editTitleText.trim() }));
        }
        showToast('Chat title updated', 'success');
      }
    } catch {
      showToast('Failed to rename chat', 'error');
    } finally {
      setEditingChatId(null);
      setEditTitleText('');
    }
  };

  const handleDeleteChat = async (sessionId, e) => {
    e.stopPropagation();
    try {
      const res = await api.delete(`/chats/${sessionId}`);
      if (res.data.success) {
        setSessions((prev) => prev.filter((s) => s._id !== sessionId));
        if (activeSessionId === sessionId) {
          handleNewChat();
        }
        showToast('Chat deleted', 'success');
      }
    } catch {
      showToast('Failed to delete chat', 'error');
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
    <div className="flex h-[calc(100vh-6.5rem)] rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl overflow-hidden shadow-2xl animate-fade-in">
      {/* Chats Sidebar */}
      <div className="w-72 shrink-0 border-r border-slate-800/80 bg-slate-950/60 hidden md:flex flex-col p-4">
        {/* New Chat Button */}
        <button
          type="button"
          onClick={handleNewChat}
          className="flex items-center justify-between w-full p-3 rounded-2xl bg-brand-600/20 hover:bg-brand-600/30 border border-brand-500/30 text-brand-200 text-sm font-semibold transition-all mb-4 group active:scale-[0.98]"
        >
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-brand-400 group-hover:rotate-90 transition-transform" />
            <span>New Chat</span>
          </div>
          <span className="text-[10px] bg-brand-500/30 px-1.5 py-0.5 rounded text-brand-300">
            Ctrl+K
          </span>
        </button>

        {/* Chat Search */}
        <div className="relative mb-3">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search history..."
            value={chatSearch}
            onChange={(e) => setChatSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1">
            Previous Conversations
          </p>

          {sessionsLoading ? (
            <div className="p-4 text-center text-xs text-slate-400 animate-pulse">
              Loading history...
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">No chats found.</div>
          ) : (
            filteredSessions.map((session) => {
              const isActive = activeSessionId === session._id;
              const isEditing = editingChatId === session._id;

              return (
                <div
                  key={session._id}
                  onClick={() => navigate(`/chat/${session._id}`)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                    isActive
                      ? 'bg-slate-800 text-white border border-slate-700/80 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MessageSquare className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                    {isEditing ? (
                      <input
                        type="text"
                        value={editTitleText}
                        onChange={(e) => setEditTitleText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(session._id);
                          if (e.key === 'Escape') setEditingChatId(null);
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="bg-slate-950 border border-brand-500 rounded px-1.5 py-0.5 text-xs text-white w-full focus:outline-none"
                      />
                    ) : (
                      <span className="truncate">{session.title}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isEditing ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRename(session._id);
                        }}
                        className="p-1 hover:text-emerald-400"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingChatId(session._id);
                          setEditTitleText(session.title);
                        }}
                        className="p-1 hover:text-brand-300"
                        title="Rename"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteChat(session._id, e)}
                      className="p-1 hover:text-rose-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950/40">
        {/* Chat Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800/80 bg-slate-900/30 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20 shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">
                {activeSession?.title || 'New Conversation'}
              </h3>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <span>RAG Retrieval with Page Citations</span>
                {documents.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-brand-300">{documents.length} ready PDFs</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={handleNewChat}
              className="text-xs md:hidden"
            >
              New
            </Button>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center shadow-xl shadow-brand-500/20 mb-4">
                <Sparkles className="w-7 h-7" />
              </div>
              <h4 className="text-base sm:text-lg font-bold text-white mb-1">
                Ask anything about your documents
              </h4>
              <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
                The AI searches across your uploaded PDFs, retrieves relevant context chunks, and synthesizes answers with exact page numbers.
              </p>

              {documents.length === 0 && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>No ready documents found. Please upload a PDF first to begin querying.</span>
                </div>
              )}
            </div>
          ) : (
            <>
              {messages.map((msg, index) => (
                <MessageItem
                  key={index}
                  message={msg}
                  isLast={index === messages.length - 1}
                  onRegenerate={handleRegenerate}
                  loading={loading}
                />
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex gap-4 p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 animate-fade-in">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-md">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-brand-300">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Retrieving vectors & synthesizing answer...</span>
                    </div>
                    <div className="flex gap-1.5 items-center pt-1">
                      <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" />
                      <span
                        className="w-2 h-2 rounded-full bg-brand-400 animate-bounce"
                        style={{ animationDelay: '0.15s' }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-brand-400 animate-bounce"
                        style={{ animationDelay: '0.3s' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800/80 bg-slate-900/40">
          <ChatInput
            input={input}
            setInput={setInput}
            onSend={handleSendMessage}
            loading={loading}
            documents={documents}
            selectedDocId={selectedDocId}
            setSelectedDocId={setSelectedDocId}
            suggestedQuestions={messages.length === 0 ? suggestedQuestions : []}
          />
        </div>
      </div>
    </div>
  );
}
