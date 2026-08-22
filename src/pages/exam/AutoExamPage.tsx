// ============================================
// AUTO EXAM PAGE - Tạo Đề Thi Tự Động Theo Ma Trận
// Matrix Validation, Strategy, Live Preview, Reroll, Blueprint
// ============================================
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '@/stores/exam-store';
import { useSubjectStore } from '@/stores/subject-store';
import { useQuestionStore } from '@/stores/question-store';
import { Card, CardContent, Badge, Button, Modal } from '@/components/ui';
import { ExamBuilderService, type MatrixValidationResult } from '@/services/exam-builder-service';
import type { Exam, Question, Difficulty, ChapterDistribution, DifficultyDistribution, ExamBlueprint } from '@/types';
import toast from 'react-hot-toast';
import {
  Shuffle, ArrowLeft, Play, Save, RefreshCw, Sparkles,
  AlertTriangle, CheckCircle2, Sliders, Layers, Clock, Award,
  HelpCircle, Eye, BookmarkPlus, Bookmark, Check, ShieldAlert,
  ChevronRight, ArrowRight, Minus, Plus, Zap
} from 'lucide-react';
import { MathRenderer } from '@/components/common/MathRenderer';

export const AutoExamPage: React.FC = () => {
  const navigate = useNavigate();
  const { subjects, chapters } = useSubjectStore();
  const { questions: allQuestions, loadQuestions } = useQuestionStore();
  const { createExam, saveBlueprint, loadBlueprints, blueprints, startExamById } = useExamStore();

  // Step 1: Basic Config
  const [name, setName] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [totalQuestions, setTotalQuestions] = useState(40);
  const [timeLimit, setTimeLimit] = useState(50);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleAnswers, setShuffleAnswers] = useState(true);

  // Step 2: Chapter Distribution
  const [chapterCounts, setChapterCounts] = useState<Record<string, number>>({});

  // Step 3: Difficulty Distribution (Percentages)
  const [difficultyPercentages, setDifficultyPercentages] = useState<{
    easy: number;
    medium: number;
    hard: number;
    very_hard: number;
  }>({
    easy: 30,
    medium: 40,
    hard: 20,
    very_hard: 10,
  });

  // Step 4: Strategy Toggles
  const [strategy, setStrategy] = useState({
    prioritizeWrong: true,
    prioritizeNew: true,
    excludeMastered: false,
  });

  // Generated Preview State
  const [generatedExam, setGeneratedExam] = useState<Exam | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [activeSeed, setActiveSeed] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Blueprint selection modal
  const [showBlueprintModal, setShowBlueprintModal] = useState(false);
  const [showSaveBlueprintModal, setShowSaveBlueprintModal] = useState(false);
  const [blueprintName, setBlueprintName] = useState('');

  // Initial Load
  useEffect(() => {
    const init = async () => {
      await loadQuestions();
      await loadBlueprints();
      if (subjects.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(subjects[0].id);
      }
    };
    init();
  }, [subjects]);

  // Subject Chapters
  const currentSubjectChapters = useMemo(() => {
    return chapters.filter(c => c.subjectId === selectedSubjectId);
  }, [chapters, selectedSubjectId]);

  // Subject Pool
  const subjectPool = useMemo(() => {
    return allQuestions.filter(q => q.subjectId === selectedSubjectId);
  }, [allQuestions, selectedSubjectId]);

  // Initialize or update chapter distribution when subject or chapters change
  useEffect(() => {
    if (currentSubjectChapters.length > 0) {
      const initialCounts: Record<string, number> = {};
      const perChapter = Math.floor(totalQuestions / currentSubjectChapters.length);
      let remainder = totalQuestions % currentSubjectChapters.length;

      currentSubjectChapters.forEach((ch, idx) => {
        initialCounts[ch.id] = perChapter + (idx < remainder ? 1 : 0);
      });
      setChapterCounts(initialCounts);
    }
  }, [selectedSubjectId, currentSubjectChapters.length, totalQuestions]);

  // Chapter Distribution array
  const chapterDistArray = useMemo<ChapterDistribution[]>(() => {
    return Object.entries(chapterCounts).map(([chapterId, count]) => ({
      chapterId,
      count: Number(count) || 0,
    }));
  }, [chapterCounts]);

  // Total allocated chapter questions sum
  const totalAllocatedChapters = useMemo(() => {
    return Object.values(chapterCounts).reduce((sum, val) => sum + (Number(val) || 0), 0);
  }, [chapterCounts]);

  // Difficulty Distribution array
  const diffDistArray = useMemo<DifficultyDistribution[]>(() => {
    return [
      { difficulty: 'easy', percentage: difficultyPercentages.easy },
      { difficulty: 'medium', percentage: difficultyPercentages.medium },
      { difficulty: 'hard', percentage: difficultyPercentages.hard },
      { difficulty: 'very_hard', percentage: difficultyPercentages.very_hard },
    ];
  }, [difficultyPercentages]);

  const totalDiffPercentage = useMemo(() => {
    return difficultyPercentages.easy + difficultyPercentages.medium + difficultyPercentages.hard + difficultyPercentages.very_hard;
  }, [difficultyPercentages]);

  // Matrix Validation
  const validation = useMemo<MatrixValidationResult>(() => {
    return ExamBuilderService.validateMatrix(
      selectedSubjectId,
      totalQuestions,
      chapterDistArray,
      diffDistArray,
      allQuestions,
      chapters,
      strategy
    );
  }, [selectedSubjectId, totalQuestions, chapterDistArray, diffDistArray, allQuestions, chapters, strategy]);

  // Utilities for Chapter distribution
  const handleDistributeEvenly = () => {
    if (currentSubjectChapters.length === 0) return;
    const perChapter = Math.floor(totalQuestions / currentSubjectChapters.length);
    let remainder = totalQuestions % currentSubjectChapters.length;
    const next: Record<string, number> = {};
    currentSubjectChapters.forEach((ch, idx) => {
      next[ch.id] = perChapter + (idx < remainder ? 1 : 0);
    });
    setChapterCounts(next);
    toast.success('Đã chia đều câu hỏi cho các chương');
  };

  const handleDistributeByBankRatio = () => {
    if (currentSubjectChapters.length === 0 || subjectPool.length === 0) return;
    const next: Record<string, number> = {};
    let allocated = 0;

    currentSubjectChapters.forEach((ch, idx) => {
      if (idx === currentSubjectChapters.length - 1) {
        next[ch.id] = Math.max(0, totalQuestions - allocated);
      } else {
        const inBank = subjectPool.filter(q => q.chapterId === ch.id).length;
        const ratio = inBank / subjectPool.length;
        const count = Math.round(ratio * totalQuestions);
        next[ch.id] = count;
        allocated += count;
      }
    });

    setChapterCounts(next);
    toast.success('Đã phân bổ theo tỷ lệ câu trong ngân hàng');
  };

  const updateChapterCount = (chId: string, delta: number) => {
    setChapterCounts(prev => {
      const current = prev[chId] || 0;
      const nextVal = Math.max(0, Math.min(totalQuestions, current + delta));
      return { ...prev, [chId]: nextVal };
    });
  };

  const applyDifficultyPreset = (easy: number, med: number, hard: number, vhard: number) => {
    setDifficultyPercentages({ easy, medium: med, hard, very_hard: vhard });
    toast.success('Đã áp dụng mẫu tỷ lệ độ khó');
  };

  // Generate Exam Action
  const handleGenerate = () => {
    if (!validation.isValid && !validation.canAutoFill) {
      toast.error('Ma trận chưa hợp lệ. Vui lòng kiểm tra các cảnh báo.');
      return;
    }

    setIsGenerating(true);
    try {
      const seed = Math.random().toString(36).substring(2, 9).toUpperCase();
      const examName = name.trim() || `Đề Ma Trận - ${subjects.find(s => s.id === selectedSubjectId)?.name || 'Môn học'} - ${new Date().toLocaleDateString('vi-VN')}`;

      const { exam, questions } = ExamBuilderService.generateExamFromMatrix(
        {
          name: examName,
          subjectId: selectedSubjectId,
          totalQuestions,
          timeLimit,
          chapterDistribution: chapterDistArray,
          difficultyDistribution: diffDistArray,
          strategy,
          shuffleQuestions,
          shuffleAnswers,
          generationSeed: seed,
        },
        allQuestions,
        chapters
      );

      setGeneratedExam(exam);
      setGeneratedQuestions(questions);
      setActiveSeed(seed);
      toast.success(`🎉 Đã sinh đề thi thành công với ${questions.length} câu hỏi!`);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi sinh đề thi');
    } finally {
      setIsGenerating(false);
    }
  };

  // Reroll single question in preview
  const handleRerollQuestion = (questionId: string) => {
    const currentQ = generatedQuestions.find(q => q.id === questionId);
    if (!currentQ) return;

    const replacement = ExamBuilderService.rerollQuestion({
      currentQuestionId: questionId,
      examQuestionIds: generatedQuestions.map(q => q.id),
      subjectId: selectedSubjectId,
      chapterId: currentQ.chapterId,
      difficulty: currentQ.difficulty,
      allQuestions,
      strategy,
    });

    if (!replacement) {
      toast.error('Không còn câu hỏi thay thế cùng chương và độ khó trong ngân hàng.');
      return;
    }

    const nextQuestions = generatedQuestions.map(q => q.id === questionId ? replacement : q);
    setGeneratedQuestions(nextQuestions);
    if (generatedExam) {
      setGeneratedExam({
        ...generatedExam,
        questionIds: nextQuestions.map(q => q.id),
        snapshotQuestions: nextQuestions,
      });
    }
    toast.success('Đã đổi câu hỏi khác');
  };

  // Save Exam Action
  const handleSaveExam = async (startImmediately = false) => {
    if (!generatedExam) return;
    setSaving(true);
    try {
      const finalExam = {
        ...generatedExam,
        name: name.trim() || generatedExam.name,
        questionIds: generatedQuestions.map(q => q.id),
        questionCount: generatedQuestions.length,
        snapshotQuestions: generatedQuestions,
      };

      const saved = await createExam(finalExam);
      toast.success('Đã lưu đề thi vào kho thành công');

      if (startImmediately) {
        await startExamById(saved.id, { mode: 'exam' });
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

  // Save Blueprint Action
  const handleSaveBlueprint = async () => {
    if (!blueprintName.trim()) {
      toast.error('Vui lòng nhập tên Blueprint');
      return;
    }

    try {
      await saveBlueprint({
        name: blueprintName.trim(),
        subjectId: selectedSubjectId,
        totalQuestions,
        timeLimit,
        chapterDistribution: chapterDistArray,
        difficultyDistribution: diffDistArray,
        strategy,
      });
      setShowSaveBlueprintModal(false);
      setBlueprintName('');
      toast.success('Đã lưu mẫu Blueprint thành công');
    } catch {
      toast.error('Lỗi khi lưu Blueprint');
    }
  };

  // Apply Blueprint
  const handleApplyBlueprint = (bp: ExamBlueprint) => {
    setSelectedSubjectId(bp.subjectId);
    setTotalQuestions(bp.totalQuestions);
    if (bp.timeLimit) setTimeLimit(bp.timeLimit);
    if (bp.strategy) setStrategy({ ...strategy, ...bp.strategy });

    const nextCounts: Record<string, number> = {};
    bp.chapterDistribution.forEach(cd => {
      nextCounts[cd.chapterId] = cd.count;
    });
    setChapterCounts(nextCounts);

    const nextDiff: any = { easy: 0, medium: 0, hard: 0, very_hard: 0 };
    bp.difficultyDistribution.forEach(dd => {
      nextDiff[dd.difficulty] = dd.percentage;
    });
    setDifficultyPercentages(nextDiff);

    setShowBlueprintModal(false);
    toast.success(`Đã áp dụng mẫu: "${bp.name}"`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-12 animate-fade-in">
      
      {/* Top Horizontal Bar: Title & Blueprints */}
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
              <Shuffle className="text-[hsl(var(--primary))] w-6 h-6" />
              <span>Tạo Đề Thi Tự Động Theo Ma Trận</span>
            </h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              Bảng ma trận tinh gọn: Tự động phân bổ chương, tỷ lệ độ khó và sinh đề chuẩn xác trong 1 màn hình.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Bookmark size={14} />}
            onClick={() => setShowBlueprintModal(true)}
            className="rounded-xl text-xs h-8"
          >
            Mẫu Blueprint ({blueprints.length})
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<BookmarkPlus size={14} />}
            onClick={() => setShowSaveBlueprintModal(true)}
            className="rounded-xl text-xs h-8"
          >
            Lưu làm mẫu
          </Button>
        </div>
      </div>

      {/* TOP COMPACT CONFIG RIBBON */}
      <Card className="rounded-3xl border border-[hsl(var(--border))] shadow-xs bg-[hsl(var(--card))]">
        <CardContent className="p-3.5 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            
            {/* Tên đề thi (4 cols) */}
            <div className="lg:col-span-4">
              <label className="text-[11px] font-bold text-[hsl(var(--foreground))] block mb-1">
                Tên đề thi
              </label>
              <input
                type="text"
                placeholder="VD: Đề Thi Thử Tốt Nghiệp THPT - Ma trận chuẩn"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-xs font-semibold text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
              />
            </div>

            {/* Môn học (3 cols) */}
            <div className="lg:col-span-3">
              <label className="text-[11px] font-bold text-[hsl(var(--foreground))] block mb-1">
                Môn học <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                className="w-full py-1.5 px-2.5 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-xs font-semibold text-[hsl(var(--foreground))] focus:outline-none"
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Tổng số câu (3 cols) */}
            <div className="lg:col-span-3">
              <label className="text-[11px] font-bold text-[hsl(var(--foreground))] block mb-1 flex items-center justify-between">
                <span>Số câu hỏi:</span>
                <strong className="text-[hsl(var(--primary))] font-mono">{totalQuestions} câu</strong>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={totalQuestions}
                  onChange={e => setTotalQuestions(parseInt(e.target.value, 10))}
                  className="flex-1 accent-[hsl(var(--primary))]"
                />
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={totalQuestions}
                  onChange={e => setTotalQuestions(parseInt(e.target.value, 10) || 5)}
                  className="w-14 px-1.5 py-0.5 text-center rounded-lg bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-xs font-bold font-mono text-[hsl(var(--foreground))]"
                />
              </div>
            </div>

            {/* Thời gian & Trộn câu (2 cols) */}
            <div className="lg:col-span-2 flex flex-col justify-center">
              <div className="flex items-center justify-between gap-1 mb-1">
                <label className="text-[11px] font-bold text-[hsl(var(--foreground))]">Thời gian:</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="300"
                    value={timeLimit}
                    onChange={e => setTimeLimit(parseInt(e.target.value, 10) || 0)}
                    className="w-12 px-1 py-0.5 text-center rounded-lg bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-xs font-bold font-mono text-[hsl(var(--foreground))]"
                  />
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">phút</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-0.5 text-[10.5px]">
                <label className="flex items-center gap-1 cursor-pointer font-medium text-[hsl(var(--foreground))]">
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={e => setShuffleQuestions(e.target.checked)}
                    className="rounded text-[hsl(var(--primary))] focus:ring-0 scale-90"
                  />
                  <span>Trộn câu</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer font-medium text-[hsl(var(--foreground))]">
                  <input
                    type="checkbox"
                    checked={shuffleAnswers}
                    onChange={e => setShuffleAnswers(e.target.checked)}
                    className="rounded text-[hsl(var(--primary))] focus:ring-0 scale-90"
                  />
                  <span>Trộn đáp án</span>
                </label>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* MAIN 2-COLUMN BALANCED MATRIX WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: Combined Matrix & Difficulty Studio (7 / 12) */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* 1. Chapter Distribution Table Card */}
          <Card className="rounded-3xl border border-[hsl(var(--border))] shadow-xs">
            <CardContent className="p-4 space-y-3">
              
              {/* Card Header with Quick Actions */}
              <div className="flex items-center justify-between pb-2 border-b border-[hsl(var(--border))]">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] flex items-center justify-center font-bold text-xs">
                    1
                  </span>
                  <h2 className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">
                    Phân Bổ Theo Chương
                  </h2>
                  <span className={`text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-full ${totalAllocatedChapters === totalQuestions ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'}`}>
                    {totalAllocatedChapters}/{totalQuestions} câu
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={handleDistributeEvenly}
                    className="text-[11px] font-bold text-[hsl(var(--primary))] hover:underline cursor-pointer"
                  >
                    Chia đều
                  </button>
                  <span className="text-[hsl(var(--border))]">•</span>
                  <button
                    onClick={handleDistributeByBankRatio}
                    className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] hover:underline cursor-pointer"
                  >
                    Theo tỷ lệ kho
                  </button>
                </div>
              </div>

              {/* Compact Scrollable Chapter List */}
              <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                {currentSubjectChapters.length === 0 ? (
                  <p className="text-xs text-[hsl(var(--muted-foreground))] py-6 text-center">
                    Môn học này chưa có chương học nào.
                  </p>
                ) : (
                  currentSubjectChapters.map((ch, idx) => {
                    const count = chapterCounts[ch.id] || 0;
                    const inBank = subjectPool.filter(q => q.chapterId === ch.id).length;
                    const percent = totalQuestions > 0 ? Math.round((count / totalQuestions) * 100) : 0;

                    return (
                      <div
                        key={ch.id}
                        className="p-2 px-3 rounded-2xl bg-[hsl(var(--muted)/0.2)] hover:bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] flex items-center justify-between gap-3 text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-5 h-5 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[10px] font-mono font-bold flex items-center justify-center text-[hsl(var(--muted-foreground))] shrink-0">
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <span className="font-semibold text-[hsl(var(--foreground))] block truncate" title={ch.name}>
                              {ch.name}
                            </span>
                            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                              Kho: <strong className="text-[hsl(var(--foreground))]">{inBank}</strong> câu • ({percent}% đề)
                            </span>
                          </div>
                        </div>

                        {/* Numeric Stepper */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateChapterCount(ch.id, -1)}
                            className="w-6 h-6 rounded-lg bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] cursor-pointer transition-colors"
                          >
                            <Minus size={11} />
                          </button>
                          <input
                            type="number"
                            min="0"
                            max={totalQuestions}
                            value={count}
                            onChange={e => {
                              const val = parseInt(e.target.value, 10) || 0;
                              setChapterCounts(prev => ({ ...prev, [ch.id]: val }));
                            }}
                            className="w-12 py-0.5 text-center rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] font-bold font-mono text-xs text-[hsl(var(--foreground))]"
                          />
                          <button
                            type="button"
                            onClick={() => updateChapterCount(ch.id, 1)}
                            className="w-6 h-6 rounded-lg bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] cursor-pointer transition-colors"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* 2. Difficulty Distribution Card */}
          <Card className="rounded-3xl border border-[hsl(var(--border))] shadow-xs">
            <CardContent className="p-4 space-y-3">
              
              {/* Header with Quick Presets */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[hsl(var(--border))]">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] flex items-center justify-center font-bold text-xs">
                    2
                  </span>
                  <h2 className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">
                    Tỷ Lệ Độ Khó ({totalDiffPercentage}%)
                  </h2>
                </div>

                {/* Quick Difficulty Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Mẫu:</span>
                  <button
                    onClick={() => applyDifficultyPreset(30, 40, 20, 10)}
                    className="text-[10.5px] font-bold px-2 py-0.5 rounded-lg bg-[hsl(var(--muted)/0.5)] hover:bg-[hsl(var(--primary)/0.15)] hover:text-[hsl(var(--primary))] border border-[hsl(var(--border))] transition-colors cursor-pointer"
                  >
                    Chuẩn 3-4-2-1
                  </button>
                  <button
                    onClick={() => applyDifficultyPreset(40, 40, 20, 0)}
                    className="text-[10.5px] font-bold px-2 py-0.5 rounded-lg bg-[hsl(var(--muted)/0.5)] hover:bg-[hsl(var(--primary)/0.15)] hover:text-[hsl(var(--primary))] border border-[hsl(var(--border))] transition-colors cursor-pointer"
                  >
                    Cơ bản 4-4-2-0
                  </button>
                  <button
                    onClick={() => applyDifficultyPreset(20, 30, 30, 20)}
                    className="text-[10.5px] font-bold px-2 py-0.5 rounded-lg bg-[hsl(var(--muted)/0.5)] hover:bg-[hsl(var(--primary)/0.15)] hover:text-[hsl(var(--primary))] border border-[hsl(var(--border))] transition-colors cursor-pointer"
                  >
                    Nâng cao 2-3-3-2
                  </button>
                </div>
              </div>

              {/* 4 Compact Sliders in a 2x2 Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Dễ */}
                <div className="p-2.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Dễ (Nhận biết)</span>
                    <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {difficultyPercentages.easy}% (~{Math.round((difficultyPercentages.easy / 100) * totalQuestions)}c)
                    </span>
                  </div>
                  <input
                    type="range" min="0" max="100" step="5"
                    value={difficultyPercentages.easy}
                    onChange={e => setDifficultyPercentages(prev => ({ ...prev, easy: parseInt(e.target.value, 10) }))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Vừa */}
                <div className="p-2.5 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-600 dark:text-blue-400">Vừa (Thông hiểu)</span>
                    <span className="font-bold font-mono text-blue-600 dark:text-blue-400">
                      {difficultyPercentages.medium}% (~{Math.round((difficultyPercentages.medium / 100) * totalQuestions)}c)
                    </span>
                  </div>
                  <input
                    type="range" min="0" max="100" step="5"
                    value={difficultyPercentages.medium}
                    onChange={e => setDifficultyPercentages(prev => ({ ...prev, medium: parseInt(e.target.value, 10) }))}
                    className="w-full accent-blue-500"
                  />
                </div>

                {/* Khó */}
                <div className="p-2.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-600 dark:text-amber-400">Khó (Vận dụng)</span>
                    <span className="font-bold font-mono text-amber-600 dark:text-amber-400">
                      {difficultyPercentages.hard}% (~{Math.round((difficultyPercentages.hard / 100) * totalQuestions)}c)
                    </span>
                  </div>
                  <input
                    type="range" min="0" max="100" step="5"
                    value={difficultyPercentages.hard}
                    onChange={e => setDifficultyPercentages(prev => ({ ...prev, hard: parseInt(e.target.value, 10) }))}
                    className="w-full accent-amber-500"
                  />
                </div>

                {/* Rất khó */}
                <div className="p-2.5 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-rose-600 dark:text-rose-400">Rất khó (VDC)</span>
                    <span className="font-bold font-mono text-rose-600 dark:text-rose-400">
                      {difficultyPercentages.very_hard}% (~{Math.round((difficultyPercentages.very_hard / 100) * totalQuestions)}c)
                    </span>
                  </div>
                  <input
                    type="range" min="0" max="100" step="5"
                    value={difficultyPercentages.very_hard}
                    onChange={e => setDifficultyPercentages(prev => ({ ...prev, very_hard: parseInt(e.target.value, 10) }))}
                    className="w-full accent-rose-500"
                  />
                </div>
              </div>

            </CardContent>
          </Card>

        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Validation HUD & Live Preview (5 / 12)       */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Validation Status & Generate CTA Card */}
          <Card className="rounded-3xl border border-[hsl(var(--border))] shadow-xs bg-[hsl(var(--card))]">
            <CardContent className="p-4 space-y-3">
              
              <div className="flex items-center justify-between pb-2 border-b border-[hsl(var(--border))]">
                <h2 className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))] uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[hsl(var(--primary))]" />
                  <span>Kiểm Tra Ma Trận</span>
                </h2>
                {validation.isValid ? (
                  <span className="text-[10.5px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Khả thi 100%
                  </span>
                ) : validation.canAutoFill ? (
                  <span className="text-[10.5px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    Có thể tự động bù
                  </span>
                ) : (
                  <span className="text-[10.5px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                    Chưa hợp lệ
                  </span>
                )}
              </div>

              {/* Status messages */}
              <div className="space-y-1.5 text-xs">
                {validation.isValid ? (
                  <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 size={15} className="shrink-0" />
                    <span>✓ Ngân hàng có đầy đủ câu hỏi đáp ứng chính xác mọi yêu cầu trong ma trận.</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {validation.errors.map((err, i) => (
                      <div key={i} className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 flex items-start gap-1.5 text-[11px]">
                        <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                        <span>{err}</span>
                      </div>
                    ))}
                    {validation.warnings.map((warn, i) => (
                      <div key={i} className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 flex items-start gap-1.5 text-[11px]">
                        <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                        <span>{warn}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Compact Strategy Toggles */}
              <div className="p-2.5 rounded-2xl bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] space-y-1.5 text-[11px]">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-semibold text-[hsl(var(--foreground))]">Ưu tiên câu làm sai nhiều lần</span>
                  <input
                    type="checkbox"
                    checked={strategy.prioritizeWrong}
                    onChange={e => setStrategy(prev => ({ ...prev, prioritizeWrong: e.target.checked }))}
                    className="rounded text-[hsl(var(--primary))] w-3.5 h-3.5"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-semibold text-[hsl(var(--foreground))]">Ưu tiên câu hỏi mới (chưa làm)</span>
                  <input
                    type="checkbox"
                    checked={strategy.prioritizeNew}
                    onChange={e => setStrategy(prev => ({ ...prev, prioritizeNew: e.target.checked }))}
                    className="rounded text-[hsl(var(--primary))] w-3.5 h-3.5"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-semibold text-[hsl(var(--foreground))]">Loại trừ câu đã thành thạo</span>
                  <input
                    type="checkbox"
                    checked={strategy.excludeMastered}
                    onChange={e => setStrategy(prev => ({ ...prev, excludeMastered: e.target.checked }))}
                    className="rounded text-[hsl(var(--primary))] w-3.5 h-3.5"
                  />
                </label>
              </div>

              {/* Action Button to Generate */}
              <Button
                variant="gradient"
                size="lg"
                icon={<Sparkles size={16} />}
                loading={isGenerating}
                disabled={!validation.isValid && !validation.canAutoFill}
                onClick={handleGenerate}
                className="w-full rounded-2xl font-bold py-3 text-sm shadow-md"
              >
                ⚡ Sinh đề thi ngay ({totalQuestions} câu)
              </Button>
            </CardContent>
          </Card>

          {/* Live Preview Card */}
          {generatedExam && (
            <Card className="rounded-3xl border border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.02)] shadow-md animate-fade-in">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[hsl(var(--border))]">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))]">
                      Xem Trước Đề Sinh Tự Động
                    </h3>
                    <p className="text-[10.5px] text-[hsl(var(--muted-foreground))]">
                      Seed: <span className="font-mono font-bold text-[hsl(var(--primary))]">{activeSeed}</span> • {generatedQuestions.length} câu hỏi
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Save size={12} />}
                      loading={saving}
                      onClick={() => handleSaveExam(false)}
                      className="rounded-xl text-xs py-1 h-7 px-2.5"
                    >
                      Lưu đề
                    </Button>
                    <Button
                      variant="gradient"
                      size="sm"
                      icon={<Play size={12} className="fill-current" />}
                      loading={saving}
                      onClick={() => handleSaveExam(true)}
                      className="rounded-xl font-bold text-xs py-1 h-7 px-2.5"
                    >
                      Vào thi
                    </Button>
                  </div>
                </div>

                {/* Questions Preview List with Reroll */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {generatedQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="p-2.5 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] space-y-1 hover:border-[hsl(var(--primary)/0.4)] transition-all text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] flex items-center justify-center font-bold text-[9px]">
                            {idx + 1}
                          </span>
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                            {q.difficulty}
                          </span>
                        </div>

                        {/* Reroll single question */}
                        <button
                          onClick={() => handleRerollQuestion(q.id)}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-[hsl(var(--primary))] hover:underline px-1.5 py-0.5 rounded-md hover:bg-[hsl(var(--primary)/0.1)] transition-colors cursor-pointer"
                          title="Đổi câu khác cùng chương và độ khó"
                        >
                          <RefreshCw size={10} />
                          <span>Đổi câu</span>
                        </button>
                      </div>

                      <div className="text-[11px] text-[hsl(var(--foreground))] line-clamp-2 leading-relaxed">
                        <MathRenderer text={q.content} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </div>

      </div>

      {/* Blueprint Selector Modal */}
      <Modal
        open={showBlueprintModal}
        onClose={() => setShowBlueprintModal(false)}
        title="Chọn Mẫu Ma Trận Blueprint"
        size="md"
      >
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1 p-1">
          {blueprints.length === 0 ? (
            <div className="py-8 text-center text-[hsl(var(--muted-foreground))] space-y-1.5">
              <Bookmark className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs">Chưa có mẫu Blueprint nào được lưu.</p>
            </div>
          ) : (
            blueprints.map(bp => (
              <div
                key={bp.id}
                onClick={() => handleApplyBlueprint(bp)}
                className="p-3 rounded-2xl bg-[hsl(var(--muted)/0.3)] hover:bg-[hsl(var(--primary)/0.08)] border border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.4)] flex items-center justify-between transition-all cursor-pointer group"
              >
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))]">
                    {bp.name}
                  </h4>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                    {bp.totalQuestions} câu • {bp.timeLimit ? `${bp.timeLimit} phút` : 'Tự do'}
                  </p>
                </div>
                <div className="flex items-center text-xs font-bold text-[hsl(var(--primary))]">
                  <span>Áp dụng</span>
                  <ChevronRight size={14} className="ml-1" />
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Save Blueprint Modal */}
      <Modal
        open={showSaveBlueprintModal}
        onClose={() => setShowSaveBlueprintModal(false)}
        title="Lưu Ma Trận Hiện Tại Thành Blueprint"
        size="sm"
      >
        <div className="space-y-4 p-1">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Lưu cấu hình tỷ lệ chương và độ khó này làm mẫu để tái sử dụng nhanh chóng cho các lần tạo đề sau.
          </p>
          <div>
            <label className="text-xs font-semibold text-[hsl(var(--foreground))] block mb-1">
              Tên mẫu Blueprint
            </label>
            <input
              type="text"
              placeholder="VD: Đề Ôn Giữa Kỳ I - 40 câu"
              value={blueprintName}
              onChange={e => setBlueprintName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-xs font-semibold text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowSaveBlueprintModal(false)}>
              Hủy
            </Button>
            <Button variant="default" size="sm" onClick={handleSaveBlueprint}>
              Lưu Blueprint
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
