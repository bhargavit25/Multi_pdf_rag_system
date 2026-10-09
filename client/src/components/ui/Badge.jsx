import React from 'react';

export function Badge({ status, label, className = '' }) {
  const normalizedStatus = status || label || 'Ready';

  const configs = {
    Uploading: {
      bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
      dot: 'bg-blue-400 animate-ping',
      text: 'Uploading',
    },
    Processing: {
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      dot: 'bg-amber-400 animate-pulse',
      text: 'Processing Text',
    },
    Embedding: {
      bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
      dot: 'bg-indigo-400 animate-pulse',
      text: 'Embedding Vectors',
    },
    Ready: {
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      dot: 'bg-emerald-400',
      text: 'Ready for RAG',
    },
    Failed: {
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      dot: 'bg-rose-400',
      text: 'Failed',
    },
  };

  const current = configs[normalizedStatus] || configs.Ready;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${current.bg} ${className}`}
    >
      <span className="relative flex h-2 w-2">
        {(normalizedStatus === 'Uploading' ||
          normalizedStatus === 'Processing' ||
          normalizedStatus === 'Embedding') && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${current.dot}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${current.dot.split(' ')[0]}`} />
      </span>
      <span>{label || current.text}</span>
    </span>
  );
}
