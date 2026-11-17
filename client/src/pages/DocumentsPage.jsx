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
  MessageSquare,
  Sparkles,
  HelpCircle,
  Clock,
  Eye,
} from 'lucide-react';
import { Link, useOutletContext } from 'react-router-dom';
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
      if (res.data?.success) {
        setDocuments(res.data.data.documents || []);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
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
      if (res.data?.success) {
        showToast('success', `Document "${deleteDoc.filename}" and vector embeddings deleted.`);
        setDocuments((prev) => prev.filter((d) => d._id !== deleteDoc._id));
        setDeleteDoc(null);
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to delete document');
    } finally {
      setDeleting(false);
    }
  };

  const statusOptions = ['All', 'Ready', 'Processing', 'Embedding', 'Failed'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <FileText className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Document Management</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage your PDF knowledge library, inspect page-level vector chunks, and monitor extraction status.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={() => fetchDocuments(false)}
            title="Refresh list"
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Upload className="w-4 h-4" />}
            onClick={openUploadModal}
          >
            Upload PDF
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 border border-slate-200 bg-white flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {statusOptions.map((opt) => {
            const val = opt === 'All' ? '' : opt;
            const isSelected = statusFilter === val;
            return (
              <button
                key={opt}
                onClick={() => setStatusFilter(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search documents by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-brand-500 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Documents Table */}
      <div className="card border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4 font-semibold">Document</th>
                <th className="py-3 px-4 font-semibold">Upload Date</th>
                <th className="py-3 px-4 font-semibold">Size</th>
                <th className="py-3 px-4 font-semibold">Pages</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <>
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                </>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-700">No documents found</p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">
                      {search || statusFilter
                        ? 'Try clearing your search filters'
                        : 'Upload PDF files to start chatting, generating summaries, quizzes, and flashcards.'}
                    </p>
                    <Button variant="primary" size="sm" onClick={openUploadModal}>
                      Upload Your First PDF
                    </Button>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const isReady = doc.status?.toLowerCase() === 'ready';
                  const docName = doc.filename || doc.name || 'Untitled PDF';

                  return (
                    <tr key={doc._id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Filename & Chunks */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-red-50 text-red-600 border border-red-100 shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate max-w-xs sm:max-w-md" title={docName}>
                              {docName}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {doc.chunkCount > 0 ? `${doc.chunkCount} vector chunks` : 'Processing...'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Upload Date */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(doc.createdAt)}
                      </td>

                      {/* File Size */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap font-medium">
                        {formatBytes(doc.fileSize)}
                      </td>

                      {/* Pages */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {doc.pageCount ? `${doc.pageCount} pgs` : '-'}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge
                          variant={
                            isReady
                              ? 'success'
                              : doc.status?.toLowerCase() === 'processing' || doc.status?.toLowerCase() === 'embedding'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {doc.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {isReady ? (
                            <>
                              <Link
                                to={`/chat?doc=${doc._id}`}
                                title="Chat with this PDF"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </Link>
                              <Link
                                to={`/summarize?doc=${doc._id}`}
                                title="Summarize this PDF"
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              >
                                <Sparkles className="w-4 h-4" />
                              </Link>
                              <Link
                                to={`/quiz?doc=${doc._id}`}
                                title="Generate Quiz from this PDF"
                                className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              >
                                <HelpCircle className="w-4 h-4" />
                              </Link>
                              <Link
                                to={`/flashcards?doc=${doc._id}`}
                                title="Create Flashcards from this PDF"
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Layers className="w-4 h-4" />
                              </Link>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400 mr-2 italic">Awaiting index</span>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedDocId(doc._id)}
                            title="Inspect Chunks and Metadata"
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <a
                            href={`/api/documents/${doc._id}/file${localStorage.getItem('token') ? `?token=${encodeURIComponent(localStorage.getItem('token'))}` : ''}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View PDF"
                            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>

                          <button
                            type="button"
                            onClick={() => setDeleteDoc(doc)}
                            title="Delete Document & Vectors"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p>
              This will permanently delete <strong>{deleteDoc?.filename}</strong>, along with its stored PDF file and all associated vectors from the vector database.
            </p>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDoc(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="w-4 h-4" />}
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

export default DocumentsPage;
