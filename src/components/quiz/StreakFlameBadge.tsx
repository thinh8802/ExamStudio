// ============================================
// STREAK FLAME BADGE - Multi-Tier Visual Reward System
// 7 Dynamic Flame Tiers from Streak 3 to 21+
// ============================================
import React, { useEffect, useState } from 'react';
import { Flame, Sparkles, Zap, Crown, Gem, Orbit } from 'lucide-react';
import { cn } from '@/utils';

export interface StreakTierInfo {
  tier: number; // 1 to 7
  title: string;
  subtitle: string;
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
  glowClass: string;
  flagGradient: string;
  flagBorder: string;
  pinColor: string;
  icon: React.ReactNode;
  iconColor: string;
}

export function getStreakTier(streak: number): StreakTierInfo | null {
  if (streak < 3) return null;

  if (streak < 6) {
    // Tier 1 (3-5): Lửa Cam Ấm (Warm Ember)
    return {
      tier: 1,
      title: 'Vào guồng',
      subtitle: 'Lửa Cam Ấm',
      badgeBg: 'bg-amber-500/15',
      badgeBorder: 'border-amber-500/40',
      textColor: 'text-amber-800 dark:text-amber-300 font-extrabold',
      glowClass: 'shadow-[0_2px_10px_rgba(245,158,11,0.25)]',
      flagGradient: 'from-amber-500/20 to-orange-500/20',
      flagBorder: 'border-amber-400/50',
      pinColor: 'bg-amber-400 border-amber-300 ring-amber-400/30',
      icon: <Flame size={13} className="text-amber-600 dark:text-amber-400" />,
      iconColor: 'text-amber-600 dark:text-amber-400',
    };
  }

  if (streak < 9) {
    // Tier 2 (6-8): Lửa Đỏ Rực (Crimson Blaze)
    return {
      tier: 2,
      title: 'Bùng nổ',
      subtitle: 'Lửa Đỏ Rực',
      badgeBg: 'bg-gradient-to-r from-amber-500/15 to-rose-500/15',
      badgeBorder: 'border-rose-500/45',
      textColor: 'text-rose-800 dark:text-rose-300 font-extrabold',
      glowClass: 'shadow-[0_2px_12px_rgba(244,63,94,0.3)]',
      flagGradient: 'from-rose-500/20 to-amber-500/20',
      flagBorder: 'border-rose-400/50',
      pinColor: 'bg-rose-400 border-rose-300 ring-rose-400/30',
      icon: (
        <div className="flex items-center -space-x-1">
          <Flame size={13} className="text-amber-500" />
          <Flame size={13} className="text-rose-500" />
        </div>
      ),
      iconColor: 'text-rose-600 dark:text-rose-400',
    };
  }

  if (streak < 12) {
    // Tier 3 (9-11): Lửa Tím Plasma (Violet Plasma)
    return {
      tier: 3,
      title: 'Siêu tập trung',
      subtitle: 'Lửa Tím Plasma',
      badgeBg: 'bg-gradient-to-r from-purple-500/15 via-fuchsia-500/15 to-indigo-500/15',
      badgeBorder: 'border-purple-500/45',
      textColor: 'text-purple-900 dark:text-purple-200 font-black',
      glowClass: 'shadow-[0_2px_14px_rgba(168,85,247,0.35)]',
      flagGradient: 'from-purple-500/25 to-indigo-600/25',
      flagBorder: 'border-purple-400/60',
      pinColor: 'bg-purple-400 border-purple-300 ring-purple-400/40',
      icon: <Zap size={13} className="text-purple-600 dark:text-purple-300" />,
      iconColor: 'text-purple-600 dark:text-purple-300',
    };
  }

  if (streak < 15) {
    // Tier 4 (12-14): Lửa Băng Thanh Lam (Cyan Frostfire)
    return {
      tier: 4,
      title: 'Cảnh giới Cao thủ',
      subtitle: 'Lửa Băng Thanh Lam',
      badgeBg: 'bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-teal-500/15',
      badgeBorder: 'border-cyan-500/45',
      textColor: 'text-teal-900 dark:text-cyan-200 font-black',
      glowClass: 'shadow-[0_2px_14px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400/30',
      flagGradient: 'from-cyan-500/25 to-teal-600/25',
      flagBorder: 'border-cyan-400/60',
      pinColor: 'bg-cyan-400 border-cyan-200 ring-cyan-400/40',
      icon: <Gem size={13} className="text-teal-600 dark:text-cyan-300" />,
      iconColor: 'text-teal-600 dark:text-cyan-300',
    };
  }

  if (streak < 18) {
    // Tier 5 (15-17): Lửa Hoàng Kim (Golden Sunfire)
    return {
      tier: 5,
      title: 'Cấp Huyền Thoại',
      subtitle: 'Lửa Hoàng Kim',
      badgeBg: 'bg-gradient-to-r from-yellow-500/20 via-amber-400/20 to-yellow-300/15',
      badgeBorder: 'border-amber-400/55',
      textColor: 'text-amber-900 dark:text-amber-200 font-black',
      glowClass: 'shadow-[0_2px_16px_rgba(245,158,11,0.4)] ring-1 ring-amber-400/40',
      flagGradient: 'from-yellow-400/25 to-amber-500/25',
      flagBorder: 'border-yellow-400/70',
      pinColor: 'bg-yellow-300 border-yellow-100 ring-yellow-400/40',
      icon: <Crown size={14} className="text-amber-600 dark:text-yellow-300" />,
      iconColor: 'text-amber-600 dark:text-yellow-300',
    };
  }

  if (streak < 21) {
    // Tier 6 (18-20): Lửa Thần Thoại (Prism Mythic)
    return {
      tier: 6,
      title: 'Thần Thoại Vô Song',
      subtitle: 'Lửa Thần Thoại',
      badgeBg: 'bg-gradient-to-r from-rose-500/15 via-emerald-500/15 to-purple-500/15',
      badgeBorder: 'border-fuchsia-400/55',
      textColor: 'text-fuchsia-950 dark:text-fuchsia-200 font-black',
      glowClass: 'shadow-[0_2px_18px_rgba(217,70,239,0.45)] ring-1 ring-fuchsia-400/40',
      flagGradient: 'from-fuchsia-500/25 to-purple-600/25',
      flagBorder: 'border-fuchsia-400/70',
      pinColor: 'bg-fuchsia-300 border-fuchsia-100 ring-fuchsia-400/40',
      icon: <Sparkles size={14} className="text-fuchsia-600 dark:text-fuchsia-300" />,
      iconColor: 'text-fuchsia-600 dark:text-fuchsia-300',
    };
  }

  // Tier 7 (21+): Cầu Vồng Siêu Tân Tinh (Prism Rainbow Nova)
  return {
    tier: 7,
    title: 'Bất Khả Chiến Bại',
    subtitle: 'Cầu Vồng Siêu Tân Tinh',
    badgeBg: 'bg-gradient-to-r from-rose-500/20 via-amber-500/20 via-emerald-500/20 via-cyan-500/20 to-purple-500/20',
    badgeBorder: 'border-transparent',
    textColor: 'font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-amber-600 via-emerald-600 via-blue-600 to-purple-600 dark:from-rose-400 dark:via-amber-300 dark:via-emerald-300 dark:via-cyan-300 dark:to-purple-300',
    glowClass: 'shadow-[0_0_15px_rgba(236,72,153,0.35)]',
    flagGradient: '',
    flagBorder: 'border-transparent',
    pinColor: 'bg-gradient-to-r from-pink-400 via-amber-400 to-cyan-400 border-white ring-purple-400/50',
    icon: (
      <div className="flex items-center -space-x-1">
        <Sparkles size={13} className="text-amber-500 animate-pulse" />
        <Flame size={13} className="text-rose-500 animate-pulse" />
      </div>
    ),
    iconColor: 'text-purple-600 dark:text-purple-300',
  };
}

