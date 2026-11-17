import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  FileText,
  RotateCcw,
  Shuffle,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Trash2,
  Check,
  Award,
  Layers,
  Filter,
  ArrowRight,
  Clock,
  ExternalLink,
  Edit2,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/formatters';
import api from '../services/api';

export const isDocumentReady = (doc) => {
  if (!doc) return false;
  const status = String(doc.status || '').trim().toLowerCase();
  const hasContent = Number(doc.pageCount) > 0 || Number(doc.chunkCount) > 0;
  return status === 'ready' && hasContent && !doc.errorMessage;
};

export function FlashcardsPage() {
  const [searchParams] = useSearchParams();
  const preselectedDocId = searchParams.get('doc');
  const preselectedSetId = searchParams.get('id');
  const { showToast } = useToast();

  const [documents, setDocuments] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState(preselectedDocId ? [preselectedDocId] : []);
  const [title, setTitle] = useState('');
  const [cardCount, setCardCount] = useState(10);
  const [loading, setLoading] = useState(false);

  // Active set & cards state
  const [activeSet, setActiveSet] = useState(null);
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'need_practice' | 'known'

  // Saved sets list
  const [savedSets, setSavedSets] = useState([]);
  const [loadingSets, setLoadingSets] = useState(true);

  // Rename set state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  // Fetch documents and existing sets
  useEffect(() => {
    fetchDocuments();
    fetchSavedSets();
  }, []);

  // Pre-load specific set if requested in URL
  useEffect(() => {
    if (preselectedSetId) {
      loadSetById(preselectedSetId);
    }
  }, [preselectedSetId]);

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/documents');
      const docs = res.data?.data?.documents || [];
      setDocuments(docs);
      if (preselectedDocId && docs.some((d) => d._id === preselectedDocId && isDocumentReady(d))) {
        setSelectedDocIds([preselectedDocId]);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  const fetchSavedSets = async () => {
    try {
      setLoadingSets(true);
      const res = await api.get('/flashcards');
      setSavedSets(res.data?.data?.flashcardSets || []);
    } catch (err) {
      console.error('Failed to load flashcard sets:', err);
    } finally {
      setLoadingSets(false);
    }
  };

  const loadSetById = async (id) => {
    try {
      setLoading(true);
      const res = await api.get(`/flashcards/${id}`);
      const set = res.data?.data?.flashcardSet;
      if (set) {
        setActiveSet(set);
        setCards(set.cards || []);
        setCurrentIndex(0);
        setIsFlipped(false);
        setFilterMode('all');
        setNewTitle(set.title);
      }
    } catch (err) {
      showToast('error', 'Failed to load flashcard set.');
    } finally {
      setLoading(false);
    }
  };

  const handleDocToggle = (docId) => {
    const doc = documents.find((d) => d._id === docId);
    if (!doc || !isDocumentReady(doc)) return;
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleSelectAllReady = () => {
    const readyIds = readyDocs.map((d) => d._id);
    if (readyIds.length === 0) return;
    const allSelected = readyIds.every((id) => selectedDocIds.includes(id));
    if (allSelected) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(readyIds);
    }
  };

  const handleGenerate = async () => {
    if (selectedDocIds.length === 0) {
      showToast('error', 'Please select at least one document.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/flashcards/generate', {
        documentIds: selectedDocIds,
        title: title.trim() || undefined,
        count: cardCount,
      });

      const set = res.data?.data?.flashcardSet;
      setActiveSet(set);
      setCards(set.cards || []);
      setCurrentIndex(0);
      setIsFlipped(false);
      setFilterMode('all');
      setNewTitle(set.title);

      showToast('success', `Created ${set.cards?.length || 0} flashcards successfully!`);
      fetchSavedSets();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to generate flashcards.';
      showToast('error', msg);
    } finally {
      setLoading(false);
    }
  };

  // Filtered cards based on active filter
  const displayedCards = cards.filter((card) => {
    if (filterMode === 'need_practice') return card.status === 'need_practice';
    if (filterMode === 'known') return card.status === 'known';
    return true;
  });

  const currentCard = displayedCards[currentIndex] || null;

  // Keyboard navigation: Space = flip, ArrowLeft = prev, ArrowRight = next
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, displayedCards.length]);

  const handleNext = () => {
    if (currentIndex < displayedCards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex((idx) => idx + 1), 150);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex((idx) => idx - 1), 150);
    }
  };

  const handleCardStatus = async (status) => {
    if (!currentCard || !activeSet) return;

    const updatedCards = cards.map((c) =>
      c.id === currentCard.id
        ? { ...c, status, lastReviewedAt: new Date().toISOString() }
        : c
    );

    setCards(updatedCards);

    // Save to backend asynchronously
    try {
      await api.patch(`/flashcards/${activeSet._id}`, { cards: updatedCards });
    } catch (err) {
      console.error('Failed to sync card status:', err);
    }

    // Auto-advance if not at the last card
    if (currentIndex < displayedCards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex((idx) => idx + 1), 200);
    }
  };

  const handleShuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    showToast('info', 'Cards shuffled!');
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleSaveTitle = async () => {
    if (!newTitle.trim() || !activeSet) return;
    try {
      await api.patch(`/flashcards/${activeSet._id}`, { title: newTitle.trim() });
      setActiveSet((prev) => ({ ...prev, title: newTitle.trim() }));
      setIsEditingTitle(false);
      showToast('success', 'Set renamed successfully.');
      fetchSavedSets();
    } catch (err) {
      showToast('error', 'Failed to rename set.');
    }
  };

  const handleDeleteSet = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this flashcard set?')) return;

    try {
      await api.delete(`/flashcards/${id}`);
      showToast('success', 'Flashcard set deleted.');
      if (activeSet && activeSet._id === id) {
        setActiveSet(null);
        setCards([]);
      }
      fetchSavedSets();
    } catch (err) {
      showToast('error', 'Failed to delete flashcard set.');
    }
  };

  // Metrics
  const knownCount = cards.filter((c) => c.status === 'known').length;
  const needPracticeCount = cards.filter((c) => c.status === 'need_practice').length;
  const unreviewedCount = cards.length - knownCount - needPracticeCount;
  const percentComplete = cards.length > 0 ? Math.round(((knownCount + needPracticeCount) / cards.length) * 100) : 0;
  const readyDocs = documents.filter(isDocumentReady);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-brand-50 text-brand-600 border border-brand-100">
              <Layers className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">AI Flashcard Generator</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Turn complex PDF content into high-yield interactive study flashcards with source citations.
          </p>
        </div>

        {activeSet && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveSet(null)}
            icon={<RotateCcw className="h-4 w-4" />}
          >
            Create New Set
          </Button>
        )}
      </div>

      {/* Main View: Setup or Study Player */}
      {!activeSet ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Creation Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6 border border-slate-200 bg-white">
              <h2 className="text-base font-semibold text-slate-900 mb-1 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
                  1
                </span>
                Select Source Documents
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Choose the ready PDFs you want AI to extract concepts and key terms from.
              </p>

              {documents.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg">
                  <FileText className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700">No documents uploaded yet</p>
                  <p className="text-xs text-slate-500 mt-1 mb-3">Upload a PDF to start generating flashcards.</p>
                  <Link to="/documents">
                    <Button size="sm" variant="outline">
                      Go to Documents
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-500 px-1 mb-1">
                    <span>
                      {readyDocs.length} ready document{readyDocs.length === 1 ? '' : 's'} available
                      {selectedDocIds.length > 0 && ` (${selectedDocIds.length} selected)`}
                    </span>
                    {readyDocs.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectAllReady}
                        className="text-brand-600 hover:text-brand-700 font-medium"
                      >
                        {readyDocs.every((d) => selectedDocIds.includes(d._id)) ? 'Deselect All' : 'Select All Ready'}
                      </button>
                    )}
                  </div>

                  {readyDocs.length === 0 && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>No ready documents available. Documents may still be processing or failed extraction.</span>
                    </div>
                  )}

                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                    {documents.map((doc) => {
                      const isReady = isDocumentReady(doc);
                      const isSelected = selectedDocIds.includes(doc._id);
                      const filename = doc.filename || doc.name || 'Document';

                      return (
                        <div
                          key={doc._id}
                          onClick={() => isReady && handleDocToggle(doc._id)}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                            !isReady
                              ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-200'
                              : isSelected
                              ? 'border-brand-500 bg-brand-50/50 cursor-pointer shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!isReady}
                              onChange={() => isReady && handleDocToggle(doc._id)}
                              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <FileText className={`h-4 w-4 shrink-0 ${isSelected ? 'text-brand-600' : 'text-slate-400'}`} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{filename}</p>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>{doc.pageCount || 0} pages</span>
                                <span>•</span>
                                <span>{formatDate(doc.createdAt)}</span>
                                {doc.errorMessage && (
                                  <span className="text-rose-600 truncate max-w-[180px]" title={doc.errorMessage}>
                                    • {doc.errorMessage}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div>
                            <Badge status={doc.status}>
                              {doc.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Config: Count & Title */}
            <div className="card p-6 border border-slate-200 bg-white space-y-4">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
                  2
                </span>
                Flashcard Settings
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Set Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Biology Chapter 4 Review"
                    className="w-full text-sm rounded-lg border-slate-200 focus:border-brand-500 focus:ring-brand-500 bg-slate-50/50"
                  />
                  <p className="text-xs text-slate-500 mt-1">Leave blank to auto-name from documents.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Number of Cards
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[5, 10, 15, 20].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setCardCount(num)}
                        className={`py-2 text-sm font-semibold rounded-lg border transition-all ${
                          cardCount === num
                            ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-xs'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">High-yield terms and key definitions.</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Button
                  onClick={handleGenerate}
                  loading={loading}
                  disabled={loading || selectedDocIds.length === 0}
                  className="w-full py-3"
                  icon={<Sparkles className="h-4 w-4" />}
                >
                  {loading ? 'Analyzing Content & Generating Cards...' : 'Generate Flashcards with AI'}
                </Button>
              </div>
            </div>
          </div>

          {/* Right Col: Previously Saved Sets */}
          <div className="space-y-4">
            <div className="card p-5 border border-slate-200 bg-white">
              <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center justify-between">
                <span>Saved Flashcard Sets</span>
                <span className="text-xs font-normal text-slate-500">{savedSets.length} sets</span>
              </h2>

              {loadingSets ? (
                <div className="space-y-3 py-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : savedSets.length === 0 ? (
                <div className="text-center py-8">
                  <Layers className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No saved flashcard sets yet.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                  {savedSets.map((set) => (
                    <div
                      key={set._id}
                      onClick={() => loadSetById(set._id)}
                      className="p-3 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50/20 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-slate-800 truncate group-hover:text-brand-600">
                            {set.title}
                          </h3>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {set.documentNames?.join(', ') || 'Document'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSet(set._id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
                        <span className="font-medium text-slate-600">
                          {set.totalCards} cards
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600 font-semibold">{set.knownCount || 0} known</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-amber-600 font-semibold">{set.needPracticeCount || 0} review</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Study Player View */
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white">
            <div className="min-w-0">
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="text-base font-bold text-slate-900 border-b border-brand-500 bg-transparent px-1 py-0.5 focus:outline-hidden"
                  />
                  <Button size="xs" variant="primary" onClick={handleSaveTitle}>
                    Save
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => setIsEditingTitle(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 truncate">{activeSet.title}</h2>
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                    title="Rename Set"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Sources: {activeSet.documentNames?.join(', ') || 'Uploaded PDFs'}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleShuffle}
                icon={<Shuffle className="h-3.5 w-3.5" />}
              >
                Shuffle
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRestart}
                icon={<RotateCcw className="h-3.5 w-3.5" />}
              >
                Restart
              </Button>
            </div>
          </div>

          {/* Filter Pills & Progress */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setFilterMode('all');
                  setCurrentIndex(0);
                  setIsFlipped(false);
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  filterMode === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({cards.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterMode('need_practice');
                  setCurrentIndex(0);
                  setIsFlipped(false);
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  filterMode === 'need_practice'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Need Practice ({needPracticeCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterMode('known');
                  setCurrentIndex(0);
                  setIsFlipped(false);
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  filterMode === 'known'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Known ({knownCount})
              </button>
            </div>

            {/* Progress status */}
            <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
              <span>{percentComplete}% Reviewed</span>
              <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-brand-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${percentComplete}%` }}
                />
              </div>
            </div>
          </div>

          {/* 3D Flip Card Container */}
          {displayedCards.length === 0 ? (
            <div className="card p-12 text-center border border-slate-200 bg-white">
              <Layers className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No cards in this filter</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                {filterMode === 'need_practice'
                  ? 'Great job! You have no cards marked for practice.'
                  : 'No cards match this criteria.'}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setFilterMode('all');
                  setCurrentIndex(0);
                }}
              >
                Show All Cards
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className="card-flip-container cursor-pointer select-none"
                onClick={() => setIsFlipped(!isFlipped)}
                style={{ height: '360px' }}
              >
                <div className={`card-flip-inner shadow-sm ${isFlipped ? 'card-flipped' : ''}`}>
                  {/* FRONT SIDE */}
                  <div className="card-flip-front p-8 flex flex-col justify-between border-2 border-slate-200 rounded-2xl bg-white hover:border-brand-400 transition-colors">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold uppercase tracking-wider text-brand-600">
                        Term / Question
                      </span>
                      <span>Card {currentIndex + 1} of {displayedCards.length}</span>
                    </div>

                    <div className="my-auto py-6 text-center">
                      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                        {currentCard.front}
                      </h3>
                      {(currentCard.source?.filename || currentCard.sourceDoc) && (
                        <p className="text-xs text-slate-400 mt-4 flex items-center justify-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-brand-600" />
                          <span>{currentCard.source?.filename || currentCard.sourceDoc}</span>
                          {(currentCard.source?.pageNumber || currentCard.sourcePage) && (
                            <span>(p. {currentCard.source?.pageNumber || currentCard.sourcePage})</span>
                          )}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100">
                      <span>Click or press Space to reveal answer</span>
                      {currentCard.status === 'known' ? (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> Marked Known
                        </span>
                      ) : currentCard.status === 'need_practice' ? (
                        <span className="text-amber-600 font-semibold flex items-center gap-1">
                          <RotateCcw className="h-3.5 w-3.5" /> Needs Practice
                        </span>
                      ) : (
                        <span className="text-slate-400">Unreviewed</span>
                      )}
                    </div>
                  </div>

                  {/* BACK SIDE */}
                  <div className="card-flip-back p-8 flex flex-col justify-between border-2 border-brand-200 rounded-2xl bg-brand-50/20">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold uppercase tracking-wider text-emerald-700">
                        Answer / Definition
                      </span>
                      {(currentCard.source?.filename || currentCard.sourceDoc) && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 font-medium">
                          <BookOpen className="h-3 w-3 text-brand-600" />
                          <span className="truncate max-w-[200px]">{currentCard.source?.filename || currentCard.sourceDoc}</span>
                          {(currentCard.source?.pageNumber || currentCard.sourcePage) && (
                            <span>: p. {currentCard.source?.pageNumber || currentCard.sourcePage}</span>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="my-auto py-4 overflow-y-auto max-h-48">
                      <p className="text-base sm:text-lg text-slate-800 leading-relaxed font-normal">
                        {currentCard.back}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-brand-100/60">
                      <span className="text-xs text-slate-400">Click to flip back</span>
                      <span className="text-xs font-semibold text-brand-700">
                        Did you know this?
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons below card */}
              <div className="flex items-center justify-between gap-4 pt-2">
                <Button
                  variant="outline"
                  size="md"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  icon={<ChevronLeft className="h-4 w-4" />}
                >
                  Previous
                </Button>

                {/* Mark status pills */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleCardStatus('need_practice')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                      currentCard.status === 'need_practice'
                        ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-amber-300 text-slate-700 hover:bg-amber-50/40'
                    }`}
                  >
                    <RotateCcw className="h-4 w-4 text-amber-600" />
                    <span>Need Practice</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCardStatus('known')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                      currentCard.status === 'known'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-emerald-300 text-slate-700 hover:bg-emerald-50/40'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Mark Known</span>
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="md"
                  onClick={handleNext}
                  disabled={currentIndex === displayedCards.length - 1}
                  className="flex-row-reverse"
                  icon={<ChevronRight className="h-4 w-4" />}
                >
                  Next
                </Button>
              </div>

              {/* Quick Key Guide */}
              <div className="text-center pt-2">
                <p className="text-[11px] text-slate-400">
                  Keyboard shortcuts: <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 border border-slate-200">Space</kbd> Flip &bull; <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 border border-slate-200">&larr;</kbd> Previous &bull; <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 border border-slate-200">&rarr;</kbd> Next
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FlashcardsPage;

