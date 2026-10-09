import React from 'react';

export function StatCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-5 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 w-24 bg-slate-800 rounded" />
        <div className="h-8 w-8 bg-slate-800 rounded-lg" />
      </div>
      <div className="h-8 w-16 bg-slate-800 rounded mb-2" />
      <div className="h-3 w-32 bg-slate-800/60 rounded" />
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <tr className="border-b border-slate-800/60 animate-pulse">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800" />
          <div className="space-y-1.5">
            <div className="h-4 w-40 bg-slate-800 rounded" />
            <div className="h-3 w-20 bg-slate-800/60 rounded" />
          </div>
        </div>
      </td>
      <td className="py-4 px-4"><div className="h-4 w-16 bg-slate-800 rounded" /></td>
      <td className="py-4 px-4"><div className="h-4 w-12 bg-slate-800 rounded" /></td>
      <td className="py-4 px-4"><div className="h-6 w-24 bg-slate-800 rounded-full" /></td>
      <td className="py-4 px-4"><div className="h-8 w-20 bg-slate-800 rounded" /></td>
    </tr>
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex gap-4 p-4 rounded-2xl bg-slate-900/40 animate-pulse">
      <div className="w-8 h-8 rounded-lg bg-slate-800 shrink-0" />
      <div className="flex-1 space-y-2.5">
        <div className="h-4 w-28 bg-slate-800 rounded" />
        <div className="h-4 w-full bg-slate-800/80 rounded" />
        <div className="h-4 w-3/4 bg-slate-800/60 rounded" />
      </div>
    </div>
  );
}
