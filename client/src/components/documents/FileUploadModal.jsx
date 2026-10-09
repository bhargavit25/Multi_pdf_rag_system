import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, Trash2, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import { formatBytes } from '../../utils/formatters';
import api from '../../services/api';

export function FileUploadModal({ isOpen, onClose, onUploadSuccess }) {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateAndAddFiles = (newFiles) => {
    const validFiles = [];
    const errors = [];

    Array.from(newFiles).forEach((file) => {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        errors.push(`${file.name}: Only PDF documents are allowed.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: Exceeds maximum 20MB limit.`);
        return;
      }
      // Check for duplicate in current queue
      if (files.some((f) => f.name === file.name && f.size === file.size)) {
        errors.push(`${file.name}: Already in upload queue.`);
        return;
      }
      validFiles.push(file);
    });

    if (errors.length > 0) {
      errors.forEach((err) => showToast(err, 'warning'));
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setProgress(15);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(Math.min(percent, 90));
          }
        },
      });

      setProgress(100);
      showToast(`Successfully uploaded ${files.length} PDF(s). Processing has started!`, 'success');
      setFiles([]);
      onClose();
      if (onUploadSuccess) onUploadSuccess(res.data.data.documents);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to upload files. Please try again.';
      showToast(msg, 'error');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFiles([]);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload PDF Documents" maxWidth="max-w-xl">
      <div className="space-y-4">
        {/* Drag and drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-brand-500 bg-brand-500/10'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/70'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mx-auto mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-white mb-1">
            Click to upload or drag and drop PDFs
          </p>
          <p className="text-xs text-slate-400">
            PDF files only up to 20MB each. Page numbers and embeddings preserved.
          </p>
        </div>

        {/* Selected files list */}
        {files.length > 0 && (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Selected Documents ({files.length})</span>
              <button
                type="button"
                onClick={() => setFiles([])}
                className="text-rose-400 hover:underline"
              >
                Clear all
              </button>
            </div>
            {files.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-200 truncate text-xs sm:text-sm">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-slate-400">{formatBytes(file.size)}</p>
                  </div>
                </div>
                {!uploading && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(idx);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload progress */}
        {uploading && (
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Uploading & preparing pipeline...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-600 to-indigo-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Modal actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <Button variant="ghost" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            loading={uploading}
            icon={UploadCloud}
          >
            Upload {files.length > 0 ? `(${files.length})` : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
