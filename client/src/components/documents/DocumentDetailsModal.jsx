import React, { useState, useEffect } from 'react';
import { ExternalLink, Layers, FileText, Calendar, HardDrive, Hash, MessageSquare, AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatBytes, formatDate } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export function DocumentDetailsModal({ isOpen, onClose, documentId }) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchChunk, setSearchChunk] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen || !documentId) {
      setDoc(null);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/documents/${documentId}`);
        if (res.data.success) {
          setDoc(res.data.data.document);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [isOpen, documentId]);

  if (!isOpen) return null;

  const handleStartChat = () => {
    onClose();
    navigate(`/chat?doc=${documentId}`);
  };

  const filteredChunks = (doc?.chunks || []).filter((chunk) => {
    if (!searchChunk) return true;
    return (
      chunk.chunkId.toLowerCase().includes(searchChunk.toLowerCase()) ||
      String(chunk.pageNumber).includes(searchChunk) ||
      chunk.previewText.toLowerCase().includes(searchChunk.toLowerCase())
    );
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={doc?.filename || 'Document Inspection'}
      maxWidth="max-w-3xl"
    >
      {loading ? (
        <div className="py-12 flex justify-center text-slate-400">
          <div className="animate-pulse">Loading document metadata and chunks...</div>
        </div>
      ) : !doc ? (
        <div className="py-8 text-center text-slate-400">Unable to load document details.</div>
      ) : (
        <div className="space-y-6">
          {/* Header Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <FileText className="w-3.5 h-3.5 text-brand-400" />
                <span>Pages</span>
              </div>
              <p className="text-lg font-bold text-white">{doc.pageCount || 0}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Vector Chunks</span>
              </div>
              <p className="text-lg font-bold text-white">{doc.chunkCount || 0}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                <span>File Size</span>
              </div>
              <p className="text-lg font-bold text-white">{formatBytes(doc.fileSize)}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Hash className="w-3.5 h-3.5 text-amber-400" />
                <span>Status</span>
              </div>
              <Badge status={doc.status} />
            </div>
          </div>

          {/* Error notice if failed */}
          {doc.status === 'Failed' && doc.errorMessage && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-300">Processing Error:</p>
                <p>{doc.errorMessage}</p>
              </div>
            </div>
          )}

          {/* Chunks Inspector */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-400" />
                <span>Extracted Vector Chunks ({doc.chunks?.length || 0})</span>
              </h4>
              <input
                type="text"
                placeholder="Filter by page or keyword..."
                value={searchChunk}
                onChange={(e) => setSearchChunk(e.target.value)}
                className="text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 rounded-xl">
              {filteredChunks.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800">
                  {doc.status !== 'Ready'
                    ? 'Chunks will appear here once embedding processing completes.'
                    : 'No chunks matching the search term.'}
                </div>
              ) : (
                filteredChunks.map((chunk, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 text-xs space-y-1.5 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono px-2 py-0.5 rounded bg-brand-500/10 text-brand-300 border border-brand-500/20 font-semibold">
                          {chunk.chunkId}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                          Page {chunk.pageNumber}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">{chunk.textLength} chars</span>
                    </div>
                    <p className="text-slate-300 line-clamp-2 italic text-[11px] bg-slate-950/50 p-2 rounded-lg border border-slate-800/50">
                      "{chunk.previewText}..."
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <a
              href={`/api/documents/${doc._id}/file`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-brand-400 hover:text-brand-300 font-medium hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open PDF in new tab</span>
            </a>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
              {doc.status === 'Ready' && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={MessageSquare}
                  onClick={handleStartChat}
                >
                  Chat with Document
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
