// ============================================
// KNOWLEDGE GAP & PERSONAL HEALTH MAP
// ============================================
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubjectStore } from '@/stores/subject-store';
import { useExamStore } from '@/stores/exam-store';
import { db } from '@/services/database';
import type { Question, QuizConfig } from '@/types';
import { 
  Play, 
  BrainCircuit, 
  CheckCircle2, 
  AlertTriangle, 
  Flame, 
  Sparkles, 
  HelpCircle, 
  ArrowRight,
  ChevronRight, 
  RotateCcw,
  Info,
  Layers,
  Clock,
  BookOpen,
  Target,
  FileQuestion,
  X
} from 'lucide-react';
import { Modal } from '@/components/ui';
import toast from 'react-hot-toast';

export interface ChapterGapData {
  chapterId: string;
  chapterName: string;
  subjectId: string;
  subjectName: string;
  wrongQuestionCount: number;
  totalChapterQuestions: number;
  attemptedQuestionCount: number;
  sumWrongCount: number;
  sumAttemptCount: number;
  avgWrongCount: number;
  errorRatioAttempted: number;
  urgencyScore: number; // 0-100
  urgencyLevel: 'high' | 'medium' | 'low' | 'insufficient';
  explanation: string;
}

type FilterTab = 'all' | 'high' | 'medium' | 'insufficient';

