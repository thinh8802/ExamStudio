// ============================================
// EXAM BUILDER PAGE - Tạo Đề Thi Thủ Công
// Split-View Desktop, Draft Autosave, Undo/Redo
// ============================================
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useExamStore } from '@/stores/exam-store';
import { useSubjectStore } from '@/stores/subject-store';
import { useQuestionStore } from '@/stores/question-store';
import { Card, CardContent, Badge, Button } from '@/components/ui';
import type { Question, Difficulty, ExamDraft } from '@/types';
import toast from 'react-hot-toast';
import {
  PlusCircle, Search, Filter, ChevronUp, ChevronDown,
  Trash2, Undo2, Redo2, Save, Play, CheckCircle2, ArrowLeft,
  BookOpen, Sparkles, FileText, Check, HelpCircle, Layers
} from 'lucide-react';
import { MathRenderer } from '@/components/common/MathRenderer';

interface BuilderState {
  name: string;
  subjectId: string;
  description: string;
  timeLimit: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  passingScore: number;
  selectedQuestionIds: string[];
}

export const ExamBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editExamId = searchParams.get('edit');

  const { subjects, chapters } = useSubjectStore();
  const { questions: allQuestions, loadQuestions } = useQuestionStore();
  const { createExam, updateExam, getExamById, loadDraft, saveDraft, clearDraft, startExamById } = useExamStore();

  // Builder State
  const [name, setName] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState(45);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleAnswers, setShuffleAnswers] = useState(true);
  const [passingScore, setPassingScore] = useState(5.0);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  // Filter State (Left column)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterChapterId, setFilterChapterId] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Undo / Redo History Stack
  const historyRef = useRef<BuilderState[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoAction = useRef<boolean>(false);

  // Autosave status
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [hasDraftNotice, setHasDraftNotice] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<ExamDraft | null>(null);
  const [saving, setSaving] = useState(false);

  // Initial Load
  useEffect(() => {
    const init = async () => {
      await loadQuestions();

      if (editExamId) {
        const exam = await getExamById(editExamId);
        if (exam) {
          setName(exam.name);
          setSelectedSubjectId(exam.subjectId);
          setDescription(exam.description || '');
          setTimeLimit(exam.timeLimit || 45);
          setShuffleQuestions(Boolean(exam.shuffleQuestions));
          setShuffleAnswers(Boolean(exam.shuffleAnswers));
          setPassingScore(exam.passingScore ?? 5.0);
          setSelectedQuestionIds(exam.questionIds || []);
          return;
        }
      }

      // Check draft
      const draft = await loadDraft();
      if (draft && draft.questionIds && draft.questionIds.length > 0) {
        setPendingDraft(draft);
        setHasDraftNotice(true);
      } else if (subjects.length > 0) {
        setSelectedSubjectId(subjects[0].id);
      }
    };
    init();
  }, [editExamId]);

  // Set default subject if none
  useEffect(() => {
    if (!selectedSubjectId && subjects.length > 0) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  // Push state to Undo/Redo history
  const pushHistory = useCallback((state: BuilderState) => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }
    const currentHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    currentHistory.push(state);
    if (currentHistory.length > 30) currentHistory.shift();
    historyRef.current = currentHistory;
    historyIndexRef.current = currentHistory.length - 1;
  }, []);

  // Track state changes for history & autosave
  useEffect(() => {
    const currentState: BuilderState = {
      name,
      subjectId: selectedSubjectId,
      description,
      timeLimit,
      shuffleQuestions,
      shuffleAnswers,
      passingScore,
      selectedQuestionIds,
    };
    pushHistory(currentState);

    // Autosave draft if not editing an existing exam and has content
    if (!editExamId && (selectedQuestionIds.length > 0 || name.trim().length > 0)) {
      const timer = setTimeout(() => {
        saveDraft(currentState);
        setLastSavedTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [name, selectedSubjectId, description, timeLimit, shuffleQuestions, shuffleAnswers, passingScore, selectedQuestionIds]);

  // Keyboard Shortcuts (Undo / Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const prevState = historyRef.current[historyIndexRef.current];
      if (prevState) {
        isUndoRedoAction.current = true;
        setName(prevState.name);
        setSelectedSubjectId(prevState.subjectId);
        setDescription(prevState.description);
        setTimeLimit(prevState.timeLimit);
        setShuffleQuestions(prevState.shuffleQuestions);
        setShuffleAnswers(prevState.shuffleAnswers);
        setPassingScore(prevState.passingScore);
        setSelectedQuestionIds(prevState.selectedQuestionIds);
        toast('Đã hoàn tác (Undo)', { icon: '↩️', duration: 1500 });
      }
    }
  };

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const nextState = historyRef.current[historyIndexRef.current];
      if (nextState) {
        isUndoRedoAction.current = true;
        setName(nextState.name);
        setSelectedSubjectId(nextState.subjectId);
        setDescription(nextState.description);
        setTimeLimit(nextState.timeLimit);
        setShuffleQuestions(nextState.shuffleQuestions);
        setShuffleAnswers(nextState.shuffleAnswers);
        setPassingScore(nextState.passingScore);
        setSelectedQuestionIds(nextState.selectedQuestionIds);
        toast('Đã làm lại (Redo)', { icon: '↪️', duration: 1500 });
      }
    }
  };

  const handleRestoreDraft = () => {
    if (pendingDraft) {
      setName(pendingDraft.name || '');
      setSelectedSubjectId(pendingDraft.subjectId || '');
      setDescription(pendingDraft.description || '');
      setTimeLimit(pendingDraft.timeLimit || 45);
      setShuffleQuestions(Boolean(pendingDraft.shuffleQuestions));
      setShuffleAnswers(Boolean(pendingDraft.shuffleAnswers));
      setPassingScore(pendingDraft.passingScore ?? 5.0);
      setSelectedQuestionIds(pendingDraft.questionIds || []);
      setHasDraftNotice(false);
      toast.success('Đã khôi phục bản nháp đề thi');
    }
  };

  const handleDiscardDraft = async () => {
    await clearDraft();
    setHasDraftNotice(false);
    setPendingDraft(null);
    toast('Đã hủy bản nháp', { icon: '🗑️' });
  };

  // Filtered Questions (Bank - Left Column)
  const filteredBankQuestions = useMemo(() => {
    return allQuestions.filter(q => {
      if (selectedSubjectId && q.subjectId !== selectedSubjectId) return false;
      if (filterChapterId && q.chapterId !== filterChapterId) return false;
      if (filterDifficulty && q.difficulty !== filterDifficulty) return false;
      if (filterStatus && q.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchContent = q.content.toLowerCase().includes(query);
        const matchExplanation = q.explanation && q.explanation.toLowerCase().includes(query);
        if (!matchContent && !matchExplanation) return false;
      }
      return true;
    });
  }, [allQuestions, selectedSubjectId, filterChapterId, filterDifficulty, filterStatus, searchQuery]);

  // Selected Questions (Cart - Right Column)
  const selectedQuestionMap = useMemo(() => {
    const map = new Map(allQuestions.map(q => [q.id, q]));
    return map;
  }, [allQuestions]);

  const selectedQuestionsList = useMemo(() => {
    return selectedQuestionIds.map(id => selectedQuestionMap.get(id)).filter(Boolean) as Question[];
  }, [selectedQuestionIds, selectedQuestionMap]);

  // Difficulty breakdown of selected questions
  const difficultyBreakdown = useMemo(() => {
    const counts = { easy: 0, medium: 0, hard: 0, very_hard: 0 };
    selectedQuestionsList.forEach(q => {
      if (counts[q.difficulty] !== undefined) counts[q.difficulty]++;
    });
    return counts;
  }, [selectedQuestionsList]);

  // Add / Remove actions
  const handleToggleQuestion = (questionId: string) => {
    if (selectedQuestionIds.includes(questionId)) {
      setSelectedQuestionIds(prev => prev.filter(id => id !== questionId));
    } else {
      setSelectedQuestionIds(prev => [...prev, questionId]);
    }
  };

  const handleSelectAllFiltered = () => {
    const newIds = new Set(selectedQuestionIds);
    filteredBankQuestions.forEach(q => newIds.add(q.id));
    setSelectedQuestionIds(Array.from(newIds));
    toast.success(`Đã thêm ${filteredBankQuestions.length} câu vào đề`);
  };

  const handleDeselectAllFiltered = () => {
    const filterSet = new Set(filteredBankQuestions.map(q => q.id));
    setSelectedQuestionIds(prev => prev.filter(id => !filterSet.has(id)));
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedQuestionIds.length) return;
    const next = [...selectedQuestionIds];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setSelectedQuestionIds(next);
  };

  const handleSaveExam = async (startImmediately = false) => {
    if (!name.trim()) {
      toast.error('Vui lòng nhập tên đề thi');
      return;
    }
    if (!selectedSubjectId) {
      toast.error('Vui lòng chọn môn học');
      return;
    }
    if (selectedQuestionIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 câu hỏi vào đề thi');
      return;
    }

    setSaving(true);
    try {
      const now = new Date();
      const examData = {
        name: name.trim(),
        subjectId: selectedSubjectId,
        description: description.trim(),
        questionIds: selectedQuestionIds,
        questionCount: selectedQuestionIds.length,
        timeLimit: Number(timeLimit) || 0,
        shuffleQuestions,
        shuffleAnswers,
        passingScore,
        status: 'ready' as const,
        snapshotQuestions: selectedQuestionsList,
      };

      let savedExam;
      if (editExamId) {
        savedExam = await updateExam(editExamId, examData);
        toast.success('Đã cập nhật đề thi');
      } else {
        savedExam = await createExam(examData);
        await clearDraft();
        toast.success('Đã tạo đề thi mới thành công');
      }

      if (startImmediately && savedExam) {
        await startExamById(savedExam.id, { mode: 'exam' });
        navigate('/quiz/session');
      } else {
        navigate('/exams');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi lưu đề thi');
    } finally {
      setSaving(false);
    }
  };

  const currentSubjectChapters = useMemo(() => {
    return chapters.filter(c => c.subjectId === selectedSubjectId);
  }, [chapters, selectedSubjectId]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-4 pb-12 animate-fade-in">
      {/* 1. Header with Undo/Redo & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/exams')}
            className="p-2 rounded-xl bg-[hsl(var(--muted)/0.4)] hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-all cursor-pointer"
            title="Quay lại danh sách đề"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[hsl(var(--foreground))] flex items-center gap-2">
              <PlusCircle className="text-[hsl(var(--primary))] w-6 h-6" />
              <span>{editExamId ? 'Chỉnh Sửa Đề Thi' : 'Tạo Đề Thi Thủ Công'}</span>
            </h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              Chọn lọc từng câu hỏi từ ngân hàng, sắp xếp thứ tự và cấu hình bài thi.
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center p-1 rounded-xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] mr-1">
            <button
              onClick={handleUndo}
              disabled={historyIndexRef.current <= 0}
              className="p-1.5 rounded-lg text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Hoàn tác (Ctrl+Z)"
            >
              <Undo2 size={16} />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndexRef.current >= historyRef.current.length - 1}
              className="p-1.5 rounded-lg text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Làm lại (Ctrl+Shift+Z)"
            >
              <Redo2 size={16} />
            </button>
          </div>

          {/* Autosave status indicator */}
          {lastSavedTime && (
            <span className="text-[11px] text-[hsl(var(--muted-foreground))] hidden md:inline-block font-mono mr-2">
              ✓ Đã lưu nháp: {lastSavedTime}
            </span>
          )}

          <Button
            variant="outline"
            icon={<Save size={15} />}
            loading={saving}
            onClick={() => handleSaveExam(false)}
            className="rounded-2xl text-xs font-semibold"
          >
            Lưu đề thi
          </Button>

          <Button
            variant="gradient"
            icon={<Play size={15} className="fill-current" />}
            loading={saving}
            onClick={() => handleSaveExam(true)}
            className="rounded-2xl text-xs font-bold"
          >
            Lưu & Làm bài ngay
          </Button>
        </div>
      </div>

      {/* Draft Recovery Banner */}
      {hasDraftNotice && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-600 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Phát hiện bản nháp đề thi chưa hoàn thành ({pendingDraft?.questionIds?.length || 0} câu). Bạn có muốn khôi phục không?</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleDiscardDraft} className="rounded-xl text-xs py-1">
              Bỏ qua
            </Button>
            <Button size="sm" variant="default" onClick={handleRestoreDraft} className="rounded-xl text-xs py-1">
              Khôi phục
            </Button>
          </div>
        </div>
      )}

      {/* 2. Desktop Split View (60% Left Bank - 40% Right Cart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT COLUMN: Question Bank & Filters */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="rounded-3xl border border-[hsl(var(--border))] shadow-xs">
            <CardContent className="p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[hsl(var(--primary))]" />
                  <h2 className="text-sm font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">
                    Ngân Hàng Câu Hỏi ({filteredBankQuestions.length} câu)
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSelectAllFiltered}
                    className="text-[11px] font-bold text-[hsl(var(--primary))] hover:underline cursor-pointer"
                  >
                    + Chọn tất cả ({filteredBankQuestions.length})
                  </button>
                  <span className="text-[hsl(var(--border))]">•</span>
                  <button
                    onClick={handleDeselectAllFiltered}
                    className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] hover:underline cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              {/* Filters Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                <select
                  value={selectedSubjectId}
                  onChange={e => {
                    setSelectedSubjectId(e.target.value);
                    setFilterChapterId('');
                  }}
                  className="w-full py-2 px-2.5 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-xs font-semibold text-[hsl(var(--foreground))] focus:outline-none"
                >
                  <option value="">Tất cả môn</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                <select
                  value={filterChapterId}
                  onChange={e => setFilterChapterId(e.target.value)}
                  className="w-full py-2 px-2.5 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-xs font-semibold text-[hsl(var(--foreground))] focus:outline-none"
                >
                  <option value="">Tất cả chương</option>
                  {currentSubjectChapters.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <select
                  value={filterDifficulty}
                  onChange={e => setFilterDifficulty(e.target.value)}
                  className="w-full py-2 px-2.5 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-xs font-semibold text-[hsl(var(--foreground))] focus:outline-none"
                >
                  <option value="">Tất cả độ khó</option>
                  <option value="easy">Dễ (Nhận biết)</option>
                  <option value="medium">Vừa (Thông hiểu)</option>
                  <option value="hard">Khó (Vận dụng)</option>
                  <option value="very_hard">Rất khó (VDC)</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full py-2 px-2.5 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-xs font-semibold text-[hsl(var(--foreground))] focus:outline-none"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="new">Chưa làm</option>
                  <option value="learning">Đang học</option>
                  <option value="mastered">Đã thành thạo</option>
                  <option value="needs_review">Cần ôn lại</option>
                </select>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                <input
                  type="text"
                  placeholder="Tìm kiếm nội dung câu hỏi..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-2xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Question List in Bank */}
          <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 custom-scrollbar">
            {filteredBankQuestions.length === 0 ? (
              <div className="py-12 text-center rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] space-y-2">
                <HelpCircle className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-xs">Không tìm thấy câu hỏi phù hợp với bộ lọc hiện tại.</p>
              </div>
            ) : (
              filteredBankQuestions.map((q, idx) => {
                const isSelected = selectedQuestionIds.includes(q.id);
                return (
                  <div
                    key={q.id}
                    onClick={() => handleToggleQuestion(q.id)}
                    className={`p-3.5 rounded-2xl border transition-all duration-150 cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.06)] shadow-xs ring-1 ring-[hsl(var(--primary)/0.3)]'
                        : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted)/0.3)]'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isSelected
                        ? 'bg-[hsl(var(--primary))] text-white'
                        : 'border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] text-transparent'
                    }`}>
                      <Check size={13} className="stroke-[3]" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold text-[hsl(var(--muted-foreground))]">
                          #{q.id}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            q.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-500' :
                            q.difficulty === 'medium' ? 'bg-blue-500/10 text-blue-500' :
                            q.difficulty === 'hard' ? 'bg-amber-500/10 text-amber-500' :
                            'bg-rose-500/10 text-rose-500'
                          }`}>
                            {q.difficulty}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs sm:text-sm text-[hsl(var(--foreground))] line-clamp-2 leading-relaxed">
                        <MathRenderer text={q.content} />
                      </div>

                      <div className="grid grid-cols-2 gap-1 pt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                        {q.answers.slice(0, 4).map((a, aIdx) => (
                          <div key={a.id || aIdx} className="truncate">
                            <span className="font-semibold mr-1">{String.fromCharCode(65 + aIdx)}.</span>
                            <MathRenderer text={a.content.replace(/<[^>]*>/g, '')} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Exam Settings & Cart */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="rounded-3xl border border-[hsl(var(--border))] shadow-xs">
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-[hsl(var(--border))]">
                <FileText className="w-4 h-4 text-[hsl(var(--primary))]" />
                <h2 className="text-sm font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">
                  Thông Số Đề Thi
                </h2>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="text-xs font-semibold text-[hsl(var(--foreground))] block mb-1">
                    Tên đề thi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Đề Thi Thử Giữa Kỳ I - Toán 12"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-xs font-semibold text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))] block mb-1">
                      Môn học <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedSubjectId}
                      onChange={e => setSelectedSubjectId(e.target.value)}
                      className="w-full py-2 px-2.5 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-xs font-semibold text-[hsl(var(--foreground))] focus:outline-none"
                    >
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))] block mb-1">
                      Thời gian thi (phút)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="300"
                      value={timeLimit}
                      onChange={e => setTimeLimit(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-xs font-semibold text-[hsl(var(--foreground))] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] text-xs font-semibold text-[hsl(var(--foreground))] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shuffleQuestions}
                      onChange={e => setShuffleQuestions(e.target.checked)}
                      className="rounded text-[hsl(var(--primary))] focus:ring-0"
                    />
                    <span>Trộn câu hỏi</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] text-xs font-semibold text-[hsl(var(--foreground))] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shuffleAnswers}
                      onChange={e => setShuffleAnswers(e.target.checked)}
                      className="rounded text-[hsl(var(--primary))] focus:ring-0"
                    />
                    <span>Trộn đáp án</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Questions Panel */}
          <Card className="rounded-3xl border border-[hsl(var(--border))] shadow-xs">
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[hsl(var(--border))]">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[hsl(var(--primary))]" />
                  <h2 className="text-sm font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">
                    Giỏ Đề Thi ({selectedQuestionsList.length} câu)
                  </h2>
                </div>

                {selectedQuestionIds.length > 0 && (
                  <button
                    onClick={() => setSelectedQuestionIds([])}
                    className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer"
                  >
                    Xóa tất cả
                  </button>
                )}
              </div>

              {/* Difficulty breakdown chips */}
              <div className="grid grid-cols-4 gap-1.5 p-2 rounded-2xl bg-[hsl(var(--muted)/0.3)] text-center text-[10px]">
                <div>
                  <span className="text-[hsl(var(--muted-foreground))] block">Dễ</span>
                  <span className="font-bold text-emerald-500">{difficultyBreakdown.easy}</span>
                </div>
                <div>
                  <span className="text-[hsl(var(--muted-foreground))] block">Vừa</span>
                  <span className="font-bold text-blue-500">{difficultyBreakdown.medium}</span>
                </div>
                <div>
                  <span className="text-[hsl(var(--muted-foreground))] block">Khó</span>
                  <span className="font-bold text-amber-500">{difficultyBreakdown.hard}</span>
                </div>
                <div>
                  <span className="text-[hsl(var(--muted-foreground))] block">Rất khó</span>
                  <span className="font-bold text-rose-500">{difficultyBreakdown.very_hard}</span>
                </div>
              </div>

              {/* Selected Question List */}
              <div className="space-y-2 max-h-[calc(100vh-480px)] overflow-y-auto pr-1 custom-scrollbar">
                {selectedQuestionsList.length === 0 ? (
                  <div className="py-10 text-center text-[hsl(var(--muted-foreground))] space-y-1.5">
                    <Layers className="w-7 h-7 mx-auto opacity-30" />
                    <p className="text-xs">Chưa có câu hỏi nào được thêm vào đề.</p>
                    <p className="text-[11px] opacity-75">Chọn câu hỏi từ cột bên trái để đưa vào đề thi.</p>
                  </div>
                ) : (
                  selectedQuestionsList.map((q, idx) => (
                    <div
                      key={q.id}
                      className="p-2.5 rounded-2xl bg-[hsl(var(--muted)/0.3)] hover:bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] flex items-center justify-between gap-2 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-5 h-5 rounded-full bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] flex items-center justify-center font-bold text-[10px] shrink-0">
                          {idx + 1}
                        </span>
                        <p
                          className="text-xs text-[hsl(var(--foreground))] truncate"
                          dangerouslySetInnerHTML={{ __html: q.content.replace(/<[^>]*>/g, '') }}
                        />
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleMoveQuestion(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-20 cursor-pointer"
                          title="Di chuyển lên"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={() => handleMoveQuestion(idx, 'down')}
                          disabled={idx === selectedQuestionsList.length - 1}
                          className="p-1 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-20 cursor-pointer"
                          title="Di chuyển xuống"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleQuestion(q.id)}
                          className="p-1 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-rose-500 cursor-pointer"
                          title="Xóa khỏi đề"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};
