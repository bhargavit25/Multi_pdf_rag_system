import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Check, RotateCcw } from 'lucide-react';
import { SourceCitation } from './SourceCitation';
import { useToast } from '../../context/ToastContext';

export function MessageItem({ message, onRegenerate, isLast = false, loading = false }) {
  const isAssistant = message.role === 'assistant';
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    showToast('info', 'Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`flex gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl transition-all ${
        isAssistant
          ? 'bg-white border border-slate-200 shadow-xs'
          : 'bg-brand-50/60 border border-brand-100 ml-4 sm:ml-12'
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-semibold border ${
          isAssistant
            ? 'bg-linear-to-tr from-brand-600 to-indigo-600 text-white border-brand-500 shadow-xs'
            : 'bg-white text-slate-700 border-slate-200'
        }`}
      >
        {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-slate-700">
            {isAssistant ? 'RAG Assistant' : 'You'}
          </span>

          {/* Assistant Action Buttons */}
          {isAssistant && !loading && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopy}
                title="Copy answer"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-xs flex items-center gap-1"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {isLast && onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  title="Regenerate answer"
                  className="p-1 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 transition-colors text-xs flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Regenerate</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Text body formatted as Markdown */}
        <div className="prose prose-sm max-w-none text-slate-800 text-sm leading-relaxed overflow-x-auto markdown-body">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ _node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
              ul: ({ _node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
              ol: ({ _node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
              li: ({ _node, ...props }) => <li className="text-slate-700" {...props} />,
              strong: ({ _node, ...props }) => <strong className="font-semibold text-slate-900" {...props} />,
              blockquote: ({ _node, ...props }) => (
                <blockquote className="border-l-2 border-brand-500 pl-3 italic text-slate-600 my-2" {...props} />
              ),
              code: ({ _node, inline, _className, children, ...props }) => {
                if (inline) {
                  return (
                    <code className="px-1.5 py-0.5 rounded-md bg-slate-100 text-brand-700 font-mono text-xs border border-slate-200" {...props}>
                      {children}
                    </code>
                  );
                }
                return (
                  <div className="my-3 rounded-xl bg-slate-900 p-3 border border-slate-800 font-mono text-xs overflow-x-auto text-emerald-400">
                    <code {...props}>{children}</code>
                  </div>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Citations if available */}
        {isAssistant && message.sources && message.sources.length > 0 && (
          <SourceCitation sources={message.sources} />
        )}
      </div>
    </div>
  );
}
