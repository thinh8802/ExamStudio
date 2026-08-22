// ============================================
// TOPBAR
// ============================================
import React from 'react';
import { cn } from '@/utils';
import { useAppStore } from '@/stores/app-store';
import { Menu, Search, Sun, Moon, Settings, Lock, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/auth-service';

export const Topbar: React.FC = () => {
  const { sidebarOpen, toggleSidebar, theme, setTheme } = useAppStore();
  const navigate = useNavigate();
  const [searchFocused, setSearchFocused] = React.useState(false);
  const [ownerName, setOwnerName] = React.useState<string>('');
  const searchRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    authService.getOwnerUsername().then(setOwnerName);
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

  const handleLockApp = () => {
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
        {ownerName && (
          <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)]">
            👤 {ownerName}
          </span>
        )}

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
