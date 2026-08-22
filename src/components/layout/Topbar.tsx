import React from 'react';
import { cn } from '@/utils';
import { useAppStore } from '@/stores/app-store';
import { useUserProfileStore } from '@/stores/user-profile-store';
import { useLicenseStore } from '@/stores/license-store';
import { Menu, Search, Sun, Moon, Settings, Lock, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/auth-service';
import toast from 'react-hot-toast';

export const Topbar: React.FC = () => {
  const { sidebarOpen, toggleSidebar, theme, setTheme } = useAppStore();
  const { profile } = useUserProfileStore();
  const { isLicensed, payload } = useLicenseStore();
  const navigate = useNavigate();
  const [searchFocused, setSearchFocused] = React.useState(false);
  const [ownerName, setOwnerName] = React.useState<string>('');
  const [isPasswordEnabled, setIsPasswordEnabled] = React.useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    authService.getOwnerUsername().then(setOwnerName);
    authService.isPasswordProtected().then(setIsPasswordEnabled);
  }, []);

  // Ctrl+K shortcut
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLockApp = async () => {
    if (!isPasswordEnabled) {
      toast('Bạn chưa bật mật khẩu bảo vệ. Hãy vào Cài đặt → Bảo Mật để thiết lập trước.', {
        icon: '🔒',
        duration: 3000,
      });
      navigate('/settings');
      return;
    }
    authService.lock();
    window.location.reload();
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-40',
        'h-[var(--topbar-height)] px-4',
        'glass-panel',
        'flex items-center gap-4',
      )}
    >
      {/* Hamburger */}
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-lg hover:bg-[hsl(var(--accent))] transition-colors text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        aria-label="Toggle sidebar"
      >
        <Menu size={20} />
      </button>

      {/* Search Bar */}
      <div className={cn(
        'relative flex-1 max-w-lg transition-all duration-200',
        searchFocused && 'max-w-xl'
      )}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] h-4 w-4" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Tìm kiếm câu hỏi, môn học..."
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className={cn(
            'w-full h-9 pl-10 pr-16 rounded-lg text-sm',
            'bg-[hsl(var(--muted))] border border-transparent',
            'placeholder:text-[hsl(var(--muted-foreground))]',
            'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent',
            'focus:bg-[hsl(var(--background))]',
            'transition-all duration-200'
          )}
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-[hsl(var(--muted-foreground))] bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded">
          Ctrl+K
        </kbd>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* User Profile Badge */}
        <button
          onClick={() => navigate('/settings')}
          className="hidden md:inline-flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full text-xs font-semibold bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted)/0.8)] border border-[hsl(var(--border))] transition-all cursor-pointer group"
          title={`Họ tên: ${profile.fullName || ownerName}\nBấm để mở Cài đặt`}
        >
          <div
            className={cn(
              'w-6 h-6 rounded-full bg-gradient-to-tr flex items-center justify-center text-[11px] font-black text-white shadow-xs',
              profile.avatarColor || 'from-blue-500 to-indigo-600'
            )}
          >
            {(profile.nickname || profile.fullName || ownerName || 'E').charAt(0).toUpperCase()}
          </div>
          <span className="text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors max-w-[130px] truncate">
            {profile.nickname || profile.fullName || ownerName || 'Người học'}
          </span>
          {isLicensed && (
            <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              {payload?.type === 'lifetime' ? '👑 PRO' : '⭐ VIP'}
            </span>
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-[hsl(var(--accent))] transition-colors text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Chế độ Sáng' : 'Chế độ Tối'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User Guide */}
        <button
          onClick={() => navigate('/guide')}
          className="p-2 rounded-lg hover:bg-[hsl(var(--accent))] transition-colors text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          aria-label="User Guide"
          title="Cẩm nang Hướng dẫn Sử dụng"
        >
          <HelpCircle size={18} />
        </button>

        {/* Settings */}
        <button
          onClick={() => navigate('/settings')}
          className="p-2 rounded-lg hover:bg-[hsl(var(--accent))] transition-colors text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          aria-label="Settings"
          title="Cài đặt"
        >
          <Settings size={18} />
        </button>

        {/* Lock App */}
        <button
          onClick={handleLockApp}
          className="p-2 rounded-lg hover:bg-rose-500/10 transition-colors text-[hsl(var(--muted-foreground))] hover:text-rose-500"
          aria-label="Lock App"
          title="Khóa ứng dụng ngay"
        >
          <Lock size={18} />
        </button>
      </div>
    </header>
  );
};
