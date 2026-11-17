import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  FileText,
  Copy,
  Check,
  Download,
  RotateCcw,
  BookOpen,
  CheckCircle2,
  Trash2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Clock,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/formatters';
import api from '../services/api';

export function SummarizationPage() {
  const [searchParams] = useSearchParams();
  const preselectedDocId = searchParams.get('doc');
  const { showToast } = useToast();

  const [documents, setDocuments] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState(preselectedDocId ? [preselectedDocId] : []);
  const [summaryType, setSummaryType] = useState('short');
  const [loading, setLoading] = useState(false);
  const [activeSummary, setActiveSummary] = useState(null);
  const [copied, setCopied] = useState(false);
  const [pastSummaries, setPastSummaries] = useState([]);
  const [loadingPast, setLoadingPast] = useState(true);

  // Summary type cards config
  const summaryTypes = [
    {
      id: 'short',
      title: 'Short Summary',
      desc: 'Brief executive overview with main ideas and core takeaways.',
      badge: 'Quick Read',
    },
    {
      id: 'detailed',
      title: 'Detailed Summary',
      desc: 'In-depth explanation covering technical terms, methodologies, and examples.',
      badge: 'Comprehensive',
    },
    {
      id: 'chapter',
      title: 'Chapter-wise Summary',
      desc: 'Section-by-section breakdown preserving document headings and page ranges.',
      badge: 'Structured',
    },
    {
      id: 'key_points',
      title: 'Key Points & Formulas',
      desc: 'High-yield bullet points with definitions, core principles, and facts.',
      badge: 'Study Notes',
    },
  ];

  // Fetch available ready documents
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await api.get('/documents', { params: { status: 'Ready' } });
        if (res.data.success) {
          const readyDocs = res.data.data.documents || [];
          setDocuments(readyDocs);
          if (preselectedDocId && readyDocs.some((d) => d._id === preselectedDocId)) {
            setSelectedDocIds([preselectedDocId]);
          } else if (readyDocs.length > 0 && selectedDocIds.length === 0) {
            setSelectedDocIds([readyDocs[0]._id]);
          }
        }
      } catch {
        // silent
      }
    };
    fetchDocs();
  }, [preselectedDocId]);

  // Fetch past summaries
  const fetchPastSummaries = async () => {
    setLoadingPast(true);
    try {
      const res = await api.get('/summaries');
      if (res.data.success) {
        setPastSummaries(res.data.data.summaries || []);
        if (!activeSummary && res.data.data.summaries?.length > 0 && !preselectedDocId) {
          setActiveSummary(res.data.data.summaries[0]);
        }
      }
    } catch {
      // silent
    } finally {
      setLoadingPast(false);
    }
  };

  useEffect(() => {
    fetchPastSummaries();
  }, []);

  const toggleDocSelection = (id) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (selectedDocIds.length === 0) {
      showToast('Please select at least one document to summarize', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/summaries/generate', {
        documentIds: selectedDocIds,
        summaryType,
      });

      if (res.data.success) {
        setActiveSummary(res.data.data.summary);
        showToast('Summary generated successfully!', 'success');
        fetchPastSummaries();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to generate summary', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!activeSummary) return;
    navigator.clipboard.writeText(activeSummary.content);
    setCopied(true);
    showToast('Summary copied to clipboard', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!activeSummary) return;
    const blob = new Blob([activeSummary.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeSummary.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded text summary', 'success');
  };

  const handleDownloadPdf = () => {
    if (!activeSummary) return;
    // Trigger formatted browser print dialog for high fidelity PDF output
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Popup blocker prevented PDF generation. Please allow popups.', 'warning');
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${activeSummary.title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 40px auto; padding: 0 20px; }
            h1, h2, h3 { color: #0f172a; margin-top: 1.5em; }
            h1 { font-size: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
            .meta { font-size: 13px; color: #64748b; margin-bottom: 24px; }
            ul, ol { padding-left: 20px; }
            li { margin-bottom: 6px; }
            blockquote { border-left: 3px solid #6366f1; margin: 16px 0; padding-left: 12px; color: #475569; font-style: italic; }
            code { background: #f1f5f9; color: #4f46e5; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
            .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <h1>${activeSummary.title}</h1>
          <div class="meta">
            <strong>Source Documents:</strong> ${(activeSummary.documentNames || []).join(', ')}<br>
            <strong>Generated on:</strong> ${new Date(activeSummary.createdAt).toLocaleDateString()}
          </div>
          <div class="content">${activeSummary.content.replace(/\n/g, '<br>')}</div>
          <div class="footer">Generated by Multi-PDF RAG Learning Platform</div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDeleteSummary = async (id) => {
    try {
      const res = await api.delete(`/summaries/${id}`);
      if (res.data.success) {
        showToast('Summary deleted', 'success');
        setPastSummaries((prev) => prev.filter((s) => s._id !== id));
        if (activeSummary?._id === id) {
          setActiveSummary(null);
        }
      }
    } catch {
      showToast('Failed to delete summary', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-brand-600" />
            <span>AI PDF Summarization</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Synthesize key takeaways, detailed chapter analyses, and study notes from your uploaded PDFs.
          </p>
        </div>

        {pastSummaries.length > 0 && (
          <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
            {pastSummaries.length} saved {pastSummaries.length === 1 ? 'summary' : 'summaries'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Document Selection Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-brand-600" />
                <span>1. Select Source Document(s)</span>
              </label>
              <span className="text-xs text-brand-600 font-semibold">
                {selectedDocIds.length} selected
              </span>
            </div>

            {documents.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                <AlertCircle className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
                <p className="font-semibold text-slate-700">No ready documents found.</p>
                <p className="mt-0.5">Please upload and wait for documents to finish processing.</p>
                <Link to="/documents" className="mt-2 inline-block text-brand-600 font-bold hover:underline">
                  Go to Documents &rarr;
                </Link>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {documents.map((doc) => {
                  const isSelected = selectedDocIds.includes(doc._id);
                  return (
                    <button
                      key={doc._id}
                      type="button"
                      onClick={() => toggleDocSelection(doc._id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all border text-xs ${
                        isSelected
                          ? 'bg-brand-50/80 border-brand-300 text-brand-900 font-semibold'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center border shrink-0 ${
                            isSelected
                              ? 'bg-brand-600 border-brand-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="truncate">{doc.filename}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0 ml-2">
                        {doc.pageCount} pgs
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary Type Selection */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-brand-600" />
              <span>2. Choose Summary Type</span>
            </label>

            <div className="space-y-2">
              {summaryTypes.map((t) => {
                const isSelected = summaryType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSummaryType(t.id)}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-brand-50/70 border-brand-300 ring-1 ring-brand-300/50'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'border-brand-600 bg-brand-600'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-xs font-bold text-slate-800">{t.title}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          {t.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{t.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={selectedDocIds.length === 0 || loading}
              loading={loading}
              icon={Sparkles}
              className="w-full mt-4 py-2.5 font-bold shadow-xs"
            >
              Generate Summary
            </Button>
          </div>

          {/* Past Summaries History Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-brand-600" />
              <span>Saved Summaries ({pastSummaries.length})</span>
            </h3>

            {loadingPast ? (
              <div className="p-4 text-center text-xs text-slate-400 animate-pulse">
                Loading saved summaries...
              </div>
            ) : pastSummaries.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">
                No summaries generated yet.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {pastSummaries.map((s) => (
                  <div
                    key={s._id}
                    onClick={() => setActiveSummary(s)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-2 ${
                      activeSummary?._id === s._id
                        ? 'bg-brand-50 border-brand-200 text-brand-900 font-semibold'
                        : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs truncate font-medium">{s.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {formatDate(s.createdAt)} • {s.summaryType}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSummary(s._id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Delete summary"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Display Generated Summary (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs min-h-[500px] flex flex-col">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center animate-bounce mb-4 border border-brand-200">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-800 mb-1">
                  Synthesizing PDF Summary...
                </h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  The AI is analyzing extracted pages, extracting definitions, and generating your structured summary.
                </p>
              </div>
            ) : !activeSummary ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4 border border-slate-200">
                  <BookOpen className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-800 mb-1">
                  No Summary Selected
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mb-4">
                  Select your source document(s) on the left and choose a summary type to generate your first AI synthesis.
                </p>
              </div>
            ) : (
              <div className="space-y-4 flex-1 flex flex-col">
                {/* Header bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {activeSummary.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                      <span className="font-semibold text-brand-600 capitalize">
                        {activeSummary.summaryType.replace('_', ' ')}
                      </span>
                      <span>•</span>
                      <span>{formatDate(activeSummary.createdAt)}</span>
                      <span>•</span>
                      <span>{(activeSummary.documentNames || []).join(', ')}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={copied ? Check : Copy}
                      onClick={handleCopy}
                      title="Copy to clipboard"
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Download}
                      onClick={handleDownloadTxt}
                      title="Download text file"
                    >
                      TXT
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Download}
                      onClick={handleDownloadPdf}
                      title="Export printable PDF"
                    >
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={RotateCcw}
                      onClick={handleGenerate}
                      loading={loading}
                      title="Regenerate with current settings"
                    >
                      Regenerate
                    </Button>
                  </div>
                </div>

                {/* Summary Markdown Body */}
                <div className="flex-1 overflow-y-auto pr-2 markdown-body text-sm text-slate-700 leading-relaxed max-h-[600px]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {activeSummary.content}
                  </ReactMarkdown>
                </div>

                {/* Source Citations */}
                {activeSummary.sources && activeSummary.sources.length > 0 && (
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Cited Document Pages ({activeSummary.sources.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {activeSummary.sources.map((src, idx) => (
                        <div
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700 font-medium flex items-center gap-1.5"
                        >
                          <FileText className="w-3 h-3 text-brand-600" />
                          <span className="truncate max-w-[150px]">{src.filename}</span>
                          <span className="font-bold text-slate-900">Page {src.pageNumber}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

