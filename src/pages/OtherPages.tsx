// ============================================
// PLACEHOLDER PAGES
// ============================================
import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { EmptyState, Button, Card, CardContent, Badge, Modal } from '@/components/ui';
import { MathRenderer } from '@/components/common/MathRenderer';
import { useExamStore } from '@/stores/exam-store';
import { useAppStore } from '@/stores/app-store';
import { useSubjectStore } from '@/stores/subject-store';
import { useQuestionStore } from '@/stores/question-store';
import { db } from '@/services/database';
import { authService } from '@/services/auth-service';
import { formatDateTime, formatDuration, formatPercentage, cn } from '@/utils';
import type { Attempt } from '@/types';
import {
  ListChecks, History, BarChart3,
  Star, Upload, Save, Settings, ArrowLeft, Award, Trash2,
  Download, Sun, Moon, Eye, CheckCircle2, XCircle, BookOpen,
  Palette, Lock, HardDrive, AlertCircle, Target, RotateCcw,
  Search, Filter, Trophy, Clock, Lightbulb, Flame, Sparkles,
  Volume2, Volume1, VolumeX, Music, SlidersHorizontal,
  ExternalLink, Mail, Copy, Check, Info, HelpCircle,
  RefreshCw, ArrowRight, ShieldCheck, Key
} from 'lucide-react';

import toast from 'react-hot-toast';

import { StreakFlameBadge, getStreakTier } from '@/components/quiz/StreakFlameBadge';
import { KnowledgeGapSection } from '@/components/analytics/KnowledgeGapSection';
import { soundscapeService } from '@/services/soundscape-service';
import { useUpdaterStore } from '@/stores/updater-store';
import { useLicenseStore } from '@/stores/license-store';
import { APP_NAME, APP_DISPLAY_VERSION, APP_AUTHOR, APP_CONTACT, APP_FACEBOOK } from '@/constants/version';


const PlaceholderPage: React.FC<{ title: string; icon: React.ReactNode; desc: string }> = ({ title, icon, desc }) => (
  <EmptyState icon={icon} title={title} description={desc} />
);

export const StatisticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { subjects, chapters } = useSubjectStore();
  const { questions } = useQuestionStore();
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>('all');
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState<{
    totalQuestions: number;
    masteredCount: number;
    wrongCount: number;
    learningCount: number;
    newCount: number;
    masteryRate: number;
    avgScore: number;
    totalAttempts: number;
    subjectCount: number;
    chapterCount: number;
  }>({
    totalQuestions: 0,
    masteredCount: 0,
    wrongCount: 0,
    learningCount: 0,
    newCount: 0,
    masteryRate: 0,
    avgScore: 0,
    totalAttempts: 0,
    subjectCount: 0,
    chapterCount: 0,
  });

  React.useEffect(() => {
    loadStats();
  }, [questions, subjects, chapters, selectedSubjectId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const rawQs = questions.length > 0 ? questions : await db.questions.toArray();
      const rawAttempts = await db.attempts.filter(a => a.isCompleted).toArray();

      let allQs = rawQs;
      let allAttempts = rawAttempts;
      let relevantChapters = chapters;

      if (selectedSubjectId !== 'all') {
        allQs = rawQs.filter(q => q.subjectId === selectedSubjectId);
        allAttempts = rawAttempts.filter(a => a.subjectId === selectedSubjectId);
        relevantChapters = chapters.filter(c => c.subjectId === selectedSubjectId);
      }

      const mastered = allQs.filter(q => q.status === 'mastered').length;
      const wrong = allQs.filter(q => (q.wrongCount ?? 0) > 0 && q.status !== 'mastered').length;
      const learning = allQs.filter(q => q.status === 'learning' || q.status === 'needs_review').length;
      const newQs = allQs.filter(q => q.status === 'new' || q.status === 'unattempted').length;

      const masteryRate = allQs.length > 0 ? (mastered / allQs.length) * 100 : 0;
      const avgScore = allAttempts.length > 0
        ? allAttempts.reduce((sum, a) => sum + a.score, 0) / allAttempts.length
        : 0;

      setStats({
        totalQuestions: allQs.length,
        masteredCount: mastered,
        wrongCount: wrong,
        learningCount: learning,
        newCount: newQs,
        masteryRate,
        avgScore,
        totalAttempts: allAttempts.length,
        subjectCount: selectedSubjectId === 'all' ? subjects.length : 1,
        chapterCount: relevantChapters.length,
      });
    } catch (err) {
      console.error('Error loading stats page:', err);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Thống kê & Lỗ hổng kiến thức</h1>
        <div className="h-32 bg-[hsl(var(--muted))] rounded-xl animate-shimmer" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2 text-[hsl(var(--foreground))]">
            <BarChart3 className="text-[hsl(var(--primary))]" size={24} />
            <span>Thống Kê & Phân Tích Học Tập</span>
          </h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Tổng hợp tiến độ thành thạo và phát hiện các vùng kiến thức cần cải thiện
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
          {/* Subject Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">Môn:</span>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] text-xs font-bold text-[hsl(var(--foreground))] shadow-2xs hover:border-[hsl(var(--primary)/0.5)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] transition-all cursor-pointer"
            >
              <option value="all">📚 Tất cả môn ({subjects.length})</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          <Button variant="outline" size="sm" icon={<ArrowLeft size={15} />} onClick={() => navigate('/')} className="rounded-xl">
            Quay lại Dashboard
          </Button>
        </div>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-1">
          <p className="text-[11px] text-[hsl(var(--muted-foreground))] font-semibold">Tỷ lệ Thành thạo</p>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-500">{stats.masteryRate.toFixed(1)}%</p>
          <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{stats.masteredCount}/{stats.totalQuestions} câu thành thạo</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-1">
          <p className="text-[11px] text-[hsl(var(--muted-foreground))] font-semibold">Số câu cần ôn lại</p>
          <p className="text-xl sm:text-2xl font-extrabold text-amber-500">{stats.wrongCount}</p>
          <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Chưa đạt độ chính xác</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-1">
          <p className="text-[11px] text-[hsl(var(--muted-foreground))] font-semibold">Điểm số trung bình</p>
          <p className="text-xl sm:text-2xl font-extrabold text-indigo-500">{stats.avgScore.toFixed(1)} <span className="text-xs font-normal text-[hsl(var(--muted-foreground))]">/ 10</span></p>
          <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{stats.totalAttempts} lần hoàn thành bài thi</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-1">
          <p className="text-[11px] text-[hsl(var(--muted-foreground))] font-semibold">Tổng số câu hỏi</p>
          <p className="text-xl sm:text-2xl font-extrabold text-[hsl(var(--foreground))]">{stats.totalQuestions}</p>
          <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{stats.subjectCount} môn • {stats.chapterCount} chương</p>
        </div>
      </div>

      {/* Knowledge Gap Section (Filtered by Subject) */}
      <KnowledgeGapSection subjectId={selectedSubjectId === 'all' ? undefined : selectedSubjectId} />
    </div>
  );
};

export const BookmarksPage: React.FC = () => <PlaceholderPage title="Câu hỏi đã lưu" icon={<Star size={64} />} desc="Xem và ôn tập các câu hỏi đã đánh dấu." />;
export const ExportPage: React.FC = () => <PlaceholderPage title="Export dữ liệu" icon={<Upload size={64} />} desc="Xuất dữ liệu câu hỏi và lịch sử. Tính năng đang được phát triển." />;

