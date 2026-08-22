// ============================================
// QUIZ SESSION PAGE - Làm bài (Focused Learning Environment)
// ============================================
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Progress, Badge, ConfirmDialog } from '@/components/ui';
import { useExamStore } from '@/stores/exam-store';
import { useAppStore } from '@/stores/app-store';
import { cn, formatDurationShort } from '@/utils';
import toast from 'react-hot-toast';
import {
  ChevronLeft, ChevronRight, Flag, Clock, Send, X,
  CheckCircle2, XCircle, Lightbulb, Flame, Menu, BookOpen,
  AlertTriangle, PauseCircle, Maximize2, Minimize2,
  SlidersHorizontal, EyeOff, Sparkles, Type, Crown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MathRenderer } from '@/components/common/MathRenderer';
import { SoundscapeWidget } from '@/components/quiz/SoundscapeWidget';
import { soundscapeService } from '@/services/soundscape-service';
import { StreakFlameBadge, getStreakTier } from '@/components/quiz/StreakFlameBadge';

// Helper trigger multi-stage fireworks for top streak milestones
function triggerStreakFireworks(tier: number) {
  const count = tier >= 7 ? 220 : tier >= 6 ? 160 : 110;
  
  // Left cannon
  confetti({
    particleCount: Math.floor(count / 2),
    angle: 60,
    spread: 75,
    origin: { x: 0.05, y: 0.85 },
    colors: ['#FFD700', '#FF6B6B', '#A855F7', '#06B6D4', '#F43F5E', '#10B981'],
    zIndex: 9999,
  });

  // Right cannon
  confetti({
    particleCount: Math.floor(count / 2),
    angle: 120,
    spread: 75,
    origin: { x: 0.95, y: 0.85 },
    colors: ['#FFD700', '#FF6B6B', '#A855F7', '#06B6D4', '#F43F5E', '#10B981'],
    zIndex: 9999,
  });

  // Center starburst delayed
  setTimeout(() => {
    confetti({
      particleCount: Math.floor(count * 0.8),
      spread: 110,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#FFD700', '#FFFFFF', '#38BDF8', '#E879F9', '#FBBF24'],
      shapes: ['star', 'circle'],
      zIndex: 9999,
    });
  }, 250);
}

