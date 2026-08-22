import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/services/database';
import { useSubjectStore } from '@/stores/subject-store';
import { useQuestionStore } from '@/stores/question-store';
import { authService } from '@/services/auth-service';
import type { DashboardStats, Attempt, Subject, Chapter, Question } from '@/types';
import {
  Sparkles, Flame, Play, BookOpen, Layers,
  FileText, Brain, CheckCircle2, AlertTriangle,
  Clock, Award, Zap, ChevronRight, TrendingUp,
  Plus, Upload, Shuffle, ArrowUpRight, Compass,
  BarChart3, Check, Calendar, Star, Target, PieChart as PieChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  AreaChart,
  Area,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { KnowledgeGapSection } from '@/components/analytics/KnowledgeGapSection';

interface DayActivity {
  dayName: string;
  dateStr: string;
  count: number;
  isToday: boolean;
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { subjects, chapters } = useSubjectStore();
  const { questions } = useQuestionStore();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [hoveredDonutData, setHoveredDonutData] = useState<{ name: string; value: number; percent: number; color: string } | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<Attempt[]>([]);
  const [allAttempts, setAllAttempts] = useState<Attempt[]>([]);
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [activeProgress, setActiveProgress] = useState<{ total: number; completed: number; accuracy: number; lastTime: string }>({
    total: 0,
    completed: 0,
    accuracy: 0,
    lastTime: 'Hôm nay',
  });
  const [weakestChapter, setWeakestChapter] = useState<{ chapter: Chapter; accuracy: number; wrongCount: number } | null>(null);
  const [streakDays, setStreakDays] = useState<number>(1);
  const [todayAnsweredCount, setTodayAnsweredCount] = useState<number>(0);
  const [weekActivity, setWeekActivity] = useState<DayActivity[]>([]);
  const [userName, setUserName] = useState<string>('Người học');
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');

  // Load User & Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const name = await authService.getOwnerUsername();
        if (name) setUserName(name);

        const loadedQuestions: Question[] = questions.length > 0 ? questions : await db.questions.toArray();
        const loadedAttempts: Attempt[] = await db.attempts.filter((a) => a.isCompleted).toArray();
        const loadedExams = await db.exams.toArray();

        setAllAttempts(loadedAttempts);

        let filteredQuestions = loadedQuestions;
        let filteredAttempts = loadedAttempts;
        let filteredChapters = chapters;

        if (selectedSubjectId !== 'all') {
          filteredQuestions = loadedQuestions.filter((q) => q.subjectId === selectedSubjectId);
          filteredAttempts = loadedAttempts.filter((a) => a.subjectId === selectedSubjectId);
          filteredChapters = chapters.filter((c) => c.subjectId === selectedSubjectId);
        }

        const masteredCount = filteredQuestions.filter((q) => q.status === 'mastered').length;
        const wrongCount = filteredQuestions.filter((q) => q.status === 'needs_review').length;
        const learningCount = filteredQuestions.filter((q) => q.status === 'learning').length;
        const newCount = filteredQuestions.filter((q) => q.status === 'new').length;

        const avgScore =
          filteredAttempts.length > 0
            ? filteredAttempts.reduce((sum, a) => sum + a.score, 0) / filteredAttempts.length
            : 0;

        const totalCorrect = filteredAttempts.reduce((sum, a) => sum + a.correctCount, 0);
        const totalAnswered = filteredAttempts.reduce((sum, a) => sum + (a.totalQuestions - a.skippedCount), 0);
        const overallAccuracy = totalAnswered > 0 ? (totalCorrect / totalAnswered) * 100 : 0;

        setStats({
          totalQuestions: filteredQuestions.length,
          totalSubjects: selectedSubjectId === 'all' ? subjects.length : 1,
          totalChapters: filteredChapters.length,
          totalExams: loadedExams.length,
          totalAttempts: filteredAttempts.length,
          averageScore: avgScore,
          overallAccuracy,
          newQuestions: newCount,
          learningQuestions: learningCount,
          wrongQuestions: wrongCount,
          masteredQuestions: masteredCount,
        });

        // Recent attempts (5 latest)
        const recent = [...loadedAttempts]
          .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
          .slice(0, 5);
        setRecentAttempts(recent);

        // Find active subject & chapter for "Continue Journey"
        if (subjects.length > 0) {
          const lastAttempt = recent[0];
          let subject = subjects[0];
          if (lastAttempt && lastAttempt.subjectId) {
            const found = subjects.find((s) => s.id === lastAttempt.subjectId);
            if (found) subject = found;
          }
          setActiveSubject(subject);

          const subjectQuestions = loadedQuestions.filter((q) => q.subjectId === subject.id);
          const completedQ = subjectQuestions.filter((q) => q.status === 'mastered' || q.status === 'learning').length;
          const subjectAttempts = loadedAttempts.filter((a) => a.subjectId === subject.id);
          const subCorrect = subjectAttempts.reduce((s, a) => s + a.correctCount, 0);
          const subTotal = subjectAttempts.reduce((s, a) => s + (a.totalQuestions - a.skippedCount), 0);
          const subAccuracy = subTotal > 0 ? Math.round((subCorrect / subTotal) * 100) : 85;

          const lastTimeStr = lastAttempt
            ? new Date(lastAttempt.startedAt).toLocaleDateString('vi-VN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Vừa mới';

          setActiveProgress({
            total: subjectQuestions.length || 100,
            completed: completedQ || Math.min(12, subjectQuestions.length),
            accuracy: subAccuracy,
            lastTime: lastTimeStr,
          });

          // Chapter recommendation
          const subjectChaps = chapters.filter((c) => c.subjectId === subject.id);
          if (subjectChaps.length > 0) {
            setActiveChapter(subjectChaps[0]);
          }
        }

        // Calculate Study Streak & Today Activity
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        let todayCount = 0;
        const activityDaysSet = new Set<string>();

        loadedAttempts.forEach((att) => {
          const dStr = new Date(att.startedAt).toISOString().split('T')[0];
          activityDaysSet.add(dStr);
          if (dStr === todayStr) {
            todayCount += att.totalQuestions || 10;
          }
        });

        setTodayAnsweredCount(todayCount);

        // Compute consecutive streak days
        let streak = 0;
        let checkDate = new Date();
        const hasToday = activityDaysSet.has(todayStr);
        if (hasToday) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          checkDate.setDate(checkDate.getDate() - 1);
        }

        while (true) {
          const s = checkDate.toISOString().split('T')[0];
          if (activityDaysSet.has(s)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
        setStreakDays(Math.max(1, streak));

        // Compute 7-day Knowledge Pulse (Mon to Sun)
        const daysOfWeek = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
        const currentDayIndex = (now.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
        const weekPulse: DayActivity[] = [];

        for (let i = 0; i < 7; i++) {
          const d = new Date(now);
          d.setDate(now.getDate() - (currentDayIndex - i));
          const dString = d.toISOString().split('T')[0];
          let c = 0;
          loadedAttempts.forEach((a) => {
            if (new Date(a.startedAt).toISOString().split('T')[0] === dString) {
              c += 1;
            }
          });
          weekPulse.push({
            dayName: daysOfWeek[i],
            dateStr: dString,
            count: c,
            isToday: i === currentDayIndex,
          });
        }
        setWeekActivity(weekPulse);

        // Find Knowledge Gap / Weakest chapter
        const chaptersWithWrongs = chapters.map((chap) => {
          const chapQuestions = loadedQuestions.filter((q) => q.chapterId === chap.id);
          const wrongCount = chapQuestions.filter((q) => q.status === 'needs_review').length;
          const attempted = chapQuestions.filter((q) => (q.attemptCount || 0) > 0);
          const totalAtt = attempted.reduce((sum, q) => sum + (q.attemptCount || 0), 0);
          const totalCor = attempted.reduce((sum, q) => sum + (q.correctCount || 0), 0);
          const acc = totalAtt > 0 ? Math.round((totalCor / totalAtt) * 100) : 100;
          return { chapter: chap, accuracy: acc, wrongCount };
        });

        const sortedWeak = chaptersWithWrongs.sort((a, b) => {
          if (b.wrongCount !== a.wrongCount) return b.wrongCount - a.wrongCount;
          return a.accuracy - b.accuracy;
        });

        if (sortedWeak.length > 0 && (sortedWeak[0].wrongCount > 0 || sortedWeak[0].accuracy < 80)) {
          setWeakestChapter(sortedWeak[0]);
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [questions, subjects, chapters, selectedSubjectId]);

  // Dynamic Greeting based on time of day
  const { greeting, dynamicSub } = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return {
        greeting: 'Chào buổi sáng',
        dynamicSub: 'Hôm nay bạn muốn chinh phục kiến thức nào?',
      };
    }
    if (hour >= 12 && hour < 18) {
      return {
        greeting: 'Chào buổi chiều',
        dynamicSub: 'Duy trì năng lượng học tập cùng ExamPrep Studio nhé!',
      };
    }
    if (hour >= 18 && hour < 22) {
      return {
        greeting: 'Chào buổi tối',
        dynamicSub: 'Kiến thức không tự tìm đến — hãy bắt đầu một câu hỏi.',
      };
    }
    return {
      greeting: 'Đêm muộn rồi',
      dynamicSub: 'Ôn thêm vài câu nhẹ nhàng để củng cố trí nhớ sâu nhé.',
    };
  }, []);

  // Memoized Subject Progress Stats
  const subjectStats = useMemo(() => {
    return subjects.map((sub) => {
      const subQs = questions.filter((q) => q.subjectId === sub.id);
      const subChaps = chapters.filter((c) => c.subjectId === sub.id);
      const mastered = subQs.filter((q) => q.status === 'mastered').length;
      const needsReview = subQs.filter((q) => (q.wrongCount ?? 0) > 0 && q.status !== 'mastered').length;
      const attempted = subQs.filter((q) => (q.attemptCount ?? 0) > 0).length;
      const subAttempts = allAttempts.filter((a) => a.subjectId === sub.id);
      const totalCorrect = subAttempts.reduce((s, a) => s + a.correctCount, 0);
      const totalAnswered = subAttempts.reduce((s, a) => s + (a.totalQuestions - a.skippedCount), 0);
      const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : (attempted > 0 ? Math.round((mastered / attempted) * 100) : 0);

      return {
        subject: sub,
        chapterCount: subChaps.length,
        questionCount: subQs.length,
        masteredCount: mastered,
        needsReviewCount: needsReview,
        attemptedCount: attempted,
        accuracy,
        progressRate: subQs.length > 0 ? Math.round((mastered / subQs.length) * 100) : 0,
      };
    });
  }, [subjects, chapters, questions, allAttempts]);

  // Memoized Chart Data
  const statusChartData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Thành thạo', count: stats.masteredQuestions, color: '#10b981' },
      { name: 'Đang học', count: stats.learningQuestions, color: '#06b6d4' },
      { name: 'Cần ôn lại', count: stats.wrongQuestions, color: '#f59e0b' },
      { name: 'Chưa làm', count: stats.newQuestions, color: '#94a3b8' },
    ];
  }, [stats]);

  const pieChartData = useMemo(() => {
    if (!stats || stats.totalQuestions === 0) {
      return [{ name: 'Chưa có dữ liệu', value: 1, color: '#94a3b8' }];
    }
    const data = [
      { name: 'Thành thạo', value: stats.masteredQuestions, color: '#10b981' },
      { name: 'Đang học', value: stats.learningQuestions, color: '#06b6d4' },
      { name: 'Cần ôn lại', value: stats.wrongQuestions, color: '#f43f5e' },
      { name: 'Chưa làm', value: stats.newQuestions, color: '#94a3b8' },
    ];
    return data.filter((d) => d.value > 0);
  }, [stats]);

  const scoreTrendData = useMemo(() => {
    const completed = [...allAttempts].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()).slice(-10);
    return completed.map((att, i) => ({
      name: `Lần ${i + 1}`,
      date: new Date(att.startedAt).toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' }),
      score: Number(att.score.toFixed(1)),
      percentage: Math.round(att.percentage),
    }));
  }, [allAttempts]);

  // Quick Action Navigators
  const handleStartContinue = () => {
    if (activeSubject) {
      navigate(`/quiz/setup?subjectId=${activeSubject.id}`);
    } else {
      navigate('/quiz/setup');
    }
  };

  const handleRandomQuiz = () => {
    navigate('/quiz/setup?mode=quick');
  };

  const handleReviewMistakes = () => {
    navigate('/quiz/setup?mode=review');
  };

  const handleAIStudy = () => {
    navigate('/flashcards');
  };

  // Loading Skeleton State
  if (loading || !stats) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
        <div className="h-28 rounded-3xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))]" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 rounded-3xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))]" />
          <div className="h-72 rounded-3xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))]" />
        </div>
      </div>
    );
  }

  // Empty State - Brand New User
  if (stats.totalQuestions === 0) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 space-y-10 animate-fade-in-up">
        {/* Double-bezel Welcome Hero */}
        <div className="p-2 rounded-[2.5rem] bg-gradient-to-b from-[hsl(var(--primary)/0.15)] via-[hsl(var(--primary)/0.05)] to-transparent border border-[hsl(var(--border))] shadow-xl">
          <div className="p-8 sm:p-12 rounded-[2.2rem] bg-[hsl(var(--card))] backdrop-blur-xl border border-[hsl(var(--border))] text-center space-y-6 relative overflow-hidden">
            {/* Ambient backdrop glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[hsl(var(--primary)/0.15)] rounded-full blur-3xl pointer-events-none" />

            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-primary shadow-xl shadow-[hsl(var(--primary)/0.25)] mx-auto">
              <Sparkles className="w-10 h-10 text-white animate-pulse" />
            </div>

            <div className="space-y-3 max-w-2xl mx-auto">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[hsl(var(--foreground))]">
                Chào mừng đến với <span className="text-gradient-primary">ExamPrep Studio</span>
              </h1>
              <p className="text-base text-[hsl(var(--muted-foreground))] font-normal leading-relaxed">
                Mọi hành trình chinh phục kiến thức và điểm số xuất sắc đều bắt đầu từ câu hỏi đầu tiên. Hãy nhập hoặc tạo ngân hàng câu hỏi để bắt đầu ngay.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <button
                onClick={() => navigate('/import')}
                className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-primary hover:opacity-90 text-white font-semibold shadow-lg shadow-[hsl(var(--primary)/0.25)] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Upload className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                <span>Nhập bộ câu hỏi đầu tiên</span>
                <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center ml-1 group-hover:translate-x-1 transition-transform">
                  <ChevronRight className="w-4 h-4 text-white" />
                </span>
              </button>

              <button
                onClick={() => navigate('/questions/new')}
                className="inline-flex items-center gap-2 px-6 py-4 rounded-full bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] font-medium active:scale-[0.98] transition-all cursor-pointer"
              >
                <Plus className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                <span>Tạo câu hỏi thủ công</span>
              </button>
            </div>

            {/* Feature pillars preview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-[hsl(var(--border))] text-left">
              <div className="p-4 rounded-2xl bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))]">
                <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center mb-2 font-bold text-sm">
                  1
                </div>
                <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">100% Offline & Bảo mật</h4>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Dữ liệu lưu cục bộ trong máy tính, không lo mất mạng hay lộ đề.</p>
              </div>

              <div className="p-4 rounded-2xl bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))]">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2 font-bold text-sm">
                  2
                </div>
                <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">Thuật toán Lặp lại Ngắt quãng</h4>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Tự động phát hiện câu sai và gợi ý thời điểm ôn tập tối ưu.</p>
              </div>

              <div className="p-4 rounded-2xl bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))]">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2 font-bold text-sm">
                  3
                </div>
                <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">Thi thử & Thống kê chiều sâu</h4>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Mô phỏng áp lực phòng thi, phân tích chính xác từng lỗ hổng kiến thức.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Populated Knowledge Command Center
  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-fade-in-up">
      {/* ========================================================== */}
      {/* 1. HERO AREA - Dynamic Greeting & Knowledge Command Center */}
      {/* ========================================================== */}
      <section className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 sm:p-8 rounded-[2rem] bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-md overflow-hidden">
        {/* Subtle background ambient blur */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-[hsl(var(--primary)/0.08)] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[hsl(var(--primary)/0.05)] rounded-full blur-3xl pointer-events-none" />

        {/* Left Greeting & Headline */}
        <div className="space-y-2 z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(var(--primary)/0.1)] border border-[hsl(var(--primary)/0.2)] text-xs font-semibold text-[hsl(var(--primary))]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Trung tâm Điều khiển Kiến thức</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[hsl(var(--foreground))] leading-snug">
            {greeting}, <span className="text-gradient-primary">{userName}</span>
          </h1>

          <p className="text-sm sm:text-base text-[hsl(var(--muted-foreground))] font-normal leading-relaxed">
            {dynamicSub}
          </p>
        </div>

        {/* Right Streak & Knowledge Pulse Badge */}
        <div className="flex items-center gap-4 z-10 self-start md:self-auto">
          {/* Streak Ring Card */}
          <div className="flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))] shadow-sm">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
              <Flame className="w-6 h-6 animate-bounce-slow" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold text-[hsl(var(--foreground))] tracking-tight">{streakDays}</span>
                <span className="text-xs font-medium text-amber-500 uppercase tracking-wider">Ngày liên tiếp</span>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Chuỗi học tập duy trì tốt</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================== */}
      {/* 2. KPI METRICS CARDS & SUBJECT FILTER                      */}
      {/* ========================================================== */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-[hsl(var(--primary))]" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              {selectedSubjectId === 'all' ? 'Tổng quan toàn bộ môn học' : subjects.find(s => s.id === selectedSubjectId)?.name || 'Dữ liệu môn học'}
            </h2>
          </div>

          {/* Subject Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] shrink-0">Lọc môn học:</span>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-xs font-bold text-[hsl(var(--foreground))] shadow-2xs hover:border-[hsl(var(--primary)/0.5)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] transition-all cursor-pointer"
            >
              <option value="all">📚 Tất cả môn học ({subjects.length})</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 sm:p-5 rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Tổng câu hỏi</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-[hsl(var(--foreground))]">{stats.totalQuestions}</span>
            <span className="text-xs text-[hsl(var(--muted-foreground))] block mt-0.5">
              {stats.totalSubjects} môn • {stats.totalChapters} chương
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500/80">Thành thạo</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-emerald-500">
              {stats.totalQuestions > 0 ? Math.round((stats.masteredQuestions / stats.totalQuestions) * 100) : 0}%
            </span>
            <span className="text-xs text-[hsl(var(--muted-foreground))] block mt-0.5">
              {stats.masteredQuestions} / {stats.totalQuestions} câu thành thạo
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500/80">Cần ôn lại</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-rose-500">{stats.wrongQuestions}</span>
            <span className="text-xs text-[hsl(var(--muted-foreground))] block mt-0.5">
              {stats.wrongQuestions > 0 ? 'Có điểm yếu cần củng cố' : 'Không có câu sai tồn đọng'}
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--primary))]">Điểm & Độ chính xác</span>
            <div className="w-8 h-8 rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)] flex items-center justify-center">
              <Star className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-[hsl(var(--primary))]">
              {stats.averageScore.toFixed(1)}/10
            </span>
            <span className="text-xs text-[hsl(var(--muted-foreground))] block mt-0.5">
              Độ chính xác: {stats.overallAccuracy.toFixed(0)}% ({stats.totalAttempts} bài thi)
            </span>
          </div>
        </div>
        </div>
      </section>

      {/* ========================================================== */}
      {/* 2. PRIMARY CTA & MAIN BENTO GRID                           */}
      {/* ========================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Khối CTA Lớn Nhất: "Tiếp tục hành trình" (Spans 8 cols on LG) */}
        <div className="lg:col-span-8 p-2 rounded-[2.2rem] bg-gradient-to-b from-[hsl(var(--primary)/0.15)] via-[hsl(var(--card))] to-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-md flex flex-col">
          <div className="p-6 sm:p-8 rounded-[1.9rem] bg-[hsl(var(--card))] border border-[hsl(var(--border))] flex-1 flex flex-col justify-between relative overflow-hidden group">
            {/* Subtle inner glow on hover */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-[hsl(var(--primary)/0.06)] rounded-full blur-2xl group-hover:bg-[hsl(var(--primary)/0.1)] transition-all duration-700 pointer-events-none" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-[hsl(var(--primary)/0.1)] border border-[hsl(var(--primary)/0.2)] text-[11px] font-bold text-[hsl(var(--primary))] tracking-wider uppercase">
                  Tiếp tục hành trình
                </span>
                <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Học gần nhất: {activeProgress.lastTime}</span>
                </span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors">
                  {activeSubject ? activeSubject.name : 'Bộ câu hỏi tổng hợp'}
                </h2>
                <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-1">
                  {activeChapter ? `Đang ôn: ${activeChapter.name}` : 'Rèn luyện và củng cố kiến thức trọng tâm'}
                </p>
              </div>

              {/* Progress Bar & Indicators */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-semibold text-[hsl(var(--foreground))]">
                    {activeProgress.completed} / {activeProgress.total} câu đã hoàn thành
                  </span>
                  <span className="font-bold text-[hsl(var(--primary))]">
                    {Math.round((activeProgress.completed / (activeProgress.total || 1)) * 100)}%
                  </span>
                </div>

                <div className="w-full h-3 rounded-full bg-[hsl(var(--muted))] border border-[hsl(var(--border))] overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-primary transition-all duration-1000 ease-out shadow-sm"
                    style={{
                      width: `${Math.max(8, Math.min(100, Math.round((activeProgress.completed / (activeProgress.total || 1)) * 100)))}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Buttons Row */}
            <div className="flex flex-wrap items-center gap-3.5 pt-6 mt-4 border-t border-[hsl(var(--border))]">
              <button
                onClick={handleStartContinue}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-2xl bg-gradient-primary hover:opacity-90 text-white font-semibold text-sm shadow-md shadow-[hsl(var(--primary)/0.25)] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current text-white" />
                <span>Tiếp tục học ngay</span>
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center ml-1">
                  <ChevronRight className="w-3.5 h-3.5 text-white" />
                </span>
              </button>

              <button
                onClick={handleRandomQuiz}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] text-sm font-medium active:scale-[0.98] transition-all cursor-pointer"
              >
                <Shuffle className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                <span>Làm đề ngẫu nhiên</span>
              </button>
            </div>
          </div>
        </div>

        {/* Knowledge Distribution & Donut Chart Card (Spans 4 cols on LG) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Donut Chart & Mastery Status Card */}
          <div className="p-5 sm:p-6 rounded-[2rem] bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-md space-y-3.5 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)] flex items-center justify-center">
                    <PieChartIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">Trạng thái năng lực</h3>
                  </div>
                </div>
                <span className="text-[11px] font-bold font-mono text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)] px-2.5 py-0.5 rounded-full border border-[hsl(var(--primary)/0.2)]">
                  {stats.totalQuestions} câu
                </span>
              </div>

              {/* Donut Chart with Center Dynamic Highlight (Hover Interactive, No Overlay Collision) */}
              <div className="relative h-36 w-full flex items-center justify-center pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={44}
                      outerRadius={64}
                      paddingAngle={pieChartData.length > 1 ? 3 : 0}
                      dataKey="value"
                      stroke="none"
                      onMouseEnter={(_, index) => {
                        const item = pieChartData[index];
                        if (item) {
                          setHoveredDonutData({
                            name: item.name,
                            value: item.value,
                            percent: Math.round((item.value / (stats.totalQuestions || 1)) * 100),
                            color: item.color,
                          });
                        }
                      }}
                      onMouseLeave={() => setHoveredDonutData(null)}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell
                          key={`donut-${index}`}
                          fill={entry.color}
                          className="transition-all duration-200 cursor-pointer"
                          opacity={hoveredDonutData && hoveredDonutData.name !== entry.name ? 0.5 : 1}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Dynamic Label - Eliminates visual collision */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-all duration-200">
                  {hoveredDonutData ? (
                    <>
                      <span className="text-xl font-black font-mono tracking-tight" style={{ color: hoveredDonutData.color }}>
                        {hoveredDonutData.value} <span className="text-xs font-semibold">câu</span>
                      </span>
                      <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider text-center truncate max-w-[110px]">
                        {hoveredDonutData.name} ({hoveredDonutData.percent}%)
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl font-black text-[hsl(var(--foreground))] tracking-tight">
                        {stats.totalQuestions > 0 ? `${Math.round((stats.masteredQuestions / stats.totalQuestions) * 100)}%` : '0%'}
                      </span>
                      <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        Thành thạo
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Status breakdown grid (2x2) */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <div className="p-2 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] truncate">Thành thạo</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-500 font-mono shrink-0">{stats.masteredQuestions}</span>
                </div>

                <div className="p-2 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shrink-0" />
                    <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] truncate">Đang học (TB)</span>
                  </div>
                  <span className="text-xs font-bold text-cyan-500 font-mono shrink-0">{stats.learningQuestions}</span>
                </div>

                <div className="p-2 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                    <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] truncate">Cần ôn lại</span>
                  </div>
                  <span className="text-xs font-bold text-rose-500 font-mono shrink-0">{stats.wrongQuestions}</span>
                </div>

                <div className="p-2 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                    <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] truncate">Chưa làm</span>
                  </div>
                  <span className="text-xs font-bold text-[hsl(var(--foreground))] font-mono shrink-0">{stats.newQuestions}</span>
                </div>
              </div>
            </div>

            {stats.wrongQuestions > 0 ? (
              <button
                onClick={() => navigate('/quiz/setup?mode=review')}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/15 text-rose-600 dark:text-rose-300 text-xs font-bold border border-rose-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Ôn tập ngay {stats.wrongQuestions} câu cần củng cố</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => navigate('/quiz/setup')}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-xs font-semibold text-[hsl(var(--foreground))] border border-[hsl(var(--border))] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Bắt đầu luyện tập</span>
                <ChevronRight className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              </button>
            )}
          </div>

          {/* Knowledge Pulse - Weekly Rhythm */}
          <div className="p-5 rounded-[2rem] bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[hsl(var(--foreground))] uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                <span>Nhịp học tuần này</span>
              </span>
              <span className="text-[11px] text-[hsl(var(--muted-foreground))]">7 ngày gần nhất</span>
            </div>

            <div className="grid grid-cols-7 gap-2 pt-1">
              {weekActivity.map((day, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all ${
                      day.count > 0
                        ? 'bg-[hsl(var(--primary))] text-white shadow-sm'
                        : day.isToday
                        ? 'bg-[hsl(var(--muted))] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.4)]'
                        : 'bg-[hsl(var(--muted)/0.6)] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))]'
                    }`}
                    title={`${day.dateStr}: ${day.count} bài làm`}
                  >
                    {day.count > 0 ? day.count : '·'}
                  </div>
                  <span className={`text-[10px] ${day.isToday ? 'font-bold text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
                    {day.dayName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================== */}
      {/* 3. QUICK ACTIONS - 4 Pillar Action Cards                   */}
      {/* ========================================================== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[hsl(var(--foreground))] tracking-tight flex items-center gap-2">
            <Compass className="w-4 h-4 text-[hsl(var(--primary))]" />
            <span>Lối vào học tập</span>
          </h3>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">Chọn chế độ phù hợp với mục tiêu</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Học theo chương */}
          <div
            onClick={() => navigate('/subjects')}
            className="p-5 rounded-2xl bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.4)] shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[hsl(var(--foreground))] group-hover:text-blue-500 transition-colors">
                Học theo chương
              </h4>
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                Khám phá câu hỏi có hệ thống theo từng môn và chương.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-blue-500 group-hover:translate-x-1 transition-transform">
              <span>Khám phá ngay</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>

          {/* Card 2: Làm bài kiểm tra */}
          <div
            onClick={() => navigate('/quiz/setup')}
            className="p-5 rounded-2xl bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] hover:border-emerald-500/40 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[hsl(var(--foreground))] group-hover:text-emerald-500 transition-colors">
                Làm bài kiểm tra
              </h4>
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                Tạo đề thi tùy chỉnh số câu, thời gian và chấm điểm ngay.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-emerald-500 group-hover:translate-x-1 transition-transform">
              <span>Tạo đề thi</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>

          {/* Card 3: Ôn lại câu sai */}
          <div
            onClick={handleReviewMistakes}
            className="p-5 rounded-2xl bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] hover:border-rose-500/40 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Brain className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-[hsl(var(--foreground))] group-hover:text-rose-500 transition-colors">
                  Ôn lại câu sai
                </h4>
                {stats.wrongQuestions > 0 && (
                  <span className="text-[11px] font-bold bg-rose-500/15 text-rose-500 px-2 py-0.5 rounded-full border border-rose-500/20">
                    {stats.wrongQuestions} câu
                  </span>
                )}
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                Tập trung triệt để vào những câu bạn từng trả lời sai.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-rose-500 group-hover:translate-x-1 transition-transform">
              <span>Khắc phục lỗi</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>

          {/* Card 4: AI Study / Spaced Repetition */}
          <div
            onClick={handleAIStudy}
            className="p-5 rounded-2xl bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] hover:border-cyan-500/40 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[hsl(var(--foreground))] group-hover:text-cyan-500 transition-colors">
                AI Flashcards
              </h4>
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                Học thông minh dựa trên chu kỳ ngắt quãng tối ưu trí nhớ.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-cyan-500 group-hover:translate-x-1 transition-transform">
              <span>Học thông minh</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================== */}
      {/* 4. STUDY INSIGHT & ACTIVITY TIMELINE                       */}
      {/* ========================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Study Insight / Knowledge Recommendation (Spans 7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-[2rem] bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-md space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)] flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">Gợi ý ôn tập cho bạn</h3>
              </div>
              <span className="text-xs text-[hsl(var(--primary))] font-medium">Phân tích tự động</span>
            </div>

            {weakestChapter ? (
              <div className="p-4 rounded-2xl bg-[hsl(var(--primary)/0.05)] border border-[hsl(var(--primary)/0.15)] space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-[hsl(var(--primary))] font-medium">Trọng tâm cần củng cố:</p>
                    <h4 className="text-base font-bold text-[hsl(var(--foreground))] mt-0.5">{weakestChapter.chapter.name}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">Độ chính xác</span>
                    <p className="text-lg font-bold text-amber-500">{weakestChapter.accuracy}%</p>
                  </div>
                </div>

                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Bạn có {weakestChapter.wrongCount > 0 ? `${weakestChapter.wrongCount} câu trả lời sai` : 'tỷ lệ chính xác chưa cao'} ở chương này. Ôn ngay để nâng cao tỷ lệ thành thạo!
                </p>

                <div className="pt-1">
                  <button
                    onClick={() => navigate(`/quiz/setup?chapterId=${weakestChapter.chapter.id}`)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(var(--primary))] hover:opacity-90 text-white text-xs font-semibold shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <span>Bắt đầu ôn 15 câu trọng tâm</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 space-y-2">
                <div className="flex items-center gap-2 text-emerald-500 text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Tiến độ rất tốt!</span>
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Bạn chưa có lỗ hổng kiến thức nghiêm trọng nào. Hãy thử thách bản thân với một bài thi thử tổng hợp 40 câu!
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => navigate('/quiz/setup?mode=exam')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] text-xs font-semibold border border-[hsl(var(--border))] transition-all cursor-pointer"
                  >
                    <span>Thi thử 40 câu</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Quick Status Bar */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[hsl(var(--border))] text-center">
              <div className="p-2.5 rounded-xl bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))]">
                <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Thành thạo</span>
                <p className="text-base font-bold text-emerald-500">{stats.masteredQuestions}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))]">
                <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Cần ôn lại</span>
                <p className="text-base font-bold text-amber-500">{stats.wrongQuestions}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))]">
                <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Chính xác chung</span>
                <p className="text-base font-bold text-[hsl(var(--primary))]">{stats.overallAccuracy.toFixed(0)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Timeline (Spans 5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-[2rem] bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))] flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">Hoạt động gần đây</h3>
              </div>
              <button
                onClick={() => navigate('/history')}
                className="text-xs text-[hsl(var(--primary))] hover:underline font-medium cursor-pointer"
              >
                Xem tất cả
              </button>
            </div>

            {recentAttempts.length > 0 ? (
              <div className="space-y-2.5">
                {recentAttempts.slice(0, 4).map((attempt) => (
                  <div
                    key={attempt.id}
                    onClick={() => navigate(`/quiz/result/${attempt.id}`)}
                    className="p-3 rounded-xl bg-[hsl(var(--muted)/0.5)] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] flex items-center justify-between transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          attempt.percentage >= 80
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : attempt.percentage >= 50
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-[hsl(var(--foreground))] line-clamp-1">
                          {attempt.examName || 'Bài luyện tập'}
                        </p>
                        <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                          {new Date(attempt.startedAt).toLocaleDateString('vi-VN')} • {attempt.totalQuestions} câu
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-[hsl(var(--foreground))]">{attempt.score.toFixed(1)}/10</span>
                      <p
                        className={`text-[11px] font-semibold ${
                          attempt.percentage >= 80
                            ? 'text-emerald-500'
                            : attempt.percentage >= 50
                            ? 'text-amber-500'
                            : 'text-rose-500'
                        }`}
                      >
                        {attempt.percentage.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-[hsl(var(--muted-foreground))] space-y-1">
                <Clock className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-xs">Chưa có bài thi nào được hoàn thành</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================== */}
      {/* 5. LEARNING ANALYTICS CHARTS                               */}
      {/* ========================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Biểu đồ phân bố câu hỏi (5/12 cols) */}
        <div className="lg:col-span-5 p-5 sm:p-6 rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">Phân Bố Kiến Thức</h3>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Trạng thái toàn bộ câu hỏi trong kho</p>
              </div>
            </div>
          </div>

          <div className="h-48 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: 'hsl(var(--foreground))',
                  }}
                  formatter={(val: any) => [`${val} câu hỏi`, 'Số lượng']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[hsl(var(--border))] text-center">
            {statusChartData.map(item => (
              <div key={item.name} className="p-2 rounded-xl bg-[hsl(var(--muted)/0.25)] border border-[hsl(var(--border))]">
                <span className="text-[10px] text-[hsl(var(--muted-foreground))] block">{item.name}</span>
                <span className="text-xs font-bold font-mono text-[hsl(var(--foreground))]">{item.count} câu</span>
              </div>
            ))}
          </div>
        </div>

        {/* Biểu đồ xu hướng điểm số (7/12 cols) */}
        <div className="lg:col-span-7 p-5 sm:p-6 rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">Xu Hướng Kết Quả Bài Thi</h3>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Tiến độ điểm số qua các lượt làm gần nhất</p>
              </div>
            </div>
            {recentAttempts.length > 0 && (
              <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                {recentAttempts.length} bài gần nhất
              </span>
            )}
          </div>

          {scoreTrendData.length > 0 ? (
            <div className="h-48 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={scoreTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                      color: 'hsl(var(--foreground))',
                    }}
                    formatter={(val: any) => [`${val}/10 điểm`, 'Điểm số']}
                  />
                  <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2.5} fillOpacity={1} fill="url(#scoreGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-[hsl(var(--muted-foreground))] space-y-2">
              <TrendingUp className="w-8 h-8 opacity-30" />
              <p className="text-xs">Làm thêm bài thi để xem biểu đồ xu hướng điểm số.</p>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))] pt-2 border-t border-[hsl(var(--border))]">
            <span>Điểm cao nhất: <strong>{recentAttempts.length > 0 ? Math.max(...recentAttempts.map(a => a.score)).toFixed(1) : '0'}/10</strong></span>
            <span>Tổng số bài thi hoàn thành: <strong>{allAttempts.length} bài</strong></span>
          </div>
        </div>
      </section>

      {/* ========================================================== */}
      {/* 6. SUBJECT MASTERY & PROGRESS TABLE                        */}
      {/* ========================================================== */}
      {subjects.length > 0 && (
        <section className="p-5 sm:p-6 rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[hsl(var(--foreground))]">
                  Bảng Thống Kê Tiến Độ Theo Môn Học
                </h3>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                  Theo dõi chi tiết số lượng câu hỏi, tỷ lệ thành thạo và câu sai theo từng môn
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/subjects')}
              className="text-xs text-[hsl(var(--primary))] hover:underline font-semibold cursor-pointer"
            >
              Quản lý môn ({subjects.length})
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] uppercase tracking-wider font-bold">
                  <th className="pb-3 pl-2">Môn học</th>
                  <th className="pb-3">Phạm vi</th>
                  <th className="pb-3">Tiến độ thành thạo</th>
                  <th className="pb-3">Câu sai cần ôn</th>
                  <th className="pb-3">Độ chính xác</th>
                  <th className="pb-3 text-right pr-2">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {subjectStats.map(item => (
                  <tr key={item.subject.id} className="hover:bg-[hsl(var(--muted)/0.25)] transition-colors">
                    <td className="py-3.5 pl-2 font-bold text-[hsl(var(--foreground))]">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--primary))]" />
                        <span>{item.subject.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-[hsl(var(--muted-foreground))]">
                      {item.chapterCount} chương • {item.questionCount} câu
                    </td>
                    <td className="py-3.5">
                      <div className="space-y-1 max-w-[160px]">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-emerald-500">{item.masteredCount} câu</span>
                          <span className="font-bold text-[hsl(var(--foreground))]">{item.progressRate}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${item.progressRate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5">
                      {item.needsReviewCount > 0 ? (
                        <span className="font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                          {item.needsReviewCount} câu
                        </span>
                      ) : (
                        <span className="text-emerald-500 font-medium">Đã sạch lỗi</span>
                      )}
                    </td>
                    <td className="py-3.5 font-bold text-[hsl(var(--foreground))]">
                      {item.accuracy > 0 ? `${item.accuracy}%` : 'Chưa có dữ liệu'}
                    </td>
                    <td className="py-3.5 text-right pr-2">
                      <button
                        onClick={() => navigate(`/quiz/setup?subjectId=${item.subject.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[hsl(var(--primary))] hover:opacity-90 active:scale-[0.98] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Luyện tập</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Analytics & Knowledge Gap Section */}
      <section className="pt-2">
        <KnowledgeGapSection subjectId={selectedSubjectId} />
      </section>
    </div>
  );
};

