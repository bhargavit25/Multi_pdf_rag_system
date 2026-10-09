import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Upload,
  Search,
  Trash2,
  ExternalLink,
  Layers,
  RefreshCw,
  AlertCircle,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { TableRowSkeleton } from '../components/ui/Skeletons';
import { DocumentDetailsModal } from '../components/documents/DocumentDetailsModal';
import { useToast } from '../context/ToastContext';
import { formatBytes, formatDate } from '../utils/formatters';
import api from '../services/api';

export function DocumentsPage() {
  const { openUploadModal } = useOutletContext() || {};
  const { showToast } = useToast();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDocuments = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/documents', { params });
      if (res.data.success) {
        setDocuments(res.data.data.documents);
      }
    } catch {
      // silent
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchDocuments();
    const handleUpdate = () => fetchDocuments(true);
    window.addEventListener('documents-updated', handleUpdate);
    return () => window.removeEventListener('documents-updated', handleUpdate);
  }, [fetchDocuments]);

  // Real-time polling when any document is in active processing state
  useEffect(() => {
    const hasActiveProcessing = documents.some((d) =>
      ['Uploading', 'Processing', 'Embedding'].includes(d.status)
    );

    if (hasActiveProcessing) {
      const interval = setInterval(() => {
        fetchDocuments(true);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [documents, fetchDocuments]);

  const handleDelete = async () => {
    if (!deleteDoc) return;
    setDeleting(true);

    try {
      const res = await api.delete(`/documents/${deleteDoc._id}`);
      if (res.data.success) {
        showToast(`Document "${deleteDoc.filename}" and its vector embeddings deleted.`, 'success');
        setDocuments((prev) => prev.filter((d) => d._id !== deleteDoc._id));
        setDeleteDoc(null);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete document', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const statusOptions = ['All', 'Ready', 'Processing', 'Embedding', 'Failed'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Document Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Manage your PDF library, inspect page-level chunks, and monitor indexing status.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={() => fetchDocuments(false)}
            title="Refresh list"
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Upload}
            onClick={openUploadModal}
          >
            Upload PDFs
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {statusOptions.map((opt) => {
            const val = opt === 'All' ? '' : opt;
            const isSelected = statusFilter === val;
            return (
              <button
                key={opt}
                onClick={() => setStatusFilter(val)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>
      </div>

      {/* Documents Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 uppercase text-[11px] tracking-wider">
                <th className="py-3.5 px-4 font-semibold">Filename</th>
                <th className="py-3.5 px-4 font-semibold">Upload Date</th>
                <th className="py-3.5 px-4 font-semibold">File Size</th>
                <th className="py-3.5 px-4 font-semibold">Pages</th>
                <th className="py-3.5 px-4 font-semibold">Processing Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <>
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                </>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-medium">No documents found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {search || statusFilter
                        ? 'Try clearing your filters'
                        : 'Upload PDF documents to begin semantic search'}
                    </p>
                    <div className="mt-4">
                      <Button variant="secondary" size="sm" onClick={openUploadModal}>
                        Upload Document
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc._id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Filename */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate max-w-xs sm:max-w-md">
                            {doc.filename}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {doc.chunkCount > 0 ? `${doc.chunkCount} vector chunks` : 'Processing...'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Upload Date */}
                    <td className="py-4 px-4 text-slate-400 whitespace-nowrap">
                      {formatDate(doc.createdAt)}
                    </td>

                    {/* File Size */}
                    <td className="py-4 px-4 text-slate-300 whitespace-nowrap">
                      {formatBytes(doc.fileSize)}
                    </td>

                    {/* Pages */}
                    <td className="py-4 px-4 text-slate-300 font-medium">
                      {doc.pageCount ? `${doc.pageCount} pgs` : '-'}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <Badge status={doc.status} />
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedDocId(doc._id)}
                          title="Inspect Chunks and Metadata"
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Layers className="w-4 h-4" />
                        </button>

                        <a
                          href={`/api/documents/${doc._id}/file`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View PDF"
                          className="p-2 text-slate-400 hover:text-brand-300 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        <button
                          type="button"
                          onClick={() => setDeleteDoc(doc)}
                          title="Delete Document & Vectors"
                          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Details & Chunks Inspector Modal */}
      <DocumentDetailsModal
        isOpen={Boolean(selectedDocId)}
        onClose={() => setSelectedDocId(null)}
        documentId={selectedDocId}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteDoc)}
        onClose={() => setDeleteDoc(null)}
        title="Confirm Document Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <p>
              This will permanently delete <strong>{deleteDoc?.filename}</strong>, along with its stored PDF file and all associated vectors from ChromaDB / the vector store.
            </p>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteDoc(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={handleDelete}
              loading={deleting}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