export const KnowledgeGapSection: React.FC<{ subjectId?: string }> = ({ subjectId }) => {
  const navigate = useNavigate();
  const { chapters, subjects } = useSubjectStore();
  const [gaps, setGaps] = useState<ChapterGapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedGapForInfo, setSelectedGapForInfo] = useState<ChapterGapData | null>(null);
  const [reviewCountChoice, setReviewCountChoice] = useState<number>(20);

  React.useEffect(() => {
    loadKnowledgeGaps();
  }, [chapters, subjects, subjectId]);

  const loadKnowledgeGaps = async () => {
    setLoading(true);
    try {
      let allQuestions = await db.questions.toArray();
      if (subjectId && subjectId !== 'all') {
        allQuestions = allQuestions.filter((q) => q.subjectId === subjectId);
      }

      // Group all questions by chapter
      const chapterQuestionMap = new Map<string, Question[]>();
      allQuestions.forEach((q) => {
        if (!q.chapterId) return;
        const list = chapterQuestionMap.get(q.chapterId) || [];
        list.push(q);
        chapterQuestionMap.set(q.chapterId, list);
      });

      const gapList: ChapterGapData[] = [];

      chapterQuestionMap.forEach((qList, chapterId) => {
        const chapter = chapters.find((c) => c.id === chapterId);
        const subject = subjects.find((s) => s.id === chapter?.subjectId);
        const totalChapterQuestions = qList.length;

        const attemptedQuestions = qList.filter((q) => (q.attemptCount ?? 0) > 0);
        const wrongQuestions = qList.filter((q) => (q.wrongCount ?? 0) > 0 && q.status !== 'mastered');

        const attemptedQuestionCount = attemptedQuestions.length;
        const wrongQuestionCount = wrongQuestions.length;

        const sumWrongCount = wrongQuestions.reduce((sum, q) => sum + (q.wrongCount || 0), 0);
        const sumAttemptCount = qList.reduce((sum, q) => sum + (q.attemptCount || 0), 0);
        const sumCorrectCount = qList.reduce((sum, q) => sum + (q.correctCount || 0), 0);
        const avgWrongCount = sumWrongCount / Math.max(1, wrongQuestionCount);

        // Skip chapters where user has not attempted any question and has zero wrong questions
        if (attemptedQuestionCount === 0 && wrongQuestionCount === 0) {
          return;
        }

        // --- Data Sufficiency Check ---
        const isInsufficient = attemptedQuestionCount < 3 && sumAttemptCount < 5;

        let urgencyLevel: 'high' | 'medium' | 'low' | 'insufficient';
        let urgencyScore = 0;
        let errorRatioAttempted = 0;
        let explanation = '';

        if (isInsufficient) {
          urgencyLevel = 'insufficient';
          urgencyScore = 15;
          errorRatioAttempted = attemptedQuestionCount > 0 ? wrongQuestionCount / attemptedQuestionCount : 0;
          explanation = `Đã làm ${attemptedQuestionCount}/${totalChapterQuestions} câu — cần làm thêm bài để chẩn đoán chính xác`;
        } else {
          errorRatioAttempted = wrongQuestionCount / Math.max(1, attemptedQuestionCount);
          const errorRatioTotal = wrongQuestionCount / Math.max(1, totalChapterQuestions);
          const attemptErrorIntensity = (sumAttemptCount - sumCorrectCount) / Math.max(1, sumAttemptCount);
          const repeatFactor = Math.min(1.5, sumWrongCount / Math.max(1, wrongQuestionCount));

          const rawScore = (errorRatioAttempted * 40) + (errorRatioTotal * 30) + (attemptErrorIntensity * 20) * repeatFactor;
          urgencyScore = Math.min(100, Math.round(rawScore));

          if (urgencyScore >= 60 || (wrongQuestionCount >= 4 && errorRatioAttempted >= 0.45)) {
            urgencyLevel = 'high';
          } else if (urgencyScore >= 35 || (wrongQuestionCount >= 2 && errorRatioAttempted >= 0.25)) {
            urgencyLevel = 'medium';
          } else {
            urgencyLevel = 'low';
          }

          const percentText = Math.round(errorRatioAttempted * 100);
          explanation = `${
            urgencyLevel === 'high' ? '🚨 Điểm yếu khẩn cấp' : urgencyLevel === 'medium' ? '⚠️ Cần củng cố thêm' : 'Ổn định'
          }: Tỷ lệ sai ${percentText}% (${wrongQuestionCount}/${attemptedQuestionCount} câu đã làm)`;
        }

        if (wrongQuestionCount > 0 || isInsufficient) {
          gapList.push({
            chapterId,
            chapterName: chapter?.name || 'Chương không xác định',
            subjectId: chapter?.subjectId || '',
            subjectName: subject?.name || 'Môn học',
            wrongQuestionCount,
            totalChapterQuestions,
            attemptedQuestionCount,
            sumWrongCount,
            sumAttemptCount,
            avgWrongCount,
            errorRatioAttempted,
            urgencyScore,
            urgencyLevel,
            explanation,
          });
        }
      });

      // Priority ranking: High > Medium > Low > Insufficient, then urgencyScore desc
      const levelRank: Record<'high' | 'medium' | 'low' | 'insufficient', number> = {
        high: 4,
        medium: 3,
        low: 2,
        insufficient: 1,
      };

      gapList.sort((a, b) => {
        const rankDiff = levelRank[b.urgencyLevel] - levelRank[a.urgencyLevel];
        if (rankDiff !== 0) return rankDiff;
        if (b.urgencyScore !== a.urgencyScore) return b.urgencyScore - a.urgencyScore;
        return b.errorRatioAttempted - a.errorRatioAttempted;
      });

      setGaps(gapList);
    } catch (err) {
      console.error('Error loading knowledge gaps:', err);
    }
    setLoading(false);
  };

  const openGapPreviewModal = (gap: ChapterGapData) => {
    setSelectedGapForInfo(gap);
    const defaultCount = Math.min(20, Math.max(5, gap.wrongQuestionCount || 10));
    setReviewCountChoice(defaultCount);
  };

  const handleStartReview = async (gap: ChapterGapData, customCount?: number) => {
    try {
      const qCount = customCount || Math.min(20, Math.max(5, gap.wrongQuestionCount || 10));
      const config: QuizConfig = {
        subjectId: gap.subjectId,
        chapterIds: [gap.chapterId],
        mode: 'review',
        questionCount: qCount,
        timeLimit: 0,
        shuffleQuestions: true,
        shuffleAnswers: true,
        prioritizeWrong: true,
        prioritizeNew: false,
        prioritizeWeak: true,
        excludeMastered: true,
        difficulty: '',
        randomSeed: '',
      };
      await useExamStore.getState().startQuiz(config);
      navigate('/quiz/session');
    } catch (err: any) {
      toast.error(err.message || 'Không thể bắt đầu phiên ôn tập');
    }
  };


  const handleStartBatchReview = async () => {
    try {
      const urgentGaps = gaps.filter((g) => g.urgencyLevel === 'high' || g.urgencyLevel === 'medium');
      const targetGaps = urgentGaps.length > 0 ? urgentGaps : gaps;
      
      if (targetGaps.length === 0) {
        toast('Không có câu sai cần ôn tập!');
        return;
      }

      const chapterIds = targetGaps.map((g) => g.chapterId);
      const subjectId = targetGaps[0]?.subjectId || '';

      const config: QuizConfig = {
        subjectId,
        chapterIds,
        mode: 'review',
        questionCount: Math.min(30, Math.max(10, targetGaps.reduce((acc, g) => acc + g.wrongQuestionCount, 0))),
        timeLimit: 0,
        shuffleQuestions: true,
        shuffleAnswers: true,
        prioritizeWrong: true,
        prioritizeNew: false,
        prioritizeWeak: true,
        excludeMastered: true,
        difficulty: '',
        randomSeed: '',
      };

      await useExamStore.getState().startQuiz(config);
      navigate('/quiz/session');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi khởi tạo ôn tập tổng hợp');
    }
  };

  // Metrics Calculations
  const highCount = gaps.filter((g) => g.urgencyLevel === 'high').length;
  const mediumCount = gaps.filter((g) => g.urgencyLevel === 'medium').length;
  const insufficientCount = gaps.filter((g) => g.urgencyLevel === 'insufficient').length;
  const totalWrongQuestions = gaps.reduce((sum, g) => sum + g.wrongQuestionCount, 0);

  // Overall Knowledge Health Score (0-100%)
  const healthScore = useMemo(() => {
    if (gaps.length === 0) return 100;
    const evaluatedGaps = gaps.filter((g) => g.urgencyLevel !== 'insufficient');
    if (evaluatedGaps.length === 0) return 85;
    const avgUrgency = evaluatedGaps.reduce((sum, g) => sum + g.urgencyScore, 0) / evaluatedGaps.length;
    return Math.max(10, Math.round(100 - avgUrgency));
  }, [gaps]);

  const filteredGaps = useMemo(() => {
    if (activeTab === 'all') return gaps;
    return gaps.filter((g) => g.urgencyLevel === activeTab);
  }, [gaps, activeTab]);

  // Render loading skeleton
  if (loading) {
    return (
      <div className="p-6 rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-[hsl(var(--muted))] rounded-lg animate-pulse" />
          <div className="h-8 w-24 bg-[hsl(var(--muted))] rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-[hsl(var(--muted)/0.4)] rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {[1, 2].map(i => (
            <div key={i} className="h-44 bg-[hsl(var(--muted)/0.4)] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // All Perfect State
  if (gaps.length === 0) {
    return (
      <div className="p-8 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-[hsl(var(--card))] to-[hsl(var(--card))] border border-emerald-500/20 shadow-sm text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h3 className="text-base sm:text-lg font-bold text-[hsl(var(--foreground))]">
            Sức Khỏe Kiến Thức Hoàn Hảo! 🎉
          </h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
            Bạn không có lỗ hổng kiến thức nghiêm trọng nào. Mọi câu hỏi đã làm đều đạt độ chính xác cao hoặc đã thành thạo.
          </p>
        </div>
        <button
          onClick={() => navigate('/quiz/setup?mode=exam')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(var(--primary))] hover:opacity-90 active:scale-[0.98] text-white text-xs font-semibold shadow-md shadow-[hsl(var(--primary)/0.25)] transition-all cursor-pointer"
        >
          <span>Thi thử thách thức năng lực</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-7 rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-sm space-y-6">
      
      {/* ========================================================== */}
      {/* 1. HEADER & 1-CLICK SMART REVIEW                           */}
      {/* ========================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shadow-xs shrink-0">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-[hsl(var(--foreground))] tracking-tight">
                Bản Đồ Sức Khỏe Kiến Thức
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)]">
                AI Chẩn đoán
              </span>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              Phát hiện lỗ hổng theo thời gian thực và đề xuất trọng tâm cần ôn tập.
            </p>
          </div>
        </div>

        {totalWrongQuestions > 0 && (
          <button
            onClick={handleStartBatchReview}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[hsl(var(--primary))] hover:opacity-90 active:scale-[0.98] text-white text-xs font-bold shadow-md shadow-[hsl(var(--primary)/0.25)] transition-all cursor-pointer shrink-0 self-start md:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Ôn nhanh {totalWrongQuestions} câu sai</span>
          </button>
        )}
      </div>

      {/* ========================================================== */}
      {/* 2. MINI DASHBOARD INSIGHTS STRIP (4 KPIS)                  */}
      {/* ========================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Health Score */}
        <div className="p-3.5 rounded-2xl bg-[hsl(var(--muted)/0.35)] border border-[hsl(var(--border))] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider block">
              Sức khỏe kiến thức
            </span>
            <span className={`text-xl font-black ${
              healthScore >= 75 ? 'text-emerald-500' : healthScore >= 50 ? 'text-amber-500' : 'text-rose-500'
            }`}>
              {healthScore}%
            </span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))] block mt-0.5">
              {healthScore >= 75 ? 'Rất tốt' : healthScore >= 50 ? 'Cần củng cố' : 'Cần chú ý gấp'}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[hsl(var(--card))] border border-[hsl(var(--border))] shrink-0">
            {healthScore >= 75 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : healthScore >= 50 ? (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            ) : (
              <Flame className="w-4 h-4 text-rose-500" />
            )}
          </div>
        </div>

        {/* Critical Gaps */}
        <div className="p-3.5 rounded-2xl bg-rose-500/[0.04] border border-rose-500/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-rose-500/80 tracking-wider block">
              Cần cứu nguy
            </span>
            <span className="text-xl font-black text-rose-500">
              {highCount} <span className="text-xs font-semibold">chương</span>
            </span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))] block mt-0.5">
              Tỷ lệ sai {'>'} 45%
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
            <Flame className="w-4 h-4" />
          </div>
        </div>

        {/* Moderate Gaps */}
        <div className="p-3.5 rounded-2xl bg-amber-500/[0.04] border border-amber-500/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-500/80 tracking-wider block">
              Cần củng cố
            </span>
            <span className="text-xl font-black text-amber-500">
              {mediumCount} <span className="text-xs font-semibold">chương</span>
            </span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))] block mt-0.5">
              Tỷ lệ sai 25% – 45%
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        {/* Pending Wrong Questions */}
        <div className="p-3.5 rounded-2xl bg-[hsl(var(--muted)/0.35)] border border-[hsl(var(--border))] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider block">
              Câu sai tồn đọng
            </span>
            <span className="text-xl font-black text-[hsl(var(--primary))]">
              {totalWrongQuestions} <span className="text-xs font-semibold">câu</span>
            </span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))] block mt-0.5">
              {gaps.length} vùng kiến thức
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--primary))] shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

      </div>

      {/* ========================================================== */}
      {/* 3. FILTER TABS STRIP                                       */}
      {/* ========================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))]">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-xs border border-[hsl(var(--border))]'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            Tất cả ({gaps.length})
          </button>

          {highCount > 0 && (
            <button
              onClick={() => setActiveTab('high')}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'high'
                  ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30 shadow-xs'
                  : 'text-rose-500/80 hover:text-rose-500'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>Cần cứu nguy ({highCount})</span>
            </button>
          )}

          {mediumCount > 0 && (
            <button
              onClick={() => setActiveTab('medium')}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'medium'
                  ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30 shadow-xs'
                  : 'text-amber-500/80 hover:text-amber-500'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Cần củng cố ({mediumCount})</span>
            </button>
          )}

          {insufficientCount > 0 && (
            <button
              onClick={() => setActiveTab('insufficient')}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'insufficient'
                  ? 'bg-blue-500/15 text-blue-500 border border-blue-500/30 shadow-xs'
                  : 'text-blue-500/80 hover:text-blue-500'
              }`}
            >
              <HelpCircle className="w-3 h-3" />
              <span>Cần thêm dữ liệu ({insufficientCount})</span>
            </button>
          )}
        </div>

        <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
          Hiển thị <strong>{filteredGaps.length}</strong> vùng kiến thức
        </span>
      </div>

      {/* ========================================================== */}
      {/* 4. KNOWLEDGE CARDS GRID (COMPACT 3-COLUMN SCANNABLE CARDS) */}
      {/* ========================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filteredGaps.map((gap, index) => {
          const isHigh = gap.urgencyLevel === 'high';
          const isMedium = gap.urgencyLevel === 'medium';
          const isInsufficient = gap.urgencyLevel === 'insufficient';

          const cardStyle = isHigh
            ? 'border-rose-500/30 bg-gradient-to-br from-rose-500/[0.04] to-transparent hover:border-rose-500/60'
            : isMedium
            ? 'border-amber-500/30 bg-gradient-to-br from-amber-500/[0.04] to-transparent hover:border-amber-500/60'
            : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary)/0.4)]';

          const badgeClass = isHigh
            ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
            : isMedium
            ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
            : isInsufficient
            ? 'bg-blue-500/15 text-blue-500 border-blue-500/30'
            : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';

          const badgeText = isHigh
            ? '🚨 Cần gấp'
            : isMedium
            ? '⚠️ Củng cố'
            : isInsufficient
            ? 'ℹ️ Dữ liệu ít'
            : '✅ Ổn định';

          return (
            <div
              key={gap.chapterId}
              onClick={() => openGapPreviewModal(gap)}
              className={`p-3.5 rounded-2xl border ${cardStyle} shadow-2xs transition-all duration-200 flex flex-col justify-between space-y-2.5 hover:shadow-xs group cursor-pointer hover:-translate-y-0.5`}
            >
              <div className="space-y-2">
                {/* Header: Rank + Subject Tag + Urgency Badge */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] shrink-0">
                      #{index + 1}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)] truncate max-w-[110px]">
                      {gap.subjectName}
                    </span>
                  </div>

                  <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${badgeClass} shrink-0`}>
                    {badgeText}
                  </span>
                </div>

                {/* Chapter Title & Diagnostic Subtitle */}
                <div>
                  <h4 
                    className="text-xs sm:text-sm font-extrabold text-[hsl(var(--foreground))] leading-snug group-hover:text-[hsl(var(--primary))] transition-colors line-clamp-1"
                    title={gap.chapterName}
                  >
                    {gap.chapterName}
                  </h4>
                  <p className="text-[10.5px] text-[hsl(var(--muted-foreground))] mt-0.5 line-clamp-1">
                    {gap.explanation}
                  </p>
                </div>

                {/* 3-Metric Analytics Strip */}
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="p-1.5 rounded-lg bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))]">
                    <span className="text-[9px] text-[hsl(var(--muted-foreground))] block">Câu sai</span>
                    <span className={`text-[11px] font-bold ${isHigh ? 'text-rose-500' : 'text-[hsl(var(--foreground))]'}`}>
                      {gap.wrongQuestionCount} câu
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))]">
                    <span className="text-[9px] text-[hsl(var(--muted-foreground))] block">Tỷ lệ sai</span>
                    <span className={`text-[11px] font-bold ${isHigh ? 'text-rose-500' : isMedium ? 'text-amber-500' : 'text-[hsl(var(--foreground))]'}`}>
                      {Math.round(gap.errorRatioAttempted * 100)}%
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))]">
                    <span className="text-[9px] text-[hsl(var(--muted-foreground))] block">Lặp lại</span>
                    <span className="text-[11px] font-bold text-[hsl(var(--foreground))]">
                      {gap.avgWrongCount.toFixed(1)}x
                    </span>
                  </div>
                </div>

                {/* Health & Recovery Gauge Bar */}
                {!isInsufficient && (
                  <div className="space-y-0.5 pt-0.5">
                    <div className="flex items-center justify-between text-[9.5px]">
                      <span className="text-[hsl(var(--muted-foreground))]">Độ khẩn cấp</span>
                      <span className={`font-mono font-bold ${isHigh ? 'text-rose-500' : isMedium ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {gap.urgencyScore}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isHigh
                            ? 'bg-rose-500'
                            : isMedium
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${gap.urgencyScore}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button Strip */}
              <div className="pt-0.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openGapPreviewModal(gap);
                  }}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isHigh
                      ? 'bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white shadow-2xs shadow-rose-500/20'
                      : isMedium
                      ? 'bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white shadow-2xs shadow-amber-500/20'
                      : 'bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] active:scale-[0.98] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]'
                  }`}
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{isHigh ? 'Khắc phục ngay' : isMedium ? 'Ôn củng cố' : 'Luyện thêm'}</span>
                  <ChevronRight className="w-3 h-3 opacity-70" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================== */}
      {/* 5. GAP INFORMATION & PRE-QUIZ PREVIEW MODAL                */}
      {/* ========================================================== */}
      {selectedGapForInfo && (
        <Modal
          open={Boolean(selectedGapForInfo)}
          onClose={() => setSelectedGapForInfo(null)}
          title="Thông Tin Vùng Kiến Thức"
          description={selectedGapForInfo.subjectName}
          size="lg"
        >
          <div className="space-y-4 pt-1">
            {/* Header Card */}
            <div className="p-4 rounded-2xl bg-[hsl(var(--muted)/0.35)] border border-[hsl(var(--border))] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)]">
                  {selectedGapForInfo.subjectName}
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  selectedGapForInfo.urgencyLevel === 'high'
                    ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                    : selectedGapForInfo.urgencyLevel === 'medium'
                    ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                }`}>
                  {selectedGapForInfo.urgencyLevel === 'high' ? '🚨 Điểm yếu khẩn cấp' : selectedGapForInfo.urgencyLevel === 'medium' ? '⚠️ Cần củng cố thêm' : '✅ Ổn định'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-[hsl(var(--foreground))]">
                {selectedGapForInfo.chapterName}
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                {selectedGapForInfo.explanation}
              </p>
            </div>

            {/* 4 Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="p-3 rounded-xl bg-rose-500/[0.06] border border-rose-500/20">
                <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 block">Câu sai tồn đọng</span>
                <span className="text-lg font-black text-rose-600 dark:text-rose-400">{selectedGapForInfo.wrongQuestionCount} câu</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/20">
                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 block">Tỷ lệ sai</span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400">{Math.round(selectedGapForInfo.errorRatioAttempted * 100)}%</span>
              </div>
              <div className="p-3 rounded-xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))]">
                <span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] block">Đã làm / Tổng</span>
                <span className="text-lg font-black text-[hsl(var(--foreground))]">{selectedGapForInfo.attemptedQuestionCount}/{selectedGapForInfo.totalChapterQuestions}</span>
              </div>
              <div className="p-3 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/20">
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 block">Độ khẩn cấp</span>
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{selectedGapForInfo.urgencyScore}%</span>
              </div>
            </div>

            {/* Number of Questions to Review Selector */}
            <div className="p-3.5 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-[hsl(var(--foreground))]">
                <span className="flex items-center gap-1.5">
                  <Target size={14} className="text-[hsl(var(--primary))]" />
                  <span>Chọn số lượng câu cho bài ôn tập:</span>
                </span>
                <span className="text-[hsl(var(--primary))] font-mono font-black">{reviewCountChoice} câu</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[5, 10, 15, 20, selectedGapForInfo.wrongQuestionCount].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map(count => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setReviewCountChoice(count)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      reviewCountChoice === count
                        ? 'bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))] shadow-xs'
                        : 'bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'
                    }`}
                  >
                    {count === selectedGapForInfo.wrongQuestionCount && count > 20 ? `Tất cả (${count} câu)` : `${count} câu`}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Learning Strategy Tip */}
            <div className="p-3 rounded-xl bg-indigo-500/[0.04] border border-indigo-500/20 flex items-start gap-2.5 text-xs text-[hsl(var(--foreground))]">
              <BrainCircuit size={16} className="text-indigo-500 shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11.5px]">
                Hệ thống sẽ <strong>tự động ưu tiên câu hỏi bạn từng làm sai nhiều lần nhất</strong> trong chương này để giúp bạn rà soát lại lỗ hổng và củng cố kiến thức trước khi thi chính thức.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[hsl(var(--border))]">
              <button
                type="button"
                onClick={() => setSelectedGapForInfo(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = selectedGapForInfo;
                  const count = reviewCountChoice;
                  setSelectedGapForInfo(null);
                  handleStartReview(target, count);
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-[hsl(var(--primary))] hover:opacity-90 text-white shadow-sm flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
              >
                <Play size={13} className="fill-current" />
                <span>Bắt đầu ôn tập ngay ({reviewCountChoice} câu)</span>
              </button>
            </div>
          </div>
        </Modal>
      )}



    </div>
  );
};