interface StreakFlameBadgeProps {
  streak: number;
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StreakFlameBadge: React.FC<StreakFlameBadgeProps> = ({
  streak,
  className,
  showLabel = true,
  compact = false,
  size = 'md',
}) => {
  const [levelUpAnim, setLevelUpAnim] = useState(false);
  const tierInfo = getStreakTier(streak);

  // Trigger subtle pop animation on milestone cross (3, 6, 9, 12, 15, 18, 21)
  useEffect(() => {
    if (streak >= 3 && streak % 3 === 0) {
      setLevelUpAnim(true);
      const timer = setTimeout(() => setLevelUpAnim(false), 600);
      return () => clearTimeout(timer);
    }
  }, [streak]);

  if (!tierInfo || streak < 3) return null;

  const isLarge = size === 'lg' && !compact;
  const isMedium = size === 'md' && !compact;

  return (
    <div
      className={cn(
        'relative inline-flex flex-col items-center select-none',
        levelUpAnim ? 'scale-110 transition-transform duration-300' : '',
        className
      )}
      title={`Chuỗi ${streak} câu đúng liên tiếp • Cấp ${tierInfo.tier}/7: ${tierInfo.subtitle} (${tierInfo.title})`}
    >
      {/* Hanging Pin & Cord */}
      <div className="flex flex-col items-center -mb-0.5 z-10">
        <span
          className={cn(
            'rounded-full border shadow-2xs ring-1.5 transition-all',
            isLarge ? 'w-2.5 h-2.5 ring-2' : isMedium ? 'w-2 h-2' : 'w-1.5 h-1.5',
            tierInfo.pinColor
          )}
        />
        <div className={cn('bg-[hsl(var(--foreground)/0.35)]', isLarge ? 'w-[1.5px] h-1.5' : 'w-[1px] h-1')} />
      </div>

      {/* Flag / Pennant Body */}
      {tierInfo.tier === 7 ? (
        <div className="animate-banner-swing rainbow-badge-container">
          <div className={cn(
            'rainbow-badge-inner flex items-center gap-1.5 shadow-sm',
            isLarge ? 'px-3.5 py-1 sm:px-4 sm:py-1.5 rounded-xl' : isMedium ? 'px-2.5 py-1 rounded-lg' : 'px-2 py-0.5 rounded-md'
          )}>
            <span className="shrink-0 flex items-center">{tierInfo.icon}</span>

            <span className={cn(
              'font-mono font-black leading-none tracking-tight',
              isLarge ? 'text-sm sm:text-base' : isMedium ? 'text-xs sm:text-sm' : 'text-xs',
              tierInfo.textColor
            )}>
              x{streak}
            </span>

            {showLabel && !compact && (
              <span className={cn(
                'font-black opacity-95 truncate max-w-[140px]',
                isLarge ? 'text-xs sm:text-[13px]' : isMedium ? 'text-[11px] sm:text-xs' : 'text-[10px]',
                tierInfo.textColor
              )}>
                • {tierInfo.title}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'animate-banner-swing flex items-center gap-1.5 border bg-[hsl(var(--card))] shadow-sm transition-all duration-300',
            isLarge ? 'px-3.5 py-1 sm:px-4 sm:py-1.5 rounded-xl border-1.5' : isMedium ? 'px-2.5 py-1 rounded-lg' : 'px-2 py-0.5 rounded-md',
            tierInfo.flagGradient,
            tierInfo.flagBorder,
            tierInfo.textColor,
            tierInfo.glowClass
          )}
        >
          <span className="shrink-0 flex items-center">{tierInfo.icon}</span>

          <span className={cn(
            'font-mono font-black leading-none tracking-tight',
            isLarge ? 'text-sm sm:text-base' : isMedium ? 'text-xs sm:text-sm' : 'text-xs'
          )}>
            x{streak}
          </span>

          {showLabel && !compact && (
            <span className={cn(
              'font-black opacity-95 truncate max-w-[140px]',
              isLarge ? 'text-xs sm:text-[13px]' : isMedium ? 'text-[11px] sm:text-xs' : 'text-[10px]'
            )}>
              • {tierInfo.title}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

