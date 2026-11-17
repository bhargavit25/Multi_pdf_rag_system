import React, { useRef, useEffect } from 'react';
import { Send, Sparkles, Filter, FileText, X } from 'lucide-react';
import { Button } from '../ui/Button';

export function ChatInput({
  input,
  setInput,
  onSend,
  loading = false,
  documents = [],
  selectedDocId,
  setSelectedDocId,
  suggestedQuestions = [],
}) {
  const textareaRef = useRef(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.nativeEvent?.isComposing) return;
      e.preventDefault();
      if (!loading && input.trim()) {
        onSend();
      }
    }
  };

  const selectedDoc = documents.find((d) => d._id === selectedDocId);

  return (
    <div className="space-y-3">
      {/* Suggested prompts if any */}
      {suggestedQuestions && suggestedQuestions.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-brand-600" />
            Suggestions:
          </span>
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setInput(q);
                textareaRef.current?.focus();
              }}
              className="text-xs px-2.5 py-1 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition-all text-left shadow-2xs"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Document filter indicator / pill */}
      {documents.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1 font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Context scope:
          </span>
          {selectedDoc ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
              <FileText className="w-3 h-3 text-brand-600" />
              <span className="font-medium truncate max-w-[200px]">{selectedDoc.filename || selectedDoc.name}</span>
              <button
                type="button"
                onClick={() => setSelectedDocId('')}
                className="hover:text-brand-900"
                title="Search all documents"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
              All Uploaded Documents ({documents.length})
            </span>
          )}
        </div>
      )}

      {/* Input container */}
      <div className="relative rounded-2xl bg-white border border-slate-200 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all p-2 sm:p-2.5 shadow-xs">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about your documents... (Enter to send, Shift+Enter for newline)"
          disabled={loading}
          className="w-full bg-transparent text-slate-800 placeholder-slate-400 text-sm focus:outline-hidden resize-none px-3 py-1.5 max-h-44 min-h-[42px]"
        />

        <div className="flex items-center justify-between pt-1 px-1">
          <div className="flex items-center gap-2">
            {/* Quick document dropdown */}
            {documents.length > 0 && (
              <select
                value={selectedDocId || ''}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-hidden focus:border-brand-500"
              >
                <option value="">All Documents</option>
                {documents.map((d) => (
                  <option key={d._id} value={d._id}>
                    📄 {d.filename || d.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onSend}
            disabled={!input.trim() || loading}
            loading={loading}
            icon={<Send className="w-4 h-4" />}
            className="rounded-xl px-4"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
