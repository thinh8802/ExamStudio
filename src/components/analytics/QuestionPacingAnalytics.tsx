// ============================================
// QUESTION PACING & TIME TRAP ANALYTICS (v3.0.0 Pro UX)
// Multi-mode visual inspector: Heatmap Matrix, Zoomable Timeline Bar, and Time Trap Leaderboard
// ============================================
import React, { useState, useMemo } from 'react';
import type { Attempt, Question } from '@/types';
import { Card, CardContent, Badge } from '@/components/ui';
import { formatDuration, cn } from '@/utils';
import {
  Clock, AlertTriangle, Zap, CheckCircle2, XCircle,
  Flame, LayoutGrid, BarChart2, ListOrdered, ChevronLeft,
  ChevronRight, ArrowRight, Eye, Sparkles, Filter, Info
} from 'lucide-react';
import { MathRenderer } from '@/components/common/MathRenderer';

interface QuestionPacingAnalyticsProps {
  attempt: Attempt;
  questions: Question[];
  onSelectQuestion?: (questionIndex: number) => void;
}

interface QuestionPacingItem {
  index: number;
  question: Question;
  selectedAnswer: string;
  isCorrect: boolean;
  timeSpent: number; // in seconds
  category: 'fast_correct' | 'steady_correct' | 'time_trap' | 'rushed_wrong' | 'unanswered';
  categoryLabel: string;
  categoryBadge: string;
  bgGradient: string;
  borderColor: string;
  textColor: string;
  icon: React.ReactNode;
}

