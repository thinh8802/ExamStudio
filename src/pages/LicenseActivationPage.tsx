import React, { useState } from 'react';
import { Key, ShieldCheck, AlertCircle, Copy, Check, ExternalLink, Mail, Sparkles, Lock, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useLicenseStore } from '@/stores/license-store';
import { useUserProfileStore } from '@/stores/user-profile-store';
import { WelcomeOnboardingModal } from '@/components/common/WelcomeOnboardingModal';

interface LicenseActivationPageProps {
  onActivated?: () => void;
}

export const LicenseActivationPage: React.FC<LicenseActivationPageProps> = ({ onActivated }) => {
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [isPasting, setIsPasting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [activatedInfo, setActivatedInfo] = useState<{
    fullName: string;
    email?: string;
    type?: string;
    expiresAt?: string | null;
  }>({ fullName: 'Người dùng ExamPrep' });

  const { activateLicense, isLoading, error: storeError, expiresAt: storeExpiresAt } = useLicenseStore();
  const { initFromLicense } = useUserProfileStore();

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setLicenseKeyInput(text.trim());
        setIsPasting(true);
        setTimeout(() => setIsPasting(false), 1500);
      }
    } catch (err) {
      setLocalError('Không thể đọc clipboard tự động. Vui lòng nhấn Ctrl + V để dán mã.');
    }
  };

  const handleActivate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLocalError(null);

    const trimmed = licenseKeyInput.trim();
    if (!trimmed) {
      setLocalError('Vui lòng nhập hoặc dán mã License Key.');
      return;
    }

    if (!trimmed.startsWith('EXAM.') && !trimmed.startsWith('EXAMPREP.')) {
      setLocalError('Định dạng mã License không đúng (Mã chuẩn phải bắt đầu bằng "EXAMPREP." hoặc "EXAM.")');
      return;
    }

    const result = await activateLicense(trimmed);
    if (result.success && result.payload) {
      const fullName = result.payload.name || 'Người dùng ExamPrep';
      const email = result.payload.email || '';
      const type = result.payload.type || 'subscription';
      const expiresAt = result.expiresAt || storeExpiresAt || null;

      // Khởi tạo hồ sơ người dùng chính chủ từ License Key
      initFromLicense(fullName, email);

      setActivatedInfo({
        fullName,
        email,
        type,
        expiresAt,
      });

      setIsSuccess(true);
      try {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}

      // Mở modal chào mừng & thiết lập biệt danh
      setTimeout(() => {
        setShowWelcomeModal(true);
      }, 900);
    } else {
      setLocalError(result.error || 'Mã License không hợp lệ hoặc đã bị chỉnh sửa.');
    }
  };

  const handleModalComplete = () => {
    setShowWelcomeModal(false);
    if (onActivated) {
      onActivated();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] p-4 relative overflow-hidden select-none">
      {/* Background Glow Decorations */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[hsl(var(--primary))]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-xl w-full relative z-10">
        <div className="rounded-3xl border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))]/95 backdrop-blur-2xl p-6 sm:p-10 shadow-2xl space-y-6 ring-1 ring-black/5">
          
          {/* Header Icon & Title */}
          <div className="text-center space-y-3">
            <div className="relative inline-block">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[hsl(var(--primary))] to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-[hsl(var(--primary))]/25 mx-auto animate-bounce-in">
                {isSuccess ? <ShieldCheck className="w-8 h-8 text-emerald-200 animate-pulse" /> : <Key className="w-8 h-8" />}
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[hsl(var(--card))] flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[hsl(var(--foreground))] tracking-tight">
                {isSuccess ? 'Kích Hoạt Thành Công!' : 'Kích Hoạt Bản Quyền'}
              </h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                {isSuccess
                  ? 'Chào mừng bạn đến với ExamPrep Studio! Đang mở khóa không gian học tập...'
                  : 'Nhập mã License Key để mở khóa toàn bộ tính năng và sử dụng 100% Offline.'}
              </p>
            </div>
          </div>

          {/* Form Activation */}
          {!isSuccess ? (
            <form onSubmit={handleActivate} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Mã Bản Quyền (License Key)
                  </label>
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--primary))] hover:underline cursor-pointer"
                  >
                    {isPasting ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {isPasting ? 'Đã dán!' : 'Dán từ clipboard'}
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    rows={3}
                    value={licenseKeyInput}
                    onChange={(e) => setLicenseKeyInput(e.target.value)}
                    placeholder="EXAM.eyJuYW1lIjoiLi4uIiwicHJvZCI6IkV4YW1TdHVkaW8ifQ.sig..."
                    className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3.5 text-xs sm:text-sm font-mono text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/40 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent transition-all resize-none shadow-inner"
                  />
                </div>
              </div>

              {/* Error Message */}
              {(localError || storeError) && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-start gap-2.5 text-xs leading-relaxed animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{localError || storeError}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !licenseKeyInput.trim()}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[hsl(var(--primary))] to-indigo-600 hover:from-[hsl(var(--primary))]/90 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-[hsl(var(--primary))]/20 hover:shadow-[hsl(var(--primary))]/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang kiểm tra chữ ký số...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Kích Hoạt Ngay</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="py-6 text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <Check className="w-6 h-6 animate-bounce" />
              </div>
              <p className="text-sm font-semibold text-emerald-500">
                Bản quyền đã được xác minh thành công!
              </p>
            </div>
          )}

          {/* Footer Contact Support */}
          <div className="pt-4 border-t border-[hsl(var(--border))]/60 space-y-3 text-center">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Chưa có mã License hoặc cần cấp bản quyền mới?
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              <a
                href="https://www.facebook.com/yoreis06/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))]/80 text-[hsl(var(--foreground))] border border-[hsl(var(--border))] transition-colors"
              >
                <ExternalLink className="w-3 h-3 text-blue-500" />
                <span>Facebook: Đào Đức Thịnh</span>
              </a>
              <a
                href="mailto:daothinh636@gmail.com"
                className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))]/80 text-[hsl(var(--foreground))] border border-[hsl(var(--border))] transition-colors"
              >
                <Mail className="w-3 h-3 text-rose-500" />
                <span>daothinh636@gmail.com</span>
              </a>
            </div>
          </div>

        </div>

        {/* Security watermark footer */}
        <div className="text-center mt-4">
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]/60 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" />
            <span>Xác thực mật mã bất đối xứng Ed25519 • Hoạt động 100% Offline</span>
          </p>
        </div>
      </div>

      {/* Welcome & Setup Nickname Modal */}
      <WelcomeOnboardingModal
        isOpen={showWelcomeModal}
        fullName={activatedInfo.fullName}
        email={activatedInfo.email}
        licenseType={activatedInfo.type}
        expiresAt={activatedInfo.expiresAt}
        onComplete={handleModalComplete}
      />
    </div>
  );
};
