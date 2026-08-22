// ============================================
// QUESTION BANK PAGE
// ============================================
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card, Badge, Select, EmptyState, ConfirmDialog, Checkbox, Modal } from '@/components/ui';
import { MathRenderer } from '@/components/common/MathRenderer';
import { StreakFlameBadge, getStreakTier } from '@/components/quiz/StreakFlameBadge';
import { useQuestionStore } from '@/stores/question-store';
import { useSubjectStore } from '@/stores/subject-store';
import { DIFFICULTY_LABELS, QUESTION_TYPE_LABELS, STATUS_LABELS } from '@/types';
import type { Difficulty, QuestionType, QuestionStatus, Question } from '@/types';
import {
  PlusCircle, Search, Filter, Trash2, Copy,
  BookOpen, FileQuestion, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, AlertTriangle, Star, StarOff,
  RotateCcw, Download, Edit, MinusCircle, LayoutGrid, ListFilter,
  Eye, Sparkles, Layers, ArrowLeft, ArrowRight, Folder, FolderOpen,
  FolderPlus, FolderCheck, ArrowUpRight, BarChart2, TrendingUp, Zap, Target, Activity, Award
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from 'recharts';
import toast from 'react-hot-toast';

const statusIcons: Record<string, React.ReactNode> = {
  mastered: <CheckCircle2 size={14} className="text-[hsl(var(--success))]" />,
  learning: <MinusCircle size={14} className="text-[hsl(var(--warning))]" />,
  needs_review: <XCircle size={14} className="text-[hsl(var(--destructive))]" />,
  new: <div className="w-3.5 h-3.5 rounded-full border-2 border-[hsl(var(--muted-foreground))]" />,
};

const difficultyColors: Record<string, string> = {
  easy: 'success',
  medium: 'info',
  hard: 'warning',
  very_hard: 'destructive',
};

// 7 Progressive Gradient Palettes for Chapter Cards
const CHAPTER_GRADIENTS = [
  {
    // Chapter 1: Indigo & Sapphire Ocean
    border: 'border-indigo-500/35 hover:border-indigo-500/70',
    bg: 'bg-gradient-to-br from-indigo-500/[0.08] via-blue-500/[0.03] to-transparent',
    iconBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30',
    pill: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30',
    bar: 'bg-indigo-500',
    glow: 'shadow-[0_4px_20px_rgba(99,102,241,0.12)]',
  },
  {
    // Chapter 2: Cyan & Arctic Teal
    border: 'border-cyan-500/35 hover:border-cyan-500/70',
    bg: 'bg-gradient-to-br from-cyan-500/[0.08] via-teal-500/[0.03] to-transparent',
    iconBg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30',
    pill: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30',
    bar: 'bg-cyan-500',
    glow: 'shadow-[0_4px_20px_rgba(6,182,212,0.12)]',
  },
  {
    // Chapter 3: Emerald & Forest Mint
    border: 'border-emerald-500/35 hover:border-emerald-500/70',
    bg: 'bg-gradient-to-br from-emerald-500/[0.08] via-green-500/[0.03] to-transparent',
    iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
    pill: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
    bar: 'bg-emerald-500',
    glow: 'shadow-[0_4px_20px_rgba(16,185,129,0.12)]',
  },
  {
    // Chapter 4: Amber & Solar Gold
    border: 'border-amber-500/35 hover:border-amber-500/70',
    bg: 'bg-gradient-to-br from-amber-500/[0.08] via-yellow-500/[0.03] to-transparent',
    iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
    pill: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
    bar: 'bg-amber-500',
    glow: 'shadow-[0_4px_20px_rgba(245,158,11,0.12)]',
  },
  {
    // Chapter 5: Rose & Velvet Ruby
    border: 'border-rose-500/35 hover:border-rose-500/70',
    bg: 'bg-gradient-to-br from-rose-500/[0.08] via-pink-500/[0.03] to-transparent',
    iconBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30',
    pill: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30',
    bar: 'bg-rose-500',
    glow: 'shadow-[0_4px_20px_rgba(244,63,94,0.12)]',
  },
  {
    // Chapter 6: Purple & Nebula Violet
    border: 'border-purple-500/35 hover:border-purple-500/70',
    bg: 'bg-gradient-to-br from-purple-500/[0.08] via-fuchsia-500/[0.03] to-transparent',
    iconBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30',
    pill: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30',
    bar: 'bg-purple-500',
    glow: 'shadow-[0_4px_20px_rgba(168,85,247,0.12)]',
  },
  {
    // Chapter 7: Fuchsia & Sunset Flare
    border: 'border-fuchsia-500/35 hover:border-fuchsia-500/70',
    bg: 'bg-gradient-to-br from-fuchsia-500/[0.08] via-rose-500/[0.03] to-transparent',
    iconBg: 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-500/30',
    pill: 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-500/30',
    bar: 'bg-fuchsia-500',
    glow: 'shadow-[0_4px_20px_rgba(217,70,239,0.12)]',
  },
];

export const QuestionBankPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    loadQuestions, filteredQuestions, filter, selectedIds, loading, page, pageSize,
    setFilter, resetFilter, toggleSelect, selectAll, clearSelection,
    deleteMultiple, setPage, setPageSize,
  } = useQuestionStore();
  const { loadAll: loadSubjects, subjects, chapters, getChaptersBySubject } = useSubjectStore();
  const [showFilters, setShowFilters] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState(false);
  const [activeChapterId, setActiveChapterId] = React.useState<string | null>(null);
  const [deleteChapterConfirm, setDeleteChapterConfirm] = React.useState<string | null>(null);
  const [selectedSubjectFolder, setSelectedSubjectFolder] = React.useState<string | null>(null);

  // Load latest questions & subjects on mount
  React.useEffect(() => {
    loadQuestions();
    loadSubjects();
  }, []);

  // Sync selectedSubjectFolder with filter.subjectId
  React.useEffect(() => {
    if (filter.subjectId) {
      setSelectedSubjectFolder(filter.subjectId);
    } else {
      setSelectedSubjectFolder(null);
    }
    setPage(1);
  }, [filter.subjectId]);

  const isChapterSelected = (qs: Question[]) => qs.length > 0 && qs.every(q => selectedIds.has(q.id));
  const isChapterPartial = (qs: Question[]) => qs.some(q => selectedIds.has(q.id)) && !isChapterSelected(qs);
  
  const toggleChapterSelection = (qs: Question[]) => {
    const allSelected = isChapterSelected(qs);
    qs.forEach(q => {
      if (allSelected) {
        // Deselect all in this chapter
        if (selectedIds.has(q.id)) toggleSelect(q.id);
      } else {
        // Select all in this chapter
        if (!selectedIds.has(q.id)) toggleSelect(q.id);
      }
    });
  };

  const handleDeleteChapter = async (chapterId: string) => {
    const qs = groupedQuestions[chapterId] || [];
    const ids = qs.map(q => q.id);
    if (ids.length === 0) return;
    await deleteMultiple(ids);
    toast.success(`Đã xóa ${ids.length} câu hỏi trong chương`);
    setDeleteChapterConfirm(null);
    if (activeChapterId === chapterId) setActiveChapterId(null);
  };

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginatedQuestions = filteredQuestions.slice((safePage - 1) * pageSize, safePage * pageSize);
  const availableChapters = filter.subjectId ? getChaptersBySubject(filter.subjectId) : chapters;

  const groupedQuestions = React.useMemo(() => {
    const groups: Record<string, typeof paginatedQuestions> = {};
    paginatedQuestions.forEach(q => {
      const key = q.chapterId || 'unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(q);
    });
    // Sort by chapter name/number naturally
    const sorted: Record<string, typeof paginatedQuestions> = {};
    Object.entries(groups)
      .sort(([aId], [bId]) => {
        const aChapter = chapters.find(c => c.id === aId);
        const bChapter = chapters.find(c => c.id === bId);
        const aName = aChapter?.name || aId;
        const bName = bChapter?.name || bId;
        return aName.localeCompare(bName, undefined, { numeric: true });
      })
      .forEach(([key, val]) => { sorted[key] = val; });
    return sorted;
  }, [paginatedQuestions, chapters]);

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    await deleteMultiple(ids);
    toast.success(`Đã xóa ${ids.length} câu hỏi`);
    setDeleteConfirm(false);
  };

  const handleToggleBookmark = async (id: string, current: boolean) => {
    const { updateQuestion } = useQuestionStore.getState();
    await updateQuestion(id, { isBookmarked: !current });
    toast.success(current ? 'Đã bỏ đánh dấu' : 'Đã đánh dấu');
  };
  const renderStatusBadge = (q: Question) => {
    const isError = q.answers.length === 0 || !q.answers.some(a => a.isCorrect);
    
    if (isError) {
      return (
        <Badge variant="outline" className="text-red-500 border-red-500/30 bg-red-500/10 gap-1 px-1.5 py-0 text-[10px] whitespace-nowrap">
          <XCircle size={12} /> Lỗi đáp án
        </Badge>
      );
    }
    if (q.status === 'mastered') {
      return (
        <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 gap-1 px-1.5 py-0 text-[10px] whitespace-nowrap">
          <CheckCircle2 size={12} /> Thành thạo
        </Badge>
      );
    }
    if (q.status === 'needs_review') {
      return (
        <Badge variant="outline" className="text-orange-500 border-orange-500/30 bg-orange-500/10 gap-1 px-1.5 py-0 text-[10px] whitespace-nowrap">
          <AlertTriangle size={12} /> Cần ôn tập
        </Badge>
      );
    }
    
    // For other statuses (learning, new, unattempted), just show the small icon
    return statusIcons[q.status];
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ngân hàng câu hỏi</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            {filteredQuestions.length} câu hỏi
            {filter.search && ` • Tìm kiếm: "${filter.search}"`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={<Download size={16} />} onClick={() => navigate('/import')}>
            Import
          </Button>
          <Button size="sm" icon={<PlusCircle size={16} />} onClick={() => navigate('/questions/new')}>
            Tạo câu hỏi
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <Card className="p-4">
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[250px]">
            <Input
              variant="search"
              placeholder="Tìm kiếm câu hỏi, nội dung, ID, tag..."
              value={filter.search}
              onChange={e => setFilter({ search: e.target.value })}
              clearable
              onClear={() => setFilter({ search: '' })}
            />
          </div>
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="md"
            icon={<Filter size={16} />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Bộ lọc
          </Button>
          {(filter.subjectId || filter.chapterId || filter.difficulty || filter.type || filter.status || filter.search || selectedSubjectFolder) && (
            <Button
              variant="ghost"
              size="md"
              icon={<RotateCcw size={16} />}
              onClick={() => {
                resetFilter();
                setSelectedSubjectFolder(null);
              }}
            >
              Đặt lại
            </Button>
          )}
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 pt-4 border-t border-[hsl(var(--border))] animate-fade-in-down">
            <Select
              label="Môn học"
              placeholder="Tất cả"
              value={filter.subjectId || ''}
              onChange={e => {
                const val = e.target.value;
                setSelectedSubjectFolder(val || null);
                setFilter({ subjectId: val || undefined, chapterId: undefined });
              }}
              options={subjects.map(s => ({ value: s.id, label: s.name }))}
            />
            <Select
              label="Chương"
              placeholder="Tất cả"
              value={filter.chapterId || ''}
              onChange={e => setFilter({ chapterId: e.target.value || undefined })}
              options={availableChapters.map(c => ({ value: c.id, label: c.name }))}
            />
            <Select
              label="Mức độ"
              placeholder="Tất cả"
              value={filter.difficulty || ''}
              onChange={e => setFilter({ difficulty: e.target.value as Difficulty })}
              options={Object.entries(DIFFICULTY_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            />
            <Select
              label="Loại câu"
              placeholder="Tất cả"
              value={filter.type || ''}
              onChange={e => setFilter({ type: e.target.value as QuestionType })}
              options={Object.entries(QUESTION_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            />
            <Select
              label="Trạng thái"
              placeholder="Tất cả"
              value={filter.status || ''}
              onChange={e => setFilter({ status: e.target.value as QuestionStatus })}
              options={Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            />
          </div>
        )}
      </Card>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <Card className="p-3 bg-[hsl(var(--primary)/0.05)] border-[hsl(var(--primary)/0.2)] animate-fade-in-down">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{selectedIds.size} câu đã chọn</span>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={clearSelection}>Bỏ chọn</Button>
              <Button variant="destructive" size="sm" icon={<Trash2 size={14} />} onClick={() => setDeleteConfirm(true)}>
                Xóa
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Questions List / Folder View */}
      {selectedSubjectFolder === null ? (
        /* LEVEL 1: ALL SUBJECTS VIEW */
        subjects.length === 0 ? (
          <EmptyState
            icon={<FileQuestion size={64} />}
            title="Chưa có câu hỏi"
            description="Hãy tạo câu hỏi đầu tiên hoặc import ngân hàng câu hỏi của bạn."
            action={
              <div className="flex gap-3">
                <Button icon={<PlusCircle size={16} />} onClick={() => navigate('/questions/new')}>Tạo câu hỏi</Button>
                <Button variant="outline" icon={<Download size={16} />} onClick={() => navigate('/import')}>Import</Button>
              </div>
            }
          />
        ) : (
          /* SUBJECT FOLDERS GRID VIEW */
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                <Folder className="w-4 h-4 text-[hsl(var(--primary))]" />
                <span>Thư mục môn học ({subjects.length} môn)</span>
              </div>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                Bấm vào môn học để xem các chương
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {subjects.map((subj, idx) => {
                const subjChapters = getChaptersBySubject(subj.id);
                const subjQuestions = filteredQuestions.filter(q => q.subjectId === subj.id);
                const totalSubjQuestions = subjQuestions.length;
                const masteredCount = subjQuestions.filter(q => q.status === 'mastered').length;
                const masteredRate = totalSubjQuestions > 0 ? Math.round((masteredCount / totalSubjQuestions) * 100) : 0;
                const grad = CHAPTER_GRADIENTS[idx % CHAPTER_GRADIENTS.length];

                return (
                  <div
                    key={subj.id}
                    onClick={() => {
                      setSelectedSubjectFolder(subj.id);
                      setFilter({ subjectId: subj.id, chapterId: undefined });
                    }}
                    className={`p-5 rounded-3xl border-2 ${grad.border} ${grad.bg} ${grad.glow} shadow-2xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 group hover:-translate-y-1`}
                  >
                    <div className="space-y-3">
                      {/* Top Folder Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0"
                            style={{ backgroundColor: subj.color }}
                          >
                            <Folder className="w-5 h-5 fill-white/20" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-extrabold text-sm sm:text-base text-[hsl(var(--foreground))] truncate group-hover:text-[hsl(var(--primary))] transition-colors">
                              {subj.name}
                            </h3>
                            <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
                              {subjChapters.length} chương học
                            </span>
                          </div>
                        </div>

                        <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-full ${grad.pill}`}>
                          {totalSubjQuestions} câu
                        </span>
                      </div>

                      {/* Description if any */}
                      {subj.description && (
                        <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-1">
                          {subj.description}
                        </p>
                      )}

                      {/* Progress Bar */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[10.5px] text-[hsl(var(--muted-foreground))]">
                          <span>Độ thành thạo</span>
                          <span className="font-mono font-bold text-[hsl(var(--foreground))]">
                            {masteredCount}/{totalSubjQuestions} ({masteredRate}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${grad.bar}`}
                            style={{ width: `${masteredRate}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Open Folder Strip */}
                    <div className="pt-3 border-t border-[hsl(var(--border)/0.5)] flex items-center justify-between text-xs font-bold text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] transition-colors">
                      <span className="flex items-center gap-1.5">
                        <FolderOpen size={14} />
                        <span>Mở thư mục ({subjChapters.length} chương)</span>
                      </span>
                      <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : (
        /* LEVEL 2: CHAPTERS VIEW INSIDE SELECTED SUBJECT FOLDER */
        <div className="space-y-3">
          {/* Breadcrumb Navigation Bar (LUÔN HIỆN ĐỂ CÓ LỐI THOÁT) */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-2xs">
            <div className="flex items-center gap-2 min-w-0 text-xs sm:text-sm">
              <button
                type="button"
                onClick={() => {
                  setSelectedSubjectFolder(null);
                  setFilter({ subjectId: undefined, chapterId: undefined });
                }}
                className="flex items-center gap-1 text-[hsl(var(--primary))] font-bold hover:underline cursor-pointer"
              >
                <Folder size={15} />
                <span>Tất cả môn học</span>
              </button>
              <span className="text-[hsl(var(--muted-foreground))]">/</span>
              <div className="flex items-center gap-1.5 font-extrabold text-[hsl(var(--foreground))] truncate">
                <FolderOpen size={15} className="text-[hsl(var(--primary))]" />
                <span>{subjects.find(s => s.id === selectedSubjectFolder)?.name || 'Môn học'}</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={<ArrowLeft size={14} />}
              onClick={() => {
                setSelectedSubjectFolder(null);
                setFilter({ subjectId: undefined, chapterId: undefined });
              }}
              className="text-xs h-7.5 px-3 cursor-pointer"
            >
              Trở lại danh sách môn
            </Button>
          </div>

          {/* If this subject has NO questions or 0 matches */}
          {paginatedQuestions.length === 0 ? (
            <EmptyState
              icon={<FolderOpen size={56} className="text-[hsl(var(--muted-foreground))]" />}
              title={`Môn "${subjects.find(s => s.id === selectedSubjectFolder)?.name || 'này'}" chưa có câu hỏi`}
              description="Hãy tạo câu hỏi đầu tiên hoặc import bộ đề thi cho môn học này."
              action={
                <div className="flex flex-wrap gap-2.5 justify-center">
                  <Button
                    variant="outline"
                    icon={<ArrowLeft size={14} />}
                    onClick={() => {
                      setSelectedSubjectFolder(null);
                      setFilter({ subjectId: undefined, chapterId: undefined });
                    }}
                  >
                    Quay lại danh sách môn
                  </Button>
                  <Button icon={<PlusCircle size={15} />} onClick={() => navigate('/questions/new')}>
                    Tạo câu hỏi
                  </Button>
                  <Button variant="outline" icon={<Download size={15} />} onClick={() => navigate('/import')}>
                    Import
                  </Button>
                </div>
              }
            />
          ) : (
            <>
              {/* Select All */}
              <div className="flex items-center gap-2 px-2">
                <Checkbox
                  checked={selectedIds.size === filteredQuestions.length && filteredQuestions.length > 0}
                  onChange={() => selectedIds.size === filteredQuestions.length ? clearSelection() : selectAll()}
                />
                <span className="text-xs text-[hsl(var(--muted-foreground))]">Chọn tất cả câu hỏi ({filteredQuestions.length})</span>
              </div>

              {/* 3-Column Progressive Gradient Chapter Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 pt-1">
                {Object.entries(groupedQuestions).map(([chapterId, qs], index) => {
                  const chapter = chapters.find(c => c.id === chapterId);
                  const subject = chapter ? subjects.find(s => s.id === chapter.subjectId) : null;
                  
                  const grad = CHAPTER_GRADIENTS[index % CHAPTER_GRADIENTS.length];
                  const easyCount = qs.filter(q => q.difficulty === 'easy').length;
                  const medCount = qs.filter(q => q.difficulty === 'medium').length;
                  const hardCount = qs.filter(q => q.difficulty === 'hard' || q.difficulty === 'very_hard').length;
                  const masteredCount = qs.filter(q => q.status === 'mastered').length;
                  const masteredRate = qs.length > 0 ? (masteredCount / qs.length) * 100 : 0;

                  return (
                    <div
                      key={chapterId}
                      onClick={() => setActiveChapterId(chapterId)}
                      className={`p-4 rounded-3xl border-2 ${grad.border} ${grad.bg} ${grad.glow} shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 group hover:-translate-y-1`}
                    >
                      <div className="space-y-2.5">
                        {/* Top Bar: Checkbox + Chapter Index + Subject + Delete */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div onClick={e => { e.stopPropagation(); toggleChapterSelection(qs); }} className="pt-0.5">
                              <Checkbox checked={isChapterSelected(qs)} onChange={() => {}} />
                            </div>

                            <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-lg ${grad.iconBg}`}>
                              #{index + 1}
                            </span>

                            <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))] truncate max-w-[120px]">
                              {subject?.name || 'Môn học'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${grad.pill}`}>
                              {qs.length} câu
                            </span>

                            <button
                              className="p-1 rounded-lg hover:bg-rose-500/10 text-[hsl(var(--muted-foreground))] hover:text-rose-500 transition-colors opacity-60 hover:opacity-100 cursor-pointer"
                              onClick={e => { e.stopPropagation(); setDeleteChapterConfirm(chapterId); }}
                              title="Xóa tất cả câu hỏi trong chương này"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Chapter Title */}
                        <div>
                          <h3 
                            className="text-xs sm:text-sm font-extrabold text-[hsl(var(--foreground))] leading-snug group-hover:text-[hsl(var(--primary))] transition-colors line-clamp-2"
                            title={chapter ? chapter.name : 'Chưa phân loại'}
                          >
                            {chapter ? chapter.name : 'Chưa phân loại'}
                          </h3>
                        </div>

                        {/* 3 Difficulty Metric Badges */}
                        <div className="grid grid-cols-3 gap-1.5 text-center text-[10.5px]">
                          <div className="p-1 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
                            <span className="text-[9px] text-[hsl(var(--muted-foreground))] block">Dễ</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{easyCount}</span>
                          </div>
                          <div className="p-1 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
                            <span className="text-[9px] text-[hsl(var(--muted-foreground))] block">Trung bình</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">{medCount}</span>
                          </div>
                          <div className="p-1 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
                            <span className="text-[9px] text-[hsl(var(--muted-foreground))] block">Khó</span>
                            <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">{hardCount}</span>
                          </div>
                        </div>

                        {/* Mastery Progress Bar */}
                        <div className="space-y-1 pt-0.5">
                          <div className="flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))]">
                            <span>Đã thành thạo</span>
                            <span className="font-mono font-bold text-[hsl(var(--foreground))]">{masteredCount}/{qs.length} ({Math.round(masteredRate)}%)</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${grad.bar}`} style={{ width: `${masteredRate}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Bottom Action Strip */}
                      <div className="pt-2 border-t border-[hsl(var(--border)/0.5)] flex items-center justify-between text-xs font-bold">
                        <span className="text-[11px] text-[hsl(var(--muted-foreground))] flex items-center gap-1 group-hover:text-[hsl(var(--primary))] transition-colors">
                          <BookOpen size={13} />
                          <span>Mở xem nội dung</span>
                        </span>
                        <ChevronRight size={15} className="text-[hsl(var(--muted-foreground))] group-hover:translate-x-0.5 group-hover:text-[hsl(var(--primary))] transition-all" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

          {/* Chapter Question Inspector Modal */}
          {activeChapterId !== null && (
            <ChapterQuestionInspectorModal
              chapterId={activeChapterId}
              onClose={() => setActiveChapterId(null)}
            />
          )}

          {/* Pagination */}
          {(totalPages > 1 || pageSize > 50) && (
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-4">
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Trang {page} / {totalPages} • {filteredQuestions.length} câu hỏi
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">Hiển thị:</span>
                  <div className="w-28">
                    <Select
                      value={pageSize.toString()}
                      onChange={e => setPageSize(parseInt(e.target.value))}
                      options={[
                        { value: '50', label: '50 câu' },
                        { value: '100', label: '100 câu' },
                        { value: '200', label: '200 câu' },
                        { value: '500', label: '500 câu' },
                        { value: '1000000', label: 'Tất cả' },
                      ]}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft size={16} />
                </Button>
                <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDeleteSelected}
        title="Xóa câu hỏi"
        description={`Bạn chắc chắn muốn xóa ${selectedIds.size} câu hỏi? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        variant="destructive"
      />

      {/* Delete Chapter Confirmation */}
      <ConfirmDialog
        open={!!deleteChapterConfirm}
        onClose={() => setDeleteChapterConfirm(null)}
        onConfirm={() => deleteChapterConfirm && handleDeleteChapter(deleteChapterConfirm)}
        title="Xóa câu hỏi theo chương"
        description={`Bạn chắc chắn muốn xóa tất cả câu hỏi trong chương này? Hành động này không thể hoàn tác.`}
        confirmText="Xóa tất cả"
        variant="destructive"
      />
    </div>
  );
};

interface ChapterQuestionInspectorModalProps {
  chapterId: string | null;
  onClose: () => void;
}

const ChapterQuestionInspectorModal: React.FC<ChapterQuestionInspectorModalProps> = ({ chapterId, onClose }) => {
  const navigate = useNavigate();
  const { questions, updateQuestion } = useQuestionStore();
  const { chapters, subjects } = useSubjectStore();

  const chapter = chapters.find(c => c.id === chapterId);
  const subject = chapter ? subjects.find(s => s.id === chapter.subjectId) : null;
  const chapterQuestions = React.useMemo(() => {
    return questions.filter(q => q.chapterId === chapterId);
  }, [questions, chapterId]);

  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [fontSize, setFontSize] = React.useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [search, setSearch] = React.useState('');
  const [filterType, setFilterType] = React.useState<'all' | 'mastered' | 'learning' | 'needs_review' | 'bookmarked'>('all');
  const [viewMode, setViewMode] = React.useState<'focus' | 'list'>('focus');
  const [showAnalytics, setShowAnalytics] = React.useState(false);
  const [showQuestionMap, setShowQuestionMap] = React.useState(true);
  const [selectedChunkIndex, setSelectedChunkIndex] = React.useState<number | null>(null);
  const [jumpInput, setJumpInput] = React.useState('');
  const [hoveredDonutSlice, setHoveredDonutSlice] = React.useState<{ name: string; value: number; color: string } | null>(null);

  // Chapter Diagnostic Stats
  const stats = React.useMemo(() => {
    const total = chapterQuestions.length;
    const mastered = chapterQuestions.filter(q => q.status === 'mastered').length;
    const learning = chapterQuestions.filter(q => q.status === 'learning').length;
    const needsReview = chapterQuestions.filter(q => q.status === 'needs_review').length;
    const unattempted = chapterQuestions.filter(q => !q.status || q.status === 'new' || (q.attemptCount || 0) === 0).length;

    const easyQs = chapterQuestions.filter(q => q.difficulty === 'easy');
    const medQs = chapterQuestions.filter(q => q.difficulty === 'medium');
    const hardQs = chapterQuestions.filter(q => q.difficulty === 'hard' || q.difficulty === 'very_hard');

    const calcAcc = (qs: Question[]) => {
      const totalAtt = qs.reduce((sum, q) => sum + (q.attemptCount || 0), 0);
      const totalCorr = qs.reduce((sum, q) => sum + (q.correctCount || 0), 0);
      return totalAtt > 0 ? Math.round((totalCorr / totalAtt) * 100) : 0;
    };

    const easyAcc = calcAcc(easyQs);
    const medAcc = calcAcc(medQs);
    const hardAcc = calcAcc(hardQs);

    const totalAttempts = chapterQuestions.reduce((sum, q) => sum + (q.attemptCount || 0), 0);
    const totalCorrect = chapterQuestions.reduce((sum, q) => sum + (q.correctCount || 0), 0);
    const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
    const masteryRate = total > 0 ? Math.round((mastered / total) * 100) : 0;

    const pieData = [
      { name: 'Thành thạo', value: mastered, color: '#10B981', status: 'mastered' as const },
      { name: 'Đang học', value: learning, color: '#F59E0B', status: 'learning' as const },
      { name: 'Cần ôn lại', value: needsReview, color: '#EF4444', status: 'needs_review' as const },
      { name: 'Chưa làm', value: unattempted, color: '#94A3B8', status: 'all' as const },
    ].filter(d => d.value > 0);

    return {
      total,
      mastered,
      learning,
      needsReview,
      unattempted,
      masteryRate,
      overallAccuracy,
      easyCount: easyQs.length,
      medCount: medQs.length,
      hardCount: hardQs.length,
      easyAcc,
      medAcc,
      hardAcc,
      pieData: pieData.length > 0 ? pieData : [{ name: 'Tổng số câu', value: total, color: '#6366F1', status: 'all' as const }],
    };
  }, [chapterQuestions]);

  // Filtered list
  const filtered = React.useMemo(() => {
    return chapterQuestions.filter(q => {
      if (filterType === 'mastered' && q.status !== 'mastered') return false;
      if (filterType === 'learning' && q.status !== 'learning') return false;
      if (filterType === 'needs_review' && q.status !== 'needs_review') return false;
      if (filterType === 'bookmarked' && !q.isBookmarked) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        const contentMatch = q.content.toLowerCase().includes(query);
        const idMatch = q.id.toLowerCase().includes(query);
        return contentMatch || idMatch;
      }
      return true;
    });
  }, [chapterQuestions, filterType, search]);

  // Keep currentIndex bounded
  React.useEffect(() => {
    if (currentIndex >= filtered.length) {
      setCurrentIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, currentIndex]);

  const CHUNK_SIZE = 50;
  const totalChunks = Math.max(1, Math.ceil(filtered.length / CHUNK_SIZE));
  const activeChunkIndex = selectedChunkIndex !== null
    ? Math.min(selectedChunkIndex, totalChunks - 1)
    : Math.floor(currentIndex / CHUNK_SIZE);

  const currentChunkQuestions = React.useMemo(() => {
    const start = activeChunkIndex * CHUNK_SIZE;
    const end = Math.min(filtered.length, start + CHUNK_SIZE);
    return filtered.slice(start, end).map((q, localIdx) => ({
      question: q,
      globalIndex: start + localIdx,
    }));
  }, [filtered, activeChunkIndex]);

  const handleJumpToQuestion = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const num = parseInt(jumpInput.trim(), 10);
    if (!isNaN(num) && num >= 1 && num <= filtered.length) {
      const targetIdx = num - 1;
      setCurrentIndex(targetIdx);
      setSelectedChunkIndex(Math.floor(targetIdx / CHUNK_SIZE));
      setViewMode('focus');
      setJumpInput('');
    } else {
      toast.error(`Vui lòng nhập số câu từ 1 đến ${filtered.length}`);
    }
  };

  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      const nextIdx = currentIndex - 1;
      setCurrentIndex(nextIdx);
      setSelectedChunkIndex(Math.floor(nextIdx / CHUNK_SIZE));
      setViewMode('focus');
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < filtered.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setSelectedChunkIndex(Math.floor(nextIdx / CHUNK_SIZE));
      setViewMode('focus');
    }
  };

  // Keyboard navigation with Left / Right arrow keys
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea', 'select'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        handlePrevQuestion();
      } else if (e.key === 'ArrowRight') {
        handleNextQuestion();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, filtered.length]);

  const activeQuestion = filtered[currentIndex] || null;

  const fontClass = {
    sm: 'text-xs',
    base: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  }[fontSize];

  const handleToggleBookmark = async (id: string, current: boolean) => {
    await updateQuestion(id, { isBookmarked: !current });
    toast.success(current ? 'Đã bỏ đánh dấu' : 'Đã đánh dấu câu hỏi');
  };

  if (!chapterId) return null;

  return (
    <Modal
      isOpen={!!chapterId}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 min-w-0 pr-4">
          <BookOpen className="w-5 h-5 text-[hsl(var(--primary))] shrink-0" />
          <div className="min-w-0">
            <span className="font-bold text-sm sm:text-base text-[hsl(var(--foreground))] truncate block">
              {chapter ? (subject ? `${subject.name} • ` : '') + chapter.name : 'Chi tiết chương'}
            </span>
            <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
              {chapterQuestions.length} câu hỏi • {chapterQuestions.filter(q => q.status === 'mastered').length} đã thành thạo ({stats.masteryRate}%)
            </span>
          </div>
        </div>
      }
      size="full"
    >
      <div className="space-y-3.5 max-h-[82vh] flex flex-col overflow-hidden">
        {/* Top Control Bar: Search + Analytics Toggle + Font Scaler + View Mode */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[hsl(var(--border))] shrink-0">
          {/* Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentIndex(0); }}
              placeholder="Tìm theo nội dung, mã ID..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            />
          </div>

          {/* Right Controls: Analytics Toggle & Font Scaler & View Mode */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Analytics Toggle Button */}
            <button
              onClick={() => setShowAnalytics(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                showAnalytics
                  ? 'bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.3)] shadow-2xs'
                  : 'bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] border-[hsl(var(--border))]'
              }`}
              title="Bật/tắt biểu đồ và phân tích chẩn đoán kiến thức chương"
            >
              <TrendingUp size={13} className="text-[hsl(var(--primary))]" />
              <span>{showAnalytics ? 'Thu gọn biểu đồ' : 'Biểu đồ phân tích'}</span>
              {showAnalytics ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {/* Font Scaler (A- / A+) */}
            <div className="flex items-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] p-0.5 text-xs font-semibold">
              <button
                onClick={() => setFontSize(f => (f === 'xl' ? 'lg' : f === 'lg' ? 'base' : 'sm'))}
                disabled={fontSize === 'sm'}
                className="px-2.5 py-1 rounded hover:bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-30 cursor-pointer"
                title="Thu nhỏ cỡ chữ"
              >
                A-
              </button>
              <span className="px-2 text-[10px] text-[hsl(var(--muted-foreground))] font-mono uppercase font-bold">
                {fontSize}
              </span>
              <button
                onClick={() => setFontSize(f => (f === 'sm' ? 'base' : f === 'base' ? 'lg' : 'xl'))}
                disabled={fontSize === 'xl'}
                className="px-2.5 py-1 rounded hover:bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-30 cursor-pointer"
                title="Phóng to cỡ chữ"
              >
                A+
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] p-0.5 text-xs font-semibold">
              <button
                onClick={() => setViewMode('focus')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'focus' ? 'bg-[hsl(var(--primary))] text-white shadow-2xs' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                }`}
                title="Xem ma trận từng câu (Focus View)"
              >
                <Eye size={14} className="inline mr-1" />
                <span>Tiêu điểm</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'list' ? 'bg-[hsl(var(--primary))] text-white shadow-2xs' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                }`}
                title="Xem danh sách tất cả (List View)"
              >
                <LayoutGrid size={14} className="inline mr-1" />
                <span>Danh sách</span>
              </button>
            </div>
          </div>
        </div>

        {/* Visual Analytics & Knowledge Diagnostics Dashboard */}
        {showAnalytics && (
          <div className="p-4 rounded-3xl bg-gradient-to-br from-[hsl(var(--card))] via-[hsl(var(--card))] to-[hsl(var(--muted)/0.25)] border border-[hsl(var(--border))] shadow-xs shrink-0 animate-fade-in space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
              {/* Col 1: Donut Chart Trạng Thái & Thành Thạo (md:col-span-4) */}
              <div className="md:col-span-4 flex items-center gap-3 p-2.5 rounded-2xl bg-[hsl(var(--muted)/0.25)] border border-[hsl(var(--border))]">
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={44}
                        paddingAngle={stats.pieData.length > 1 ? 3 : 0}
                        animationDuration={500}
                        onMouseEnter={(_, index) => {
                          const item = stats.pieData[index];
                          if (item) setHoveredDonutSlice(item);
                        }}
                        onMouseLeave={() => setHoveredDonutSlice(null)}
                      >
                        {stats.pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            className="transition-all duration-200 cursor-pointer"
                            opacity={hoveredDonutSlice && hoveredDonutSlice.name !== entry.name ? 0.45 : 1}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Dynamic Center Text (Không bao giờ bị tooltip đè chữ!) */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1">
                    {hoveredDonutSlice ? (
                      <>
                        <span className="text-xs font-black font-mono tracking-tight" style={{ color: hoveredDonutSlice.color }}>
                          {hoveredDonutSlice.value} câu
                        </span>
                        <span className="text-[8px] uppercase font-bold truncate max-w-[56px] leading-tight" style={{ color: hoveredDonutSlice.color }}>
                          {hoveredDonutSlice.name}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-black font-mono text-[hsl(var(--foreground))]">
                          {stats.masteryRate}%
                        </span>
                        <span className="text-[8.5px] text-[hsl(var(--muted-foreground))] uppercase font-bold leading-tight">
                          Thành thạo
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-1 text-[11px]">
                  <div 
                    onClick={() => setFilterType('mastered')}
                    className="flex items-center justify-between p-1 rounded-lg hover:bg-[hsl(var(--card))] transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Thành thạo:
                    </span>
                    <strong className="font-mono">{stats.mastered}</strong>
                  </div>
                  <div 
                    onClick={() => setFilterType('learning')}
                    className="flex items-center justify-between p-1 rounded-lg hover:bg-[hsl(var(--card))] transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-amber-500" /> Đang học:
                    </span>
                    <strong className="font-mono">{stats.learning}</strong>
                  </div>
                  <div 
                    onClick={() => setFilterType('needs_review')}
                    className="flex items-center justify-between p-1 rounded-lg hover:bg-[hsl(var(--card))] transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Cần ôn lại:
                    </span>
                    <strong className="font-mono text-rose-500 font-black">{stats.needsReview}</strong>
                  </div>
                </div>
              </div>

              {/* Col 2: Phân Tích Độ Khó & Độ Chính Xác (md:col-span-4) */}
              <div className="md:col-span-4 p-2.5 rounded-2xl bg-[hsl(var(--muted)/0.25)] border border-[hsl(var(--border))] space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-[hsl(var(--muted-foreground))]">
                  <span>Phân tích theo mức độ khó</span>
                  <span className="text-[10px] font-mono text-[hsl(var(--primary))] font-extrabold">{stats.overallAccuracy}% chính xác</span>
                </div>

                <div className="space-y-1.5 text-[10.5px]">
                  {/* Easy Bar */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Dễ ({stats.easyCount} câu)</span>
                      <span className="font-mono font-bold text-emerald-500">{stats.easyAcc}% đúng</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${stats.easyAcc}%` }} />
                    </div>
                  </div>

                  {/* Medium Bar */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">Trung bình ({stats.medCount} câu)</span>
                      <span className="font-mono font-bold text-blue-500">{stats.medAcc}% đúng</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${stats.medAcc}%` }} />
                    </div>
                  </div>

                  {/* Hard Bar */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">Khó ({stats.hardCount} câu)</span>
                      <span className="font-mono font-bold text-amber-500">{stats.hardAcc}% đúng</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${stats.hardAcc}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Col 3: Trọng Tâm Cần Ôn & Nút Hành Động Nhanh (md:col-span-4) */}
              <div className="md:col-span-4 p-3 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] flex flex-col justify-between space-y-2.5 shadow-2xs">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[hsl(var(--foreground))]">
                    <Target size={14} className="text-rose-500" />
                    <span>Trọng tâm cần ôn tập:</span>
                  </div>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1 leading-snug">
                    {stats.needsReview > 0 
                      ? `Bạn có ${stats.needsReview} câu trả lời sai hoặc cần ôn lại để đạt thành thạo chương này.`
                      : stats.unattempted > 0 
                      ? `Bạn còn ${stats.unattempted} câu hỏi chưa làm trong chương này.`
                      : 'Chúc mừng! Bạn đã hoàn thành xuất sắc các câu hỏi trong chương.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {stats.needsReview > 0 ? (
                    <button
                      onClick={() => {
                        onClose();
                        navigate(`/quiz/setup?subjectId=${chapter?.subjectId || ''}&chapterId=${chapterId}&mode=review`);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      <Zap size={13} />
                      <span>Ôn {stats.needsReview} câu sai ngay</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        onClose();
                        navigate(`/quiz/setup?subjectId=${chapter?.subjectId || ''}&chapterId=${chapterId}&mode=practice`);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-[hsl(var(--primary))] hover:opacity-90 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      <Sparkles size={13} />
                      <span>Luyện tập chương này</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Chips Bar */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          {[
            { id: 'all', label: `Tất cả (${chapterQuestions.length})` },
            { id: 'mastered', label: `🟢 Thành thạo (${chapterQuestions.filter(q => q.status === 'mastered').length})` },
            { id: 'learning', label: `🟡 Đang học (${chapterQuestions.filter(q => q.status === 'learning').length})` },
            { id: 'needs_review', label: `🔴 Cần ôn (${chapterQuestions.filter(q => q.status === 'needs_review').length})` },
            { id: 'bookmarked', label: `⭐ Đánh dấu (${chapterQuestions.filter(q => q.isBookmarked).length})` },
          ].map(chip => (
            <button
              key={chip.id}
              onClick={() => { setFilterType(chip.id as any); setCurrentIndex(0); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterType === chip.id
                  ? 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.3)] shadow-2xs'
                  : 'bg-[hsl(var(--muted)/0.3)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.6)] border border-[hsl(var(--border))]'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
        {filtered.length > 0 && (
          <div className="p-3 rounded-2xl bg-[hsl(var(--muted)/0.25)] border border-[hsl(var(--border))] shrink-0 space-y-2.5">
            {/* Top Toolbar: Map Title + Collapse/Expand Toggle + Quick Jump + Prev/Next Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              {/* Left: Map Title & Toggle Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuestionMap(v => !v)}
                  className="font-bold flex items-center gap-1.5 text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors cursor-pointer"
                  title={showQuestionMap ? 'Thu gọn bản đồ câu hỏi' : 'Mở rộng bản đồ câu hỏi'}
                >
                  <Layers size={14} className="text-[hsl(var(--primary))]" />
                  <span>Bản đồ số câu hỏi ({filtered.length} câu)</span>
                  {showQuestionMap ? <ChevronUp size={13} className="text-[hsl(var(--muted-foreground))]" /> : <ChevronDown size={13} className="text-[hsl(var(--muted-foreground))]" />}
                </button>

                {!showQuestionMap && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] font-extrabold border border-[hsl(var(--primary)/0.25)]">
                    Đang ở câu {currentIndex + 1} / {filtered.length}
                  </span>
                )}
              </div>

              {/* Right: Quick Jump Form + Prev/Next Navigation */}
              <div className="flex items-center gap-1.5 shrink-0">
                <form onSubmit={handleJumpToQuestion} className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={filtered.length}
                    value={jumpInput}
                    onChange={e => setJumpInput(e.target.value)}
                    placeholder={`Tới câu (1-${filtered.length})...`}
                    className="w-24 sm:w-28 px-2 py-1 text-[11px] font-mono rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 rounded-lg bg-[hsl(var(--primary))] text-white font-bold text-[11px] hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
                    title="Chuyển ngay đến câu hỏi"
                  >
                    Đi ➔
                  </button>
                </form>

                <div className="flex items-center gap-0.5 border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--card))] p-0.5 shadow-2xs">
                  <button
                    type="button"
                    disabled={currentIndex <= 0}
                    onClick={handlePrevQuestion}
                    className="p-1 rounded hover:bg-[hsl(var(--muted))] disabled:opacity-30 text-[hsl(var(--foreground))] cursor-pointer transition-colors"
                    title="Câu trước (Phím Mũi tên Trái ←)"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-1.5 text-[10.5px] font-mono font-black text-[hsl(var(--foreground))] min-w-[50px] text-center">
                    {currentIndex + 1}/{filtered.length}
                  </span>
                  <button
                    type="button"
                    disabled={currentIndex >= filtered.length - 1}
                    onClick={handleNextQuestion}
                    className="p-1 rounded hover:bg-[hsl(var(--muted))] disabled:opacity-30 text-[hsl(var(--foreground))] cursor-pointer transition-colors"
                    title="Câu sau (Phím Mũi tên Phải →)"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Range Chunk Tabs for large question lists (> 50 questions) */}
            {showQuestionMap && totalChunks > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] shrink-0 mr-1">
                  Phân đoạn:
                </span>
                {Array.from({ length: totalChunks }).map((_, cIdx) => {
                  const startNum = cIdx * CHUNK_SIZE + 1;
                  const endNum = Math.min(filtered.length, (cIdx + 1) * CHUNK_SIZE);
                  const isSelectedChunk = cIdx === activeChunkIndex;
                  const containsActiveQuestion = Math.floor(currentIndex / CHUNK_SIZE) === cIdx;

                  return (
                    <button
                      key={cIdx}
                      type="button"
                      onClick={() => setSelectedChunkIndex(cIdx)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                        isSelectedChunk
                          ? 'bg-[hsl(var(--primary))] text-white shadow-2xs ring-1 ring-[hsl(var(--primary)/0.5)]'
                          : containsActiveQuestion
                          ? 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.4)]'
                          : 'bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)]'
                      }`}
                    >
                      <span>{startNum} - {endNum}</span>
                      {containsActiveQuestion && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Active Chunk Question Grid (Compact 50 Badges max per view) */}
            {showQuestionMap && (
              <div className="flex flex-wrap gap-1.5 max-h-28 sm:max-h-32 overflow-y-auto custom-scrollbar p-1">
                {currentChunkQuestions.map(({ question: q, globalIndex: idx }) => {
                  const isActive = idx === currentIndex && viewMode === 'focus';
                  const statusColor = q.status === 'mastered' ? 'bg-emerald-500' : q.status === 'learning' ? 'bg-amber-500' : q.status === 'needs_review' ? 'bg-rose-500' : 'bg-slate-400';
                  const qStreak = q.consecutiveCorrectCount || 0;
                  const qStreakTier = getStreakTier(qStreak);

                  return (
                    <button
                      key={q.id}
                      onClick={() => { setCurrentIndex(idx); setViewMode('focus'); }}
                      className={`relative w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-lg font-mono text-[11px] sm:text-xs font-bold transition-all duration-150 cursor-pointer flex items-center justify-center ${
                        isActive
                          ? 'bg-[hsl(var(--primary))] text-white shadow-md ring-2 ring-[hsl(var(--primary)/0.5)] scale-105 z-10'
                          : qStreakTier
                          ? `bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border-2 ${qStreakTier.flagBorder} ${qStreakTier.glowClass} hover:scale-105`
                          : 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.6)] hover:bg-[hsl(var(--muted)/0.5)]'
                      }`}
                      title={qStreak >= 3 ? `Câu ${idx + 1}: Đúng liên tiếp x${qStreak} (${qStreakTier?.title})` : `Câu ${idx + 1}`}
                    >
                      <span>{idx + 1}</span>
                      <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-1.5 border-[hsl(var(--card))] ${statusColor}`} />
                      {qStreak >= 3 ? (
                        <span className="absolute -bottom-1 -left-1 text-[8px]">🔥</span>
                      ) : q.isBookmarked ? (
                        <span className="absolute -bottom-0.5 -left-0.5 text-[8px]">⭐</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Content Body: Focus Mode VS List Mode */}
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-[hsl(var(--muted-foreground))] space-y-2">
            <FileQuestion className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-xs">Không tìm thấy câu hỏi nào phù hợp với bộ lọc.</p>
          </div>
        ) : viewMode === 'focus' && activeQuestion ? (
          /* FOCUS 1-QUESTION INTERACTIVE VIEW */
          (() => {
            const activeStreak = activeQuestion.consecutiveCorrectCount || 0;
            const activeStreakTier = getStreakTier(activeStreak);
            const focusBorder = activeStreakTier
              ? `border-2 ${activeStreakTier.flagBorder} ${activeStreakTier.glowClass} shadow-md`
              : 'border border-[hsl(var(--border))] shadow-xs';

            return (
              <div className={`flex-1 overflow-y-auto custom-scrollbar space-y-4 p-5 rounded-2xl bg-[hsl(var(--card))] ${focusBorder} transition-all duration-300`}>
                {/* Active Question Header */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-[hsl(var(--border))]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold px-3 py-1.5 rounded-xl bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.25)]">
                      Câu {currentIndex + 1} / {filtered.length}
                    </span>
                    <span className="text-xs font-mono font-bold text-[hsl(var(--muted-foreground))]">
                      {activeQuestion.id}
                    </span>
                    <Badge variant={difficultyColors[activeQuestion.difficulty] as any} className="text-[10px]">
                      {DIFFICULTY_LABELS[activeQuestion.difficulty]}
                    </Badge>
                    {activeQuestion.status === 'mastered' && (
                      <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 text-[10px]">
                        ✓ Thành thạo
                      </Badge>
                    )}
                    {activeQuestion.status === 'needs_review' && (
                      <Badge variant="outline" className="text-rose-500 border-rose-500/30 bg-rose-500/10 text-[10px]">
                        ⚠ Cần ôn tập
                      </Badge>
                    )}
                    {activeStreak >= 3 && (
                      <div className="scale-90 origin-left">
                        <StreakFlameBadge streak={activeStreak} compact showLabel />
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleBookmark(activeQuestion.id, activeQuestion.isBookmarked)}
                      className="p-1.5 rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
                      title="Đánh dấu câu hỏi"
                    >
                      {activeQuestion.isBookmarked ? (
                        <Star size={16} className="text-yellow-500 fill-yellow-500" />
                      ) : (
                        <StarOff size={16} className="text-[hsl(var(--muted-foreground))]" />
                      )}
                    </button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Edit size={13} />}
                      onClick={() => navigate(`/questions/${activeQuestion.id}/edit`)}
                    >
                      Chỉnh sửa
                    </Button>
                  </div>
                </div>

                {/* Question Body with Scalable Font Size */}
                <div className={`font-semibold text-[hsl(var(--foreground))] leading-relaxed ${fontClass}`}>
                  <MathRenderer text={activeQuestion.content} />
                </div>

                {/* Answer Choices */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-[hsl(var(--muted-foreground))]">Các phương án đáp án:</span>
                  <div className="space-y-2">
                    {activeQuestion.answers.map((ans, aIdx) => {
                      const label = String.fromCharCode(65 + aIdx);
                      return (
                        <div
                          key={ans.id || aIdx}
                          className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                            ans.isCorrect
                              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-500/30'
                              : 'border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] text-[hsl(var(--foreground))]'
                          }`}
                        >
                          <span className={`w-7 h-7 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 ${
                            ans.isCorrect ? 'bg-emerald-500 text-white shadow-2xs' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                          }`}>
                            {label}
                          </span>
                          <div className={`flex-1 font-medium ${fontClass}`}>
                            <MathRenderer text={ans.content} />
                          </div>
                          {ans.isCorrect && (
                            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 shrink-0">
                              ✓ Đáp án đúng
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Explanation Section */}
                {activeQuestion.explanation && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1.5">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Sparkles size={14} /> Lời giải chi tiết & Ghi chú:
                    </span>
                    <div className={`text-amber-950 dark:text-amber-200 text-xs font-medium leading-relaxed ${fontClass}`}>
                      <MathRenderer text={activeQuestion.explanation} />
                    </div>
                  </div>
                )}

                {/* Question Pacing & Accuracy Metrics */}
                <div className="flex items-center justify-between text-[11px] text-[hsl(var(--muted-foreground))] pt-2 border-t border-[hsl(var(--border))]">
                  <span>Đã làm: <strong>{activeQuestion.attemptCount}</strong> lần</span>
                  <span>Tỷ lệ chính xác: <strong className="text-[hsl(var(--primary))]">{activeQuestion.masteryScore}%</strong> ({activeQuestion.correctCount} đúng / {activeQuestion.wrongCount} sai)</span>
                </div>
              </div>
            );
          })()
        ) : (
          /* COMPACT LIST VIEW */
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
            {filtered.map((q, idx) => {
              const qStreak = q.consecutiveCorrectCount || 0;
              const qStreakTier = getStreakTier(qStreak);
              const listBorder = qStreakTier
                ? `border-2 ${qStreakTier.flagBorder} ${qStreakTier.glowClass} shadow-sm bg-gradient-to-r from-[hsl(var(--card))] to-[hsl(var(--card)/0.92)]`
                : 'border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary)/0.4)]';

              return (
                <div
                  key={q.id}
                  onClick={() => { setCurrentIndex(idx); setViewMode('focus'); }}
                  className={`p-4 rounded-2xl ${listBorder} transition-all duration-300 cursor-pointer space-y-2 hover:shadow-xs`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">{q.id}</span>
                      <Badge variant={difficultyColors[q.difficulty] as any} className="text-[9px]">
                        {DIFFICULTY_LABELS[q.difficulty]}
                      </Badge>
                      {qStreak >= 3 && (
                        <div className="scale-90 origin-left">
                          <StreakFlameBadge streak={qStreak} compact showLabel />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {q.explanation && <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 text-[9px]">Có giải thích</Badge>}
                      <button
                        onClick={e => { e.stopPropagation(); handleToggleBookmark(q.id, q.isBookmarked); }}
                        className="p-1 rounded hover:bg-[hsl(var(--muted))]"
                      >
                        {q.isBookmarked ? <Star size={14} className="text-yellow-500 fill-yellow-500" /> : <StarOff size={14} className="text-[hsl(var(--muted-foreground))]" />}
                      </button>
                    </div>
                  </div>

                  <div className={`font-medium text-[hsl(var(--foreground))] line-clamp-2 ${fontClass}`}>
                    <MathRenderer text={q.content} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Navigation in Focus Mode */}
        {viewMode === 'focus' && filtered.length > 0 && (
          <div className="flex items-center justify-between pt-3 border-t border-[hsl(var(--border))] shrink-0">
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowLeft size={14} />}
              disabled={currentIndex <= 0}
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
            >
              Câu trước
            </Button>

            <span className="text-xs font-bold font-mono text-[hsl(var(--muted-foreground))]">
              {currentIndex + 1} / {filtered.length}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={currentIndex >= filtered.length - 1}
              onClick={() => setCurrentIndex(i => Math.min(filtered.length - 1, i + 1))}
            >
              <span>Câu tiếp</span>
              <ArrowRight size={14} className="ml-1" />
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
