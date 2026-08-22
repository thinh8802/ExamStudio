// ============================================
// QUIZ SETUP PAGE - Trung Tâm Thiết Lập Lượt Học (ExamPrep Studio Pro v3.0)
// Giao diện dịu mắt, phân cấp rõ ràng, tích hợp 1-Click Presets & Chapter Mastery Bars
// ============================================
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Clock,
  RotateCcw,
  Sparkles,
  Settings2,
  Shuffle,
  Play,
  AlertCircle,
  Flame,
  Award,
  Sliders,
  Layers,
  Check,
  Zap,
  Target,
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  Brain
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSubjectStore } from '@/stores/subject-store';
import { useQuestionStore } from '@/stores/question-store';
import { useExamStore } from '@/stores/exam-store';
import { DIFFICULTY_LABELS } from '@/types';
import type { ExamMode, Difficulty, QuizConfig } from '@/types';
import { Button, EmptyState } from '@/components/ui';

// --- Custom Animated Switch Toggle ---
interface CustomSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const CustomSwitch: React.FC<CustomSwitchProps> = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={(e) => {
      e.stopPropagation();
      if (!disabled) onChange(!checked);
    }}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed ${
      checked ? 'bg-[hsl(var(--primary))] shadow-xs' : 'bg-[hsl(var(--muted))]'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

// --- Mode Card Data ---
interface ModeOption {
  id: ExamMode;
  title: string;
  badge: string;
  description: string;
  icon: React.ReactNode;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    id: 'practice',
    title: 'Luyện tập',
    badge: 'Hiện đáp án ngay',
    description: 'Xem lời giải chi tiết ngay sau mỗi câu hỏi. Không giới hạn thời gian.',
    icon: <BookOpen className="w-5 h-5 text-[hsl(var(--primary))]" />,
  },
  {
    id: 'exam',
    title: 'Thi thử',
    badge: 'Tính giờ & Ẩn đáp án',
    description: 'Mô phỏng phòng thi chuẩn với đồng hồ đếm ngược và chấm điểm tổng kết.',
    icon: <Clock className="w-5 h-5 text-amber-500" />,
  },
  {
    id: 'review',
    title: 'Ôn tập câu sai',
    badge: 'Tập trung câu yếu',
    description: 'Tự động lọc các câu bạn từng làm sai hoặc chưa đạt mức thành thạo.',
    icon: <RotateCcw className="w-5 h-5 text-rose-500" />,
  },
];

// --- Toggle Options Data ---
interface ToggleOption {
  id: keyof QuizConfig;
  label: string;
  description: string;
  icon: React.ReactNode;
  group: 'random' | 'personal';
}

const TOGGLE_OPTIONS: ToggleOption[] = [
  {
    id: 'shuffleQuestions',
    label: 'Trộn câu hỏi',
    description: 'Đổi thứ tự xuất hiện ngẫu nhiên giữa các câu trong đề',
    icon: <Shuffle className="w-4 h-4 text-sky-500" />,
    group: 'random',
  },
  {
    id: 'shuffleAnswers',
    label: 'Trộn đáp án',
    description: 'Hoán đổi vị trí các phương án lựa chọn (A, B, C, D)',
    icon: <Sliders className="w-4 h-4 text-indigo-500" />,
    group: 'random',
  },
  {
    id: 'prioritizeWrong',
    label: 'Ưu tiên câu làm sai nhiều',
    description: 'Tự động sắp xếp các câu hay trả lời sai lên làm trước',
    icon: <Flame className="w-4 h-4 text-rose-500" />,
    group: 'personal',
  },
  {
    id: 'prioritizeNew',
    label: 'Ưu tiên câu chưa làm',
    description: 'Đưa những câu hỏi mới chưa từng làm lên trước',
    icon: <Sparkles className="w-4 h-4 text-amber-500" />,
    group: 'personal',
  },
  {
    id: 'excludeMastered',
    label: 'Loại bỏ câu đã thành thạo',
    description: 'Bỏ qua các câu hỏi bạn đã làm đúng nhiều lần liên tiếp',
    icon: <Award className="w-4 h-4 text-emerald-500" />,
    group: 'personal',
  },
];

