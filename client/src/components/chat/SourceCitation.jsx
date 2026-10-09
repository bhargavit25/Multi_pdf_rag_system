import React, { useState } from 'react';
import { FileText, ExternalLink, ChevronRight } from 'lucide-react';
import { SourcePreviewModal } from './SourcePreviewModal';

export function SourceCitation({ sources = [] }) {
  const [selectedSource, setSelectedSource] = useState(null);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 pt-3.5 border-t border-slate-800/80">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Sources & Citations ({sources.length})
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sources.map((src, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setSelectedSource(src)}
            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-brand-500/40 text-left transition-all group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20 shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                  📄 {src.filename}
                </p>
                <p className="text-[11px] text-slate-400">
                  Page {src.pageNumber} {src.chunkId ? `• ${src.chunkId}` : ''}
                </p>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-brand-400 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>

      <SourcePreviewModal
        isOpen={Boolean(selectedSource)}
        onClose={() => setSelectedSource(null)}
        source={selectedSource}
      />
    </div>
  );
}
