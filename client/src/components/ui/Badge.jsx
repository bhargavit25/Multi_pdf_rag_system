import React from 'react';

export function Badge({
  status,
  label,
  variant,
  children,
  className = '',
}) {
  const textContent = children || label || status || 'Ready';
  const textStr = typeof textContent === 'string' ? textContent.toLowerCase() : '';

  // Status mapping
  const statusConfigs = {
    uploading: {
      bg: 'bg-blue-50 border-blue-200 text-blue-700',
      dot: 'bg-blue-500 animate-ping',
      hasDot: true,
    },
    processing: {
      bg: 'bg-amber-50 border-amber-200 text-amber-700',
      dot: 'bg-amber-500 animate-pulse',
      hasDot: true,
    },
    embedding: {
      bg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      dot: 'bg-indigo-500 animate-pulse',
      hasDot: true,
    },
    ready: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      dot: 'bg-emerald-500',
      hasDot: true,
    },
    failed: {
      bg: 'bg-rose-50 border-rose-200 text-rose-700',
      dot: 'bg-rose-500',
      hasDot: true,
    },
  };

  // Variant mapping
  const variantConfigs = {
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      dot: 'bg-emerald-500',
      hasDot: true,
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 text-amber-700',
      dot: 'bg-amber-500',
      hasDot: true,
    },
    danger: {
      bg: 'bg-rose-50 border-rose-200 text-rose-700',
      dot: 'bg-rose-500',
      hasDot: true,
    },
    neutral: {
      bg: 'bg-slate-100 border-slate-200 text-slate-700',
      dot: 'bg-slate-400',
      hasDot: false,
    },
    info: {
      bg: 'bg-blue-50 border-blue-200 text-blue-700',
      dot: 'bg-blue-500',
      hasDot: false,
    },
  };

  let config = variantConfigs[variant] || statusConfigs[textStr] || statusConfigs.ready;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${className}`}
    >
      {config.hasDot && (
        <span className="relative flex h-2 w-2">
          {config.dot.includes('animate') && (
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dot}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot.split(' ')[0]}`} />
        </span>
      )}
      <span>{textContent}</span>
    </span>
  );
}

export default Badge;