export const QuizSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { subjects, getChaptersBySubject } = useSubjectStore();
  const { questions } = useQuestionStore();
  const { startQuiz, hasUnfinishedAttempt, resumeUnfinishedAttempt } = useExamStore();

  const urlMode = searchParams.get('mode') as ExamMode | null;
  const urlFilter = searchParams.get('filter');
  const urlSubjectId = searchParams.get('subjectId');
  const urlChapterId = searchParams.get('chapterId');

  const initialMode: ExamMode = (urlMode === 'review' || urlFilter === 'needs_review')
    ? 'review'
    : (urlMode === 'exam' ? 'exam' : 'practice');

  const [config, setConfig] = useState<QuizConfig>(() => ({
    subjectId: urlSubjectId || (subjects.length > 0 ? subjects[0].id : ''),
    chapterIds: urlChapterId ? [urlChapterId] : [],
    mode: initialMode,
    questionCount: 20,
    timeLimit: initialMode === 'exam' ? 60 : 0,
    shuffleQuestions: true,
    shuffleAnswers: true,
    prioritizeWrong: initialMode === 'review',
    prioritizeNew: false,
    prioritizeWeak: false,
    excludeMastered: false,
    difficulty: '',
    randomSeed: '',
  }));

  const [starting, setStarting] = useState(false);
  const [chapterSearch, setChapterSearch] = useState('');

  // Sync with URL params when they change
  useEffect(() => {
    if (urlMode === 'review' || urlFilter === 'needs_review') {
      setConfig(prev => ({
        ...prev,
        mode: 'review',
        prioritizeWrong: true,
      }));
    } else if (urlMode === 'exam') {
      setConfig(prev => ({
        ...prev,
        mode: 'exam',
        timeLimit: 60,
      }));
    } else if (urlMode === 'practice') {
      setConfig(prev => ({
        ...prev,
        mode: 'practice',
        timeLimit: 0,
      }));
    }
  }, [urlMode, urlFilter]);

  useEffect(() => {
    if (!config.subjectId && subjects.length > 0) {
      const targetSubId = urlSubjectId && subjects.some(s => s.id === urlSubjectId)
        ? urlSubjectId
        : subjects[0].id;
      const chaps = getChaptersBySubject(targetSubId);
      const targetChaps = urlChapterId && chaps.some(c => c.id === urlChapterId)
        ? [urlChapterId]
        : [];
      setConfig(prev => ({
        ...prev,
        subjectId: targetSubId,
        chapterIds: targetChaps,
      }));
    }
  }, [subjects, config.subjectId, getChaptersBySubject, urlSubjectId, urlChapterId]);

  const availableChapters = useMemo(() => {
    return config.subjectId ? getChaptersBySubject(config.subjectId) : [];
  }, [config.subjectId, getChaptersBySubject]);

  const filteredChapters = useMemo(() => {
    if (!chapterSearch.trim()) return availableChapters;
    return availableChapters.filter(c => c.name.toLowerCase().includes(chapterSearch.toLowerCase().trim()));
  }, [availableChapters, chapterSearch]);

  const handleSubjectChange = (newSubId: string) => {
    setConfig(prev => ({
      ...prev,
      subjectId: newSubId,
      chapterIds: [],
      questionCount: 0,
    }));
    setChapterSearch('');
  };

  const computeAvailableCountForChapters = (chapterIds: string[], currentConfig = config) => {
    if (!currentConfig.subjectId || chapterIds.length === 0) return 0;
    let qs = questions.filter(q => q.subjectId === currentConfig.subjectId && chapterIds.includes(q.chapterId));
    if (currentConfig.mode === 'review' || currentConfig.mode === 'smart_wrong') {
      qs = qs.filter(q => (q.wrongCount ?? 0) > 0 && q.status !== 'mastered');
    }
    if (currentConfig.difficulty) {
      qs = qs.filter(q => q.difficulty === currentConfig.difficulty);
    }
    if (currentConfig.excludeMastered) {
      qs = qs.filter(q => q.status !== 'mastered');
    }
    return qs.length;
  };

  const availableCount = useMemo(() => {
    return computeAvailableCountForChapters(config.chapterIds, config);
  }, [questions, config.subjectId, config.chapterIds, config.mode, config.difficulty, config.excludeMastered]);

  // Subject Health Metrics
  const subjectHealth = useMemo(() => {
    if (!config.subjectId) return { total: 0, mastered: 0, wrong: 0, unseen: 0, masteredPercent: 0 };
    const subQs = questions.filter(q => q.subjectId === config.subjectId);
    const total = subQs.length;
    const mastered = subQs.filter(q => q.status === 'mastered').length;
    const wrong = subQs.filter(q => (q.wrongCount ?? 0) > 0 && q.status !== 'mastered').length;
    const unseen = subQs.filter(q => (q.attemptCount ?? 0) === 0).length;
    const masteredPercent = total > 0 ? Math.round((mastered / total) * 100) : 0;

    return { total, mastered, wrong, unseen, masteredPercent };
  }, [questions, config.subjectId]);

  useEffect(() => {
    if (config.chapterIds.length === 0) {
      if (config.questionCount !== 0) {
        setConfig(prev => ({ ...prev, questionCount: 0 }));
      }
    } else if (config.questionCount > availableCount || config.questionCount === 0) {
      setConfig(prev => ({
        ...prev,
        questionCount: availableCount,
      }));
    }
  }, [availableCount, config.chapterIds.length]);

  const toggleChapter = (chapterId: string) => {
    setConfig(prev => {
      const nextChapterIds = prev.chapterIds.includes(chapterId)
        ? prev.chapterIds.filter(id => id !== chapterId)
        : [...prev.chapterIds, chapterId];
      const maxCount = computeAvailableCountForChapters(nextChapterIds, prev);
      return {
        ...prev,
        chapterIds: nextChapterIds,
        questionCount: maxCount,
      };
    });
  };

  const selectAllChapters = () => {
    setConfig(prev => {
      const isAllSelected = prev.chapterIds.length === availableChapters.length;
      const nextChapterIds = isAllSelected ? [] : availableChapters.map(c => c.id);
      const maxCount = computeAvailableCountForChapters(nextChapterIds, prev);
      return {
        ...prev,
        chapterIds: nextChapterIds,
        questionCount: maxCount,
      };
    });
  };

  const clearChapters = () => {
    setConfig(prev => ({
      ...prev,
      chapterIds: [],
      questionCount: 0,
    }));
  };

  const handleModeChange = (mode: ExamMode) => {
    setConfig(prev => ({
      ...prev,
      mode,
      timeLimit: mode === 'exam' ? 60 : 0,
      prioritizeWrong: mode === 'review' ? true : prev.prioritizeWrong,
    }));
  };

  // 1-Click Quick Study Presets
  const applyPreset = (presetType: 'quick' | 'standard' | 'weak_spots' | 'unseen') => {
    const allChaps = availableChapters.map(c => c.id);
    if (allChaps.length === 0) return;

    if (presetType === 'quick') {
      const qCount = Math.min(10, computeAvailableCountForChapters(allChaps, { ...config, mode: 'practice' }));
      setConfig(prev => ({
        ...prev,
        chapterIds: prev.chapterIds.length > 0 ? prev.chapterIds : allChaps,
        mode: 'practice',
        questionCount: qCount || 10,
        timeLimit: 0,
        shuffleQuestions: true,
        shuffleAnswers: true,
        prioritizeWrong: false,
        prioritizeNew: false,
        excludeMastered: false,
      }));
      toast.success('⚡ Đã nạp cấu hình: Khởi động nhanh 10 câu (Luyện tập)');
    } else if (presetType === 'standard') {
      const qCount = Math.min(40, computeAvailableCountForChapters(allChaps, { ...config, mode: 'exam' }));
      setConfig(prev => ({
        ...prev,
        chapterIds: prev.chapterIds.length > 0 ? prev.chapterIds : allChaps,
        mode: 'exam',
        questionCount: qCount || 40,
        timeLimit: 50,
        shuffleQuestions: true,
        shuffleAnswers: true,
        prioritizeWrong: false,
        prioritizeNew: false,
        excludeMastered: false,
      }));
      toast.success('🎯 Đã nạp cấu hình: Mô phỏng thi chuẩn (40 câu / 50 phút)');
    } else if (presetType === 'weak_spots') {
      const qCount = computeAvailableCountForChapters(allChaps, { ...config, mode: 'review', excludeMastered: true });
      setConfig(prev => ({
        ...prev,
        chapterIds: prev.chapterIds.length > 0 ? prev.chapterIds : allChaps,
        mode: 'review',
        questionCount: qCount || 20,
        timeLimit: 0,
        shuffleQuestions: true,
        shuffleAnswers: true,
        prioritizeWrong: true,
        prioritizeNew: false,
        excludeMastered: true,
      }));
      toast.success('🩺 Đã nạp cấu hình: Trị câu làm sai & Lỗ hổng kiến thức');
    } else if (presetType === 'unseen') {
      const qCount = Math.min(25, computeAvailableCountForChapters(allChaps, { ...config, mode: 'practice' }));
      setConfig(prev => ({
        ...prev,
        chapterIds: prev.chapterIds.length > 0 ? prev.chapterIds : allChaps,
        mode: 'practice',
        questionCount: qCount || 25,
        timeLimit: 0,
        shuffleQuestions: true,
        shuffleAnswers: true,
        prioritizeWrong: false,
        prioritizeNew: true,
        excludeMastered: false,
      }));
      toast.success('🌟 Đã nạp cấu hình: Khám phá câu hỏi mới chưa làm');
    }
  };

  const handleStart = async () => {
    if (!config.subjectId) {
      toast.error('Vui lòng chọn môn học');
      return;
    }
    if (config.chapterIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một chương');
      return;
    }
    if (availableCount === 0) {
      toast.error('Không có câu hỏi nào khả dụng');
      return;
    }

    setStarting(true);
    try {
      await startQuiz(config);
      navigate('/quiz/session');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi khởi tạo bài thi');
    } finally {
      setStarting(false);
    }
  };

  const handleResumeAttempt = async () => {
    await resumeUnfinishedAttempt();
    navigate('/quiz/session');
  };

  if (subjects.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <EmptyState
          icon={<BookOpen size={64} className="text-[hsl(var(--muted-foreground))]" />}
          title="Chưa có môn học"
          description="Hãy tạo môn học và nhập danh sách câu hỏi trước khi bắt đầu làm bài thi."
          action={<Button onClick={() => navigate('/subjects')}>Quản lý môn học</Button>}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-12 animate-fade-in">
      
      {/* Top Banner: Unfinished Attempt Alert */}
      {hasUnfinishedAttempt && (
        <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-500 shrink-0">
              <AlertCircle size={18} />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold">Bạn có một bài thi chưa hoàn thành</p>
              <p className="text-[11px] opacity-90">Bạn có muốn tiếp tục làm bài thi đang dở dang này không?</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => useExamStore.getState().abandonQuiz()}
              className="border-amber-500/30 hover:bg-amber-500/10 text-xs py-1 h-8"
            >
              Hủy bài thi
            </Button>
            <Button
              size="sm"
              onClick={handleResumeAttempt}
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs py-1 h-8"
            >
              Tiếp tục làm
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 1. TOP CONTROL BAR: Subject Selector + Mode Selector        */}
      {/* ========================================================== */}
      <section className="p-4 sm:p-5 rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-4">
        {/* Subject Select Bar + Subject Health Overview */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] flex items-center justify-center shrink-0 shadow-2xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[hsl(var(--primary))] uppercase tracking-wider block">
                Trung Tâm Luyện Thi
              </span>
              <span className="text-sm sm:text-base font-extrabold text-[hsl(var(--foreground))] block">
                Thiết Lập Bài Thi & Luyện Tập
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Subject Health Pill Strip */}
            {subjectHealth.total > 0 && (
              <div className="flex items-center gap-2 text-[11px] font-semibold px-3 py-1.5 rounded-2xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] overflow-x-auto custom-scrollbar">
                <span className="text-[hsl(var(--muted-foreground))]">Ngân hàng: <strong>{subjectHealth.total} câu</strong></span>
                <span>•</span>
                <span className="text-emerald-500">⭐ Vững: <strong>{subjectHealth.mastered}</strong> ({subjectHealth.masteredPercent}%)</span>
                <span>•</span>
                <span className="text-rose-500">❌ Sai: <strong>{subjectHealth.wrong}</strong></span>
              </div>
            )}

            <div className="w-full sm:w-64 shrink-0">
              <select
                value={config.subjectId}
                onChange={e => handleSubjectChange(e.target.value)}
                className="w-full px-3.5 py-2 bg-[hsl(var(--muted)/0.5)] hover:bg-[hsl(var(--muted)/0.8)] border border-[hsl(var(--border))] rounded-2xl text-[hsl(var(--foreground))] font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.3)] transition-all cursor-pointer shadow-2xs"
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id} className="bg-[hsl(var(--card))] text-[hsl(var(--foreground))] font-medium">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 3 Mode Tabs (Responsive Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {MODE_OPTIONS.map(opt => {
            const isSelected = config.mode === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => handleModeChange(opt.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center gap-3 ${
                  isSelected
                    ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] shadow-xs ring-1 ring-[hsl(var(--primary)/0.3)]'
                    : 'border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] hover:bg-[hsl(var(--muted)/0.45)]'
                }`}
              >
                <div className="p-2 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shrink-0 shadow-2xs">
                  {opt.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-xs sm:text-sm font-bold ${isSelected ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'}`}>
                      {opt.title}
                    </span>
                    <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                      isSelected
                        ? 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.3)]'
                        : 'bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]'
                    }`}>
                      {opt.badge}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-[hsl(var(--muted-foreground))] leading-tight line-clamp-1 mt-0.5">
                    {opt.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 1-Click Quick Study Presets Strip */}
        <div className="pt-2 border-t border-[hsl(var(--border))] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-bold text-[hsl(var(--muted-foreground))] flex items-center gap-1.5 shrink-0">
            <Zap size={14} className="text-amber-500" />
            <span>Cấu hình nhanh 1-chạm:</span>
          </span>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => applyPreset('quick')}
              className="px-3 py-1.5 rounded-xl bg-[hsl(var(--primary)/0.08)] hover:bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.25)] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 justify-center shadow-2xs"
            >
              <Sparkles size={12} />
              <span>Khởi động 10 câu</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('standard')}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/25 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 justify-center shadow-2xs"
            >
              <Clock size={12} />
              <span>Thi chuẩn (40c / 50p)</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('weak_spots')}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/25 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 justify-center shadow-2xs"
            >
              <Flame size={12} />
              <span>Trị câu sai ({subjectHealth.wrong})</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('unseen')}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/25 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 justify-center shadow-2xs"
            >
              <Target size={12} />
              <span>Khám phá mới ({subjectHealth.unseen})</span>
            </button>
          </div>
        </div>

        {/* Smart Recommendation Banner if wrong questions exist */}
        {subjectHealth.wrong > 0 && config.mode !== 'review' && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-rose-500/10 via-pink-500/5 to-amber-500/10 border border-rose-500/25 flex items-center justify-between gap-3 text-xs animate-fade-in shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-rose-500/20 text-rose-500 shrink-0">
                <Flame size={14} />
              </span>
              <span className="text-[hsl(var(--foreground))]">
                Hệ thống phát hiện bạn có <strong className="text-rose-500 font-bold">{subjectHealth.wrong} câu hỏi từng làm sai</strong> trong môn này chưa được ôn phục thù.
              </span>
            </div>
            <button
              type="button"
              onClick={() => applyPreset('weak_spots')}
              className="px-3 py-1 rounded-xl bg-rose-500 text-white font-bold text-xs hover:bg-rose-600 transition-all cursor-pointer shrink-0 shadow-xs flex items-center gap-1"
            >
              <span>Ôn ngay</span>
              <ArrowRight size={12} />
            </button>
          </div>
        )}
      </section>

      {/* ========================================================== */}
      {/* 2. MAIN 3-COLUMN WORKSPACE                                  */}
      {/* ========================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* COLUMN 1: Chapter Scope & Mastery Progress (5 / 12 cols) */}
        <div className="lg:col-span-5 p-4 sm:p-5 rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[hsl(var(--border))]">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] flex items-center justify-center text-[11px] font-bold">
                1
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))]">
                Danh sách chương học ({config.chapterIds.length}/{availableChapters.length})
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAllChapters}
                className="text-xs text-[hsl(var(--primary))] hover:underline font-semibold cursor-pointer px-1.5 py-0.5 rounded-md hover:bg-[hsl(var(--primary)/0.08)] transition-colors"
              >
                Chọn tất cả
              </button>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">•</span>
              <button
                type="button"
                onClick={clearChapters}
                className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] font-semibold cursor-pointer px-1.5 py-0.5 rounded-md hover:bg-[hsl(var(--muted))] transition-colors"
              >
                Bỏ chọn
              </button>
            </div>
          </div>

          {/* Quick Search Chapter Bar */}
          {availableChapters.length > 4 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                placeholder="Tìm nhanh tên chương học..."
                value={chapterSearch}
                onChange={e => setChapterSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.3)]"
              />
            </div>
          )}

          {/* Chapter List with Mastery Bars (Smooth internal scroll, fits ~380px) */}
          <div className="flex-1">
            {config.subjectId && filteredChapters.length > 0 ? (
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredChapters.map(chapter => {
                  const chapQuestions = questions.filter(q => q.chapterId === chapter.id);
                  const count = chapQuestions.length;
                  const masteredCount = chapQuestions.filter(q => q.status === 'mastered').length;
                  const wrongCount = chapQuestions.filter(q => (q.wrongCount ?? 0) > 0 && q.status !== 'mastered').length;
                  const masteryPercent = count > 0 ? Math.round((masteredCount / count) * 100) : 0;
                  const isChecked = config.chapterIds.includes(chapter.id);

                  return (
                    <div
                      key={chapter.id}
                      onClick={() => toggleChapter(chapter.id)}
                      className={`p-3 rounded-2xl border transition-all duration-150 cursor-pointer flex flex-col justify-between gap-2 ${
                        isChecked
                          ? 'border-[hsl(var(--primary)/0.4)] bg-[hsl(var(--primary)/0.05)] text-[hsl(var(--foreground))] shadow-2xs'
                          : 'border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.3)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-[hsl(var(--primary))] text-white'
                              : 'border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-transparent'
                          }`}>
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                          <span className={`text-xs font-bold truncate ${
                            isChecked ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--foreground)/0.8)]'
                          }`}>
                            {chapter.name}
                          </span>
                        </div>

                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] shrink-0">
                          {count} câu
                        </span>
                      </div>

                      {/* Mini Mastery Progress Bar */}
                      <div className="space-y-1 pt-0.5">
                        <div className="w-full h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden flex">
                          <div
                            style={{ width: `${masteryPercent}%` }}
                            className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))]">
                          <span className="flex items-center gap-1">
                            <span className="text-emerald-500 font-bold">⭐ {masteryPercent}%</span> đã vững ({masteredCount}/{count})
                          </span>
                          {wrongCount > 0 && (
                            <span className="text-rose-500 font-bold flex items-center gap-0.5">
                              <Flame size={11} /> {wrongCount} câu sai
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-[hsl(var(--muted-foreground))] space-y-2">
                <BookOpen className="w-7 h-7 mx-auto opacity-30" />
                <p className="text-xs">
                  {chapterSearch ? 'Không tìm thấy chương học nào khớp với từ khóa.' : 'Môn học này chưa có chương học nào.'}
                </p>
              </div>
            )}

            {config.mode === 'review' && availableCount === 0 && (
              <div className="mt-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>🎉 Bạn không có câu nào cần ôn lại.</span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-[hsl(var(--muted-foreground))] pt-1 border-t border-[hsl(var(--border))]">
            Đang chọn <strong>{config.chapterIds.length}</strong> / <strong>{availableChapters.length}</strong> chương ({availableCount} câu khả dụng)
          </p>
        </div>

        {/* COLUMN 2: Quiz Scale & Difficulty (4 / 12 cols) */}
        <div className="lg:col-span-4 p-4 sm:p-5 rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-2 pb-2.5 border-b border-[hsl(var(--border))]">
            <div className="w-5 h-5 rounded-full bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] flex items-center justify-center text-[11px] font-bold">
              2
            </div>
            <h2 className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))]">
              Quy mô bài thi & Độ khó
            </h2>
          </div>

          <div className="space-y-4 flex-1">
            {/* Question Count Slider & Badges */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">
                  Số lượng câu hỏi
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={availableCount > 0 ? 1 : 0}
                    max={Math.max(1, availableCount)}
                    value={config.questionCount || ''}
                    onChange={e => {
                      const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                      setConfig(prev => ({
                        ...prev,
                        questionCount: isNaN(val) ? 0 : Math.min(Math.max(0, val), availableCount),
                      }));
                    }}
                    onBlur={() => {
                      if (!config.questionCount || config.questionCount < 1) {
                        setConfig(prev => ({ ...prev, questionCount: Math.min(Math.max(1, availableCount > 0 ? 1 : 0), availableCount) }));
                      }
                    }}
                    disabled={availableCount === 0}
                    placeholder="Tự nhập"
                    aria-label="Số lượng câu hỏi tự nhập"
                    className="w-16 px-2 py-0.5 text-center text-xs font-bold font-mono rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.3)] shadow-2xs"
                  />
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)]">
                    / {availableCount} câu
                  </span>
                </div>
              </div>

              <input
                type="range"
                min={availableCount > 0 ? 1 : 0}
                max={Math.max(1, availableCount)}
                value={config.questionCount}
                onChange={e => setConfig(prev => ({ ...prev, questionCount: Number(e.target.value) }))}
                disabled={availableCount === 0}
                className="w-full h-2 bg-[hsl(var(--muted))] rounded-lg appearance-none cursor-pointer accent-[hsl(var(--primary))] disabled:opacity-40"
              />

              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {[30, 60, 90].map(preset => {
                  const isAvailable = availableCount >= preset;
                  const isSelected = config.questionCount === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, questionCount: Math.min(preset, availableCount) }))}
                      disabled={availableCount === 0}
                      className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[hsl(var(--primary))] text-white shadow-xs'
                          : 'bg-[hsl(var(--muted)/0.5)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'
                      } ${!isAvailable ? 'opacity-50' : ''}`}
                    >
                      {preset} câu
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, questionCount: availableCount }))}
                  disabled={availableCount === 0}
                  className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                    config.questionCount === availableCount && availableCount > 0
                      ? 'bg-[hsl(var(--primary))] text-white shadow-xs'
                      : 'bg-[hsl(var(--muted)/0.5)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'
                  }`}
                >
                  Tất cả ({availableCount})
                </button>
              </div>
            </div>

            {/* Difficulty Filter Dropdown */}
            <div className="space-y-1.5 pt-2 border-t border-[hsl(var(--border))]">
              <label className="text-xs font-bold text-[hsl(var(--foreground))] uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                <span>Độ khó câu hỏi</span>
              </label>
              <select
                value={config.difficulty}
                onChange={e => setConfig(prev => ({ ...prev, difficulty: e.target.value as Difficulty | '' }))}
                className="w-full px-3 py-2 bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] rounded-xl text-[hsl(var(--foreground))] font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.3)] transition-all cursor-pointer"
              >
                <option value="">Tất cả các mức độ</option>
                <option value="easy">Dễ (Nhận biết)</option>
                <option value="medium">Vừa (Thông hiểu)</option>
                <option value="hard">Khó (Vận dụng cao)</option>
              </select>
            </div>

            {/* Exam Mode Time Limit & Pacing Presets */}
            {config.mode === 'exam' && (
              <div className="space-y-2 pt-2 border-t border-[hsl(var(--border))] animate-fade-in">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Thời gian làm bài (Phút)</span>
                  </label>
                  <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">
                    ~{Math.round((config.timeLimit * 60) / Math.max(1, config.questionCount))}s / câu
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[15, 45, 60, 90].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, timeLimit: m }))}
                      className={`py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${
                        config.timeLimit === m
                          ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                          : 'bg-[hsl(var(--muted)/0.4)] border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'
                      }`}
                    >
                      {m}p
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  min={1}
                  max={300}
                  value={config.timeLimit}
                  onChange={e => setConfig(prev => ({ ...prev, timeLimit: Math.max(1, Number(e.target.value)) }))}
                  className="w-full px-3 py-1.5 bg-[hsl(var(--muted)/0.4)] border border-amber-500/30 rounded-xl text-[hsl(var(--foreground))] font-bold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
            )}
          </div>

          <div className="p-2.5 rounded-2xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-[11px] text-[hsl(var(--muted-foreground))] flex items-center justify-between">
            <span>Ước tính thời gian:</span>
            <strong className="text-[hsl(var(--foreground))]">
              {config.mode === 'exam' ? `${config.timeLimit} phút` : `~${Math.round(config.questionCount * 1.5)} phút`}
            </strong>
          </div>
        </div>

        {/* COLUMN 3: Optimization Switches & Start Action (3 / 12 cols) */}
        <div className="lg:col-span-3 p-4 sm:p-5 rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-2 pb-2.5 border-b border-[hsl(var(--border))]">
            <div className="w-5 h-5 rounded-full bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] flex items-center justify-center text-[11px] font-bold">
              3
            </div>
            <h2 className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))]">
              Tối ưu hóa bài luyện
            </h2>
          </div>

          {/* 5 Toggle Switches in Exact Index Order */}
          <div className="space-y-1.5 flex-1">
            {TOGGLE_OPTIONS.map(opt => {
              const checked = Boolean(config[opt.id]);
              return (
                <div
                  key={opt.id}
                  className="p-2 rounded-xl bg-[hsl(var(--muted)/0.2)] hover:bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] flex items-center justify-between gap-2 transition-colors"
                >
                  <div
                    onClick={() => setConfig(prev => ({ ...prev, [opt.id]: !prev[opt.id] }))}
                    className="flex items-center gap-2 min-w-0 cursor-pointer flex-1"
                  >
                    <div className="p-1 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] shrink-0">
                      {opt.icon}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] sm:text-xs font-bold text-[hsl(var(--foreground))] block cursor-pointer truncate">
                        {opt.label}
                      </span>
                    </div>
                  </div>
                  <CustomSwitch
                    checked={checked}
                    onChange={val => setConfig(prev => ({ ...prev, [opt.id]: val }))}
                  />
                </div>
              );
            })}
          </div>

          {/* CTA Start Button */}
          <div className="pt-2 border-t border-[hsl(var(--border))]">
            <button
              onClick={handleStart}
              disabled={availableCount === 0 || starting}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-primary hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold shadow-md shadow-[hsl(var(--primary)/0.25)] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {starting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current text-white" />
                  <span>Bắt đầu làm bài ({Math.min(config.questionCount, availableCount)} câu)</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