// ============================================
// HISTORY PAGE (Dashboard gọn gàng, trực quan)
// ============================================
// HISTORY PAGE (Bố cục Thẻ Bài Grid Trực Quan)
// ============================================
export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { subjects } = useSubjectStore();
  const [attempts, setAttempts] = React.useState<Attempt[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>('all');
  const [filterScore, setFilterScore] = React.useState<'all' | 'high' | 'mid' | 'low'>('all');
  const [selectedAttemptForModal, setSelectedAttemptForModal] = React.useState<Attempt | null>(null);

  React.useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    setLoading(true);
    const all = await db.attempts.toArray();
    const completed = all.filter(a => a.isCompleted).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    setAttempts(completed);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await db.attempts.delete(id);
    setAttempts(prev => prev.filter(a => a.id !== id));
    if (selectedAttemptForModal?.id === id) setSelectedAttemptForModal(null);
    toast.success('Đã xóa bài làm khỏi lịch sử');
  };

  // Subject-scoped attempts for KPIs
  const subjectAttempts = selectedSubjectId === 'all'
    ? attempts
    : attempts.filter(a => a.subjectId === selectedSubjectId);

  // KPIs
  const totalCount = subjectAttempts.length;
  const avgScore = totalCount > 0 ? subjectAttempts.reduce((acc, a) => acc + (a.score || 0), 0) / totalCount : 0;
  const passCount = subjectAttempts.filter(a => (a.score || 0) >= 5).length;
  const passRate = totalCount > 0 ? (passCount / totalCount) * 100 : 0;
  const totalTimeSpent = subjectAttempts.reduce((acc, a) => acc + (a.timeSpent || 0), 0);

  // Filtered List
  const filteredAttempts = attempts.filter(att => {
    if (selectedSubjectId !== 'all' && att.subjectId !== selectedSubjectId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!att.examName?.toLowerCase().includes(q)) return false;
    }
    if (filterScore === 'high') return (att.percentage || 0) >= 80;
    if (filterScore === 'mid') return (att.percentage || 0) >= 50 && (att.percentage || 0) < 80;
    if (filterScore === 'low') return (att.percentage || 0) < 50;
    return true;
  });

  if (loading) return <div className="animate-shimmer h-40 rounded-3xl bg-[hsl(var(--muted))] max-w-7xl mx-auto" />;

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[hsl(var(--foreground))] flex items-center gap-2.5">
            <History className="text-[hsl(var(--primary))]" size={24} />
            <span>Lịch Sử Làm Bài & Luyện Tập</span>
          </h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            Tổng hợp kết quả các bài thi đã làm. Theo dõi tiến độ và mở xem chi tiết từng lượt thi.
          </p>
        </div>
        <Button onClick={() => navigate('/quiz/setup')} className="self-start sm:self-center shadow-xs">
          Làm bài thi mới
        </Button>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-1">
          <span className="text-xs text-[hsl(var(--muted-foreground))] font-semibold">Tổng lượt thi</span>
          <p className="text-xl sm:text-2xl font-extrabold text-[hsl(var(--foreground))]">{totalCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-1">
          <span className="text-xs text-[hsl(var(--muted-foreground))] font-semibold">Điểm trung bình</span>
          <p className="text-xl sm:text-2xl font-extrabold text-indigo-500">{avgScore.toFixed(1)} <span className="text-xs font-normal text-[hsl(var(--muted-foreground))]">/ 10</span></p>
        </div>
        <div className="p-4 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-1">
          <span className="text-xs text-[hsl(var(--muted-foreground))] font-semibold">Tỷ lệ đạt (≥5đ)</span>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-500">{passRate.toFixed(0)}%</p>
        </div>
        <div className="p-4 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-1">
          <span className="text-xs text-[hsl(var(--muted-foreground))] font-semibold">Tổng thời gian thi</span>
          <p className="text-xl sm:text-2xl font-extrabold text-cyan-500">{formatDuration(totalTimeSpent)}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-3 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Left: Search & Subject Selector */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên bài thi..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          {/* Subject Filter Dropdown */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] text-xs font-bold text-[hsl(var(--foreground))] shadow-2xs hover:border-[hsl(var(--primary)/0.5)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] transition-all cursor-pointer"
            >
              <option value="all">📚 Tất cả môn ({subjects.length})</option>
              {subjects.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Score Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto text-[11px] font-bold">
          <button
            onClick={() => setFilterScore('all')}
            className={cn(
              'px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap',
              filterScore === 'all'
                ? 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.3)]'
                : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.5)]'
            )}
          >
            Tất cả ({subjectAttempts.length})
          </button>
          <button
            onClick={() => setFilterScore('high')}
            className={cn(
              'px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap',
              filterScore === 'high'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.5)]'
            )}
          >
            Giỏi (≥8đ)
          </button>
          <button
            onClick={() => setFilterScore('mid')}
            className={cn(
              'px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap',
              filterScore === 'mid'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.5)]'
            )}
          >
            Khá (5-7.9đ)
          </button>
          <button
            onClick={() => setFilterScore('low')}
            className={cn(
              'px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap',
              filterScore === 'low'
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.5)]'
            )}
          >
            Chưa đạt (&lt;5đ)
          </button>
        </div>
      </div>

      {/* History Cards Grid (3 Columns) */}
      {attempts.length === 0 ? (
        <EmptyState
          icon={<History size={48} />}
          title="Chưa có lịch sử làm bài"
          description="Hãy tạo hoặc bắt đầu một bài thi trắc nghiệm để lưu lại tiến độ học tập của bạn."
          action={<Button onClick={() => navigate('/quiz/setup')}>Bắt đầu làm bài</Button>}
        />
      ) : filteredAttempts.length === 0 ? (
        <div className="p-8 text-center bg-[hsl(var(--card))] rounded-3xl border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] text-xs">
          Không tìm thấy bài thi nào phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filteredAttempts.map((att, index) => {
            const isHigh = (att.percentage || 0) >= 80;
            const isMid = (att.percentage || 0) >= 50 && (att.percentage || 0) < 80;

            const modeLabel = att.mode === 'practice'
              ? 'Luyện tập'
              : att.mode === 'exam'
              ? 'Thi thử'
              : att.mode === 'review'
              ? 'Ôn câu sai'
              : 'Tự do';

            const cardBorder = isHigh
              ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.03] to-transparent hover:border-emerald-500/60'
              : isMid
              ? 'border-amber-500/30 bg-gradient-to-br from-amber-500/[0.03] to-transparent hover:border-amber-500/60'
              : 'border-rose-500/30 bg-gradient-to-br from-rose-500/[0.03] to-transparent hover:border-rose-500/60';

            const badgeVariant = isHigh
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              : isMid
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';

            const correctPercent = att.totalQuestions > 0 ? (att.correctCount / att.totalQuestions) * 100 : 0;
            const wrongPercent = att.totalQuestions > 0 ? (att.wrongCount / att.totalQuestions) * 100 : 0;
            const skippedPercent = att.totalQuestions > 0 ? ((att.skippedCount || 0) / att.totalQuestions) * 100 : 0;

            const maxStreak = (() => {
              if (!att.answers || att.answers.length === 0) return 0;
              let max = 0;
              let curr = 0;
              for (const a of att.answers) {
                if (a.isCorrect) {
                  curr++;
                  if (curr > max) max = curr;
                } else {
                  curr = 0;
                }
              }
              return max;
            })();

            const streakTier = getStreakTier(maxStreak);
            const isTier7 = streakTier?.tier === 7;
            const streakCardBorder = isTier7
              ? ''
              : streakTier 
              ? `border-2 ${streakTier.flagBorder} ${streakTier.glowClass} shadow-md`
              : `border ${cardBorder} shadow-2xs`;

            const cardInnerContent = (
              <>
                <div className="space-y-2.5">
                  {/* Top Row: Mode Tag + Rank + Score Pill */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))] shrink-0">
                        #{index + 1}
                      </span>
                      <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)] truncate">
                        {modeLabel}
                      </span>
                    </div>

                    <div className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black border flex items-center gap-1 ${badgeVariant}`}>
                      {isHigh ? <Trophy size={11} /> : isMid ? <Award size={11} /> : <Target size={11} />}
                      <span>{att.score.toFixed(1)}/10</span>
                    </div>
                  </div>

                  {/* Exam Title */}
                  <div>
                    <h3 
                      className="text-xs sm:text-sm font-extrabold text-[hsl(var(--foreground))] leading-snug group-hover:text-[hsl(var(--primary))] transition-colors line-clamp-2"
                      title={att.examName}
                    >
                      {att.examName || 'Bài thi trắc nghiệm'}
                    </h3>
                    <div className="flex items-center gap-2 text-[10.5px] text-[hsl(var(--muted-foreground))] mt-1 font-medium">
                      <span>{formatDateTime(att.startedAt)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <Clock size={11} /> {formatDuration(att.timeSpent)}
                      </span>
                    </div>
                  </div>

                  {/* Streak Flame Record Badge (If achieved streak >= 3) */}
                  {maxStreak >= 3 && (
                    <div className="pt-0.5">
                      <StreakFlameBadge streak={maxStreak} compact showLabel />
                    </div>
                  )}

                  {/* Stacked Proportional Segment Bar */}
                  <div className="w-full h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden flex shadow-2xs">
                    {correctPercent > 0 && (
                      <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${correctPercent}%` }} />
                    )}
                    {wrongPercent > 0 && (
                      <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${wrongPercent}%` }} />
                    )}
                    {skippedPercent > 0 && (
                      <div className="h-full bg-zinc-400 dark:bg-zinc-600 transition-all duration-500" style={{ width: `${skippedPercent}%` }} />
                    )}
                  </div>


                  {/* 3 Metric Pills */}
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[10.5px]">
                    <div className="p-1 rounded-lg bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))]">
                      <span className="text-[9px] text-[hsl(var(--muted-foreground))] block">Đúng</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{att.correctCount} câu</span>
                    </div>
                    <div className="p-1 rounded-lg bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))]">
                      <span className="text-[9px] text-[hsl(var(--muted-foreground))] block">Sai</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">{att.wrongCount} câu</span>
                    </div>
                    <div className="p-1 rounded-lg bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))]">
                      <span className="text-[9px] text-[hsl(var(--muted-foreground))] block">Tổng</span>
                      <span className="font-bold text-[hsl(var(--foreground))] font-mono">{att.totalQuestions} câu</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-1 flex items-center justify-between gap-1.5 border-t border-[hsl(var(--border)/0.6)]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAttemptForModal(att);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] hover:bg-[hsl(var(--primary)/0.15)] transition-colors cursor-pointer"
                  >
                    Xem chi tiết
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/quiz/review/${att.id}`);
                      }}
                      className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
                      title="Xem lại từng câu hỏi"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(att.id);
                      }}
                      className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Xóa bài làm này"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </>
            );

            if (isTier7) {
              return (
                <div
                  key={att.id}
                  onClick={() => setSelectedAttemptForModal(att)}
                  className="rainbow-card-wrapper transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
                >
                  <div className="rainbow-card-inner p-4 flex flex-col justify-between space-y-3">
                    {cardInnerContent}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={att.id}
                onClick={() => setSelectedAttemptForModal(att)}
                className={`p-4 rounded-3xl transition-all duration-300 flex flex-col justify-between space-y-3 group cursor-pointer hover:-translate-y-1 ${streakCardBorder} ${streakTier ? 'bg-gradient-to-b from-[hsl(var(--card))] to-[hsl(var(--card)/0.92)]' : 'bg-[hsl(var(--card))] hover:shadow-xs'}`}
              >
                {cardInnerContent}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================== */}
      {/* ATTEMPT DETAILS MODAL                                      */}
      {/* ========================================================== */}
      {selectedAttemptForModal && (
        <Modal
          open={Boolean(selectedAttemptForModal)}
          onClose={() => setSelectedAttemptForModal(null)}
          title="Chi Tiết Lượt Thi"
          description={formatDateTime(selectedAttemptForModal.startedAt)}
          size="lg"
        >
          <div className="space-y-4 pt-1">
            {/* Header Card */}
            <div className="p-4 rounded-2xl bg-[hsl(var(--muted)/0.35)] border border-[hsl(var(--border))] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)]">
                  {selectedAttemptForModal.mode === 'practice' ? 'Luyện tập' : selectedAttemptForModal.mode === 'exam' ? 'Thi thử' : 'Ôn tập'}
                </span>
                <span className={cn(
                  'text-xs font-bold px-2.5 py-0.5 rounded-full border',
                  (selectedAttemptForModal.percentage || 0) >= 80
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : (selectedAttemptForModal.percentage || 0) >= 50
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                )}>
                  {(selectedAttemptForModal.percentage || 0) >= 80 ? '🏆 Đạt Giỏi' : (selectedAttemptForModal.percentage || 0) >= 50 ? '⭐ Đạt Khá' : '⚠️ Chưa Đạt'}
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-black text-[hsl(var(--foreground))]">
                {selectedAttemptForModal.examName || 'Bài thi trắc nghiệm'}
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Bắt đầu lúc {formatDateTime(selectedAttemptForModal.startedAt)} • Hoàn thành trong {formatDuration(selectedAttemptForModal.timeSpent)}
              </p>
            </div>

            {/* 4 Score and Performance Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="p-3 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/20">
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 block">Điểm số</span>
                <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                  {selectedAttemptForModal.score.toFixed(1)} / 10
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20">
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block">Số câu đúng</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {selectedAttemptForModal.correctCount} / {selectedAttemptForModal.totalQuestions}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/[0.06] border border-rose-500/20">
                <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 block">Số câu sai</span>
                <span className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
                  {selectedAttemptForModal.wrongCount} câu
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))]">
                <span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] block">Tốc độ TB</span>
                <span className="text-xl font-black text-[hsl(var(--foreground))] font-mono">
                  {selectedAttemptForModal.totalQuestions > 0 ? (selectedAttemptForModal.timeSpent / selectedAttemptForModal.totalQuestions).toFixed(1) : 0}s/câu
                </span>
              </div>
            </div>

            {/* Streak Tribute in Modal */}
            {(() => {
              if (!selectedAttemptForModal.answers || selectedAttemptForModal.answers.length === 0) return null;
              let max = 0;
              let curr = 0;
              for (const a of selectedAttemptForModal.answers) {
                if (a.isCorrect) {
                  curr++;
                  if (curr > max) max = curr;
                } else {
                  curr = 0;
                }
              }
              if (max < 3) return null;
              return (
                <div className="p-3 rounded-2xl bg-amber-500/[0.08] border border-amber-500/30 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-500 animate-pulse" />
                    <span className="text-xs font-bold text-[hsl(var(--foreground))]">Kỷ lục chuỗi trả lời đúng liên tiếp:</span>
                  </div>
                  <StreakFlameBadge streak={max} />
                </div>
              );
            })()}

            {/* Actions in Modal */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[hsl(var(--border))]">
              <button
                type="button"
                onClick={() => setSelectedAttemptForModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = selectedAttemptForModal.id;
                  setSelectedAttemptForModal(null);
                  navigate(`/quiz/review/${id}`);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Eye size={13} />
                <span>Xem lại từng câu</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = selectedAttemptForModal.id;
                  setSelectedAttemptForModal(null);
                  navigate(`/quiz/result/${id}`);
                }}
                className="px-4.5 py-2 rounded-xl text-xs font-extrabold bg-[hsl(var(--primary))] hover:opacity-90 text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <BarChart3 size={13} />
                <span>Bảng phân tích toàn diện</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};


// ============================================
// QUIZ REVIEW PAGE - Split-View Pro Layout (Mở Rộng max-w-7xl)
// ============================================

export const QuizReviewPage: React.FC = () => {
  const { attemptId } = useParams();
  const [searchParams] = useSearchParams();
  const targetQuestionParam = searchParams.get('question');
  const navigate = useNavigate();
  const [attempt, setAttempt] = React.useState<Attempt | null>(null);
  const [questions, setQuestions] = React.useState<Map<string, any>>(new Map());
  
  // Selected question index for focus view (0-indexed)
  const [selectedIdx, setSelectedIdx] = React.useState<number>(0);
  
  // View mode: 'single' (Focus từng câu) | 'list' (Danh sách rộng)
  const [viewMode, setViewMode] = React.useState<'single' | 'list'>('single');
  
  // Filter: 'all' | 'wrong' | 'correct' | 'trap'
  const [filter, setFilter] = React.useState<'all' | 'wrong' | 'correct' | 'trap'>('all');

  React.useEffect(() => {
    if (attemptId) loadReview();
  }, [attemptId]);

  const loadReview = async () => {
    const att = await db.attempts.get(attemptId!);
    if (!att) return;
    setAttempt(att);
    const qs = await db.questions.where('id').anyOf(att.questionIds).toArray();
    const map = new Map(qs.map(q => [q.id, q]));
    setQuestions(map);

    // If param question provided, focus to it
    if (targetQuestionParam) {
      const idx = parseInt(targetQuestionParam, 10) - 1;
      if (!isNaN(idx) && idx >= 0 && idx < att.answers.length) {
        setSelectedIdx(idx);
      }
    }
  };

  // Sync selected index when search params change
  React.useEffect(() => {
    if (targetQuestionParam && attempt) {
      const idx = parseInt(targetQuestionParam, 10) - 1;
      if (!isNaN(idx) && idx >= 0 && idx < attempt.answers.length) {
        setSelectedIdx(idx);
        // If in list mode, scroll smoothly to element
        if (viewMode === 'list') {
          setTimeout(() => {
            const el = document.getElementById(`review-q-${idx + 1}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }
      }
    }
  }, [targetQuestionParam, attempt, viewMode]);

  if (!attempt) return <div className="animate-shimmer h-40 rounded-3xl bg-[hsl(var(--muted))] max-w-7xl mx-auto" />;

  // Filter items based on tab
  const itemsWithIdx = attempt.answers.map((ans, idx) => ({ ans, idx, q: questions.get(ans.questionId) }));
  
  const filteredList = itemsWithIdx.filter(({ ans }) => {
    if (filter === 'wrong') return !ans.isCorrect && ans.selectedAnswer;
    if (filter === 'correct') return ans.isCorrect;
    if (filter === 'trap') return !ans.isCorrect && (ans.timeSpent || 0) >= 60;
    return true;
  });

  const currentItem = itemsWithIdx[selectedIdx] || itemsWithIdx[0];
  const currentQ = currentItem?.q;
  const currentAns = currentItem?.ans;

  const totalWrong = attempt.wrongCount || attempt.answers.filter(a => !a.isCorrect && a.selectedAnswer).length;
  const totalCorrect = attempt.correctCount || attempt.answers.filter(a => a.isCorrect).length;
  const totalTraps = attempt.answers.filter(a => !a.isCorrect && (a.timeSpent || 0) >= 60).length;

  const getVisualLabel = (shuffledLabels: string[] | undefined, dbLabel: string) => {
    if (!shuffledLabels) return dbLabel;
    const index = shuffledLabels.indexOf(dbLabel);
    return index >= 0 ? String.fromCharCode(65 + index) : dbLabel;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/quiz/result/${attempt.id}`)}
            className="p-2.5 rounded-xl bg-[hsl(var(--muted)/0.6)] hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-all cursor-pointer"
            title="Quay lại báo cáo kết quả"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-[hsl(var(--foreground))] tracking-tight">
                Xem Lại Bài Làm: {attempt.examName}
              </h1>
              <Badge variant="default" className="text-[10px] font-bold">
                Điểm: {attempt.score.toFixed(1)}/10
              </Badge>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              Đúng: <strong className="text-emerald-500">{totalCorrect}</strong> • Sai: <strong className="text-rose-500">{totalWrong}</strong> • Thời gian: <strong>{formatDuration(attempt.timeSpent)}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
          {/* View Mode Toggle: Single Question Focus vs Full List */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] text-xs">
            <button
              onClick={() => setViewMode('single')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer',
                viewMode === 'single'
                  ? 'bg-[hsl(var(--card))] shadow-xs text-[hsl(var(--foreground))] border border-[hsl(var(--border))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              )}
            >
              <Target size={14} className="text-indigo-500" />
              <span>Xem từng câu (Focus)</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer',
                viewMode === 'list'
                  ? 'bg-[hsl(var(--card))] shadow-xs text-[hsl(var(--foreground))] border border-[hsl(var(--border))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              )}
            >
              <BookOpen size={14} className="text-cyan-500" />
              <span>Danh sách rộng</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={<History size={14} className="text-[hsl(var(--primary))]" />}
            onClick={() => navigate('/history')}
            className="rounded-xl text-xs"
          >
            Lịch sử
          </Button>
        </div>
      </div>


      {/* 2. Main Split-View Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Question Content Showcase (lg:col-span-8 / xl:col-span-9) */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          
          {/* MODE 1: SINGLE QUESTION FOCUS (No scrolling required!) */}
          {viewMode === 'single' && currentQ && currentAns && (
            <Card className="p-6 md:p-8 rounded-3xl border-2 border-[hsl(var(--border))] shadow-md space-y-6 animate-fade-in bg-[hsl(var(--card))]">
              
              {/* Question Top Header with Prev/Next Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[hsl(var(--border))]">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <Badge
                    variant={currentAns.isCorrect ? 'success' : currentAns.selectedAnswer ? 'destructive' : 'secondary'}
                    className="text-xs font-extrabold px-3 py-1"
                  >
                    Câu {selectedIdx + 1} / {attempt.answers.length}
                  </Badge>
                  
                  {currentAns.timeSpent ? (
                    <span className="inline-flex items-center gap-1 text-xs font-mono font-medium px-2.5 py-1 rounded-xl bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] text-[hsl(var(--foreground))]">
                      ⏱️ Thời gian: <strong>{currentAns.timeSpent}s</strong>
                    </span>
                  ) : null}

                  {currentQ.difficulty && (
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      Độ khó: <strong>{currentQ.difficulty === 'easy' ? 'Dễ' : currentQ.difficulty === 'hard' ? 'Khó' : 'Trung bình'}</strong>
                    </span>
                  )}
                </div>

                {/* Next / Prev Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedIdx(i => Math.max(0, i - 1))}
                    disabled={selectedIdx === 0}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-xs font-bold text-[hsl(var(--foreground))] border border-[hsl(var(--border))] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                  >
                    <ArrowLeft size={14} />
                    <span className="hidden sm:inline">Câu trước</span>
                  </button>
                  <button
                    onClick={() => setSelectedIdx(i => Math.min(attempt.answers.length - 1, i + 1))}
                    disabled={selectedIdx === attempt.answers.length - 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[hsl(var(--primary))] hover:opacity-90 text-xs font-bold text-white shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                  >
                    <span className="hidden sm:inline">Câu sau</span>
                    <ArrowLeft size={14} className="rotate-180" />
                  </button>
                </div>
              </div>

              {/* Question Content */}
              <div className="text-base sm:text-lg md:text-xl font-medium leading-relaxed text-[hsl(var(--foreground))]">
                <MathRenderer text={currentQ.content} />
              </div>

              {/* Question Image if present */}
              {currentQ.imageUrl && (
                <div className="flex justify-center my-3">
                  <img src={currentQ.imageUrl} alt="Minh họa câu hỏi" className="max-h-72 rounded-2xl border border-[hsl(var(--border))] object-contain" />
                </div>
              )}

              {/* Options in 2-Column Responsive Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {(() => {
                  const shuffledLabels = attempt.shuffledAnswerMap?.[currentQ.id];
                  const displayAnswers = shuffledLabels 
                    ? shuffledLabels.map((lbl: string) => currentQ.answers.find((a: any) => a.label === lbl)).filter(Boolean) as any[]
                    : currentQ.answers;

                  return displayAnswers.map((a: any, aIdx: number) => {
                    const visualLabel = String.fromCharCode(65 + aIdx);
                    const isUserChosen = currentAns.selectedAnswer?.includes(a.label);
                    const isCorrect = a.isCorrect;

                    let optionClass = 'bg-[hsl(var(--muted)/0.25)] border-[hsl(var(--border))] text-[hsl(var(--foreground))]';
                    let badgeColor = 'bg-[hsl(var(--muted)/0.8)] border-[hsl(var(--border))] text-[hsl(var(--foreground))]';

                    if (isCorrect) {
                      optionClass = 'bg-emerald-500/10 border-2 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-semibold shadow-xs';
                      badgeColor = 'bg-emerald-500 text-white border-emerald-600';
                    } else if (isUserChosen && !isCorrect) {
                      optionClass = 'bg-rose-500/10 border-2 border-rose-500 text-rose-800 dark:text-rose-300 font-semibold shadow-xs';
                      badgeColor = 'bg-rose-500 text-white border-rose-600';
                    }

                    return (
                      <div
                        key={a.id}
                        className={cn('flex items-start gap-3 p-3.5 rounded-2xl border transition-all text-xs sm:text-sm leading-relaxed', optionClass)}
                      >
                        <div className={cn('w-7 h-7 rounded-xl flex items-center justify-center font-bold font-mono shrink-0 text-xs border shadow-xs', badgeColor)}>
                          {isCorrect ? <CheckCircle2 size={14} /> : isUserChosen ? <XCircle size={14} /> : visualLabel}
                        </div>
                        <div className="flex-1 pt-0.5">
                          <MathRenderer text={a.content} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Result Comparison Strip */}
              <div className="p-3.5 rounded-2xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-xs flex flex-wrap items-center justify-between gap-2">
                <span>
                  Lựa chọn của bạn: <strong>{currentAns.selectedAnswer ? currentAns.selectedAnswer.split(',').map((lbl: string) => getVisualLabel(attempt.shuffledAnswerMap?.[currentQ.id], lbl.trim())).sort().join(', ') : 'Bỏ trống'}</strong>
                </span>
                <span>
                  Đáp án chuẩn: <strong className="text-emerald-500">{currentQ.correctAnswer.split(',').map((lbl: string) => getVisualLabel(attempt.shuffledAnswerMap?.[currentQ.id], lbl.trim())).sort().join(', ')}</strong>
                </span>
              </div>

              {/* Detailed Explanation Box */}
              {currentQ.explanation && (
                <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 text-xs sm:text-sm space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400">
                    <Lightbulb size={16} />
                    <span>💡 Lời giải & Phân tích chi tiết:</span>
                  </div>
                  <div className="leading-relaxed text-[hsl(var(--foreground))]">
                    <MathRenderer text={currentQ.explanation} />
                  </div>
                </div>
              )}

            </Card>
          )}

          {/* MODE 2: WIDE GRID LIST (Full cards rendered with 2-column options) */}
          {viewMode === 'list' && (
            <div className="space-y-4">
              {filteredList.map(({ ans, idx, q }) => {
                if (!q) return null;
                const isSelected = selectedIdx === idx;
                const shuffledLabels = attempt.shuffledAnswerMap?.[q.id];
                const displayAnswers = shuffledLabels 
                  ? shuffledLabels.map((lbl: string) => q.answers.find((a: any) => a.label === lbl)).filter(Boolean) as any[]
                  : q.answers;

                return (
                  <Card
                    key={ans.questionId}
                    id={`review-q-${idx + 1}`}
                    onClick={() => setSelectedIdx(idx)}
                    className={cn(
                      'p-5 sm:p-6 rounded-3xl transition-all duration-300 space-y-4 border-2 bg-[hsl(var(--card))]',
                      isSelected
                        ? 'border-indigo-500 ring-4 ring-indigo-500/20 shadow-lg'
                        : 'border-[hsl(var(--border))]'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-[hsl(var(--border))]">
                      <div className="flex items-center gap-2">
                        <Badge variant={ans.isCorrect ? 'success' : ans.selectedAnswer ? 'destructive' : 'secondary'} className="text-xs font-bold">
                          Câu {idx + 1}
                        </Badge>
                        {ans.timeSpent ? (
                          <span className="text-[11px] font-mono text-[hsl(var(--muted-foreground))]">
                            ⏱️ {ans.timeSpent}s
                          </span>
                        ) : null}
                      </div>
                      {ans.isCorrect ? (
                        <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 size={15} /> Đúng
                        </span>
                      ) : ans.selectedAnswer ? (
                        <span className="text-xs font-bold text-rose-500 flex items-center gap-1">
                          <XCircle size={15} /> Sai
                        </span>
                      ) : (
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">Bỏ trống</span>
                      )}
                    </div>

                    <div className="text-sm sm:text-base font-medium leading-relaxed text-[hsl(var(--foreground))]">
                      <MathRenderer text={q.content} />
                    </div>

                    {/* 2-column options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {displayAnswers.map((a: any, aIdx: number) => {
                        const visualLabel = String.fromCharCode(65 + aIdx);
                        const isUserChosen = ans.selectedAnswer?.includes(a.label);
                        const isCorrect = a.isCorrect;

                        return (
                          <div
                            key={a.id}
                            className={cn(
                              'flex items-start gap-2.5 px-3 py-2 rounded-xl text-xs border leading-relaxed',
                              isCorrect
                                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-800 dark:text-emerald-300 font-semibold'
                                : isUserChosen && !isCorrect
                                ? 'bg-rose-500/10 border-rose-500/50 text-rose-800 dark:text-rose-300 font-semibold'
                                : 'bg-[hsl(var(--muted)/0.2)] border-[hsl(var(--border))] text-[hsl(var(--foreground))]'
                            )}
                          >
                            <span className="font-bold font-mono">{visualLabel}.</span>
                            <div className="flex-1">
                              <MathRenderer text={a.content} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="text-xs text-[hsl(var(--muted-foreground))] p-3 rounded-2xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] leading-relaxed">
                        <span className="font-bold text-[hsl(var(--foreground))] block mb-1">💡 Lời giải chi tiết:</span>
                        <MathRenderer text={q.explanation} />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

        </div>

        {/* Right Column: Sticky Question Navigator & Filters (lg:col-span-4 / xl:col-span-3) */}
        <div className="lg:col-span-4 xl:col-span-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-4 shadow-xs sticky top-4 space-y-3.5">
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-1.5">
              <ListChecks size={15} className="text-[hsl(var(--primary))]" />
              <span>Ma Trận Câu Hỏi</span>
            </h3>
            <span className="text-[11px] font-mono text-[hsl(var(--muted-foreground))]">
              {attempt.answers.length} câu
            </span>
          </div>

          {/* Quick Filter Tabs */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'py-1.5 px-2 rounded-xl font-bold border transition-all cursor-pointer text-center truncate',
                filter === 'all'
                  ? 'bg-[hsl(var(--primary)/0.15)] border-[hsl(var(--primary)/0.4)] text-[hsl(var(--primary))] shadow-2xs'
                  : 'bg-[hsl(var(--muted)/0.3)] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'
              )}
            >
              Tất cả ({attempt.answers.length})
            </button>
            <button
              onClick={() => setFilter('wrong')}
              className={cn(
                'py-1.5 px-2 rounded-xl font-bold border transition-all cursor-pointer text-center truncate',
                filter === 'wrong'
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400 shadow-2xs'
                  : 'bg-[hsl(var(--muted)/0.3)] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'
              )}
            >
              Sai ({totalWrong}) ✗
            </button>
            <button
              onClick={() => setFilter('correct')}
              className={cn(
                'py-1.5 px-2 rounded-xl font-bold border transition-all cursor-pointer text-center truncate',
                filter === 'correct'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                  : 'bg-[hsl(var(--muted)/0.3)] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'
              )}
            >
              Đúng ({totalCorrect}) ✓
            </button>
            <button
              onClick={() => setFilter('trap')}
              className={cn(
                'py-1.5 px-2 rounded-xl font-bold border transition-all cursor-pointer text-center truncate',
                filter === 'trap'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 shadow-2xs'
                  : 'bg-[hsl(var(--muted)/0.3)] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'
              )}
            >
              Bẫy ({totalTraps}) ⚠️
            </button>
          </div>

          {/* Question Grid Matrix */}
          <div className="max-h-[55vh] overflow-y-auto custom-scrollbar p-1">
            <div className="grid grid-cols-5 gap-2">
              {attempt.answers.map((ans, idx) => {
                const isSelected = selectedIdx === idx;
                const isCorrect = ans.isCorrect;
                const isAnswered = Boolean(ans.selectedAnswer);
                const isTrap = !isCorrect && (ans.timeSpent || 0) >= 60;

                // Dim items that don't match current filter
                let isDimmed = false;
                if (filter === 'wrong' && (isCorrect || !isAnswered)) isDimmed = true;
                if (filter === 'correct' && !isCorrect) isDimmed = true;
                if (filter === 'trap' && !isTrap) isDimmed = true;

                let btnClass = 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500';
                if (isCorrect) {
                  btnClass = 'bg-emerald-500/15 border-emerald-500/35 text-emerald-600 dark:text-emerald-400 font-bold';
                } else if (isAnswered) {
                  btnClass = isTrap
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold'
                    : 'bg-rose-500/15 border-rose-500/35 text-rose-600 dark:text-rose-400 font-bold';
                }

                if (isSelected) {
                  btnClass += ' ring-2 ring-indigo-500 ring-offset-2 ring-offset-[hsl(var(--card))] border-indigo-500 font-black shadow-xs';
                }

                if (isDimmed) {
                  btnClass += ' opacity-25';
                }

                return (
                  <button
                    key={ans.questionId}
                    onClick={() => {
                      setSelectedIdx(idx);
                      if (viewMode === 'list') {
                        const el = document.getElementById(`review-q-${idx + 1}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                    className={cn(
                      'aspect-square rounded-xl text-xs font-semibold border transition-all flex flex-col items-center justify-center relative cursor-pointer hover:brightness-105',
                      btnClass
                    )}
                    title={`Câu ${idx + 1}: ${isCorrect ? 'Đúng' : 'Sai'} (${ans.timeSpent || 0}s)`}
                  >
                    <span>{idx + 1}</span>
                    {ans.timeSpent ? (
                      <span className="text-[8px] font-mono opacity-70 leading-none mt-0.5">
                        {ans.timeSpent}s
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-[hsl(var(--border))] flex items-center justify-between text-[11px] text-[hsl(var(--muted-foreground))]">
            <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-500" /> Đúng</span>
            <span className="flex items-center gap-1"><XCircle size={12} className="text-rose-500" /> Sai</span>
            <span className="flex items-center gap-1"><AlertCircle size={12} className="text-amber-500" /> Bẫy</span>
          </div>
        </div>

      </div>
    </div>
  );
};

// ============================================
// SETTINGS PAGE
// ============================================

import { THEME_PRESETS } from '@/constants/themes';
import { backupRepository } from '@/services/repositories/backup-repository';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    theme, setTheme, 
    colorTheme, setColorTheme,
    customGradient, setCustomGradient,
    masteryScoreThreshold, setMasteryScoreThreshold,
    easyDifficultyThreshold, setEasyDifficultyThreshold,
    hardDifficultyThreshold, setHardDifficultyThreshold,
    streakNotificationEnabled, setStreakNotificationEnabled,
    streakNotificationMode, setStreakNotificationMode,
    streakMinThreshold, setStreakMinThreshold,
  } = useAppStore();

  const [showCustomGradientModal, setShowCustomGradientModal] = React.useState(false);

  const handleExportBackup = async () => {
    try {
      const backup = await backupRepository.exportBackupJSON();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quiz_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Đã tạo file backup');
    } catch {
      toast.error('Lỗi khi tạo file backup');
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await backupRepository.restoreBackupJSON(data);
      toast.success(`Đã khôi phục dữ liệu từ backup`);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi đọc file backup');
    }
  };

  const handleClearData = async () => {
    const confirmation = window.prompt(
      'CẢNH BÁO: Hành động này sẽ xóa TOÀN BỘ ngân hàng câu hỏi, môn học, bài thi và lịch sử.\n\nĐể xác nhận xóa, hãy nhập chuỗi: XÓA DỮ LIỆU'
    );
    if (confirmation !== 'XÓA DỮ LIỆU') {
      if (confirmation !== null) toast.error('Xác nhận không đúng, hủy thao tác xóa');
      return;
    }

    try {
      // Auto backup before clearing
      await handleExportBackup();
      await backupRepository.clearAllData();
      toast.success('Đã xóa toàn bộ dữ liệu');
      window.location.reload();
    } catch {
      toast.error('Lỗi khi xóa dữ liệu');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[hsl(var(--foreground))]">
          Cài Đặt Hệ Thống & Giao Diện
        </h1>
        <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-1">
          Tùy biến theme màu sắc, gradient toàn diện và cấu hình tham số học tập cá nhân hóa.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* CỘT TRÁI: Giao diện, Màu sắc, Đánh giá năng lực AI, Phím tắt */}
        <div className="space-y-5">
          
          {/* 1. Theme Mode: Light / Dark */}
          <Card className="rounded-3xl border border-[hsl(var(--border))] shadow-xs">
            <CardContent className="p-5 space-y-3">
              <h2 className="font-bold text-sm sm:text-base flex items-center gap-2 text-[hsl(var(--foreground))]">
                <Sun size={18} className="text-[hsl(var(--primary))]" /> Chế độ hiển thị
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {(['light', 'dark'] as const).map(t => {
                  const isSelected = theme === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`p-3.5 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] shadow-xs ring-1 ring-[hsl(var(--primary)/0.3)]'
                          : 'border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] hover:bg-[hsl(var(--muted)/0.5)]'
                      }`}
                    >
                      {t === 'light' ? (
                        <Sun size={22} className={isSelected ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'} />
                      ) : (
                        <Moon size={22} className={isSelected ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'} />
                      )}
                      <div>
                        <p className={`text-xs sm:text-sm font-bold ${isSelected ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'}`}>
                          {t === 'light' ? 'Chế độ Sáng (Light Mode)' : 'Chế độ Tối (Dark Mode)'}
                        </p>
                        <p className="text-[10.5px] text-[hsl(var(--muted-foreground))]">
                          {t === 'light' ? 'Tươi sáng, rõ nét vào ban ngày' : 'Dịu mắt, tiết kiệm pin ban đêm'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 2. Theme & Gradient System: 10 Curated Palettes */}
          <Card className="rounded-3xl border border-[hsl(var(--border))] shadow-xs">
            <CardContent className="p-5 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="font-bold text-sm sm:text-base flex items-center gap-2 text-[hsl(var(--foreground))]">
                    <Palette size={18} className="text-[hsl(var(--primary))]" /> Hệ thống Màu sắc & Gradient Chủ đạo
                  </h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    Áp dụng đồng bộ xuyên suốt: Thanh điều hướng, Nút bấm, Biểu đồ, Card và Hiệu ứng.
                  </p>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)] shrink-0 self-start sm:self-auto">
                  10 Phối Màu Cao Cấp
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* 11th Special Card: Custom Free Gradient Builder */}
                <div
                  onClick={() => setShowCustomGradientModal(true)}
                  className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-2 ${
                    colorTheme === 'custom'
                      ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] ring-2 ring-[hsl(var(--primary)/0.4)] shadow-xs'
                      : 'border-[hsl(var(--primary)/0.4)] bg-[hsl(var(--primary)/0.03)] hover:bg-[hsl(var(--primary)/0.1)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-lg shadow-2xs shrink-0 flex items-center justify-center text-white text-[11px] font-black"
                        style={{
                          background: `linear-gradient(${customGradient?.angle || 135}deg, ${customGradient?.color1 || '#4f46e5'}, ${customGradient?.color2 || '#06b6d4'})`,
                        }}
                      >
                        {colorTheme === 'custom' ? <CheckCircle2 size={12} className="stroke-[3]" /> : '✨'}
                      </div>
                      <span className="text-xs font-black text-[hsl(var(--primary))]">
                        Tùy Chỉnh Màu Tự Do
                      </span>
                    </div>

                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.3)]">
                      Tự Phối Màu
                    </span>
                  </div>

                  <div
                    className="w-full h-2 rounded-full opacity-95 shadow-2xs"
                    style={{
                      background: `linear-gradient(${customGradient?.angle || 135}deg, ${customGradient?.color1 || '#4f46e5'}, ${customGradient?.color2 || '#06b6d4'})`,
                    }}
                  />

                  <p className="text-[10.5px] text-[hsl(var(--muted-foreground))] leading-tight line-clamp-1">
                    Nhấp để mở bảng phối màu 2 đầu và góc xoay gradient theo ý bạn.
                  </p>
                </div>

                {THEME_PRESETS.map(t => {
                  const isSelected = colorTheme === t.id || (t.id === 'blue-ocean' && colorTheme === 'blue') || (t.id === 'purple-nebula' && (colorTheme === 'violet' || colorTheme === 'nebula')) || (t.id === 'emerald-mint' && (colorTheme === 'emerald' || colorTheme === 'green')) || (t.id === 'sunset-glow' && (colorTheme === 'orange' || colorTheme === 'solar')) || (t.id === 'rose-magenta' && colorTheme === 'rose') || (t.id === 'amber-gold' && colorTheme === 'amber') || (t.id === 'cyan-glacier' && colorTheme === 'ocean') || (t.id === 'aurora-borealis' && colorTheme === 'galactic') || (t.id === 'crimson-ruby' && colorTheme === 'crimson');
                  return (
                    <div
                      key={t.id}
                      onClick={() => setColorTheme(t.id)}
                      className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.06)] ring-2 ring-[hsl(var(--primary)/0.3)] shadow-xs'
                          : 'border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] hover:bg-[hsl(var(--muted)/0.35)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-lg shadow-2xs shrink-0 flex items-center justify-center text-white"
                            style={{ background: t.previewGradient }}
                          >
                            {isSelected && <CheckCircle2 size={12} className="stroke-[3]" />}
                          </div>
                          <span className={`text-xs font-bold ${isSelected ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'}`}>
                            {t.name}
                          </span>
                        </div>

                        <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))]">
                          {t.category === 'calm' ? 'Dịu mắt' : t.category === 'vibrant' ? 'Rực rỡ' : t.category === 'warm' ? 'Ấm áp' : 'Công nghệ'}
                        </span>
                      </div>

                      <div
                        className="w-full h-2 rounded-full opacity-90 shadow-2xs"
                        style={{ background: t.previewGradient }}
                      />

                      <p className="text-[10.5px] text-[hsl(var(--muted-foreground))] leading-tight line-clamp-1">
                        {t.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 3. Đánh giá Năng lực (Độ khó cá nhân) with Live Interactive Simulation Table */}
          <Card className="rounded-3xl border border-[hsl(var(--border))] shadow-xs">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-sm sm:text-base flex items-center gap-2 text-[hsl(var(--foreground))]">
                  <Target size={18} className="text-[hsl(var(--primary))]" /> Đánh giá Năng lực (Độ khó cá nhân)
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)]">
                  Thuật toán AI
                </span>
              </div>
              
              {/* Sliders */}
              <div className="space-y-3.5 pt-1">
                <div className="space-y-1.5 p-3 rounded-2xl bg-[hsl(var(--muted)/0.25)] border border-[hsl(var(--border))]">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-[hsl(var(--foreground))]">Mức độ thành thạo</label>
                    <span className="font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.3)]">{masteryScoreThreshold}%</span>
                  </div>
                  <p className="text-[10.5px] text-[hsl(var(--muted-foreground))]">Tỷ lệ đúng tối thiểu trên tổng số lần làm để xem câu hỏi đã nắm vững.</p>
                  <input 
                    type="range" min="50" max="100" step="5" 
                    value={masteryScoreThreshold} 
                    onChange={e => setMasteryScoreThreshold(parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-[hsl(var(--muted))] rounded-lg appearance-none cursor-pointer accent-[hsl(var(--primary))]"
                  />
                </div>

                <div className="space-y-1.5 p-3 rounded-2xl bg-[hsl(var(--muted)/0.25)] border border-[hsl(var(--border))]">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-emerald-600 dark:text-emerald-400">Tỷ lệ đúng (Câu Dễ)</label>
                    <span className="font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">{easyDifficultyThreshold}%</span>
                  </div>
                  <p className="text-[10.5px] text-[hsl(var(--muted-foreground))]">Ngưỡng tỷ lệ đúng để hệ thống tự động phân loại một câu là dễ với bạn.</p>
                  <input 
                    type="range" min="50" max="100" step="5" 
                    value={easyDifficultyThreshold} 
                    onChange={e => setEasyDifficultyThreshold(parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-[hsl(var(--muted))] rounded-lg appearance-none cursor-pointer accent-[hsl(var(--success))]"
                  />
                </div>

                <div className="space-y-1.5 p-3 rounded-2xl bg-[hsl(var(--muted)/0.25)] border border-[hsl(var(--border))]">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-rose-600 dark:text-rose-400">Tỷ lệ sai (Câu Khó)</label>
                    <span className="font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">{hardDifficultyThreshold}%</span>
                  </div>
                  <p className="text-[10.5px] text-[hsl(var(--muted-foreground))]">Ngưỡng tỷ lệ sai để hệ thống tự động phân loại một câu là khó với bạn.</p>
                  <input 
                    type="range" min="30" max="100" step="5" 
                    value={hardDifficultyThreshold} 
                    onChange={e => setHardDifficultyThreshold(parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-[hsl(var(--muted))] rounded-lg appearance-none cursor-pointer accent-[hsl(var(--destructive))]"
                  />
                </div>
              </div>

              {/* LIVE INTERACTIVE SIMULATION TABLE */}
              <div className="p-3.5 rounded-2xl bg-[hsl(var(--muted)/0.35)] border border-[hsl(var(--border))] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                    <Lightbulb size={14} className="text-amber-500" />
                    <span>Mô phỏng phân loại câu hỏi thực tế:</span>
                  </span>
                  <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--primary))] font-bold">Live</span>
                </div>

                <div className="space-y-2">
                  {/* Case 1: Thành thạo */}
                  <div className="p-2.5 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] flex items-center justify-between gap-2 text-xs transition-all">
                    <div>
                      <span className="font-bold text-[hsl(var(--foreground))] block text-[11px]">Câu A: Làm 5 lần • Đúng 4 lần</span>
                      <span className="text-[10.5px] text-[hsl(var(--muted-foreground))]">
                        Tỷ lệ đúng: <strong className={80 >= masteryScoreThreshold ? 'text-emerald-500 font-mono' : 'text-amber-500 font-mono'}>80%</strong> {80 >= masteryScoreThreshold ? '≥' : '<'} Ngưỡng của bạn ({masteryScoreThreshold}%)
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold border shrink-0 transition-all ${
                      80 >= masteryScoreThreshold
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-2xs'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    }`}>
                      {80 >= masteryScoreThreshold ? '⭐ Đã Thành Thạo' : '🔄 Cần Ôn Thêm'}
                    </span>
                  </div>

                  {/* Case 2: Câu Dễ */}
                  <div className="p-2.5 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] flex items-center justify-between gap-2 text-xs transition-all">
                    <div>
                      <span className="font-bold text-[hsl(var(--foreground))] block text-[11px]">Câu B: Làm 10 lần • Đúng 7 lần</span>
                      <span className="text-[10.5px] text-[hsl(var(--muted-foreground))]">
                        Tỷ lệ đúng: <strong className={70 >= easyDifficultyThreshold ? 'text-blue-500 font-mono' : 'text-zinc-500 font-mono'}>70%</strong> {70 >= easyDifficultyThreshold ? '≥' : '<'} Ngưỡng của bạn ({easyDifficultyThreshold}%)
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold border shrink-0 transition-all ${
                      70 >= easyDifficultyThreshold
                        ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 shadow-2xs'
                        : 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30'
                    }`}>
                      {70 >= easyDifficultyThreshold ? '🟢 Xếp loại: Dễ' : '🟡 Xếp loại: Vừa'}
                    </span>
                  </div>

                  {/* Case 3: Câu Khó */}
                  <div className="p-2.5 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] flex items-center justify-between gap-2 text-xs transition-all">
                    <div>
                      <span className="font-bold text-[hsl(var(--foreground))] block text-[11px]">Câu C: Làm 5 lần • Sai 3 lần</span>
                      <span className="text-[10.5px] text-[hsl(var(--muted-foreground))]">
                        Tỷ lệ sai: <strong className={60 >= hardDifficultyThreshold ? 'text-rose-500 font-mono' : 'text-amber-500 font-mono'}>60%</strong> {60 >= hardDifficultyThreshold ? '≥' : '<'} Ngưỡng của bạn ({hardDifficultyThreshold}%)
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold border shrink-0 transition-all ${
                      60 >= hardDifficultyThreshold
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 shadow-2xs'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    }`}>
                      {60 >= hardDifficultyThreshold ? '🔴 Xếp loại: Khó' : '🟡 Xếp loại: Vừa'}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-[hsl(var(--muted-foreground))] leading-tight pt-1 border-t border-[hsl(var(--border))]">
                  💡 Kéo các thanh trượt bên trên để xem kết quả phân loại cập nhật động ngay lập tức.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 4. Phím tắt thao tác nhanh */}
          <Card className="rounded-3xl border border-[hsl(var(--border))] shadow-xs">
            <CardContent className="p-5 space-y-2.5">
              <h2 className="font-bold text-sm flex items-center gap-2 text-[hsl(var(--foreground))]">
                <Lightbulb size={16} className="text-[hsl(var(--primary))]" /> Bảng phím tắt thao tác nhanh
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {[
                  ['1, 2, 3, 4', 'Chọn đáp án A, B, C, D'],
                  ['N / P', 'Câu tiếp / Câu trước'],
                  ['Space', 'Đánh dấu câu'],
                  ['Enter', 'Xác nhận (luyện tập)'],
                  ['Ctrl+K', 'Tìm kiếm câu hỏi'],
                  ['Esc', 'Đóng cửa sổ modal'],
                ].map(([key, desc]) => (
                  <div key={key} className="p-2 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] space-y-0.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-[hsl(var(--card))] text-[10px] font-mono font-bold border border-[hsl(var(--border))]">{key}</kbd>
                    <p className="text-[10.5px] text-[hsl(var(--muted-foreground))] leading-tight">{desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* CỘT PHẢI: Âm thanh, Chuỗi đúng, Bảo mật, Dữ liệu, Thông tin */}
        <div className="space-y-5">
          
          {/* 1. Âm thanh & Hiệu ứng Chime (Sound Effects Volume) */}
          <SoundSettingsCard />

          {/* 1.6 Cấu hình Thông Báo Chuỗi Đúng & Combo */}
          <Card className="rounded-3xl border border-[hsl(var(--border))] shadow-xs">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-sm sm:text-base flex items-center gap-2 text-[hsl(var(--foreground))]">
                    <Flame size={18} className="text-amber-500" /> Thông báo Chuỗi Đúng & Combo
                  </h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    Tùy chỉnh popup thông báo khi trả lời đúng liên tiếp trong bài làm.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStreakNotificationEnabled(!streakNotificationEnabled)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                    streakNotificationEnabled
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 ring-1 ring-emerald-400/30'
                      : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]'
                  }`}
                >
                  {streakNotificationEnabled ? '🟢 Đang bật' : '⚪ Đã tắt'}
                </button>
              </div>

              {streakNotificationEnabled && (
                <div className="space-y-3.5 pt-1 animate-fade-in">
                  {/* 3 Chế độ lựa chọn */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[hsl(var(--foreground))] block">
                      Quy tắc kích hoạt hiển thị:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {/* Chế độ 1: Chỉ mốc thăng cấp */}
                      <button
                        type="button"
                        onClick={() => setStreakNotificationMode('milestones_only')}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1.5 ${
                          streakNotificationMode === 'milestones_only'
                            ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] ring-2 ring-[hsl(var(--primary)/0.3)] shadow-xs'
                            : 'border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] hover:bg-[hsl(var(--muted)/0.4)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black flex items-center gap-1 text-[hsl(var(--foreground))]">
                            ⚡ Mốc Thăng Cấp
                          </span>
                          {streakNotificationMode === 'milestones_only' && (
                            <CheckCircle2 size={13} className="text-[hsl(var(--primary))]" />
                          )}
                        </div>
                        <p className="text-[10.5px] text-[hsl(var(--muted-foreground))] leading-tight">
                          Chỉ hiện tại các mốc: <strong>3, 6, 9, 12, 15, 18, 21+</strong>.
                        </p>
                      </button>

                      {/* Chế độ 2: Ngưỡng chuỗi tùy chỉnh */}
                      <button
                        type="button"
                        onClick={() => setStreakNotificationMode('min_streak')}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1.5 ${
                          streakNotificationMode === 'min_streak'
                            ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] ring-2 ring-[hsl(var(--primary)/0.3)] shadow-xs'
                            : 'border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] hover:bg-[hsl(var(--muted)/0.4)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black flex items-center gap-1 text-[hsl(var(--foreground))]">
                            🎯 Ngưỡng Tối Thiểu
                          </span>
                          {streakNotificationMode === 'min_streak' && (
                            <CheckCircle2 size={13} className="text-[hsl(var(--primary))]" />
                          )}
                        </div>
                        <p className="text-[10.5px] text-[hsl(var(--muted-foreground))] leading-tight">
                          Chỉ hiện khi đạt từ <strong>chuỗi x{streakMinThreshold}</strong> trở lên.
                        </p>
                      </button>

                      {/* Chế độ 3: Tất cả câu đúng */}
                      <button
                        type="button"
                        onClick={() => setStreakNotificationMode('all')}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1.5 ${
                          streakNotificationMode === 'all'
                            ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] ring-2 ring-[hsl(var(--primary)/0.3)] shadow-xs'
                            : 'border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] hover:bg-[hsl(var(--muted)/0.4)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black flex items-center gap-1 text-[hsl(var(--foreground))]">
                            🌟 Mọi Câu Đúng
                          </span>
                          {streakNotificationMode === 'all' && (
                            <CheckCircle2 size={13} className="text-[hsl(var(--primary))]" />
                          )}
                        </div>
                        <p className="text-[10.5px] text-[hsl(var(--muted-foreground))] leading-tight">
                          Hiện liên tục mỗi khi trả lời đúng (từ chuỗi x2 trở lên).
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Thanh trượt kéo mức streak tối thiểu */}
                  {streakNotificationMode === 'min_streak' && (
                    <div className="p-3.5 rounded-2xl bg-[hsl(var(--muted)/0.25)] border border-[hsl(var(--border))] space-y-2 animate-fade-in">
                      <div className="flex justify-between items-center text-xs">
                        <label className="font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                          <SlidersHorizontal size={14} className="text-[hsl(var(--primary))]" />
                          <span>Kéo mức chuỗi tối thiểu để kích hoạt popup:</span>
                        </label>
                        <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-lg bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.3)]">
                          Từ chuỗi x{streakMinThreshold}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-[hsl(var(--muted-foreground))]">
                        Kéo thanh trượt để chỉ định mức chuỗi đúng liên tiếp tối thiểu mà bạn muốn popup xuất hiện.
                      </p>
                      <input 
                        type="range" min="2" max="20" step="1" 
                        value={streakMinThreshold} 
                        onChange={e => setStreakMinThreshold(parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-[hsl(var(--muted))] rounded-lg appearance-none cursor-pointer accent-[hsl(var(--primary))]"
                      />
                      <div className="flex justify-between text-[9.5px] text-[hsl(var(--muted-foreground))] font-mono">
                        <span>x2 (Nhạy)</span>
                        <span>x5</span>
                        <span>x10 (Trung bình)</span>
                        <span>x15</span>
                        <span>x20 (Cao thủ)</span>
                      </div>
                    </div>
                  )}

                  {/* Preview mẫu popup */}
                  <div className="p-3 rounded-2xl bg-slate-950 text-white flex items-center justify-between gap-3 shadow-md border border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center shrink-0">
                        <Flame size={16} className="text-amber-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-xs font-black">
                          <Sparkles size={12} className="text-yellow-300" />
                          <span>+1 Chuỗi đúng x{streakNotificationMode === 'min_streak' ? streakMinThreshold : 4} 🔥</span>
                        </div>
                        <p className="text-[9.5px] text-amber-200/80 font-medium">
                          {streakNotificationMode === 'milestones_only' ? 'Chỉ hiện tại mốc 3, 6, 9, 12, 15, 18, 21' : streakNotificationMode === 'min_streak' ? `Chỉ hiện khi đạt từ x${streakMinThreshold} câu đúng` : 'Hiện mỗi câu đúng liên tiếp'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-white/10 text-white/80 shrink-0">
                      Mẫu xem trước
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Tài khoản chủ & Mật khẩu */}
          <Card className="rounded-3xl border border-[hsl(var(--border))] shadow-xs">
            <CardContent className="p-5 space-y-3">
              <h2 className="font-bold text-sm flex items-center gap-2 text-[hsl(var(--foreground))]">
                <Lock size={16} className="text-[hsl(var(--primary))]" /> Tài khoản chủ & Mật khẩu
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Đổi mật khẩu bảo vệ dữ liệu và ứng dụng.</p>
              <ChangePasswordForm />
            </CardContent>
          </Card>

          {/* 3. Dữ liệu & Sao lưu */}
          <Card className="rounded-3xl border border-[hsl(var(--border))] shadow-xs">
            <CardContent className="p-5 space-y-3">
              <h2 className="font-bold text-sm flex items-center gap-2 text-[hsl(var(--foreground))]">
                <Save size={16} className="text-[hsl(var(--primary))]" /> Dữ liệu & Sao lưu
              </h2>
              <div className="space-y-2 pt-1">
                <Button variant="outline" size="sm" className="w-full justify-start" icon={<Download size={14} />} onClick={handleExportBackup}>Tạo file backup JSON đầy đủ</Button>
                <Button variant="outline" size="sm" className="w-full justify-start" icon={<HardDrive size={14} />} onClick={() => navigate('/backup')}>Mở Trung tâm Sao lưu & Khôi phục</Button>
                <Button variant="destructive" size="sm" className="w-full justify-start" icon={<Trash2 size={14} />} onClick={handleClearData}>Xóa toàn bộ dữ liệu (Yêu cầu xác nhận)</Button>
              </div>
            </CardContent>
          </Card>

          {/* 3.4. Bản Quyền Ứng Dụng (License Status) */}
          <LicenseInfoCard />

          {/* 3.5. Cập Nhật Ứng Dụng (Auto Update) */}
          <AutoUpdateCard />

          {/* 4. Giới thiệu ứng dụng & Thông tin tác giả */}
          <Card className="rounded-3xl border-[hsl(var(--primary)/0.25)] bg-[hsl(var(--primary)/0.03)] shadow-xs">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[hsl(var(--primary))] to-indigo-500 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                    EPS
                  </div>
                  <div>
                    <h2 className="font-extrabold text-base text-[hsl(var(--foreground))]">
                      ExamPrep Studio
                    </h2>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))] font-medium">Trung tâm Luyện thi & Quản lý Học tập</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-black px-2.5 py-0.5 rounded-full bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.25)]">
                  {APP_DISPLAY_VERSION}
                </span>
              </div>

              {/* Slogan / App Mission */}
              <p className="text-xs text-[hsl(var(--foreground)/0.9)] leading-relaxed bg-[hsl(var(--card))] p-3 rounded-2xl border border-[hsl(var(--border))] shadow-2xs">
                ExamPrep Studio là ứng dụng hỗ trợ học tập, luyện tập và quản lý các bài kiểm tra, được xây dựng với mục tiêu mang đến một trải nghiệm học tập trực quan, hiện đại và hiệu quả.
              </p>

              {/* Detailed Specs & Contact Info */}
              <div className="p-3.5 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] space-y-2 text-xs shadow-2xs">
                <h3 className="font-bold text-[11px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5 pb-1.5 border-b border-[hsl(var(--border))]">
                  <Info size={13} className="text-[hsl(var(--primary))]" /> Thông tin ứng dụng
                </h3>
                
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">Ứng dụng:</span>
                    <span className="font-bold text-[hsl(var(--foreground))]">ExamPrep Studio</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">Phiên bản:</span>
                    <span className="font-mono font-bold text-[hsl(var(--primary))]">{APP_DISPLAY_VERSION}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">Tác giả:</span>
                    <span className="font-bold text-[hsl(var(--foreground))]">{APP_AUTHOR}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">Facebook:</span>
                    <a
                      href={APP_FACEBOOK}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[hsl(var(--primary))] hover:underline font-medium inline-flex items-center gap-1"
                    >
                      <span>https://www.facebook.com/yoreis06/</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">Gmail:</span>
                    <a
                      href={`mailto:${APP_CONTACT}`}
                      className="text-[hsl(var(--primary))] hover:underline font-medium inline-flex items-center gap-1"
                    >
                      <span>{APP_CONTACT}</span>
                      <Mail size={11} />
                    </a>
                  </div>
                </div>

                <div className="pt-2 border-t border-[hsl(var(--border))] space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-center font-bold text-xs cursor-pointer text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.05)] hover:bg-[hsl(var(--primary)/0.12)]"
                    icon={<HelpCircle size={14} />}
                    onClick={() => navigate('/guide')}
                  >
                    Mở Cẩm Nang Hướng Dẫn Sử Dụng
                  </Button>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))] italic text-center">
                    ExamPrep Studio được phát triển với sự hỗ trợ của Antigravity.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
      
      {/* Custom Gradient Builder Modal */}
      <CustomGradientModal
        isOpen={showCustomGradientModal}
        onClose={() => setShowCustomGradientModal(false)}
      />
    </div>
  );
};

const LicenseInfoCard: React.FC = () => {
  const { payload, rawKey, activatedAt, activateLicense } = useLicenseStore();
  const [showChangeModal, setShowChangeModal] = React.useState(false);
  const [newKey, setNewKey] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleCopy = () => {
    if (rawKey) {
      navigator.clipboard.writeText(rawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success('Đã sao chép mã License Key');
    }
  };

  const handleChangeKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    setIsSubmitting(true);
    setError(null);
    const res = await activateLicense(newKey.trim());
    setIsSubmitting(false);
    if (res.success) {
      toast.success('Kích hoạt License mới thành công!');
      setShowChangeModal(false);
      setNewKey('');
    } else {
      setError(res.error || 'Mã License không hợp lệ');
    }
  };

  return (
    <>
      <Card className="rounded-3xl border border-[hsl(var(--border))] shadow-xs">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
              <div>
                <h2 className="font-bold text-sm sm:text-base text-[hsl(var(--foreground))]">
                  Bản Quyền Ứng Dụng (License)
                </h2>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Xác thực chữ ký số Ed25519 • Hoạt động 100% Offline.
                </p>
              </div>
            </div>

            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 size={12} /> Đã Kích Hoạt
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[hsl(var(--muted)/0.25)] border border-[hsl(var(--border))] text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[hsl(var(--muted-foreground))]">Đăng ký cho:</span>
              <span className="font-bold text-[hsl(var(--foreground))]">
                {payload?.name || 'ExamPrep Studio User'} {payload?.email ? `(${payload.email})` : ''}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[hsl(var(--muted-foreground))]">Gói bản quyền:</span>
              <span className="font-bold text-[hsl(var(--primary))] font-mono">
                {payload?.type === 'lifetime' || payload?.exp === 0
                  ? '⭐ VĨNH VIỄN (Lifetime Pro)'
                  : `Có thời hạn (Đến ${new Date((payload?.exp || 0) * 1000).toLocaleDateString('vi-VN')})`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[hsl(var(--muted-foreground))]">Mã License ID:</span>
              <span className="font-mono font-bold text-[hsl(var(--foreground))] text-[11px]">
                {payload?.id || 'LIC-EXAMPREP'}
              </span>
            </div>

            {activatedAt && (
              <div className="flex items-center justify-between text-[11px] text-[hsl(var(--muted-foreground))]">
                <span>Ngày kích hoạt:</span>
                <span className="font-mono">{new Date(activatedAt).toLocaleDateString('vi-VN')}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs font-semibold cursor-pointer"
              icon={copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              onClick={handleCopy}
            >
              {copied ? 'Đã sao chép!' : 'Sao chép License Key'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold cursor-pointer"
              icon={<Key size={14} />}
              onClick={() => setShowChangeModal(true)}
            >
              Đổi mã mới
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal Đổi Mã License */}
      <Modal
        isOpen={showChangeModal}
        onClose={() => setShowChangeModal(false)}
        title="Đổi Mã Bản Quyền License Mới"
        size="md"
      >
        <form onSubmit={handleChangeKey} className="space-y-4">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Dán mã License mới do tác giả cung cấp vào ô bên dưới để kích hoạt gói bản quyền mới.
          </p>

          <textarea
            rows={3}
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="EXAM.eyJuYW1lIjoiLi4uIiwicHJvZCI6IkV4YW1TdHVkaW8ifQ.sig..."
            className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 text-xs font-mono text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] resize-none"
          />

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowChangeModal(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={isSubmitting || !newKey.trim()}
            >
              {isSubmitting ? 'Đang xác thực...' : 'Lưu & Kích Hoạt'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

const AutoUpdateCard: React.FC = () => {
  const {
    status,
    updateInfo,
    progress,
    errorMessage,
    lastCheckedAt,
    checkForUpdates,
    downloadUpdate,
    quitAndInstall,
  } = useUpdaterStore();

  return (
    <Card className="rounded-3xl border border-[hsl(var(--border))] shadow-xs">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] flex items-center justify-center">
              <RefreshCw size={16} className={status === 'checking' ? 'animate-spin' : ''} />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-[hsl(var(--foreground))]">
                Cập Nhật Ứng Dụng (Auto Update)
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Tự động kiểm tra bản cập nhật mới từ GitHub Releases.
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.25)]">
            {APP_DISPLAY_VERSION}
          </span>
        </div>

        {/* Current State Alert */}
        <div className="p-3 rounded-2xl bg-[hsl(var(--muted)/0.25)] border border-[hsl(var(--border))] text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[hsl(var(--muted-foreground))]">Trạng thái:</span>
            <span className="font-bold">
              {status === 'checking' && <span className="text-[hsl(var(--primary))] flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> Đang kiểm tra...</span>}
              {status === 'not-available' && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={12} /> Phiên bản mới nhất</span>}
              {status === 'available' && <span className="text-amber-500 font-bold flex items-center gap-1"><Sparkles size={12} /> Có bản mới v{updateInfo?.version}</span>}
              {status === 'downloading' && <span className="text-[hsl(var(--primary))] flex items-center gap-1"><Download size={12} /> Đang tải ({progress?.percent || 0}%)</span>}
              {status === 'downloaded' && <span className="text-emerald-500 font-bold flex items-center gap-1"><CheckCircle2 size={12} /> Đã sẵn sàng cài đặt</span>}
              {status === 'error' && <span className="text-rose-500 flex items-center gap-1"><AlertCircle size={12} /> Lỗi kết nối</span>}
              {status === 'idle' && <span className="text-[hsl(var(--muted-foreground))]">Sẵn sàng</span>}
            </span>
          </div>

          {lastCheckedAt && (
            <div className="flex items-center justify-between text-[11px] text-[hsl(var(--muted-foreground))]">
              <span>Kiểm tra gần nhất:</span>
              <span className="font-mono">{lastCheckedAt.toLocaleTimeString('vi-VN')} {lastCheckedAt.toLocaleDateString('vi-VN')}</span>
            </div>
          )}

          {status === 'downloading' && progress && (
            <div className="space-y-1.5 pt-1">
              <div className="w-full h-2 rounded-full bg-[hsl(var(--muted))] overflow-hidden flex">
                <div
                  style={{ width: `${progress.percent}%` }}
                  className="h-full bg-gradient-to-r from-[hsl(var(--primary))] to-indigo-500 rounded-full transition-all duration-300"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))] font-mono">
                <span>{(progress.transferred / 1024 / 1024).toFixed(1)} MB / {(progress.total / 1024 / 1024).toFixed(1)} MB</span>
                <span>{(progress.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s</span>
              </div>
            </div>
          )}

          {status === 'error' && errorMessage && (
            <p className="text-[11px] text-rose-500 leading-tight">
              {errorMessage}
            </p>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-1">
          {status === 'available' ? (
            <Button
              variant="default"
              size="sm"
              icon={<Download size={14} />}
              onClick={downloadUpdate}
              className="w-full justify-center bg-[hsl(var(--primary))] text-white font-bold text-xs"
            >
              Tải bản cập nhật v{updateInfo?.version} ngay
            </Button>
          ) : status === 'downloaded' ? (
            <Button
              variant="default"
              size="sm"
              icon={<ArrowRight size={14} />}
              onClick={quitAndInstall}
              className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
            >
              Cài đặt & Khởi động lại ngay
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw size={14} className={status === 'checking' ? 'animate-spin' : ''} />}
              onClick={checkForUpdates}
              disabled={status === 'checking' || status === 'downloading'}
              className="w-full justify-center text-xs font-bold"
            >
              {status === 'checking' ? 'Đang kiểm tra...' : 'Kiểm tra bản cập nhật mới'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const CustomGradientModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { customGradient, setCustomGradient } = useAppStore();
  const [color1, setColor1] = React.useState(customGradient?.color1 || '#4f46e5');
  const [color2, setColor2] = React.useState(customGradient?.color2 || '#06b6d4');
  const [angle, setAngle] = React.useState(customGradient?.angle ?? 135);

  React.useEffect(() => {
    if (isOpen) {
      setColor1(customGradient?.color1 || '#4f46e5');
      setColor2(customGradient?.color2 || '#06b6d4');
      setAngle(customGradient?.angle ?? 135);
    }
  }, [isOpen, customGradient]);

  const SWATCHES_1 = [
    { name: 'Indigo', color: '#4f46e5' },
    { name: 'Xanh Lam', color: '#2563eb' },
    { name: 'Tím', color: '#7c3aed' },
    { name: 'Hồng', color: '#db2777' },
    { name: 'Lục Bảo', color: '#059669' },
    { name: 'Hổ Phách', color: '#d97706' },
    { name: 'Đỏ Ruby', color: '#dc2626' },
    { name: 'Lam Đêm', color: '#312e81' },
  ];

  const SWATCHES_2 = [
    { name: 'Cyan Băng', color: '#06b6d4' },
    { name: 'Bạc Hà', color: '#10b981' },
    { name: 'Hoa Hồng', color: '#f43f5e' },
    { name: 'Tử Đinh Hương', color: '#8b5cf6' },
    { name: 'Hoàng Kim', color: '#f59e0b' },
    { name: 'Trời Xanh', color: '#38bdf8' },
    { name: 'Fuchsia', color: '#ec4899' },
    { name: 'Ngọc Lam', color: '#14b8a6' },
  ];

  const currentGradStyle = `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`;

  const handleApply = () => {
    setCustomGradient({ color1, color2, angle });
    toast.success('✨ Đã áp dụng bảng màu và gradient tùy chỉnh toàn hệ thống!');
    onClose();
  };

  const handleReset = () => {
    setColor1('#4f46e5');
    setColor2('#06b6d4');
    setAngle(135);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bảng Tùy Chỉnh Màu Sắc & Gradient Tự Do" size="lg">
      <div className="space-y-5 p-1">
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          Chọn 2 điểm màu (Màu bắt đầu & Màu kết thúc) cùng góc xoay để tạo gradient độc quyền. Hệ thống sẽ tự động đồng bộ thanh điều hướng, nút bấm, biểu đồ và hiệu ứng phát sáng.
        </p>

        {/* Live Interactive Preview Box */}
        <div className="p-4 rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
              <Sparkles size={15} className="text-amber-500" /> Bản Xem Trước Trực Quan
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
              Góc xoay: {angle}°
            </span>
          </div>

          {/* Gradient Banner */}
          <div
            className="w-full h-10 rounded-2xl shadow-sm flex items-center justify-center text-white font-bold text-xs tracking-wider transition-all duration-300"
            style={{ background: currentGradStyle }}
          >
            ExamPrep Studio Gradient Preview
          </div>

          {/* Mock Interactive Components */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <button
              type="button"
              className="px-3 py-2 rounded-xl text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
              style={{ background: currentGradStyle }}
            >
              <span>Nút Chính (Button)</span>
            </button>

            <div
              className="px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5"
              style={{ borderColor: color1, color: color1, backgroundColor: `${color1}15` }}
            >
              <span>Huy Hiệu (Badge)</span>
            </div>

            <div
              className="px-3 py-2 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-1.5"
              style={{ borderColor: color2, color: color2, backgroundColor: `${color2}15` }}
            >
              <span>Card Highlight</span>
            </div>
          </div>
        </div>

        {/* 2 Color Pickers & Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Color 1 */}
          <div className="p-3.5 rounded-2xl bg-[hsl(var(--muted)/0.25)] border border-[hsl(var(--border))] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-full shadow-2xs" style={{ backgroundColor: color1 }} />
                <span>Màu Bắt Đầu (Đầu 1)</span>
              </label>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
                {color1.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color1}
                onChange={e => setColor1(e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer border border-[hsl(var(--border))] bg-transparent p-0.5"
              />
              <input
                type="text"
                value={color1}
                onChange={e => setColor1(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl text-xs font-mono bg-[hsl(var(--card))] border border-[hsl(var(--border))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                placeholder="#4f46e5"
              />
            </div>

            {/* Quick Swatches 1 */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {SWATCHES_1.map(sw => (
                <button
                  key={sw.color}
                  type="button"
                  onClick={() => setColor1(sw.color)}
                  className="w-6 h-6 rounded-lg shadow-2xs border border-white/20 transition-transform hover:scale-110 cursor-pointer"
                  style={{ backgroundColor: sw.color }}
                  title={sw.name}
                />
              ))}
            </div>
          </div>

          {/* Color 2 */}
          <div className="p-3.5 rounded-2xl bg-[hsl(var(--muted)/0.25)] border border-[hsl(var(--border))] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-full shadow-2xs" style={{ backgroundColor: color2 }} />
                <span>Màu Kết Thúc (Đầu 2)</span>
              </label>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
                {color2.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color2}
                onChange={e => setColor2(e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer border border-[hsl(var(--border))] bg-transparent p-0.5"
              />
              <input
                type="text"
                value={color2}
                onChange={e => setColor2(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl text-xs font-mono bg-[hsl(var(--card))] border border-[hsl(var(--border))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                placeholder="#06b6d4"
              />
            </div>

            {/* Quick Swatches 2 */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {SWATCHES_2.map(sw => (
                <button
                  key={sw.color}
                  type="button"
                  onClick={() => setColor2(sw.color)}
                  className="w-6 h-6 rounded-lg shadow-2xs border border-white/20 transition-transform hover:scale-110 cursor-pointer"
                  style={{ backgroundColor: sw.color }}
                  title={sw.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Angle Slider */}
        <div className="p-3.5 rounded-2xl bg-[hsl(var(--muted)/0.25)] border border-[hsl(var(--border))] space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-[hsl(var(--foreground))]">Góc Xoay Gradient (Angle)</span>
            <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
              {angle}°
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            step="15"
            value={angle}
            onChange={e => setAngle(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-[hsl(var(--muted))] rounded-lg appearance-none cursor-pointer accent-[hsl(var(--primary))]"
          />
          <div className="flex justify-between text-[10px] text-[hsl(var(--muted-foreground))]">
            <span>0° (Dọc)</span>
            <span>90° (Ngang)</span>
            <span>135° (Chéo tiêu chuẩn)</span>
            <span>270° (Đảo chiều)</span>
            <span>360°</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-[hsl(var(--border))]">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            🔄 Khôi phục mặc định
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Hủy
            </Button>
            <Button size="sm" onClick={handleApply} className="gap-1.5 shadow-sm">
              <Sparkles size={14} /> Áp dụng toàn hệ thống
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const SoundSettingsCard: React.FC = () => {
  const [sfxVol, setSfxVol] = React.useState<number>(() => Math.round(soundscapeService.getSfxVolume() * 100));

  const handleSfxChange = (val: number) => {
    setSfxVol(val);
    soundscapeService.setSfxVolume(val / 100);
  };

  const testCorrect = () => {
    soundscapeService.playStreakChime(3);
    toast.success('🔊 Đã phát âm thanh chọn đúng', { duration: 1500 });
  };

  const testWrong = () => {
    soundscapeService.playWrongSound();
    toast.error('🔊 Đã phát âm thanh chọn sai', { duration: 1500 });
  };

  const testLevelUp = () => {
    soundscapeService.playLevelUpChime(2);
    toast('✨ Đã phát âm thanh thăng cấp chuỗi!', { icon: '🔥', duration: 1500 });
  };

  return (
    <Card className="rounded-3xl border border-[hsl(var(--border))] shadow-xs">
      <CardContent className="p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm sm:text-base flex items-center gap-2 text-[hsl(var(--foreground))]">
            <Volume2 size={18} className="text-[hsl(var(--primary))]" /> Âm thanh & Hiệu ứng Chime
          </h2>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)]">
            Audio FX
          </span>
        </div>

        {/* Volume Slider */}
        <div className="space-y-2 p-3.5 rounded-2xl bg-[hsl(var(--muted)/0.25)] border border-[hsl(var(--border))]">
          <div className="flex justify-between items-center text-xs">
            <label className="font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
              {sfxVol === 0 ? <VolumeX size={15} className="text-rose-500" /> : sfxVol < 50 ? <Volume1 size={15} className="text-amber-500" /> : <Volume2 size={15} className="text-emerald-500" />}
              <span>Âm lượng hiệu ứng âm thanh (SFX)</span>
            </label>
            <span className="font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.3)]">
              {sfxVol}%
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={sfxVol}
            onChange={e => handleSfxChange(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-[hsl(var(--muted))] rounded-lg appearance-none cursor-pointer accent-[hsl(var(--primary))]"
          />

          <p className="text-[10.5px] text-[hsl(var(--muted-foreground))]">
            Điều chỉnh âm lượng to/nhỏ khi chọn đáp án đúng, sai và thăng cấp chuỗi kỷ lục.
          </p>
        </div>

        {/* Test Sound Buttons */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] block">Thử âm thanh:</span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={testCorrect}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
            >
              <span>🔊 Tiếng Đúng</span>
            </button>

            <button
              type="button"
              onClick={testWrong}
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/30 flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
            >
              <span>🔊 Tiếng Sai</span>
            </button>

            <button
              type="button"
              onClick={testLevelUp}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/30 flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
            >
              <span>✨ Thăng Cấp</span>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ChangePasswordForm: React.FC = () => {
  const [oldPass, setOldPass] = React.useState('');
  const [newPass, setNewPass] = React.useState('');
  const [confirmPass, setConfirmPass] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (newPass !== confirmPass) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    const res = await authService.changePassword(oldPass, newPass);
    setLoading(false);

    if (res.success) {
      toast.success('Đã đổi mật khẩu thành công');
      setOldPass('');
      setNewPass('');
      setConfirmPass('');
    } else {
      toast.error(res.error || 'Lỗi khi đổi mật khẩu');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-1">
      <div>
        <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Mật khẩu hiện tại</label>
        <input
          type="password"
          value={oldPass}
          onChange={e => setOldPass(e.target.value)}
          placeholder="Nhập mật khẩu cũ..."
          className="w-full px-3 py-2 text-sm bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Mật khẩu mới</label>
          <input
            type="password"
            value={newPass}
            onChange={e => setNewPass(e.target.value)}
            placeholder="Tối thiểu 6 ký tự..."
            className="w-full px-3 py-2 text-sm bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Xác nhận mật khẩu</label>
          <input
            type="password"
            value={confirmPass}
            onChange={e => setConfirmPass(e.target.value)}
            placeholder="Nhập lại mật khẩu mới..."
            className="w-full px-3 py-2 text-sm bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          />
        </div>
      </div>
      <Button type="submit" disabled={loading || !oldPass || !newPass} size="sm">
        {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
      </Button>
    </form>
  );
};

// ============================================
// BACKUP & RESTORE HUB PAGE
// ============================================
export const BackupPage: React.FC = () => {
  const [loading, setLoading] = React.useState(false);

  const handleExportJSON = async () => {
    try {
      const backup = await backupRepository.exportBackupJSON();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `examprep_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Đã xuất file backup ExamPrep Studio thành công');
    } catch {
      toast.error('Lỗi khi xuất file backup');
    }
  };

  const handleRestoreMerge = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await backupRepository.mergeBackupJSON(data);
      toast.success(`Hợp nhất thành công: Thêm ${res.importedQuestions} câu hỏi mới!`);
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi hợp nhất dữ liệu backup');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleRestoreReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmText = window.prompt(
      'CẢNH BÁO: Chế độ "Khôi phục Thay thế" sẽ ghi đè toàn bộ dữ liệu hiện tại bằng dữ liệu từ file backup.\n\nHệ thống sẽ tự động tạo một snapshot sao lưu dự phòng trước khi thay thế.\n\nĐể tiếp tục, hãy nhập: XAC NHAN'
    );

    if (confirmText !== 'XAC NHAN') {
      if (confirmText !== null) toast.error('Xác nhận không đúng, đã hủy thao tác');
      e.target.value = '';
      return;
    }

    try {
      setLoading(true);
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await backupRepository.restoreWithSafeBackup(data);
      if (res.success) {
        toast.success('Đã khôi phục và thay thế toàn bộ dữ liệu thành công!');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error(res.error || 'Lỗi trong quá trình khôi phục');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi đọc file backup');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trung Tâm Sao Lưu & Phục Hồi Dữ Liệu</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          Quản lý xuất/nhập dữ liệu ngân hàng câu hỏi, đề thi và tiến độ học tập của ExamPrep Studio.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export Card */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
              <Download size={22} />
            </div>
            <h2 className="font-semibold text-base">Xuất Bản Sao Lưu (Backup)</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              Tải về toàn bộ ngân hàng câu hỏi, môn học, chương, lịch sử thi và cài đặt dưới dạng tệp JSON tiêu chuẩn.
            </p>
          </div>
          <div className="pt-4">
            <Button onClick={handleExportJSON} className="w-full" icon={<Download size={16} />}>
              Tải Xuống File Backup (.json)
            </Button>
          </div>
        </Card>

        {/* Restore Merge Card */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
              <Upload size={22} />
            </div>
            <h2 className="font-semibold text-base">Khôi Phục Hợp Nhất (Merge)</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              Nhập thêm câu hỏi và môn học từ file backup vào cơ sở dữ liệu hiện có mà không làm mất lịch sử hay câu hỏi cũ.
            </p>
          </div>
          <div className="pt-4">
            <label className="block">
              <Button variant="outline" className="w-full" disabled={loading} icon={<Upload size={16} />} onClick={() => document.getElementById('restore-merge-input')?.click()}>
                {loading ? 'Đang xử lý...' : 'Chọn File Để Hợp Nhất'}
              </Button>
              <input id="restore-merge-input" type="file" accept=".json" onChange={handleRestoreMerge} className="hidden" />
            </label>
          </div>
        </Card>
      </div>

      {/* Danger Zone: Restore Replace */}
      <Card className="p-5 border-rose-500/30 bg-rose-500/5">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 flex-shrink-0">
            <AlertCircle size={24} />
          </div>
          <div className="space-y-2 flex-1">
            <h2 className="font-semibold text-base text-rose-500">Khôi Phục Thay Thế Toàn Bộ (Replace)</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              Xóa sạch dữ liệu hiện tại và thay thế bằng dữ liệu từ file backup. Hệ thống sẽ tự động tạo một bản lưu dự phòng trước khi thực hiện để đảm bảo an toàn tuyệt đối.
            </p>
            <div className="pt-2">
              <label className="inline-block">
                <Button variant="destructive" size="sm" disabled={loading} icon={<RotateCcw size={14} />} onClick={() => document.getElementById('restore-replace-input')?.click()}>
                  {loading ? 'Đang khôi phục...' : 'Khôi Phục & Ghi Đè (Cần Xác Nhận)'}
                </Button>
                <input id="restore-replace-input" type="file" accept=".json" onChange={handleRestoreReplace} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