export const QuestionPacingAnalytics: React.FC<QuestionPacingAnalyticsProps> = ({
  attempt,
  questions,
  onSelectQuestion,
}) => {
  const [viewMode, setViewMode] = useState<'matrix' | 'chart' | 'list'>('matrix');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(50);
  const [selectedItem, setSelectedItem] = useState<QuestionPacingItem | null>(null);

  const items = useMemo<QuestionPacingItem[]>(() => {
    return attempt.answers.map((ans, idx) => {
      const q = questions.find(item => item.id === ans.questionId) || questions[idx];
      const time = ans.timeSpent || 0;
      const isCorrect = ans.isCorrect;
      const answered = !!ans.selectedAnswer;

      let category: QuestionPacingItem['category'] = 'steady_correct';
      let categoryLabel = 'Tư duy chắc chắn';
      let categoryBadge = 'Tư duy chắc';
      let bgGradient = 'from-emerald-500/10 via-emerald-500/5 to-transparent';
      let borderColor = 'border-emerald-500/30 hover:border-emerald-500';
      let textColor = 'text-emerald-600 dark:text-emerald-400';
      let icon = <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />;

      if (!answered) {
        category = 'unanswered';
        categoryLabel = 'Chưa trả lời';
        categoryBadge = 'Bỏ qua';
        bgGradient = 'from-slate-500/10 via-slate-500/5 to-transparent';
        borderColor = 'border-slate-500/30 hover:border-slate-500';
        textColor = 'text-slate-500';
        icon = <XCircle size={13} className="text-slate-400 shrink-0" />;
      } else if (isCorrect) {
        if (time <= 30) {
          category = 'fast_correct';
          categoryLabel = 'Phản xạ nhanh (≤30s)';
          categoryBadge = '⚡ Phản xạ nhanh';
          bgGradient = 'from-cyan-500/15 via-cyan-500/5 to-transparent';
          borderColor = 'border-cyan-500/30 hover:border-cyan-500';
          textColor = 'text-cyan-600 dark:text-cyan-400';
          icon = <Zap size={13} className="text-cyan-500 shrink-0" />;
        } else {
          category = 'steady_correct';
          categoryLabel = 'Tư duy chắc chắn (30s - 90s)';
          categoryBadge = '✓ Tư duy chắc';
          bgGradient = 'from-emerald-500/15 via-emerald-500/5 to-transparent';
          borderColor = 'border-emerald-500/30 hover:border-emerald-500';
          textColor = 'text-emerald-600 dark:text-emerald-400';
          icon = <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />;
        }
      } else {
        if (time >= 75) {
          category = 'time_trap';
          categoryLabel = 'Bẫy thời gian (Mất nhiều thời gian mà sai)';
          categoryBadge = '⚠️ Bẫy thời gian';
          bgGradient = 'from-rose-500/20 via-rose-500/5 to-transparent';
          borderColor = 'border-rose-500/40 hover:border-rose-500';
          textColor = 'text-rose-600 dark:text-rose-400';
          icon = <AlertTriangle size={13} className="text-rose-500 shrink-0" />;
        } else if (time <= 15) {
          category = 'rushed_wrong';
          categoryLabel = 'Vội vàng / Ẩu (≤15s nhưng làm sai)';
          categoryBadge = '🔥 Đọc ẩu / Vội';
          bgGradient = 'from-amber-500/20 via-amber-500/5 to-transparent';
          borderColor = 'border-amber-500/40 hover:border-amber-500';
          textColor = 'text-amber-600 dark:text-amber-400';
          icon = <Flame size={13} className="text-amber-500 shrink-0" />;
        } else {
          category = 'time_trap';
          categoryLabel = 'Trả lời sai (Cần ôn lại)';
          categoryBadge = '✗ Cần ôn lại';
          bgGradient = 'from-orange-500/15 via-orange-500/5 to-transparent';
          borderColor = 'border-orange-500/30 hover:border-orange-500';
          textColor = 'text-orange-600 dark:text-orange-400';
          icon = <XCircle size={13} className="text-orange-500 shrink-0" />;
        }
      }

      return {
        index: idx,
        question: q,
        selectedAnswer: ans.selectedAnswer,
        isCorrect,
        timeSpent: time,
        category,
        categoryLabel,
        categoryBadge,
        bgGradient,
        borderColor,
        textColor,
        icon,
      };
    });
  }, [attempt, questions]);

  const stats = useMemo(() => {
    const totalTime = attempt.timeSpent || items.reduce((s, i) => s + i.timeSpent, 0) || 1;
    const totalQuestions = attempt.totalQuestions || items.length || 1;
    const avgTime = Math.round(totalTime / totalQuestions);

    const fastCorrect = items.filter(i => i.category === 'fast_correct').length;
    const steadyCorrect = items.filter(i => i.category === 'steady_correct').length;
    const timeTraps = items.filter(i => i.category === 'time_trap').length;
    const rushedWrong = items.filter(i => i.category === 'rushed_wrong').length;

    const rawMax = Math.max(...items.map(i => i.timeSpent), 0);
    const maxTime = rawMax > 0 ? rawMax : 10;

    return {
      avgTime,
      fastCorrect,
      steadyCorrect,
      timeTraps,
      rushedWrong,
      maxTime,
    };
  }, [items, attempt]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') return items;
    return items.filter(i => i.category === selectedCategory);
  }, [items, selectedCategory]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages - 1);

  const displayedItems = useMemo(() => {
    if (filteredItems.length <= pageSize) return filteredItems;
    const start = safePage * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, safePage, pageSize]);

  return (
    <Card className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xs overflow-hidden">
      <CardContent className="p-4 sm:p-5 space-y-4">
        
        {/* Header & Quick Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[hsl(var(--border))]">
          <div className="space-y-0.5">
            <h2 className="text-sm sm:text-base font-extrabold flex items-center gap-2 text-[hsl(var(--foreground))]">
              <Clock className="w-4 h-4 text-[hsl(var(--primary))]" />
              Phân Tích Nhịp Độ Làm Bài & Bẫy Thời Gian
            </h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Theo dõi tốc độ xử lý từng câu hỏi, phát hiện điểm nghẽn và bẫy thời gian.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.25)] flex items-center gap-1.5 shadow-2xs">
              <Sparkles size={13} />
              <span>Trung bình: <strong>{stats.avgTime}s / câu</strong></span>
            </span>

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-xs',
                  viewMode === 'matrix'
                    ? 'bg-[hsl(var(--primary))] text-white font-bold shadow-2xs'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                )}
                title="Xem dạng Lưới Ô Vuông Heatmap trực quan"
              >
                <LayoutGrid size={13} />
                <span className="hidden sm:inline">Lưới nhiệt</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('chart')}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-xs',
                  viewMode === 'chart'
                    ? 'bg-[hsl(var(--primary))] text-white font-bold shadow-2xs'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                )}
                title="Xem dạng Biểu đồ Cột Thời gian"
              >
                <BarChart2 size={13} />
                <span className="hidden sm:inline">Biểu đồ</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-xs',
                  viewMode === 'list'
                    ? 'bg-[hsl(var(--primary))] text-white font-bold shadow-2xs'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                )}
                title="Xem dạng Bảng xếp hạng bẫy thời gian"
              >
                <ListOrdered size={13} />
                <span className="hidden sm:inline">Bảng xếp hạng</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Interactive Category Filter Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory(c => c === 'fast_correct' ? 'all' : 'fast_correct');
              setCurrentPage(0);
            }}
            className={cn(
              'p-3 rounded-2xl border text-left transition-all cursor-pointer space-y-1',
              selectedCategory === 'fast_correct'
                ? 'bg-cyan-500/15 border-cyan-500 ring-2 ring-cyan-400/30 shadow-xs'
                : 'bg-cyan-500/5 border-cyan-500/20 hover:bg-cyan-500/10'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                <Zap size={13} /> Phản xạ nhanh
              </span>
              <span className="text-base font-black text-cyan-600 dark:text-cyan-400">{stats.fastCorrect}</span>
            </div>
            <p className="text-[10.5px] text-[hsl(var(--muted-foreground))]">≤30s và làm đúng</p>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedCategory(c => c === 'steady_correct' ? 'all' : 'steady_correct');
              setCurrentPage(0);
            }}
            className={cn(
              'p-3 rounded-2xl border text-left transition-all cursor-pointer space-y-1',
              selectedCategory === 'steady_correct'
                ? 'bg-emerald-500/15 border-emerald-500 ring-2 ring-emerald-400/30 shadow-xs'
                : 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={13} /> Tư duy chắc
              </span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{stats.steadyCorrect}</span>
            </div>
            <p className="text-[10.5px] text-[hsl(var(--muted-foreground))]">30s - 90s và làm đúng</p>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedCategory(c => c === 'time_trap' ? 'all' : 'time_trap');
              setCurrentPage(0);
            }}
            className={cn(
              'p-3 rounded-2xl border text-left transition-all cursor-pointer space-y-1',
              selectedCategory === 'time_trap'
                ? 'bg-rose-500/15 border-rose-500 ring-2 ring-rose-400/30 shadow-xs'
                : 'bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertTriangle size={13} /> Bẫy thời gian
              </span>
              <span className="text-base font-black text-rose-600 dark:text-rose-400">{stats.timeTraps}</span>
            </div>
            <p className="text-[10.5px] text-[hsl(var(--muted-foreground))]">Mất nhiều thời gian mà sai</p>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedCategory(c => c === 'rushed_wrong' ? 'all' : 'rushed_wrong');
              setCurrentPage(0);
            }}
            className={cn(
              'p-3 rounded-2xl border text-left transition-all cursor-pointer space-y-1',
              selectedCategory === 'rushed_wrong'
                ? 'bg-amber-500/15 border-amber-500 ring-2 ring-amber-400/30 shadow-xs'
                : 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Flame size={13} /> Vội vàng / Ẩu
              </span>
              <span className="text-base font-black text-amber-600 dark:text-amber-400">{stats.rushedWrong}</span>
            </div>
            <p className="text-[10.5px] text-[hsl(var(--muted-foreground))]">≤15s nhưng làm sai</p>
          </button>
        </div>

        {/* Sub-header Controls & Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[hsl(var(--foreground))]">
              {viewMode === 'matrix' ? 'Bản đồ nhiệt nhịp độ:' : viewMode === 'chart' ? 'Biểu đồ thời gian từng câu:' : 'Xếp hạng bẫy thời gian:'}
            </span>
            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => { setSelectedCategory('all'); setCurrentPage(0); }}
                className="text-[11px] font-bold text-[hsl(var(--primary))] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>(Đang lọc: {filteredItems.length} câu)</span>
                <span className="text-xs">✕ Bỏ lọc</span>
              </button>
            )}
          </div>

          {/* Pagination when items > pageSize */}
          <div className="flex items-center gap-2 ml-auto">
            {filteredItems.length > 30 && (
              <div className="flex items-center gap-1.5 bg-[hsl(var(--muted)/0.4)] px-2 py-1 rounded-xl border border-[hsl(var(--border))] text-xs font-semibold">
                <button
                  type="button"
                  disabled={safePage === 0}
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  className="p-1 rounded text-[hsl(var(--foreground))] disabled:opacity-30 hover:bg-[hsl(var(--card))] cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="font-mono font-bold text-[hsl(var(--primary))] px-1">
                  Câu {safePage * pageSize + 1} - {Math.min(filteredItems.length, (safePage + 1) * pageSize)} / {filteredItems.length}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages - 1}
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  className="p-1 rounded text-[hsl(var(--foreground))] disabled:opacity-30 hover:bg-[hsl(var(--card))] cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}

            {/* Page Size Selector */}
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(0); }}
              className="bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] rounded-xl px-2 py-1 text-xs font-bold text-[hsl(var(--foreground))] cursor-pointer focus:outline-none"
            >
              <option value={30}>30 câu / trang</option>
              <option value={50}>50 câu / trang</option>
              <option value={100}>100 câu / trang</option>
            </select>
          </div>
        </div>

        {/* 1. VIEW MODE: MATRIX / HEATMAP GRID (Mặc định trực quan nhất) */}
        {viewMode === 'matrix' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-2 max-h-[380px] overflow-y-auto p-1 custom-scrollbar">
              {displayedItems.map((item) => {
                const isSelected = selectedItem?.index === item.index;
                return (
                  <button
                    key={item.index}
                    type="button"
                    onClick={() => {
                      setSelectedItem(item);
                      onSelectQuestion?.(item.index);
                    }}
                    className={cn(
                      'p-2.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-1.5 relative overflow-hidden group',
                      `bg-gradient-to-br ${item.bgGradient}`,
                      item.borderColor,
                      isSelected && 'ring-2 ring-[hsl(var(--primary))] shadow-sm scale-[1.02]'
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-mono font-black text-xs text-[hsl(var(--foreground))]">
                        Câu {item.index + 1}
                      </span>
                      {item.icon}
                    </div>

                    <div className="flex items-center justify-between w-full text-[10.5px]">
                      <span className={cn('font-mono font-black px-1.5 py-0.5 rounded-md bg-[hsl(var(--card))] border border-[hsl(var(--border))]', item.textColor)}>
                        {item.timeSpent}s
                      </span>
                      <span className="text-[10px] opacity-75 font-semibold">
                        {item.isCorrect ? 'Đúng' : 'Sai'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Legend Bar */}
            <div className="flex items-center justify-center gap-4 flex-wrap text-[11px] font-semibold text-[hsl(var(--muted-foreground))] pt-1 border-t border-[hsl(var(--border))]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> ≤30s Đúng (Phản xạ)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 30-90s Đúng (Chắc chắn)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Bẫy thời gian (Sai)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> ≤15s Sai (Vội vàng)
              </span>
            </div>
          </div>
        )}

        {/* 2. VIEW MODE: ADJUSTABLE TIMELINE BAR CHART */}
        {viewMode === 'chart' && (
          <div className="space-y-3">
            <div className="flex items-end gap-2 h-44 pt-6 pb-2 px-3 rounded-2xl bg-[hsl(var(--muted)/0.25)] border border-[hsl(var(--border))] overflow-x-auto relative custom-scrollbar">
              {displayedItems.map((item) => {
                const ratio = stats.maxTime > 0 ? item.timeSpent / stats.maxTime : 0;
                const heightPercent = item.timeSpent === 0 ? 8 : Math.max(12, Math.min(100, Math.round(ratio * 100)));

                let barBg = 'bg-gradient-to-t from-emerald-600 to-emerald-400';
                if (!item.selectedAnswer) barBg = 'bg-slate-400';
                else if (item.category === 'time_trap') barBg = 'bg-gradient-to-t from-rose-600 to-rose-400';
                else if (item.category === 'rushed_wrong') barBg = 'bg-gradient-to-t from-amber-600 to-amber-400';
                else if (item.category === 'fast_correct') barBg = 'bg-gradient-to-t from-cyan-600 to-cyan-400';

                return (
                  <button
                    type="button"
                    key={item.index}
                    onClick={() => {
                      setSelectedItem(item);
                      onSelectQuestion?.(item.index);
                    }}
                    className="flex-1 min-w-[28px] max-w-[48px] flex flex-col items-center justify-end h-full group cursor-pointer relative p-1 rounded-xl hover:bg-[hsl(var(--muted)/0.5)] transition-all focus:outline-none shrink-0"
                    title={`Câu ${item.index + 1}: ${item.timeSpent}s (${item.isCorrect ? 'Đúng' : 'Sai'}) - ${item.categoryLabel}`}
                  >
                    <span className="text-[9.5px] font-mono font-black mb-1 leading-none text-[hsl(var(--foreground))] opacity-90 group-hover:scale-110 group-hover:text-[hsl(var(--primary))] transition-transform">
                      {item.timeSpent}s
                    </span>

                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-lg transition-all duration-300 ${barBg} group-hover:brightness-125 shadow-xs`}
                    />
                    
                    <span className="text-[10px] font-mono font-bold mt-1 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]">
                      {item.index + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. VIEW MODE: LEADERBOARD / TIME TRAPS TABLE */}
        {viewMode === 'list' && (
          <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar">
            <div className="space-y-1.5">
              {[...displayedItems]
                .sort((a, b) => b.timeSpent - a.timeSpent)
                .map((item, rank) => (
                  <div
                    key={item.index}
                    onClick={() => {
                      setSelectedItem(item);
                      onSelectQuestion?.(item.index);
                    }}
                    className="p-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted)/0.3)] transition-all cursor-pointer flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn(
                        'w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0',
                        rank === 0 ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                      )}>
                        {rank + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-black text-[hsl(var(--foreground))] mr-2">
                          Câu {item.index + 1}:
                        </span>
                        <span className="text-[hsl(var(--muted-foreground))] truncate inline-block max-w-xs sm:max-w-md align-bottom">
                          {item.question.content.replace(/[#*`$]/g, '') || 'Nội dung câu hỏi...'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={cn('text-xs font-mono font-black px-2 py-0.5 rounded-lg border', item.textColor, item.borderColor)}>
                        ⏱️ {item.timeSpent}s
                      </span>
                      <span className="text-[11px] font-bold">
                        {item.categoryBadge}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Active Selected Question Inline Preview Card */}
        {selectedItem && (
          <div className="p-4 rounded-3xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--primary)/0.3)] space-y-2.5 animate-fade-in shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-lg bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.3)]">
                  Chi tiết Câu {selectedItem.index + 1}
                </span>
                <span className={cn('text-xs font-bold px-2.5 py-0.5 rounded-full border', selectedItem.borderColor, selectedItem.textColor)}>
                  {selectedItem.categoryBadge} (Mất {selectedItem.timeSpent}s)
                </span>
              </div>
              <button
                type="button"
                onClick={() => onSelectQuestion?.(selectedItem.index)}
                className="text-xs font-bold text-[hsl(var(--primary))] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Xem lời giải chi tiết</span>
                <ArrowRight size={13} />
              </button>
            </div>

            <div className="text-xs text-[hsl(var(--foreground))] line-clamp-2 leading-relaxed">
              <MathRenderer content={selectedItem.question.content} />
            </div>
          </div>
        )}

        {/* Warning Box for Time Traps */}
        {stats.timeTraps > 0 && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-1">
            <h3 className="text-xs font-black text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <AlertTriangle size={14} />
              Cảnh báo bẫy thời gian ({stats.timeTraps} câu):
            </h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              Bạn đã mất nhiều thời gian ở các câu này nhưng trả lời chưa đúng. Khi làm bài thi thật, nếu gặp câu tính toán phức tạp quá <strong>90 giây</strong>, hãy <strong>đánh dấu cờ (Flag)</strong> để làm các câu khác trước nhằm tối ưu điểm số.
            </p>
          </div>
        )}

      </CardContent>
    </Card>
  );
};
