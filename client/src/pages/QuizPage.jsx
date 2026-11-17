import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Award,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  BookOpen,
  Send,
  Trash2,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/formatters';
import api from '../services/api';

export function QuizPage() {
  const [searchParams] = useSearchParams();
  const preselectedDocId = searchParams.get('doc');
  const { showToast } = useToast();

  // Mode: 'configure' | 'play' | 'review'
  const [mode, setMode] = useState('configure');

  // Documents
  const [documents, setDocuments] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState(preselectedDocId ? [preselectedDocId] : []);

  // Configuration options
  const [difficulty, setDifficulty] = useState('medium');
  const [questionType, setQuestionType] = useState('mcq');
  const [questionCount, setQuestionCount] = useState(5);
  const [generating, setGenerating] = useState(false);

  // Active Quiz State
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // questionIdx -> selectedAnswer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Past quizzes list
  const [pastQuizzes, setPastQuizzes] = useState([]);
  const [loadingPast, setLoadingPast] = useState(true);

  // Fetch documents
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

  // Fetch past quizzes
  const fetchPastQuizzes = async () => {
    setLoadingPast(true);
    try {
      const res = await api.get('/quizzes');
      if (res.data.success) {
        setPastQuizzes(res.data.data.quizzes || []);
      }
    } catch {
      // silent
    } finally {
      setLoadingPast(false);
    }
  };

  useEffect(() => {
    fetchPastQuizzes();
  }, []);

  // Elapsed timer
  useEffect(() => {
    let interval = null;
    if (timerActive) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const toggleDocSelection = (id) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    );
  };

  const handleGenerateQuiz = async () => {
    if (selectedDocIds.length === 0) {
      showToast('Please select at least one document', 'warning');
      return;
    }

    setGenerating(true);
    try {
      const res = await api.post('/quizzes/generate', {
        documentIds: selectedDocIds,
        difficulty,
        questionType,
        questionCount,
      });

      if (res.data.success) {
        const quiz = res.data.data.quiz;
        setActiveQuiz(quiz);
        setCurrentQuestionIdx(0);
        setSelectedAnswers({});
        setElapsedSeconds(0);
        setTimerActive(true);
        setMode('play');
        showToast('Quiz generated! Good luck!', 'success');
        fetchPastQuizzes();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to generate quiz', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectOption = (questionIdx, option) => {
    if (mode !== 'play') return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIdx]: option,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    setSubmitting(true);
    setTimerActive(false);

    try {
      const answersPayload = activeQuiz.questions.map((_, idx) => ({
        questionIndex: idx,
        selectedAnswer: selectedAnswers[idx] || '',
      }));

      const res = await api.post(`/quizzes/${activeQuiz._id}/submit`, {
        answers: answersPayload,
      });

      if (res.data.success) {
        setActiveQuiz(res.data.data.quiz);
        setShowSubmitModal(false);
        setMode('review');
        showToast('Quiz submitted and graded!', 'success');
        fetchPastQuizzes();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit quiz', 'error');
      setTimerActive(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetakeQuiz = () => {
    if (!activeQuiz) return;
    setSelectedAnswers({});
    setCurrentQuestionIdx(0);
    setElapsedSeconds(0);
    setTimerActive(true);
    setMode('play');
  };

  const handleLoadPastQuiz = async (id) => {
    try {
      const res = await api.get(`/quizzes/${id}`);
      if (res.data.success) {
        const quiz = res.data.data.quiz;
        setActiveQuiz(quiz);
        if (quiz.status === 'completed') {
          // Reconstruct user responses
          const savedAnswers = {};
          (quiz.userResponses || []).forEach((ur) => {
            savedAnswers[ur.questionIndex] = ur.selectedAnswer;
          });
          setSelectedAnswers(savedAnswers);
          setMode('review');
        } else {
          setSelectedAnswers({});
          setCurrentQuestionIdx(0);
          setElapsedSeconds(0);
          setTimerActive(true);
          setMode('play');
        }
      }
    } catch {
      showToast('Failed to load quiz', 'error');
    }
  };

  const handleDeleteQuiz = async (id) => {
    try {
      const res = await api.delete(`/quizzes/${id}`);
      if (res.data.success) {
        showToast('Quiz deleted', 'success');
        setPastQuizzes((prev) => prev.filter((q) => q._id !== id));
        if (activeQuiz?._id === id) {
          setActiveQuiz(null);
          setMode('configure');
        }
      }
    } catch {
      showToast('Failed to delete quiz', 'error');
    }
  };

  const getFeedbackBadge = (pct) => {
    if (pct >= 90) return { label: 'Outstanding!', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (pct >= 75) return { label: 'Great Job!', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (pct >= 50) return { label: 'Passed – Room to Review', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'Needs Practice', color: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-brand-600" />
            <span>AI Quiz Generator</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Generate and take active-recall assessment quizzes grounded directly in your PDF documents.
          </p>
        </div>

        {mode !== 'configure' && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setTimerActive(false);
              setMode('configure');
            }}
          >
            Create New Quiz
          </Button>
        )}
      </div>

      {/* ============================================================== */}
      {/* 1. CONFIGURE MODE */}
      {/* ============================================================== */}
      {mode === 'configure' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Configuration Form (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Document Selection */}
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
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
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

            {/* Quiz Parameters */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                2. Quiz Configuration
              </label>

              {/* Difficulty */}
              <div>
                <span className="text-xs font-semibold text-slate-600 block mb-2">Difficulty Level</span>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'easy', label: 'Easy', desc: 'Direct recall' },
                    { id: 'medium', label: 'Medium', desc: 'Application' },
                    { id: 'hard', label: 'Hard', desc: 'Deep synthesis' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDifficulty(d.id)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        difficulty === d.id
                          ? 'bg-brand-50 border-brand-400 text-brand-900 font-bold shadow-xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">{d.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{d.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Format */}
              <div>
                <span className="text-xs font-semibold text-slate-600 block mb-2">Question Type</span>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'mcq', label: 'Multiple Choice', desc: '4 Options (A-D)' },
                    { id: 'true_false', label: 'True / False', desc: 'Concept accuracy' },
                    { id: 'mixed', label: 'Mixed Format', desc: 'MCQ + True/False' },
                  ].map((qt) => (
                    <button
                      key={qt.id}
                      type="button"
                      onClick={() => setQuestionType(qt.id)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        questionType === qt.id
                          ? 'bg-brand-50 border-brand-400 text-brand-900 font-bold shadow-xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">{qt.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{qt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Questions */}
              <div>
                <span className="text-xs font-semibold text-slate-600 block mb-2">Number of Questions</span>
                <div className="grid grid-cols-4 gap-2.5">
                  {[5, 10, 15, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuestionCount(num)}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                        questionCount === num
                          ? 'bg-brand-600 border-brand-600 text-white shadow-xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {num} Questions
                    </button>
                  ))}
                </div>
              </div>

              <Button
                variant="primary"
                onClick={handleGenerateQuiz}
                disabled={selectedDocIds.length === 0 || generating}
                loading={generating}
                icon={Sparkles}
                className="w-full mt-2 py-3 font-bold shadow-xs"
              >
                Generate Quiz ({questionCount} Questions)
              </Button>
            </div>
          </div>

          {/* Past Quizzes List (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>Quiz History ({pastQuizzes.length})</span>
                <Clock className="w-4 h-4 text-brand-600" />
              </h3>

              {loadingPast ? (
                <div className="p-4 text-center text-xs text-slate-400 animate-pulse">
                  Loading quiz history...
                </div>
              ) : pastQuizzes.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  <BarChart3 className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  <p>No past quizzes found. Generate your first one!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {pastQuizzes.map((q) => {
                    const isCompleted = q.status === 'completed';
                    return (
                      <div
                        key={q._id}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all flex items-center justify-between gap-3 group"
                      >
                        <div
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => handleLoadPastQuiz(q._id)}
                        >
                          <p className="text-xs font-bold text-slate-800 truncate group-hover:text-brand-600">
                            {q.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                            <span className="capitalize font-medium">{q.difficulty}</span>
                            <span>•</span>
                            <span>{q.questionCount} Qs</span>
                            {isCompleted && (
                              <>
                                <span>•</span>
                                <span className="font-bold text-emerald-600">{q.percentage}% Score</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleLoadPastQuiz(q._id)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:border-brand-300 text-brand-700 shadow-xs"
                          >
                            {isCompleted ? 'Review' : 'Play'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuiz(q._id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors"
                            title="Delete quiz"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. PLAY QUIZ MODE */}
      {/* ============================================================== */}
      {mode === 'play' && activeQuiz && (
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Quiz Header Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}
              </span>
              <h3 className="text-sm font-bold text-slate-900 truncate max-w-md">
                {activeQuiz.title}
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 font-mono text-xs font-bold text-slate-700">
                <Clock className="w-3.5 h-3.5 text-brand-600" />
                <span>{formatTimer(elapsedSeconds)}</span>
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={Send}
                onClick={() => setShowSubmitModal(true)}
              >
                Submit Quiz
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-brand-600 h-full transition-all duration-300"
              style={{
                width: `${((currentQuestionIdx + 1) / activeQuiz.questions.length) * 100}%`,
              }}
            />
          </div>

          {/* Current Question Card */}
          {(() => {
            const currentQ = activeQuiz.questions[currentQuestionIdx];
            const currentSelected = selectedAnswers[currentQuestionIdx];

            return (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="space-y-2">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {currentQ.type === 'mcq' ? 'Multiple Choice' : 'True or False'}
                  </span>
                  <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                    {currentQ.question}
                  </h4>
                </div>

                {/* Options List */}
                <div className="space-y-2.5">
                  {currentQ.options.map((opt, optIdx) => {
                    const isChecked = currentSelected === opt;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(currentQuestionIdx, opt)}
                        className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between text-sm ${
                          isChecked
                            ? 'bg-brand-50 border-brand-400 ring-2 ring-brand-400/40 font-semibold text-brand-900 shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span>{opt}</span>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                            isChecked
                              ? 'border-brand-600 bg-brand-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Question Navigation Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={ChevronLeft}
                    onClick={() => setCurrentQuestionIdx((prev) => Math.max(0, prev - 1))}
                    disabled={currentQuestionIdx === 0}
                  >
                    Previous
                  </Button>

                  {/* Question Palette Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto max-w-xs px-2 py-1">
                    {activeQuiz.questions.map((_, idx) => {
                      const isAnswered = selectedAnswers[idx] !== undefined;
                      const isCurrent = idx === currentQuestionIdx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCurrentQuestionIdx(idx)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                            isCurrent
                              ? 'bg-brand-600 text-white shadow-xs'
                              : isAnswered
                              ? 'bg-brand-100 text-brand-800'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  {currentQuestionIdx < activeQuiz.questions.length - 1 ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setCurrentQuestionIdx((prev) => Math.min(activeQuiz.questions.length - 1, prev + 1))}
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      variant="success"
                      size="sm"
                      icon={Send}
                      onClick={() => setShowSubmitModal(true)}
                    >
                      Finish
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. REVIEW RESULTS MODE */}
      {/* ============================================================== */}
      {mode === 'review' && activeQuiz && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Result Score Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs text-center space-y-4">
            <div className="inline-flex p-3 rounded-2xl bg-brand-50 text-brand-600 border border-brand-200 mb-1">
              <Award className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-bold text-slate-900">Quiz Completed!</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Review your answers below along with explanations and verified page citations from your document.
            </p>

            {/* Score Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto pt-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 font-semibold block">Total Score</span>
                <span className="text-xl font-bold text-slate-900">{activeQuiz.score} / {activeQuiz.questionCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 font-semibold block">Percentage</span>
                <span className="text-xl font-bold text-brand-600">{activeQuiz.percentage}%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 font-semibold block">Correct</span>
                <span className="text-xl font-bold text-emerald-600">{activeQuiz.score}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 font-semibold block">Incorrect</span>
                <span className="text-xl font-bold text-rose-600">{activeQuiz.questionCount - activeQuiz.score}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getFeedbackBadge(activeQuiz.percentage).color}`}>
                {getFeedbackBadge(activeQuiz.percentage).label}
              </span>
              <Button variant="secondary" size="sm" icon={RotateCcw} onClick={handleRetakeQuiz}>
                Retake Quiz
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMode('configure')}>
                Back to Config
              </Button>
            </div>
          </div>

          {/* Detailed Question Review List */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Detailed Question Review ({activeQuiz.questions.length})
            </h4>

            {activeQuiz.questions.map((q, idx) => {
              const userResp = activeQuiz.userResponses?.find((ur) => ur.questionIndex === idx);
              const isCorrect = userResp?.isCorrect;
              const userSelected = userResp?.selectedAnswer || selectedAnswers[idx] || '(No Answer)';

              return (
                <div
                  key={idx}
                  className={`bg-white rounded-2xl border p-5 shadow-xs space-y-3.5 transition-all ${
                    isCorrect ? 'border-emerald-200' : 'border-rose-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 ${
                          isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-slate-900 leading-snug">
                          {q.question}
                        </h5>
                        <p className="text-[11px] text-slate-400 capitalize mt-0.5">
                          {q.type === 'mcq' ? 'Multiple Choice' : 'True or False'}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isCorrect ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Correct
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3.5 h-3.5" />
                          Incorrect
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Options Comparison */}
                  <div className="space-y-1.5 pl-8 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="font-semibold text-slate-500 mr-2">Your Answer:</span>
                      <span className={isCorrect ? 'font-bold text-emerald-700' : 'font-bold text-rose-700'}>
                        {userSelected}
                      </span>
                    </div>

                    {!isCorrect && (
                      <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200">
                        <span className="font-semibold text-emerald-800 mr-2">Correct Answer:</span>
                        <span className="font-bold text-emerald-900">{q.correctAnswer}</span>
                      </div>
                    )}

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-600 mt-2">
                        <strong className="text-slate-800 font-semibold block mb-0.5">Explanation:</strong>
                        <span>{q.explanation}</span>
                      </div>
                    )}

                    {/* Source Citation */}
                    {q.source && (
                      <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                        <FileText className="w-3 h-3 text-brand-600" />
                        <span>Source: <strong>{q.source.filename || 'Document'}</strong></span>
                        <span>•</span>
                        <span className="px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 font-bold border border-brand-200">
                          Page {q.source.pageNumber || 1}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Quiz"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            You have answered <strong>{Object.keys(selectedAnswers).length}</strong> of{' '}
            <strong>{activeQuiz?.questions.length}</strong> questions.
          </p>

          {Object.keys(selectedAnswers).length < (activeQuiz?.questions.length || 0) && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Unanswered questions will be scored as incorrect.</span>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowSubmitModal(false)}>
              Keep Answering
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Send}
              loading={submitting}
              onClick={handleSubmitQuiz}
            >
              Confirm & Submit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

