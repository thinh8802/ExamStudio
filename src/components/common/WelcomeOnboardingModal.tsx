// ============================================
// WELCOME ONBOARDING MODAL - ExamPrep Studio
// ============================================
import React, { useState } from 'react';
import {
  Sparkles,
  Award,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  User,
  HeartHandshake,
  GraduationCap,
  Briefcase,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  useUserProfileStore,
  AVATAR_GRADIENTS,
  ROLE_LABELS,
  type UserRole,
} from '@/stores/user-profile-store';
import { cn } from '@/utils';

interface WelcomeOnboardingModalProps {
  isOpen: boolean;
  fullName: string;
  email?: string;
  licenseType?: string;
  expiresAt?: string | null;
  onComplete: () => void;
}

export const WelcomeOnboardingModal: React.FC<WelcomeOnboardingModalProps> = ({
  isOpen,
  fullName,
  email,
  licenseType = 'subscription',
  expiresAt,
  onComplete,
}) => {
  const { profile, completeOnboarding } = useUserProfileStore();

  // Khởi tạo biệt danh mặc định từ tên
  const initialNickname = () => {
    const parts = fullName.trim().split(' ');
    return parts[parts.length - 1] || fullName;
  };

  const [nickname, setNickname] = useState(profile.nickname || initialNickname());
  const [selectedRole, setSelectedRole] = useState<UserRole>(profile.role || 'student');
  const [selectedAvatarColor, setSelectedAvatarColor] = useState(
    profile.avatarColor || AVATAR_GRADIENTS[0].value
  );
  const [studyGoal, setStudyGoal] = useState(
    profile.studyGoal || 'Ôn luyện thi THPTQG & Luyện đề trắc nghiệm thông minh'
  );

  if (!isOpen) return null;

  const handleFinish = () => {
    try {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.5 },
      });
    } catch (e) {}

    completeOnboarding(nickname, selectedRole, selectedAvatarColor, studyGoal);
    onComplete();
  };

  const isLifetime = licenseType === 'lifetime';
  const firstLetter = (nickname || fullName || 'E').trim().charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none">
      {/* Glow Effects */}
      <div className="absolute w-[600px] h-[600px] bg-gradient-to-tr from-[hsl(var(--primary))]/20 to-purple-500/20 blur-[130px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-2xl w-full rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/95 backdrop-blur-2xl shadow-2xl overflow-hidden ring-1 ring-white/10 animate-scale-in">
        {/* Top Decorative Banner */}
        <div className="relative h-28 bg-gradient-to-r from-[hsl(var(--primary))] via-indigo-600 to-purple-600 p-6 flex items-center justify-between overflow-hidden">
          <div className="relative z-10 text-white space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Chào Mừng Thành Viên Mới
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Khởi Đầu Không Gian Học Tập Của Bạn!
            </h2>
          </div>

          <div className="w-20 h-20 rounded-full bg-white/10 blur-xl absolute -top-4 -right-4" />
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[78vh] overflow-y-auto custom-scrollbar">
          {/* 1. Thẻ Huy Hiệu Bản Quyền Chính Chủ */}
          <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Bản Quyền Chính Chủ
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Award className="w-3 h-3" />
                    {isLifetime ? 'Vĩnh Viễn (Lifetime Pro)' : '1 Tháng Miễn Phí'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[hsl(var(--foreground))] mt-0.5">
                  {fullName}
                </h3>
                {email && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{email}</p>
                )}
              </div>
            </div>

            {expiresAt && !isLifetime && (
              <div className="hidden sm:block text-right text-xs text-[hsl(var(--muted-foreground))]">
                <div>Hạn sử dụng:</div>
                <div className="font-semibold text-[hsl(var(--foreground))]">
                  {new Date(expiresAt).toLocaleDateString('vi-VN')}
                </div>
              </div>
            )}
          </div>

          {/* 2. Thiết lập Biệt danh & Avatar */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
              <User className="w-4 h-4 text-[hsl(var(--primary))]" />
              1. Tùy Biến Tên Gọi & Avatar Thân Mật
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              {/* Avatar Preview */}
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] text-center">
                <div
                  className={cn(
                    'w-16 h-16 rounded-2xl bg-gradient-to-tr flex items-center justify-center text-2xl font-black text-white shadow-lg transition-all duration-300 transform hover:scale-105',
                    selectedAvatarColor
                  )}
                >
                  {firstLetter}
                </div>
                <span className="text-xs font-semibold text-[hsl(var(--foreground))] mt-2 truncate max-w-[120px]">
                  {nickname || fullName}
                </span>
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  {ROLE_LABELS[selectedRole].label}
                </span>
              </div>

              {/* Input Biệt danh */}
              <div className="sm:col-span-2 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[hsl(var(--foreground))] block mb-1">
                    Bạn muốn ExamPrep Studio gọi bạn là gì?
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Ví dụ: Thịnh Đào, Thầy Thịnh, Thịnh Pro..."
                    className="w-full h-11 px-4 rounded-xl text-sm font-medium bg-[hsl(var(--muted))] border border-[hsl(var(--border))] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--ring))] focus:outline-none transition-all"
                  />
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1">
                    * Họ tên chính chủ <strong>{fullName}</strong> vẫn được gắn cố định trong bản quyền.
                  </p>
                </div>

                {/* Chọn màu Avatar */}
                <div>
                  <label className="text-xs font-semibold text-[hsl(var(--foreground))] block mb-1.5">
                    Chọn màu sắc phong cách:
                  </label>
                  <div className="flex items-center gap-2">
                    {AVATAR_GRADIENTS.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setSelectedAvatarColor(g.value)}
                        className={cn(
                          'w-7 h-7 rounded-lg bg-gradient-to-tr cursor-pointer transition-all duration-200 flex items-center justify-center',
                          g.value,
                          selectedAvatarColor === g.value
                            ? 'ring-2 ring-[hsl(var(--primary))] ring-offset-2 ring-offset-[hsl(var(--card))] scale-110'
                            : 'opacity-70 hover:opacity-100 hover:scale-105'
                        )}
                        title={g.label}
                      >
                        {selectedAvatarColor === g.value && (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Chọn Vai trò */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-[hsl(var(--primary))]" />
              2. Vai trò học tập của bạn
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => {
                const item = ROLE_LABELS[r];
                const isSelected = selectedRole === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRole(r)}
                    className={cn(
                      'p-3.5 rounded-2xl border text-left cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-1.5',
                      isSelected
                        ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] shadow-md shadow-[hsl(var(--primary)/0.1)]'
                        : 'border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] hover:bg-[hsl(var(--muted)/0.6)]'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{item.icon}</span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-[hsl(var(--primary))]" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[hsl(var(--foreground))]">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-[hsl(var(--muted-foreground))] line-clamp-2 leading-relaxed">
                        {item.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Mục tiêu học tập */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[hsl(var(--primary))]" />
              3. Mục tiêu chính trong ứng dụng
            </label>
            <input
              type="text"
              value={studyGoal}
              onChange={(e) => setStudyGoal(e.target.value)}
              placeholder="Ví dụ: Ôn thi Đại học, Luyện đề Toán 12, Soạn đề Vật Lý..."
              className="w-full h-10 px-4 rounded-xl text-xs font-medium bg-[hsl(var(--muted))] border border-[hsl(var(--border))] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--ring))] focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Footer Button */}
        <div className="p-6 bg-[hsl(var(--muted)/0.3)] border-t border-[hsl(var(--border))] flex items-center justify-between gap-4">
          <div className="text-xs text-[hsl(var(--muted-foreground))] hidden sm:block">
            ✨ Bạn có thể thay đổi lại các thông tin này bất cứ lúc nào trong <strong>Cài đặt</strong>.
          </div>

          <button
            type="button"
            onClick={handleFinish}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[hsl(var(--primary))] to-indigo-600 text-white font-bold text-sm shadow-xl shadow-[hsl(var(--primary)/0.25)] hover:opacity-95 transform active:scale-95 transition-all cursor-pointer"
          >
            <span>Bắt Đầu Hành Trình Học Tập</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
