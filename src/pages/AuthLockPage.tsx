// ============================================
// EXAMSTUDIO LANDING PAGE & AUTH LOCK SCREEN
// ============================================
import React, { useState, useEffect, useRef } from 'react';
import { authService } from '@/services/auth-service';
import { 
  Lock, 
  Unlock, 
  ShieldCheck, 
  UserCheck, 
  KeyRound, 
  Sparkles, 
  AlertCircle, 
  BookOpen, 
  Brain, 
  HardDrive, 
  ChevronRight, 
  CheckCircle2, 
  Zap, 
  Mail, 
  User, 
  Award,
  ArrowRight
} from 'lucide-react';
import logoImg from '@/assets/logo.png';
import toast from 'react-hot-toast';

interface AuthLockPageProps {
  onAuthenticated: () => void;
}

export const AuthLockPage: React.FC<AuthLockPageProps> = ({ onAuthenticated }) => {
  const [isSetup, setIsSetup] = useState<boolean | null>(null);
  const [ownerName, setOwnerName] = useState<string>('Chủ sở hữu');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [shake, setShake] = useState(false);
  
  const authSectionRef = useRef<HTMLDivElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkState = async () => {
      const setup = await authService.isAccountSetup();
      if (setup) {
        const isProtected = await authService.isPasswordProtected();
        const isManualLock = authService.isManualLock();

        if (!isProtected && !isManualLock) {
          onAuthenticated();
          return;
        }

        const name = await authService.getOwnerUsername();
        setOwnerName(name);
        if (name && name !== 'Chủ sở hữu' && name !== 'Người học') {
          setUsername(name);
        }
        setIsSetup(isProtected);
      } else {
        setIsSetup(false);
      }
    };
    checkState();
  }, [onAuthenticated]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const scrollToAuth = () => {
    if (authSectionRef.current) {
      authSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 400);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim()) {
      setErrorMsg('Vui lòng nhập tên người dùng');
      triggerShake();
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự');
      triggerShake();
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp');
      triggerShake();
      return;
    }

    setLoading(true);
    const result = await authService.setupAccount(username, password);
    setLoading(false);

    if (result.success) {
      toast.success('Thiết lập tài khoản thành công!');
      onAuthenticated();
    } else {
      setErrorMsg(result.error || 'Lỗi thiết lập tài khoản');
      triggerShake();
    }
  };

  const handleSkip = async () => {
    await authService.skipAccountSetup(username || 'Người học');
    toast.success('Chào mừng bạn đến với ExamPrep Studio!');
    onAuthenticated();
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!password) {
      setErrorMsg('Vui lòng nhập mật khẩu');
      triggerShake();
      return;
    }

    setLoading(true);
    const result = await authService.login(password);
    setLoading(false);

    if (result.success) {
      toast.success(`Chào mừng trở lại, ${ownerName}!`);
      onAuthenticated();
    } else {
      setErrorMsg(result.error || 'Mật khẩu không đúng');
      triggerShake();
      setPassword('');
    }
  };

  if (isSetup === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <div className="w-8 h-8 rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[hsl(var(--background))] text-[hsl(var(--foreground))] flex flex-col relative overflow-x-hidden selection:bg-[hsl(var(--primary)/0.2)]">
      {/* Background ambient lighting */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-[hsl(var(--primary)/0.06)] rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* ========================================================== */}
      {/* 1. TOP NAVIGATION BAR                                      */}
      {/* ========================================================== */}
      <header className="sticky top-0 z-40 w-full border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/0.8)] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary)/0.1)] p-1.5 flex items-center justify-center shadow-sm ring-1 ring-[hsl(var(--primary)/0.2)]">
              <img src={logoImg} alt="ExamPrep Studio" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-[hsl(var(--foreground))]">ExamPrep Studio</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)]">
                  v1.0 Pro
                </span>
              </div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] hidden sm:block">
                Không Gian Luyện Thi & Quản Lý Học Tập
              </p>
            </div>
          </div>

          {/* Top-Right Action Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={scrollToAuth}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(var(--primary))] hover:opacity-90 active:scale-[0.98] text-white text-xs font-semibold shadow-md shadow-[hsl(var(--primary)/0.25)] transition-all cursor-pointer"
            >
              {isSetup ? (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Mở khóa / Đăng nhập</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Bắt đầu ngay</span>
                </>
              )}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================== */}
      {/* 2. HERO & LANDING SHOWCASE + LOGIN SPLIT SECTION           */}
      {/* ========================================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LEFT SIDE: Landing & Value Proposition (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[hsl(var(--primary)/0.1)] border border-[hsl(var(--primary)/0.2)] text-xs font-semibold text-[hsl(var(--primary))] animate-fade-in">
              <Sparkles className="w-4 h-4 text-[hsl(var(--primary))]" />
              <span>Trung tâm Luyện thi & Ôn tập Thông minh</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[hsl(var(--foreground))] leading-[1.15]">
                Chinh phục mọi kỳ thi với{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--primary))] via-indigo-500 to-cyan-500">
                  ExamPrep Studio
                </span>
              </h1>
              <p className="text-base sm:text-lg text-[hsl(var(--muted-foreground))] leading-relaxed max-w-2xl font-normal">
                Không gian học tập cá nhân hóa, rèn luyện kỹ năng giải trắc nghiệm tốc độ cao và ghi nhớ kiến thức bền vững qua thuật toán lặp lại ngắt quãng.
              </p>
            </div>

            {/* 3 Core Feature Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-sm space-y-2 hover:border-[hsl(var(--primary)/0.4)] transition-all">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">Luyện Thi Đa Dạng</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                  Thi thử bấm giờ thực tế, học theo chương và tạo đề ngẫu nhiên linh hoạt.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-sm space-y-2 hover:border-cyan-500/40 transition-all">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                  <Brain className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">AI Flashcards</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                  Tự động phân tích điểm yếu và gợi ý thời điểm ôn lại câu sai tối ưu.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-sm space-y-2 hover:border-emerald-500/40 transition-all">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <HardDrive className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">100% Offline</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                  Toàn bộ đề thi và tiến độ lưu trữ an toàn ngay trên máy tính của bạn.
                </p>
              </div>
            </div>

            {/* Developer Info Card */}
            <div className="p-4 rounded-2xl bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center font-bold text-sm border border-[hsl(var(--primary)/0.2)]">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[hsl(var(--foreground))]">Yoreis</span>
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
                      Developer
                    </span>
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span>daothinh636@gmail.com</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Bản quyền © 2026 ExamPrep Studio</span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Interactive Login / Setup Card (5 Cols) */}
          <div ref={authSectionRef} className="lg:col-span-5">
            <div className={`p-2 rounded-[2.2rem] bg-gradient-to-b from-[hsl(var(--primary)/0.15)] via-[hsl(var(--card))] to-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xl transition-transform duration-300 ${shake ? 'animate-shake' : ''}`}>
              <div className="p-6 sm:p-8 rounded-[1.9rem] bg-[hsl(var(--card))] border border-[hsl(var(--border))] space-y-6">
                
                {/* Brand Icon & Heading */}
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--primary)/0.1)] p-2 mx-auto shadow-md ring-2 ring-[hsl(var(--primary)/0.2)] flex items-center justify-center">
                    <img src={logoImg} alt="ExamPrep Studio" className="w-full h-full object-contain" />
                  </div>
                  
                  <h2 className="text-xl font-bold text-[hsl(var(--foreground))] tracking-tight">
                    {isSetup ? 'Mở Khóa Không Gian Học' : 'Khởi Tạo Không Gian Học'}
                  </h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {isSetup
                      ? `Nhập mật khẩu để truy cập dữ liệu của ${ownerName}`
                      : 'Thiết lập tài khoản người học để bắt đầu quản lý đề thi'}
                  </p>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2.5 text-xs text-rose-500 animate-fade-in">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Forms */}
                {isSetup ? (
                  /* Form: Unlock Existing Account */
                  <form onSubmit={handleUnlock} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[hsl(var(--foreground))] uppercase tracking-wider mb-1.5">
                        Mật khẩu đăng nhập
                      </label>
                      <div className="relative">
                        <input
                          ref={passwordInputRef}
                          type="password"
                          autoFocus
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Nhập mật khẩu của bạn..."
                          className="w-full px-4 py-3 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.4)] focus:border-[hsl(var(--primary))] transition-all text-sm"
                        />
                        <KeyRound className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] pointer-events-none" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-6 rounded-xl bg-[hsl(var(--primary))] hover:opacity-90 active:scale-[0.98] text-white font-semibold text-sm shadow-md shadow-[hsl(var(--primary)/0.25)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Unlock className="w-4 h-4" />
                          <span>Mở Khóa ExamPrep Studio</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* Form: New User Setup */
                  <form onSubmit={handleSetup} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-[hsl(var(--foreground))] uppercase tracking-wider mb-1">
                        Tên người học
                      </label>
                      <input
                        type="text"
                        autoFocus
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Ví dụ: Minh Quân, Thu Trang..."
                        className="w-full px-3.5 py-2.5 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.4)] focus:border-[hsl(var(--primary))] transition-all text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[hsl(var(--foreground))] uppercase tracking-wider mb-1">
                        Mật khẩu bảo vệ (tối thiểu 6 ký tự)
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Tạo mật khẩu..."
                        className="w-full px-3.5 py-2.5 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.4)] focus:border-[hsl(var(--primary))] transition-all text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[hsl(var(--foreground))] uppercase tracking-wider mb-1">
                        Xác nhận lại mật khẩu
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu..."
                        className="w-full px-3.5 py-2.5 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.4)] focus:border-[hsl(var(--primary))] transition-all text-sm"
                      />
                    </div>

                    <div className="pt-2 space-y-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-5 rounded-xl bg-[hsl(var(--primary))] hover:opacity-90 active:scale-[0.98] text-white font-semibold text-sm shadow-md shadow-[hsl(var(--primary)/0.25)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4" />
                            <span>Tạo Tài Khoản & Vào Học</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleSkip}
                        className="w-full py-2 px-4 rounded-xl bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] active:scale-[0.98] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] border border-[hsl(var(--border))] text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Trải nghiệm nhanh không cần mật khẩu</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                )}

                {/* Footer Security Badge */}
                <div className="pt-4 border-t border-[hsl(var(--border))] text-center flex items-center justify-center gap-1.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Bảo mật dữ liệu PBKDF2 • 100% Cục bộ máy tính</span>
                </div>

              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