export const QuizSessionPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentAttempt, currentQuestions, currentIndex, elapsedTime,
    answerQuestion, markQuestion, navigateTo, nextQuestion, prevQuestion,
    submitQuiz, tick, abandonQuiz, autoSave,
  } = useExamStore();

  const {
    streakNotificationEnabled,
    streakNotificationMode,
    streakMinThreshold,
  } = useAppStore();

  const [showSubmitConfirm, setShowSubmitConfirm] = React.useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = React.useState(false);
  const [showNav, setShowNav] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [isZenMode, setIsZenMode] = React.useState(false);
  
  // Font size scaler: sm | base | lg | xl
  const [fontSize, setFontSize] = React.useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  
  // Strikethrough elimination: map of questionId -> string[] of eliminated labels
  const [strikedOptions, setStrikedOptions] = React.useState<Record<string, string[]>>({});

  // Palette Filter: all | unanswered | marked
  const [paletteFilter, setPaletteFilter] = React.useState<'all' | 'unanswered' | 'marked'>('all');

  // Floating combo text feedback (5s auto-dismiss)
  interface FloatingComboState {
    id: number;
    text: string;
    subtitle?: string;
    tier?: number;
    streak?: number;
    isMegaTier?: boolean;
  }
  const [floatingCombo, setFloatingCombo] = React.useState<FloatingComboState | null>(null);
  const [showMegaCelebration, setShowMegaCelebration] = React.useState<FloatingComboState | null>(null);

  // Auto-dismiss floating combo toast after 5s
  React.useEffect(() => {
    if (!floatingCombo) return;
    const timer = setTimeout(() => {
      setFloatingCombo(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [floatingCombo?.id]);

  // Auto-dismiss mega celebration banner after 3.8s
  React.useEffect(() => {
    if (!showMegaCelebration) return;
    const timer = setTimeout(() => {
      setShowMegaCelebration(null);
    }, 3800);
    return () => clearTimeout(timer);
  }, [showMegaCelebration?.id]);

  // Stop ambient sound on unmount
  React.useEffect(() => {
    return () => {
      soundscapeService.stop();
    };
  }, []);

  const toggleZenMode = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsZenMode(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsZenMode(false);
    }
  };

  // === Streak / On Fire ===
  const [streak, setStreak] = React.useState(0);
  const [maxStreak, setMaxStreak] = React.useState(0);
  const prevAnsweredRef = React.useRef<string | undefined>(undefined);

  // Timer
  React.useEffect(() => {
    if (!currentAttempt || currentAttempt.isCompleted) return;
    const interval = setInterval(() => tick(), 1000);
    return () => clearInterval(interval);
  }, [currentAttempt?.isCompleted]);

  // Auto-save mỗi 30 giây
  React.useEffect(() => {
    if (!currentAttempt || currentAttempt.isCompleted) return;
    const interval = setInterval(() => autoSave(), 30000);
    return () => clearInterval(interval);
  }, [currentAttempt]);

  const { shortcuts } = useAppStore();

  const isPractice = currentAttempt ? (
    currentAttempt.mode === 'practice' || currentAttempt.mode === 'smart_wrong'
    || currentAttempt.mode === 'smart_new' || currentAttempt.mode === 'smart_weak'
  ) : false;
  const question = currentQuestions[currentIndex];
  const currentAnswer = currentAttempt?.answers.find(a => a.questionId === question?.id);
  const answeredCount = currentAttempt?.answers.filter(a => a.selectedAnswer).length || 0;
  const markedCount = currentAttempt?.answers.filter(a => a.isMarked).length || 0;
  const totalQuestions = currentAttempt?.totalQuestions || 0;
  const unansweredCount = totalQuestions - answeredCount;
  const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
  const isOnFire = streak >= 3;

  // Keyboard shortcuts (Visual-mapped to A/B/C/D on screen & Dynamic Config)
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!question) return;

      const shuffled = currentAttempt?.shuffledAnswerMap?.[question.id];
      const displayAnswers = shuffled 
        ? (shuffled.map(lbl => question.answers.find(a => a.label === lbl)).filter(Boolean) as typeof question.answers)
        : question.answers;

      const handleVisualAnswer = (visualIdx: number) => {
        const targetAns = displayAnswers[visualIdx];
        if (targetAns) {
          handleAnswer(question.id, targetAns.label);
        }
      };

      const keyUpper = e.key.toUpperCase();
      const nextKeyUpper = (shortcuts?.nextKey || 'N').toUpperCase();
      const prevKeyUpper = (shortcuts?.prevKey || 'P').toUpperCase();
      const markKey = shortcuts?.markKey || 'Space';
      const confirmKey = shortcuts?.confirmKey || 'Enter';
      const answerMode = shortcuts?.answerKeys || 'both';

      // Next Question
      if (keyUpper === nextKeyUpper || e.key === 'ArrowRight') {
        nextQuestion();
        return;
      }

      // Prev Question
      if (keyUpper === prevKeyUpper || e.key === 'ArrowLeft') {
        prevQuestion();
        return;
      }

      // Mark / Flag Question
      if ((markKey === 'Space' && e.key === ' ') || keyUpper === markKey.toUpperCase()) {
        e.preventDefault();
        markQuestion(question.id);
        return;
      }

      // Confirm (practice mode)
      if (keyUpper === confirmKey.toUpperCase() || e.key === confirmKey) {
        if (isPractice && currentAnswer?.selectedAnswer) {
          nextQuestion();
        }
        return;
      }

      // Answer selections (1-6 / A-F)
      if (answerMode === 'both' || answerMode === '1-4') {
        if (e.key === '1') { handleVisualAnswer(0); return; }
        if (e.key === '2') { handleVisualAnswer(1); return; }
        if (e.key === '3') { handleVisualAnswer(2); return; }
        if (e.key === '4') { handleVisualAnswer(3); return; }
        if (e.key === '5') { handleVisualAnswer(4); return; }
        if (e.key === '6') { handleVisualAnswer(5); return; }
      }
      if (answerMode === 'both' || answerMode === 'a-d') {
        if (keyUpper === 'A') { handleVisualAnswer(0); return; }
        if (keyUpper === 'B') { handleVisualAnswer(1); return; }
        if (keyUpper === 'C') { handleVisualAnswer(2); return; }
        if (keyUpper === 'D') { handleVisualAnswer(3); return; }
        if (keyUpper === 'E') { handleVisualAnswer(4); return; }
        if (keyUpper === 'F') { handleVisualAnswer(5); return; }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [currentIndex, currentQuestions, currentAttempt?.shuffledAnswerMap, shortcuts, isPractice, currentAnswer, question]);

  // Redirect if no active quiz
  React.useEffect(() => {
    if (!currentAttempt) {
      navigate('/quiz/setup');
    }
  }, [currentAttempt]);

  // Strikethrough elimination handler
  const toggleStrikeOption = (e: React.MouseEvent, questionId: string, label: string) => {
    e.stopPropagation();
    e.preventDefault();
    setStrikedOptions(prev => {
      const list = prev[questionId] || [];
      if (list.includes(label)) {
        return { ...prev, [questionId]: list.filter(l => l !== label) };
      } else {
        return { ...prev, [questionId]: [...list, label] };
      }
    });
  };

  if (!currentAttempt || currentQuestions.length === 0) return null;

  // Time check for exam mode
  const timeLimit = currentAttempt.timeLimit;
  const timeRemaining = timeLimit > 0 ? Math.max(0, timeLimit - elapsedTime) : null;
  const isTimeUp = timeRemaining !== null && timeRemaining <= 0;
  const isUrgentTime = timeRemaining !== null && timeRemaining < 300; // < 5 mins

  // Auto-submit when time is up
  React.useEffect(() => {
    if (isTimeUp && !currentAttempt.isCompleted) {
      handleSubmit();
    }
  }, [isTimeUp]);

  const handleAnswer = (questionId: string, label: string) => {
    if (isPractice && currentAnswer?.selectedAnswer) return; // Already answered in practice mode

    // In practice modes: immediately update streak & trigger sounds
    if (isPractice && question) {
      const isCorrect = question.correctAnswer === label;
      if (isCorrect) {
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        setMaxStreak(m => Math.max(m, nextStreak));

        // Play chime sound on EVERY correct answer
        soundscapeService.playStreakChime(nextStreak);

        // Milestone level up chime & celebration banner (Mốc 3, 6, 9, 12, 15, 18, 21...)
        if (nextStreak >= 3 && nextStreak % 3 === 0) {
          const tierInfo = getStreakTier(nextStreak);
          if (tierInfo) {
            soundscapeService.playLevelUpChime(tierInfo.tier);
            const isMega = tierInfo.tier >= 5; // Top 3 Tiers: Tier 5 (15-17), Tier 6 (18-20), Tier 7 (21+)
            const comboData = {
              id: Date.now(),
              text: `⚡ Thăng cấp: ${tierInfo.subtitle}!`,
              subtitle: tierInfo.title,
              tier: tierInfo.tier,
              streak: nextStreak,
              isMegaTier: isMega,
            };

            if (streakNotificationEnabled) {
              setFloatingCombo(comboData);
            }

            // Trigger Fireworks on top 3 streak tiers!
            if (isMega) {
              setShowMegaCelebration(comboData);
              triggerStreakFireworks(tierInfo.tier);
            }
          }
        } else if (nextStreak >= 2 && streakNotificationEnabled) {
          // Check user notification settings for intermediate streaks
          let shouldShowToast = false;
          if (streakNotificationMode === 'all') {
            shouldShowToast = true;
          } else if (streakNotificationMode === 'min_streak' && nextStreak >= streakMinThreshold) {
            shouldShowToast = true;
          } else if (streakNotificationMode === 'milestones_only') {
            shouldShowToast = false; // Only milestones 3, 6, 9, 12, 15, 18, 21... show
          }

          if (shouldShowToast) {
            setFloatingCombo({
              id: Date.now(),
              text: `+1 Chuỗi đúng x${nextStreak} 🔥`,
              streak: nextStreak,
            });
          }
        }
      } else {
        // Answer is wrong: completely wipe streak to 0 & play gentle wrong buzzer
        setStreak(0);
        setFloatingCombo(null);
        setShowMegaCelebration(null);
        soundscapeService.playWrongSound();
      }
    }


    if (currentAttempt.mode === 'exam' && question?.type === 'multiple_choice') {
      const current = currentAnswer?.selectedAnswer || '';
      const labels = current ? current.split(',') : [];
      const newLabels = labels.includes(label)
        ? labels.filter(l => l !== label)
        : [...labels, label].sort();
      answerQuestion(questionId, newLabels.join(','));
    } else {
      answerQuestion(questionId, label);
    }
  };


  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await submitQuiz();
      navigate(`/quiz/result/${result.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi nộp bài. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setSubmitting(false);
      setShowSubmitConfirm(false);
    }
  };

  const handleAbandon = () => {
    abandonQuiz();
    navigate('/quiz/setup');
  };

  if (!question) return null;

  const hasAnswered = !!currentAnswer?.selectedAnswer;
  const showFeedback = isPractice && hasAnswered;

  const shuffledLabels = currentAttempt.shuffledAnswerMap?.[question.id];
  const getVisualLabel = (dbLabel: string) => {
    if (!shuffledLabels) return dbLabel;
    const idx = shuffledLabels.indexOf(dbLabel);
    return idx >= 0 ? String.fromCharCode(65 + idx) : dbLabel;
  };
  const visualSelected = currentAnswer?.selectedAnswer?.split(',').map(lbl => getVisualLabel(lbl.trim())).sort().join(', ') || 'Bỏ trống';
  const visualCorrect = question.correctAnswer.split(',').map(lbl => getVisualLabel(lbl.trim())).sort().join(', ');

  // Helper classes for font sizing
  const fontSizeClass = {
    sm: 'text-sm sm:text-base leading-[1.6]',
    base: 'text-base sm:text-lg md:text-xl leading-[1.75]',
    lg: 'text-lg sm:text-xl md:text-2xl leading-[1.8]',
    xl: 'text-xl sm:text-2xl md:text-3xl leading-[1.85]',
  }[fontSize];

  const optionTextClass = {
    sm: 'text-xs sm:text-sm',
    base: 'text-sm sm:text-base',
    lg: 'text-base sm:text-lg',
    xl: 'text-lg sm:text-xl',
  }[fontSize];

  const currentPacing = currentAnswer?.timeSpent || 0;
  const isPracticePacingFrozen = isPractice && hasAnswered;
  const pacingBadgeClass = isPracticePacingFrozen
    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold'
    : currentPacing >= 120
    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40 animate-pulse'
    : currentPacing >= 60
    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40'
    : 'bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]';

  // Render Navigator Content
  const renderNavigatorContent = () => (
    <div className="p-4 flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))] mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-1.5">
          <BookOpen size={14} className="text-[hsl(var(--primary))]" />
          <span>Danh Sách Câu Hỏi</span>
        </h3>
        <button
          onClick={() => setShowNav(false)}
          className="p-1 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] lg:hidden cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress Summary Card */}
      <div className="p-3.5 rounded-xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] mb-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[hsl(var(--muted-foreground))]">Tiến độ làm bài</span>
          <span className="font-mono font-bold text-[hsl(var(--primary))]">
            {answeredCount} / {currentAttempt.totalQuestions} ({Math.round(progressPercent)}%)
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Filter Tabs for Question Palette */}
      <div className="flex p-1 rounded-xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] mb-3 text-[11px]">
        <button
          onClick={() => setPaletteFilter('all')}
          className={cn(
            'flex-1 py-1 px-1.5 rounded-lg font-bold transition-all cursor-pointer text-center',
            paletteFilter === 'all'
              ? 'bg-[hsl(var(--card))] shadow-xs text-[hsl(var(--foreground))] border border-[hsl(var(--border))]'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          )}
        >
          Tất cả ({currentAttempt.totalQuestions})
        </button>
        <button
          onClick={() => setPaletteFilter('unanswered')}
          className={cn(
            'flex-1 py-1 px-1.5 rounded-lg font-bold transition-all cursor-pointer text-center',
            paletteFilter === 'unanswered'
              ? 'bg-[hsl(var(--card))] shadow-xs text-amber-500 border border-[hsl(var(--border))]'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          )}
        >
          Chưa làm ({unansweredCount})
        </button>
        <button
          onClick={() => setPaletteFilter('marked')}
          className={cn(
            'flex-1 py-1 px-1.5 rounded-lg font-bold transition-all cursor-pointer text-center',
            paletteFilter === 'marked'
              ? 'bg-[hsl(var(--card))] shadow-xs text-amber-600 dark:text-amber-400 border border-[hsl(var(--border))]'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          )}
        >
          Đánh dấu ({markedCount})
        </button>
      </div>

      {/* Question Matrix Grid */}
      <div className="flex-1 overflow-y-auto p-1 pr-1.5 mb-3 custom-scrollbar">
        <div className="grid grid-cols-5 gap-2">
          {currentAttempt.answers.map((ans, idx) => {
            // Apply filter
            if (paletteFilter === 'unanswered' && ans.selectedAnswer) return null;
            if (paletteFilter === 'marked' && !ans.isMarked) return null;

            const isCurrent = idx === currentIndex;
            const isAnswered = Boolean(ans.selectedAnswer);
            const isMarked = ans.isMarked;

            let itemClass = 'bg-[hsl(var(--muted)/0.4)] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]';

            if (isPractice && isAnswered) {
              itemClass = ans.isCorrect
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400 font-bold';
            } else if (isAnswered) {
              itemClass = 'bg-[hsl(var(--primary)/0.12)] border-[hsl(var(--primary)/0.4)] text-[hsl(var(--primary))] font-bold shadow-xs';
            }

            if (isCurrent) {
              itemClass += ' border-2 border-[hsl(var(--primary))] ring-2 ring-[hsl(var(--primary)/0.25)] font-bold text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)] shadow-xs z-10';
            }

            return (
              <button
                key={ans.questionId}
                onClick={() => {
                  navigateTo(idx);
                  if (window.innerWidth < 1024) setShowNav(false);
                }}
                className={cn(
                  'aspect-square rounded-xl text-xs font-semibold border transition-all duration-150 flex items-center justify-center relative cursor-pointer',
                  itemClass
                )}
                title={`Câu ${idx + 1}`}
              >
                <span>{idx + 1}</span>
                {isMarked && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 ring-1 ring-[hsl(var(--card))]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status Legend */}
      <div className="p-3 rounded-xl bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] space-y-1.5 text-xs mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-md bg-[hsl(var(--primary)/0.2)] border border-[hsl(var(--primary))]" />
            <span className="text-[hsl(var(--muted-foreground))]">Đã làm</span>
          </div>
          <span className="font-bold text-[hsl(var(--foreground))] font-mono">{answeredCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-md bg-[hsl(var(--muted))] border border-[hsl(var(--border))]" />
            <span className="text-[hsl(var(--muted-foreground))]">Chưa làm</span>
          </div>
          <span className="font-bold text-[hsl(var(--foreground))] font-mono">{unansweredCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-[hsl(var(--muted-foreground))]">Đánh dấu xem lại</span>
          </div>
          <span className="font-bold text-amber-500 font-mono">{markedCount}</span>
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={() => {
          setShowSubmitConfirm(true);
          if (window.innerWidth < 1024) setShowNav(false);
        }}
        className={cn(
          'w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm',
          answeredCount === currentAttempt.totalQuestions
            ? 'bg-[hsl(var(--primary))] hover:opacity-90 text-white shadow-[hsl(var(--primary)/0.25)]'
            : 'bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]'
        )}
      >
        <Send size={14} />
        <span>Nộp bài thi</span>
      </button>
    </div>
  );

  // Dynamic Streak Aura Helpers for background and canvas border
  const getStreakAuraBackground = (s: number) => {
    if (s < 3) return 'bg-[#f4f6f9] dark:bg-slate-950';
    if (s < 6) return 'bg-gradient-to-b from-amber-500/12 via-[#f4f6f9] to-[#f4f6f9] dark:from-amber-950/30 dark:via-slate-950 dark:to-slate-950';
    if (s < 9) return 'bg-gradient-to-b from-rose-500/14 via-amber-500/8 to-[#f4f6f9] dark:from-rose-950/35 dark:via-slate-950 dark:to-slate-950';
    if (s < 12) return 'bg-gradient-to-b from-purple-500/16 via-indigo-500/8 to-[#f4f6f9] dark:from-purple-950/40 dark:via-slate-950 dark:to-slate-950';
    if (s < 15) return 'bg-gradient-to-b from-cyan-500/18 via-blue-500/10 to-[#f4f6f9] dark:from-cyan-950/45 dark:via-slate-950 dark:to-slate-950';
    if (s < 18) return 'bg-gradient-to-b from-amber-400/22 via-yellow-500/10 to-[#f4f6f9] dark:from-yellow-950/50 dark:via-slate-950 dark:to-slate-950';
    if (s < 21) return 'bg-gradient-to-b from-fuchsia-500/25 via-purple-500/12 to-[#f4f6f9] dark:from-fuchsia-950/55 dark:via-slate-950 dark:to-slate-950';
    return 'bg-gradient-to-b from-cyan-400/28 via-purple-600/18 to-[#f4f6f9] dark:from-cyan-950/65 dark:via-indigo-950/55 dark:to-slate-950';
  };

  const getStreakCanvasBorder = (s: number) => {
    if (s < 3) return 'border-[hsl(var(--border))] shadow-md';
    if (s < 6) return 'border-amber-500/40 shadow-[0_4px_30px_rgba(245,158,11,0.18)] ring-1 ring-amber-500/25';
    if (s < 9) return 'border-rose-500/45 shadow-[0_4px_30px_rgba(244,63,94,0.22)] ring-1 ring-rose-500/25';
    if (s < 12) return 'border-purple-500/50 shadow-[0_4px_35px_rgba(168,85,247,0.25)] ring-1 ring-purple-500/30';
    if (s < 15) return 'border-cyan-400/55 shadow-[0_4px_40px_rgba(6,182,212,0.28)] ring-2 ring-cyan-400/35';
    if (s < 18) return 'border-amber-400/65 shadow-[0_4px_45px_rgba(245,158,11,0.32)] ring-2 ring-amber-400/40';
    if (s < 21) return 'border-fuchsia-400/70 shadow-[0_4px_50px_rgba(217,70,239,0.38)] ring-2 ring-fuchsia-400/45';
    return 'border-cyan-300/80 shadow-[0_4px_60px_rgba(6,182,212,0.48)] ring-2 ring-cyan-300/55';
  };

  return (
    <div className={cn('h-[100dvh] flex flex-col font-sans overflow-hidden text-[hsl(var(--foreground))] transition-colors duration-700', getStreakAuraBackground(streak))}>
      
      {/* 1. TOP HEADER */}
      <header className="h-14 flex-shrink-0 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] flex items-center justify-between px-4 lg:px-6 z-20 shadow-xs">
        
        {/* Left: Exam Info & Mode */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] shrink-0">
            <BookOpen size={16} />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-xs sm:text-sm text-[hsl(var(--foreground))] truncate block">
              {currentAttempt.examName}
            </span>
          </div>
          <Badge
            variant={isPractice ? 'secondary' : 'default'}
            className="hidden sm:inline-flex text-[10px] uppercase tracking-wider font-bold"
          >
            {isPractice ? 'Luyện tập' : 'Thi thử'}
          </Badge>
        </div>

        {/* Right: Timer & Soundscape & Zen & Exit */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Soundscape Ambient Sound Widget */}
          <SoundscapeWidget />

          {/* Zen Fullscreen Button */}
          <button
            onClick={toggleZenMode}
            className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] border border-[hsl(var(--border))] shadow-xs transition-all cursor-pointer"
            title={isZenMode ? 'Thoát toàn màn hình' : 'Chế độ tập trung (Zen Mode)'}
          >
            {isZenMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span className="hidden md:inline">{isZenMode ? 'Thu nhỏ' : 'Zen Mode'}</span>
          </button>

          {/* Timer Display */}
          <div className={cn(
            'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-mono font-bold border transition-colors shadow-xs',
            isUrgentTime
              ? 'bg-rose-500/10 text-rose-500 border-rose-500/30 animate-pulse'
              : 'bg-[hsl(var(--muted)/0.5)] text-[hsl(var(--foreground))] border-[hsl(var(--border))]'
          )}>
            <Clock size={15} className={isUrgentTime ? 'text-rose-500' : 'text-[hsl(var(--muted-foreground))]'} />
            <span>{timeRemaining !== null ? formatDurationShort(timeRemaining) : formatDurationShort(elapsedTime)}</span>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setShowNav(true)}
            className="p-2 rounded-xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors lg:hidden cursor-pointer"
            title="Mở ma trận câu hỏi"
          >
            <Menu size={20} />
          </button>

          {/* Exit / Pause Button */}
          <button
            onClick={() => setShowAbandonConfirm(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] border border-[hsl(var(--border))] border-b-2 shadow-xs transition-all cursor-pointer"
            title="Lưu bài thi và thoát"
          >
            <PauseCircle size={14} />
            <span>Tạm dừng</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN LAYOUT */}
      <div className="flex-1 flex overflow-hidden p-3 md:p-4 gap-4">
        
        {/* 2a. Question Canvas (Main Area) with Dynamic Streak Aura */}
        <div className={cn('flex-1 bg-[hsl(var(--card))] rounded-2xl md:rounded-3xl border flex flex-col overflow-hidden relative transition-all duration-700', getStreakCanvasBorder(streak))}>

          {/* Scrollable Question Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
            <div key={currentIndex} className="max-w-3xl mx-auto space-y-6 animate-question-slide">
              
              {/* Question Metadata Row - Balanced 3-Zone Layout */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[hsl(var(--border))]">
                {/* Left: Question index & Difficulty & Timer */}
                <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap min-w-0">
                  <span className="text-xs font-extrabold px-3 py-1.5 rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)]">
                    Câu {currentIndex + 1} / {currentAttempt.totalQuestions}
                  </span>
                  {question.difficulty && (
                    <span className="hidden sm:inline-block text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
                      Độ khó: <strong>{question.difficulty === 'easy' ? 'Dễ' : question.difficulty === 'hard' ? 'Khó' : 'Trung bình'}</strong>
                    </span>
                  )}
                  {/* Current question pacing timer with color alert */}
                  <span className={cn('inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2.5 py-1 rounded-lg border transition-colors', pacingBadgeClass)}>
                    <Clock size={12} className={isPracticePacingFrozen ? 'text-emerald-500' : currentPacing >= 120 ? 'text-rose-500' : currentPacing >= 60 ? 'text-amber-500' : 'text-indigo-500'} />
                    <span>{currentPacing}s</span>
                    {isPracticePacingFrozen && <span className="text-[9.5px] font-sans font-bold opacity-80 ml-0.5">• Đã chốt</span>}
                  </span>
                </div>

                {/* Center: Streak Flame Record Badge (NẰM Ở CHÍNH GIỮA CÂN ĐỐI) */}
                {streak >= 3 ? (
                  <div className="animate-fade-in flex items-center justify-center shrink-0 my-0.5">
                    <StreakFlameBadge streak={streak} size="lg" />
                  </div>
                ) : (
                  <div className="hidden sm:block" />
                )}

                {/* Right: Font Scaler & Marked Badge */}
                <div className="flex items-center gap-2.5 shrink-0">
                  {currentAnswer?.isMarked && (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      Đã đánh dấu
                    </span>
                  )}

                  <div className="hidden sm:inline-flex items-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] p-0.5 text-xs font-semibold">
                    <button
                      onClick={() => setFontSize(f => (f === 'xl' ? 'lg' : f === 'lg' ? 'base' : 'sm'))}
                      disabled={fontSize === 'sm'}
                      className="px-2 py-0.5 rounded hover:bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-30 cursor-pointer"
                      title="Thu nhỏ cỡ chữ"
                    >
                      A-
                    </button>
                    <span className="px-1.5 text-[10px] text-[hsl(var(--muted-foreground))] font-mono uppercase font-bold">{fontSize}</span>
                    <button
                      onClick={() => setFontSize(f => (f === 'sm' ? 'base' : f === 'base' ? 'lg' : 'xl'))}
                      disabled={fontSize === 'xl'}
                      className="px-2 py-0.5 rounded hover:bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-30 cursor-pointer"
                      title="Phóng to cỡ chữ"
                    >
                      A+
                    </button>
                  </div>
                </div>
              </div>


              {/* Question Body with MathRenderer & Font Sizing */}
              <div className="py-2">
                <div className={cn('font-medium text-[hsl(var(--foreground))] transition-all duration-150', fontSizeClass)}>
                  <MathRenderer text={question.content} />
                </div>
              </div>

              {/* Question Image (if present) */}
              {question.imageUrl && (
                <div className="flex justify-center my-4">
                  <img
                    src={question.imageUrl}
                    alt="Minh họa câu hỏi"
                    className="max-h-72 rounded-xl border border-[hsl(var(--border))] object-contain shadow-xs"
                  />
                </div>
              )}

              {/* Options List with 3D Depth & Bottom Border */}
              <div className="space-y-3.5 pt-2">
                {(() => {
                  const shuffled = currentAttempt.shuffledAnswerMap?.[question.id];
                  const displayAnswers = shuffled 
                    ? shuffled.map(lbl => question.answers.find(a => a.label === lbl)).filter(Boolean) as typeof question.answers
                    : question.answers;

                  const currentStriked = strikedOptions[question.id] || [];

                  return displayAnswers.map((answer, index) => {
                    const visualLabel = String.fromCharCode(65 + index); // A, B, C, D...
                    const isSelected = currentAnswer?.selectedAnswer?.includes(answer.label);
                    const isCorrect = answer.isCorrect;
                    const isStriked = currentStriked.includes(answer.label);

                    let cardClass = 'bg-[hsl(var(--card))] border-2 border-[hsl(var(--border))] border-b-4 border-b-[hsl(var(--border)/0.8)] dark:border-b-[hsl(var(--border))] text-[hsl(var(--foreground))] shadow-xs hover:border-[hsl(var(--primary)/0.5)] hover:border-b-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.03)] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-2';
                    let badgeClass = 'bg-[hsl(var(--muted)/0.7)] border border-[hsl(var(--border))] border-b-2 border-b-[hsl(var(--border))] text-[hsl(var(--foreground))] font-bold shadow-xs';

                    if (showFeedback) {
                      if (isCorrect) {
                        cardClass = 'bg-emerald-500/10 border-2 border-emerald-500 border-b-4 border-b-emerald-600 text-emerald-700 dark:text-emerald-300 font-semibold shadow-sm';
                        badgeClass = 'bg-emerald-500 text-white border-emerald-600 shadow-xs';
                      } else if (isSelected && !isCorrect) {
                        cardClass = 'bg-rose-500/10 border-2 border-rose-500 border-b-4 border-b-rose-600 text-rose-700 dark:text-rose-300 font-semibold shadow-sm';
                        badgeClass = 'bg-rose-500 text-white border-rose-600 shadow-xs';
                      } else {
                        cardClass = 'opacity-40 bg-[hsl(var(--muted)/0.2)] border-2 border-[hsl(var(--border))] border-b-2 text-[hsl(var(--muted-foreground))]';
                        badgeClass = 'bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]';
                      }
                    } else if (isSelected) {
                      cardClass = 'bg-[hsl(var(--primary)/0.08)] border-2 border-[hsl(var(--primary))] border-b-4 border-b-[hsl(var(--primary))] text-[hsl(var(--foreground))] font-semibold shadow-sm';
                      badgeClass = 'bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))] shadow-xs';
                    } else if (isStriked) {
                      cardClass = 'opacity-40 line-through bg-[hsl(var(--muted)/0.2)] border-dashed border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]';
                      badgeClass = 'bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]';
                    }

                    return (
                      <div key={answer.id} className="relative group">
                        <button
                          onClick={() => handleAnswer(question.id, answer.label)}
                          onContextMenu={(e) => toggleStrikeOption(e, question.id, answer.label)}
                          disabled={showFeedback}
                          className={cn(
                            'w-full flex items-center gap-4 p-4 sm:p-4.5 rounded-2xl text-left transition-all duration-150 cursor-pointer select-none',
                            cardClass,
                            showFeedback && 'cursor-default hover:translate-y-0'
                          )}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-all',
                            badgeClass
                          )}>
                            {showFeedback && isCorrect ? <CheckCircle2 size={16} /> :
                             showFeedback && isSelected && !isCorrect ? <XCircle size={16} /> :
                             visualLabel}
                          </div>
                          <span className={cn('flex-1 leading-relaxed', optionTextClass, isStriked && 'line-through opacity-70')}>
                            <MathRenderer text={answer.content} />
                          </span>
                          <span className="hidden sm:inline-block text-[11px] font-mono text-[hsl(var(--muted-foreground))] opacity-60">
                            [{visualLabel}]
                          </span>
                        </button>

                        {/* Strikethrough Elimination Button */}
                        {!showFeedback && (
                          <button
                            type="button"
                            onClick={(e) => toggleStrikeOption(e, question.id, answer.label)}
                            className={cn(
                              'absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-xs transition-opacity cursor-pointer z-10',
                              isStriked
                                ? 'opacity-100 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                : 'opacity-0 group-hover:opacity-100 hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                            )}
                            title={isStriked ? 'Bỏ gạch đáp án' : 'Gạch bỏ loại trừ đáp án'}
                          >
                            <EyeOff size={14} />
                          </button>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Practice Feedback Box (Learning Loop) */}
              {showFeedback && (
                <div className="mt-5 p-5 sm:p-6 rounded-2xl border-2 border-[hsl(var(--border))] border-b-4 bg-[hsl(var(--card))] shadow-sm space-y-3.5 animate-fade-in">
                  <div className="flex items-center gap-2">
                    {currentAnswer?.isCorrect ? (
                      <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                        <CheckCircle2 size={18} />
                        <span>CHÍNH XÁC</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-rose-500 font-bold text-sm">
                        <XCircle size={18} />
                        <span>CHƯA CHÍNH XÁC</span>
                      </div>
                    )}
                  </div>

                  {!currentAnswer?.isCorrect && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Bạn chọn: <strong>{visualSelected}</strong> • Đáp án đúng: <strong className="text-emerald-500">{visualCorrect}</strong>
                    </p>
                  )}

                  {question.explanation && (
                    <div className="pt-3 border-t border-[hsl(var(--border))] space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[hsl(var(--foreground))]">
                        <Lightbulb size={14} className="text-amber-500" />
                        <span>Giải thích chi tiết</span>
                      </div>
                      <div className="text-xs sm:text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                        <MathRenderer text={question.explanation} />
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Bottom Navigation Toolbar (Fixed at Bottom) */}
          <div className="flex-shrink-0 border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-3.5 z-10 shadow-xs">
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
              
              {/* Prev Button */}
              <button
                onClick={prevQuestion}
                disabled={currentIndex === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] text-xs font-bold text-[hsl(var(--foreground))] border border-[hsl(var(--border))] border-b-2 shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed active:translate-y-0.5 active:border-b cursor-pointer"
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">Câu trước (P)</span>
              </button>

              {/* Bookmark / Flag Button */}
              <button
                onClick={() => markQuestion(question.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border border-b-2 shadow-xs transition-all cursor-pointer active:translate-y-0.5 active:border-b',
                  currentAnswer?.isMarked
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400'
                    : 'bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'
                )}
              >
                <Flag size={14} />
                <span>{currentAnswer?.isMarked ? 'Đã đánh dấu' : 'Đánh dấu xem lại'}</span>
              </button>

              {/* Next / Submit Button */}
              {currentIndex < currentAttempt.totalQuestions - 1 ? (
                <button
                  onClick={nextQuestion}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[hsl(var(--primary))] hover:opacity-95 active:translate-y-0.5 text-white text-xs font-bold shadow-md shadow-[hsl(var(--primary)/0.25)] border-b-2 border-b-black/20 transition-all cursor-pointer"
                >
                  <span>Câu tiếp (N)</span>
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:translate-y-0.5 text-white text-xs font-bold shadow-md shadow-emerald-500/25 border-b-2 border-b-emerald-800 transition-all cursor-pointer"
                >
                  <Send size={14} />
                  <span>Nộp bài</span>
                </button>
              )}

            </div>
          </div>

        </div>

        {/* 2b. Navigator Sidebar (Desktop 320px) */}
        <div className="hidden lg:flex w-72 xl:w-80 bg-[hsl(var(--card))] rounded-2xl md:rounded-3xl border border-[hsl(var(--border))] shadow-md flex-col overflow-hidden">
          {renderNavigatorContent()}
        </div>

        {/* Mobile Navigator Drawer (Overlay) */}
        {showNav && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-xs animate-fade-in" onClick={() => setShowNav(false)} />
            <div className="relative ml-auto w-[85%] max-w-[320px] bg-[hsl(var(--card))] shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
              {renderNavigatorContent()}
            </div>
          </div>
        )}

      </div>

      {/* 3. EXAM COMPLETION SUMMARY MODAL (Nộp bài thi) */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] flex items-center justify-center shrink-0">
                <Send size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-[hsl(var(--foreground))]">Xác Nhận Nộp Bài Thi</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Kiểm tra lại toàn bộ tiến độ trước khi kết thúc</p>
              </div>
            </div>

            {/* Summary Statistics Card */}
            <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-2xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))]">
              <div className="p-2.5 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-center">
                <span className="text-[11px] text-[hsl(var(--muted-foreground))] block">Đã trả lời</span>
                <span className="text-lg font-bold text-emerald-500">{answeredCount} / {currentAttempt.totalQuestions}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-center">
                <span className="text-[11px] text-[hsl(var(--muted-foreground))] block">Chưa trả lời</span>
                <span className={cn('text-lg font-bold', unansweredCount > 0 ? 'text-amber-500' : 'text-emerald-500')}>
                  {unansweredCount} câu
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-center">
                <span className="text-[11px] text-[hsl(var(--muted-foreground))] block">Đánh dấu xem lại</span>
                <span className="text-lg font-bold text-amber-500">{markedCount} câu</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-center">
                <span className="text-[11px] text-[hsl(var(--muted-foreground))] block">Thời gian làm</span>
                <span className="text-lg font-bold text-[hsl(var(--primary))]">{formatDurationShort(elapsedTime)}</span>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>Bạn vẫn còn <strong>{unansweredCount} câu chưa chọn đáp án</strong>. Bạn có chắc chắn muốn nộp bài ngay bây giờ?</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="px-4 py-2.5 rounded-xl bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-xs font-semibold text-[hsl(var(--foreground))] border border-[hsl(var(--border))] transition-all cursor-pointer"
              >
                Kiểm tra lại câu hỏi
              </button>
              <button
                disabled={submitting}
                onClick={handleSubmit}
                className="px-5 py-2.5 rounded-xl bg-[hsl(var(--primary))] hover:opacity-90 active:scale-[0.98] text-white text-xs font-bold shadow-md shadow-[hsl(var(--primary)/0.25)] transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Đang nộp...' : 'Xác nhận nộp bài'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 4. ABANDON / SAVE CONFIRM DIALOG */}
      <ConfirmDialog
        open={showAbandonConfirm}
        onClose={() => setShowAbandonConfirm(false)}
        onConfirm={handleAbandon}
        title="Tạm dừng bài thi"
        description="Tiến độ và các câu đã làm sẽ được tự động lưu. Bạn có thể tiếp tục làm bài bất kỳ lúc nào."
        confirmText="Lưu và Thoát"
        variant="default"
      />

      {/* 5. FLOATING COMBO TOAST (Căn giữa đỉnh màn hình, tự biến mất sau 5s, không che thanh điều khiển khi chia đôi màn hình) */}
      {floatingCombo && (
        <div
          key={floatingCombo.id}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-toast-slide-down flex flex-col items-center pointer-events-auto select-none max-w-[92vw] sm:max-w-md w-max"
        >
          <div className={cn(
            'p-3.5 sm:p-4 rounded-2xl text-white shadow-2xl backdrop-blur-xl border flex items-center gap-3 max-w-sm transition-all duration-300',
            floatingCombo.isMegaTier
              ? 'bg-gradient-to-r from-amber-600 via-rose-600 to-purple-800 border-amber-300/70 shadow-[0_10px_40px_rgba(245,158,11,0.55)] ring-2 ring-amber-300/50 animate-epic-glow'
              : floatingCombo.tier
                ? 'bg-gradient-to-r from-slate-900/95 via-purple-950/95 to-slate-900/95 border-purple-500/50 shadow-xl ring-1 ring-purple-400/30'
                : 'bg-slate-900/95 border-slate-700/70 shadow-lg'
          )}>
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-inner',
              floatingCombo.isMegaTier
                ? 'bg-amber-400 text-amber-950 border-amber-200 animate-bounce'
                : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
            )}>
              {floatingCombo.isMegaTier ? <Crown size={20} /> : <Flame size={20} className="text-amber-400 animate-flame-pulse" />}
            </div>

            <div className="min-w-0 pr-1 space-y-0.5">
              <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm tracking-wide">
                <Sparkles size={14} className="text-yellow-300 animate-spin" style={{ animationDuration: '3s' }} />
                <span>{floatingCombo.text}</span>
              </div>
              {floatingCombo.subtitle && (
                <p className="text-[11px] sm:text-xs text-amber-200/90 font-bold truncate">
                  {floatingCombo.subtitle}
                </p>
              )}
              {/* 5s progress countdown bar */}
              <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mt-1.5">
                <div
                  className="h-full bg-yellow-300 rounded-full"
                  style={{
                    animation: 'shrinkWidth 5s linear forwards'
                  }}
                />
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setFloatingCombo(null)}
              className="p-1 rounded-lg hover:bg-white/20 text-white/70 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Đóng"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 6. MEGA STREAK EPIC CENTER BANNER CELEBRATION (3 mốc cao nhất >= 15) */}
      {showMegaCelebration && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center p-4">
          <div className="text-center space-y-3 p-8 sm:p-10 rounded-3xl bg-slate-950/90 backdrop-blur-xl border-2 border-yellow-400/90 shadow-[0_0_100px_rgba(234,179,8,0.85)] animate-bounce-in max-w-lg">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-yellow-300 text-white shadow-2xl ring-4 ring-yellow-300/60 animate-spin" style={{ animationDuration: '8s' }}>
              <Crown size={40} className="text-yellow-100" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-black tracking-widest uppercase text-amber-300/90">
                ✨ KỶ LỤC CHUỖI ĐỈNH CAO ✨
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 drop-shadow-md">
                🔥 {showMegaCelebration.text} 🔥
              </h3>
              <p className="text-sm font-bold text-amber-200">
                Đã trả lời đúng liên tiếp <strong className="text-white text-base font-extrabold">{showMegaCelebration.streak}</strong> câu!
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

