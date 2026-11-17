import React, { useState, useEffect } from 'react';
import { ExternalLink, Layers, FileText, HardDrive, Hash, MessageSquare, AlertTriangle, Sparkles, HelpCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatBytes } from '../../utils/formatters';
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
        <div className="py-12 flex justify-center text-slate-500">
          <div className="animate-pulse">Loading document metadata and chunks...</div>
        </div>
      ) : !doc ? (
        <div className="py-8 text-center text-slate-500">Unable to load document details.</div>
      ) : (
        <div className="space-y-6">
          {/* Header Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <FileText className="w-3.5 h-3.5 text-brand-600" />
                <span>Pages</span>
              </div>
              <p className="text-lg font-bold text-slate-900">{doc.pageCount || 0}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Vector Chunks</span>
              </div>
              <p className="text-lg font-bold text-slate-900">{doc.chunkCount || 0}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
                <span>File Size</span>
              </div>
              <p className="text-lg font-bold text-slate-900">{formatBytes(doc.fileSize)}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <Hash className="w-3.5 h-3.5 text-amber-600" />
                <span>Status</span>
              </div>
              <Badge status={doc.status} />
            </div>
          </div>

          {/* Error notice if failed */}
          {doc.status === 'Failed' && doc.errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900">Processing Error:</p>
                <p>{doc.errorMessage}</p>
              </div>
            </div>
          )}

          {/* Quick Learning Actions */}
          {doc.status === 'Ready' && (
            <div className="flex flex-wrap gap-2.5 p-3.5 rounded-xl bg-brand-50/50 border border-brand-100">
              <span className="text-xs font-bold text-brand-900 flex items-center gap-1 mr-1">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                AI Learning Actions:
              </span>
              <button
                onClick={() => {
                  onClose();
                  navigate(`/chat?doc=${doc._id}`);
                }}
                className="text-xs px-2.5 py-1 rounded-lg bg-white border border-brand-200 text-brand-700 font-semibold hover:bg-brand-50 transition-colors flex items-center gap-1"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Ask Questions
              </button>
              <button
                onClick={() => {
                  onClose();
                  navigate(`/summarize?doc=${doc._id}`);
                }}
                className="text-xs px-2.5 py-1 rounded-lg bg-white border border-brand-200 text-brand-700 font-semibold hover:bg-brand-50 transition-colors flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Summarize
              </button>
              <button
                onClick={() => {
                  onClose();
                  navigate(`/quiz?doc=${doc._id}`);
                }}
                className="text-xs px-2.5 py-1 rounded-lg bg-white border border-brand-200 text-brand-700 font-semibold hover:bg-brand-50 transition-colors flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Create Quiz
              </button>
              <button
                onClick={() => {
                  onClose();
                  navigate(`/flashcards?doc=${doc._id}`);
                }}
                className="text-xs px-2.5 py-1 rounded-lg bg-white border border-brand-200 text-brand-700 font-semibold hover:bg-brand-50 transition-colors flex items-center gap-1"
              >
                <Layers className="w-3.5 h-3.5" />
                Flashcards
              </button>
            </div>
          )}

          {/* Chunks Inspector */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-600" />
                <span>Extracted Vector Chunks ({doc.chunks?.length || 0})</span>
              </h4>
              <input
                type="text"
                placeholder="Filter by page or keyword..."
                value={searchChunk}
                onChange={(e) => setSearchChunk(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 rounded-xl">
              {filteredChunks.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                  {doc.status !== 'Ready'
                    ? 'Chunks will appear here once embedding processing completes.'
                    : 'No chunks matching the search term.'}
                </div>
              ) : (
                filteredChunks.map((chunk, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200 font-semibold text-[11px]">
                          {chunk.chunkId}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-medium">
                          Page {chunk.pageNumber}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">{chunk.textLength} chars</span>
                    </div>
                    <p className="text-slate-600 italic text-[11px] bg-white p-2.5 rounded-lg border border-slate-200/80">
                      "{chunk.previewText}..."
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <a
              href={`/api/documents/${doc._id}/file${localStorage.getItem('token') ? `?token=${encodeURIComponent(localStorage.getItem('token'))}` : ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-brand-600 hover:text-brand-700 font-medium hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open PDF in new tab</span>
            </a>

            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
