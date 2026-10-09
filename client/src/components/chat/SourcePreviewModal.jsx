import React from 'react';
import { FileText, ExternalLink, Hash, Bookmark } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export function SourcePreviewModal({ isOpen, onClose, source }) {
  if (!isOpen || !source) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Source Citation Detail"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {/* Source Header info */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-400 shrink-0" />
            <h4 className="font-semibold text-white text-sm truncate">{source.filename}</h4>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-medium">
              📄 Page {source.pageNumber}
            </span>
            {source.chunkId && (
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
                {source.chunkId}
              </span>
            )}
            {source.score !== undefined && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Score: {Math.round(source.score * 100)}%
              </span>
            )}
          </div>
        </div>

        {/* Text Excerpt */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
            Retrieved Text Excerpt
          </label>
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans max-h-60 overflow-y-auto">
            {source.previewText || 'No preview text available.'}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <a
            href={`/api/documents/${source.documentId}/file`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-medium hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open PDF Document</span>
          </a>

          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
