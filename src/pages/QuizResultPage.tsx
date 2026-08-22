// ============================================
// QUIZ RESULT PAGE
// ============================================
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Progress } from '@/components/ui';
import { useExamStore } from '@/stores/exam-store';
import { useSubjectStore } from '@/stores/subject-store';
import { formatDuration, formatPercentage, cn } from '@/utils';
import type { Attempt, Question, QuizConfig } from '@/types';
import { db } from '@/services/database';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import {
  Award, Clock, CheckCircle2, XCircle, MinusCircle,
  ArrowLeft, RotateCcw, Eye, TrendingUp, BookOpen, Trophy,
  BrainCircuit, Flame, Sparkles, History, BarChart2, PieChart as PieIcon,
  Table as TableIcon, AlignLeft
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';

import { QuestionPacingAnalytics } from '@/components/analytics/QuestionPacingAnalytics';
import { StreakFlameBadge, getStreakTier } from '@/components/quiz/StreakFlameBadge';

// === Confetti Trigger Component ===
const ConfettiTrigger: React.FC<{ isPerfect: boolean }> = ({ isPerfect }) => {
  const firedRef = React.useRef(false);
  React.useEffect(() => {
    if (isPerfect && !firedRef.current) {
      firedRef.current = true;
      const duration = 3000;
      const end = Date.now() + duration;
      const fire = () => {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 1 }, colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96E6A1'] });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 1 }, colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#DDA0DD'] });
        if (Date.now() < end) requestAnimationFrame(fire);
      };
      fire();
    }
  }, [isPerfect]);
  return null;
};

export const QuizResultPage: React.FC = () => {
  return (
    <QuizResultErrorBoundary>
      <QuizResultPageContent />
    </QuizResultErrorBoundary>
  );
};

class QuizResultErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl max-w-3xl mx-auto mt-10">
          <h2 className="text-xl font-bold mb-4">Đã xảy ra lỗi khi hiển thị kết quả</h2>
          <pre className="text-sm text-left overflow-auto p-4 bg-white rounded border border-red-200">
            {this.state.error?.message}
            <br />
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const QuizResultPageContent: React.FC = () => {
  const navigate = useNavigate();
  const { attemptId } = useParams<{ attemptId: string }>();
  const { chapters } = useSubjectStore();
  const currentAttempt = useExamStore(state => state.currentAttempt);

  const [attempt, setAttempt] = React.useState<Attempt | null>(null);
  const [questions, setQuestions] = React.useState<Question[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [remainingCount, setRemainingCount] = React.useState<number>(0);
  const [chapterViewMode, setChapterViewMode] = React.useState<'bar' | 'pie' | 'progress' | 'table'>('bar');

  React.useEffect(() => {
    loadResult();
  }, [attemptId]);

  const loadResult = async () => {
    let att: Attempt | null = null;
    if (currentAttempt?.id === attemptId) {
      att = currentAttempt;
    } else if (attemptId) {
      att = (await db.attempts.get(attemptId)) || null;
    }
    if (att) {
      setAttempt(att);
      const qs = await db.questions.where('id').anyOf(att.questionIds).toArray();
      setQuestions(qs);
    }
  };

  const isReviewMode = attempt ? (attempt.mode === 'review' || attempt.mode === 'smart_wrong') : false;

  React.useEffect(() => {
    if (attempt && isReviewMode) {
      let query;
      if (attempt.chapterIds && attempt.chapterIds.length > 0) {
        query = db.questions.where('chapterId').anyOf(attempt.chapterIds);
      } else if (attempt.subjectId) {
        query = db.questions.where('subjectId').equals(attempt.subjectId);
      } else {
        query = db.questions.toCollection();
      }
      query.filter(q => (q.wrongCount ?? 0) > 0 && q.status !== 'mastered')
           .toArray()
           .then(qs => setRemainingCount(qs.length));
    }
  }, [attempt, isReviewMode]);

  const masteredInSession = React.useMemo(() => {
    return questions.filter(q => q.status === 'mastered').length;
  }, [questions]);

  const chapterBreakdown = React.useMemo(() => {
    const map = new Map<string, { correct: number; wrong: number; skipped: number; total: number }>();
    if (attempt?.answers) {
      attempt.answers.forEach(ans => {
        const q = questions.find(q => q.id === ans.questionId);
        if (!q) return;
        const existing = map.get(q.chapterId) || { correct: 0, wrong: 0, skipped: 0, total: 0 };
        existing.total++;
        if (ans.isCorrect) {
          existing.correct++;
        } else if (ans.selectedAnswer) {
          existing.wrong++;
        } else {
          existing.skipped++;
        }
        map.set(q.chapterId, existing);
      });
    }
    return Array.from(map.entries()).map(([chapterId, data]) => {
      const chapter = chapters.find(c => c.id === chapterId);
      const accuracy = data.total > 0 ? (data.correct / data.total) * 100 : 0;
      return { 
        chapterId, 
        name: chapter?.name || 'Chương không xác định', 
        ...data, 
        accuracy 
      };
    }).sort((a, b) => a.accuracy - b.accuracy);
  }, [attempt, questions, chapters]);

  // Compute highest correct streak in this attempt
  const bestStreak = React.useMemo(() => {
    if (!attempt?.answers) return 0;
    let max = 0;
    let curr = 0;
    attempt.answers.forEach(a => {
      if (a.isCorrect) {
        curr++;
        if (curr > max) max = curr;
      } else {
        curr = 0;
      }
    });
    return max;
  }, [attempt?.answers]);

  const handleRetryWrong = async () => {

    if (!attempt) return;
    if (remainingCount === 0) {
      toast.success('🎉 Tất cả các câu hỏi đã được thành thạo! Không còn câu sai để ôn lại.');
      return;
    }
    const config: QuizConfig = {
      subjectId: attempt.subjectId,
      chapterIds: attempt.chapterIds,
      mode: 'review',
      questionCount: Math.min(20, remainingCount),
      timeLimit: 0,
      shuffleQuestions: true,
      shuffleAnswers: true,
      prioritizeWrong: true,
      prioritizeNew: false,
      prioritizeWeak: false,
      excludeMastered: true,
      difficulty: '',
      randomSeed: '',
    };
    try {
      await useExamStore.getState().startQuiz(config);
      navigate('/quiz/session');
    } catch (err: any) {
      toast.error(err.message || 'Không thể bắt đầu lại phiên ôn tập');
    }
  };

  if (!attempt) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[hsl(var(--muted-foreground))]">Đang tải kết quả...</p>
      </div>
    );
  }

  const scoreColor = (attempt.percentage || 0) >= 80 ? 'var(--success)' : (attempt.percentage || 0) >= 50 ? 'var(--warning)' : 'var(--destructive)';
  const isPerfect = attempt.correctCount === attempt.totalQuestions && attempt.totalQuestions > 0;
  const isGreat = (attempt.percentage || 0) >= 80;

  return (
    <div className="w-full max-w-[1700px] mx-auto px-2 sm:px-4 lg:px-6 space-y-3 pb-4 animate-fade-in">
      
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/history')}
            className="p-1.5 rounded-xl bg-[hsl(var(--muted)/0.6)] hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-all cursor-pointer shrink-0"
            title="Quay lại lịch sử làm bài"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-[hsl(var(--foreground))] tracking-tight truncate">
                {isReviewMode ? 'Báo Cáo Ôn Tập Thông Minh' : (attempt.examName || 'Báo Cáo Kết Quả Bài Thi')}
              </h1>
              {isReviewMode && (
                <Badge variant="warning" className="text-[10px]">
                  <BrainCircuit size={12} className="mr-1" /> Review Mode
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
              Hoàn thành: {new Date(attempt.completedAt || Date.now()).toLocaleString('vi-VN')} • {attempt.totalQuestions} câu hỏi
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <button
            onClick={() => navigate(`/quiz/review/${attempt.id}`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-primary hover:opacity-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Eye size={13} />
            <span>Xem lại từng câu</span>
          </button>
          
          {!isReviewMode && (
            <button
              onClick={async () => {
                const config: QuizConfig = {
                  subjectId: attempt.subjectId,
                  chapterIds: attempt.chapterIds,
                  mode: attempt.mode,
                  questionCount: attempt.totalQuestions,
                  timeLimit: attempt.timeLimit,
                  shuffleQuestions: true,
                  shuffleAnswers: true,
                  prioritizeWrong: false,
                  prioritizeNew: false,
                  prioritizeWeak: false,
                  excludeMastered: false,
                  difficulty: '' as any,
                  randomSeed: '',
                };
                try {
                  await useExamStore.getState().startQuiz(config);
                  navigate('/quiz/session');
                } catch (err: any) {
                  console.error(err);
                }
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-xs font-semibold text-[hsl(var(--foreground))] border border-[hsl(var(--border))] transition-all cursor-pointer"
              title="Làm lại đề thi này"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">Làm lại</span>
            </button>
          )}

          <button
            onClick={() => navigate('/history')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-xs font-semibold text-[hsl(var(--foreground))] border border-[hsl(var(--border))] transition-all cursor-pointer"
            title="Lịch sử làm bài"
          >
            <History size={12} className="text-[hsl(var(--primary))]" />
            <span className="hidden sm:inline">Lịch sử</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Split Layout (5 cols Left, 7 cols Right -> Tổng 12 cột chuẩn, song song trên 1 màn hình) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        
        {/* Left Column: Score Showcase & Chapter Breakdown (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-3">
          
          {/* Compact Score & Metrics Card */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-3 text-center relative overflow-hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-left">
                {isPerfect ? (
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-2xs">
                    <Trophy size={22} />
                  </div>
                ) : isReviewMode ? (
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 border border-rose-500/30 flex items-center justify-center shrink-0 shadow-2xs">
                    <BrainCircuit size={22} />
                  </div>
                ) : (
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs',
                    isGreat ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                  )}>
                    <Award size={22} />
                  </div>
                )}
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black tracking-tight text-[hsl(var(--foreground))]">
                      {(attempt.score || 0).toFixed(1)}
                    </span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))] font-semibold">/ 10 điểm</span>
                  </div>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] font-medium">
                    Đạt <strong>{attempt.correctCount || 0}/{attempt.totalQuestions || 0}</strong> câu đúng ({formatPercentage(attempt.percentage || 0)})
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <span className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-bold border shadow-2xs shrink-0',
                isGreat ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : (attempt.percentage || 0) >= 50 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
              )}>
                {isGreat ? 'Đạt Giỏi' : (attempt.percentage || 0) >= 50 ? 'Đạt Khá' : 'Chưa Đạt'}
              </span>
            </div>

            {/* 4 Mini Metrics Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2 border-t border-[hsl(var(--border))] text-left">
              <div className="p-2 rounded-xl bg-[hsl(var(--muted)/0.35)] border border-[hsl(var(--border))]">
                <span className="text-[9.5px] text-[hsl(var(--muted-foreground))] block font-semibold">Đúng</span>
                <span className="text-xs font-extrabold text-emerald-500">{attempt.correctCount} câu</span>
              </div>
              <div className="p-2 rounded-xl bg-[hsl(var(--muted)/0.35)] border border-[hsl(var(--border))]">
                <span className="text-[9.5px] text-[hsl(var(--muted-foreground))] block font-semibold">Sai</span>
                <span className="text-xs font-extrabold text-rose-500">{attempt.wrongCount} câu</span>
              </div>
              <div className="p-2 rounded-xl bg-[hsl(var(--muted)/0.35)] border border-[hsl(var(--border))]">
                <span className="text-[9.5px] text-[hsl(var(--muted-foreground))] block font-semibold">Bỏ trống</span>
                <span className="text-xs font-extrabold text-[hsl(var(--muted-foreground))]">{attempt.skippedCount || 0} câu</span>
              </div>
              <div className="p-2 rounded-xl bg-[hsl(var(--muted)/0.35)] border border-[hsl(var(--border))]">
                <span className="text-[9.5px] text-[hsl(var(--muted-foreground))] block font-semibold">Thời gian</span>
                <span className="text-xs font-extrabold text-indigo-500">{formatDuration(attempt.timeSpent)}</span>
              </div>
            </div>

            {/* Max Streak Tribute Badge */}
            {bestStreak >= 3 && (
              <div className="pt-2 border-t border-[hsl(var(--border))] flex items-center justify-between text-xs font-semibold">
                <span className="text-[hsl(var(--muted-foreground))] flex items-center gap-1.5 text-[11px]">
                  <Sparkles size={12} className="text-amber-500" /> Kỷ lục chuỗi đúng:
                </span>
                <StreakFlameBadge streak={bestStreak} />
              </div>
            )}
          </div>

          {/* Chapter Breakdown - Interactive Visual Chart & Matrix Table */}
          {chapterBreakdown.length > 0 && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-2.5">
              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 border-b border-[hsl(var(--border))] pb-2">
                <h3 className="text-xs font-extrabold text-[hsl(var(--foreground))] uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                  <TrendingUp size={14} className="text-[hsl(var(--primary))]" />
                  <span>Độ chính xác theo chương ({chapterBreakdown.length})</span>
                </h3>

                {/* View Mode Switcher: Bar, Pie, Progress, Table */}
                <div className="flex items-center p-0.5 rounded-lg bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] shrink-0">
                  <button
                    onClick={() => setChapterViewMode('bar')}
                    className={cn(
                      'flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-bold transition-all cursor-pointer',
                      chapterViewMode === 'bar'
                        ? 'bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-2xs'
                        : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                    )}
                    title="Xem dạng biểu đồ cột"
                  >
                    <BarChart2 size={11} />
                    <span className="hidden sm:inline">Biểu đồ cột</span>
                  </button>

                  <button
                    onClick={() => setChapterViewMode('pie')}
                    className={cn(
                      'flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-bold transition-all cursor-pointer',
                      chapterViewMode === 'pie'
                        ? 'bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-2xs'
                        : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                    )}
                    title="Xem dạng biểu đồ tròn"
                  >
                    <PieIcon size={11} />
                    <span className="hidden sm:inline">Biểu đồ tròn</span>
                  </button>

                  <button
                    onClick={() => setChapterViewMode('progress')}
                    className={cn(
                      'flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-bold transition-all cursor-pointer',
                      chapterViewMode === 'progress'
                        ? 'bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-2xs'
                        : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                    )}
                    title="Xem dạng thanh tiến độ"
                  >
                    <AlignLeft size={11} />
                    <span className="hidden sm:inline">Thanh</span>
                  </button>

                  <button
                    onClick={() => setChapterViewMode('table')}
                    className={cn(
                      'flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-bold transition-all cursor-pointer',
                      chapterViewMode === 'table'
                        ? 'bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-2xs'
                        : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                    )}
                    title="Xem dạng bảng ma trận chi tiết"
                  >
                    <TableIcon size={11} />
                    <span className="hidden sm:inline">Bảng</span>
                  </button>
                </div>
              </div>

              {/* Mode 1: Recharts Vertical Bar Chart */}
              {chapterViewMode === 'bar' && (
                <div className="space-y-1.5">
                  <div className="h-44 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chapterBreakdown.map((ch, idx) => ({
                          code: `#${idx + 1}`,
                          name: ch.name,
                          accuracy: Math.round(ch.accuracy),
                          correct: ch.correct,
                          wrong: ch.wrong,
                          skipped: ch.skipped,
                          total: ch.total,
                        }))}
                        margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
                      >
                        <XAxis
                          dataKey="code"
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 700 }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          unit="%"
                          axisLine={false}
                          tickLine={false}
                        />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="p-3 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xl space-y-1.5 text-xs">
                                <div className="font-extrabold text-[hsl(var(--foreground))] max-w-[200px]">
                                  {d.code}: {d.name}
                                </div>
                                <div className="flex items-center justify-between gap-3 text-[11px] pt-1 border-t border-[hsl(var(--border))]">
                                  <span className="text-[hsl(var(--muted-foreground))]">Độ chính xác:</span>
                                  <span className={cn('font-mono font-black', d.accuracy >= 80 ? 'text-emerald-500' : d.accuracy >= 50 ? 'text-amber-500' : 'text-rose-500')}>
                                    {d.accuracy}%
                                  </span>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] pt-1">
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{d.correct} đúng</span>
                                  <span className="text-rose-600 dark:text-rose-400 font-bold">{d.wrong} sai</span>
                                  <span className="text-[hsl(var(--muted-foreground))] font-medium">{d.skipped} bỏ</span>
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="accuracy" radius={[8, 8, 0, 0]} animationDuration={800}>
                          {chapterBreakdown.map((ch, index) => {
                            const color = ch.accuracy >= 80 ? '#10B981' : ch.accuracy >= 50 ? '#F59E0B' : '#EF4444';
                            return <Cell key={`bar-cell-${index}`} fill={color} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Chapter Legend Strip */}
                  <div className="flex items-center justify-center gap-3 text-[10.5px] font-bold pt-1 border-t border-[hsl(var(--border))]">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Tốt (&ge;80%)
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Trung bình (50-79%)
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Cần ôn lại (&lt;50%)
                    </span>
                  </div>
                </div>
              )}

              {/* Mode 2: Recharts Donut / Pie Chart */}
              {chapterViewMode === 'pie' && (
                <div className="space-y-3">
                  <div className="h-56 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chapterBreakdown.map((ch, idx) => {
                            const PIE_COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#14B8A6'];
                            return {
                              name: ch.name,
                              code: `#${idx + 1}`,
                              value: ch.total,
                              correct: ch.correct,
                              wrong: ch.wrong,
                              accuracy: Math.round(ch.accuracy),
                              fill: PIE_COLORS[idx % PIE_COLORS.length],
                            };
                          })}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={75}
                          paddingAngle={3}
                          animationDuration={800}
                        >
                          {chapterBreakdown.map((_, index) => {
                            const PIE_COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#14B8A6'];
                            return <Cell key={`pie-cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />;
                          })}
                        </Pie>
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="p-3 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xl space-y-1 text-xs">
                                <div className="font-extrabold text-[hsl(var(--foreground))] max-w-[200px]">
                                  {d.code}: {d.name}
                                </div>
                                <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
                                  Tổng số câu: <strong className="text-[hsl(var(--foreground))]">{d.value} câu</strong>
                                </div>
                                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                                  Độ chính xác: {d.accuracy}% ({d.correct} đúng)
                                </div>
                              </div>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Pie Legend Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-28 overflow-y-auto custom-scrollbar p-1">
                    {chapterBreakdown.map((ch, idx) => {
                      const PIE_COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#14B8A6'];
                      const color = PIE_COLORS[idx % PIE_COLORS.length];
                      return (
                        <div key={ch.chapterId} className="flex items-center gap-1.5 text-[10.5px] p-1.5 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))]">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="font-bold truncate" title={ch.name}>#{idx + 1} {ch.name}</span>
                          <span className="font-mono text-[10px] text-emerald-500 font-extrabold ml-auto">{Math.round(ch.accuracy)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mode 3: Stacked Segmented Horizontal Bar Chart */}
              {chapterViewMode === 'progress' && (
                <div className="space-y-2.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                  {chapterBreakdown.map((ch, idx) => {
                    const isGreat = ch.accuracy >= 80;
                    const isModerate = ch.accuracy >= 50 && ch.accuracy < 80;
                    const correctPercent = ch.total > 0 ? (ch.correct / ch.total) * 100 : 0;
                    const wrongPercent = ch.total > 0 ? (ch.wrong / ch.total) * 100 : 0;
                    const skippedPercent = ch.total > 0 ? (ch.skipped / ch.total) * 100 : 0;

                    return (
                      <div 
                        key={ch.chapterId} 
                        className="p-3 rounded-2xl bg-[hsl(var(--muted)/0.25)] border border-[hsl(var(--border))] space-y-2 hover:border-[hsl(var(--primary)/0.3)] transition-all"
                      >
                        {/* Title & Level Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))] shrink-0">
                              #{idx + 1}
                            </span>
                            <span 
                              className="text-xs font-bold text-[hsl(var(--foreground))] truncate"
                              title={ch.name}
                            >
                              {ch.name}
                            </span>
                          </div>

                          <span className={cn(
                            'text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full border shrink-0',
                            isGreat 
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                              : isModerate 
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' 
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          )}>
                            {formatPercentage(ch.accuracy)}
                          </span>
                        </div>

                        {/* Stacked Proportional Segment Bar */}
                        <div className="w-full h-2 rounded-full bg-[hsl(var(--muted))] overflow-hidden flex shadow-2xs">
                          {correctPercent > 0 && (
                            <div
                              className="h-full bg-emerald-500 transition-all duration-500"
                              style={{ width: `${correctPercent}%` }}
                              title={`Đúng: ${ch.correct} câu (${correctPercent.toFixed(1)}%)`}
                            />
                          )}
                          {wrongPercent > 0 && (
                            <div
                              className="h-full bg-rose-500 transition-all duration-500"
                              style={{ width: `${wrongPercent}%` }}
                              title={`Sai: ${ch.wrong} câu (${wrongPercent.toFixed(1)}%)`}
                            />
                          )}
                          {skippedPercent > 0 && (
                            <div
                              className="h-full bg-zinc-400 dark:bg-zinc-600 transition-all duration-500"
                              style={{ width: `${skippedPercent}%` }}
                              title={`Bỏ trống: ${ch.skipped} câu (${skippedPercent.toFixed(1)}%)`}
                            />
                          )}
                        </div>

                        {/* Detail Stats Legend Strip */}
                        <div className="flex items-center justify-between text-[10.5px] text-[hsl(var(--muted-foreground))] font-medium pt-0.5">
                          <div className="flex items-center gap-2.5">
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                              <CheckCircle2 size={11} /> {ch.correct} đúng
                            </span>
                            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                              <XCircle size={11} /> {ch.wrong} sai
                            </span>
                            {ch.skipped > 0 && (
                              <span className="flex items-center gap-1 text-[hsl(var(--muted-foreground))]">
                                <MinusCircle size={11} /> {ch.skipped} bỏ
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono opacity-80">
                            {ch.total} câu
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Mode 4: Detailed Matrix Table */}
              {chapterViewMode === 'table' && (
                <div className="overflow-x-auto max-h-72 custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[hsl(var(--border))] text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        <th className="py-2 px-2 font-bold">Chương</th>
                        <th className="py-2 px-1 text-center font-bold">Tổng</th>
                        <th className="py-2 px-1 text-center font-bold text-emerald-500">Đúng</th>
                        <th className="py-2 px-1 text-center font-bold text-rose-500">Sai</th>
                        <th className="py-2 px-1 text-center font-bold">Bỏ</th>
                        <th className="py-2 px-2 text-right font-bold">Tỷ lệ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[hsl(var(--border)/0.4)]">
                      {chapterBreakdown.map((ch, idx) => {
                        const isGreat = ch.accuracy >= 80;
                        const isModerate = ch.accuracy >= 50 && ch.accuracy < 80;

                        return (
                          <tr key={ch.chapterId} className="hover:bg-[hsl(var(--muted)/0.3)] transition-colors">
                            <td className="py-2 px-2 max-w-[140px]">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] shrink-0">
                                  #{idx + 1}
                                </span>
                                <span className="font-semibold text-[hsl(var(--foreground))] truncate" title={ch.name}>
                                  {ch.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-1 text-center font-mono font-semibold">{ch.total}</td>
                            <td className="py-2 px-1 text-center font-mono font-bold text-emerald-500">{ch.correct}</td>
                            <td className="py-2 px-1 text-center font-mono font-bold text-rose-500">{ch.wrong}</td>
                            <td className="py-2 px-1 text-center font-mono text-[hsl(var(--muted-foreground))]">{ch.skipped}</td>
                            <td className="py-2 px-2 text-right">
                              <span className={cn(
                                'font-mono font-bold text-[11px]',
                                isGreat ? 'text-emerald-500' : isModerate ? 'text-amber-500' : 'text-rose-500'
                              )}>
                                {formatPercentage(ch.accuracy)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>


        {/* Right Column: Question Pacing & Time Trap Analytics (lg:col-span-7) */}
        <div className="lg:col-span-7">
          <QuestionPacingAnalytics
            attempt={attempt}
            questions={questions}
            onSelectQuestion={(idx) => navigate(`/quiz/review/${attempt.id}?question=${idx + 1}#question-${idx + 1}`)}
          />
        </div>

      </div>
    </div>
  );
};

