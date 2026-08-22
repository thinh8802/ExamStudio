// ============================================
// SIDEBAR - Navigation
// ============================================
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/utils';
import { useAppStore } from '@/stores/app-store';
import logoImg from '@/assets/logo.png';
import {
  LayoutDashboard, BookOpen, FileQuestion, GraduationCap,
  Play, History, BarChart3, Download, Upload, Settings,
  Save, ChevronDown, ChevronRight, Star, PlusCircle,
  Shuffle, ListChecks, HardDrive, Layers, HelpCircle
} from 'lucide-react';
import { APP_DISPLAY_VERSION, APP_NAME, APP_AUTHOR, APP_CONTACT } from '@/constants/version';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { path: '/', label: 'Tổng quan', icon: <LayoutDashboard size={20} /> },
  { path: '/quiz/setup', label: 'Làm bài', icon: <Play size={20} /> },
  {
    path: '/questions', label: 'Ngân hàng câu hỏi', icon: <BookOpen size={20} />,
    children: [
      { path: '/questions', label: 'Tất cả câu hỏi', icon: <FileQuestion size={18} /> },
      { path: '/subjects', label: 'Môn học', icon: <GraduationCap size={18} /> },
      { path: '/bookmarks', label: 'Đã đánh dấu', icon: <Star size={18} /> },
    ],
  },
  {
    path: '/exams', label: 'Đề thi', icon: <ListChecks size={20} />,
    children: [
      { path: '/exams/new', label: 'Tạo thủ công', icon: <PlusCircle size={18} /> },
      { path: '/exams/auto', label: 'Tạo tự động', icon: <Shuffle size={18} /> },
      { path: '/exams', label: 'Danh sách đề', icon: <ListChecks size={18} /> },
    ],
  },
  {
    path: '/flashcards', label: 'Học tập / Flashcard', icon: <Layers size={20} />,
  },
  { path: '/history', label: 'Lịch sử', icon: <History size={20} /> },
  { path: '/statistics', label: 'Thống kê', icon: <BarChart3 size={20} /> },
];

const bottomItems: NavItem[] = [
  { path: '/guide', label: 'Hướng dẫn', icon: <HelpCircle size={20} /> },
  { path: '/import', label: 'Import', icon: <Download size={20} /> },
  { path: '/export', label: 'Export', icon: <Upload size={20} /> },
  { path: '/backup', label: 'Sao lưu', icon: <Save size={20} /> },
  { path: '/settings', label: 'Cài đặt', icon: <Settings size={20} /> },
];

const SidebarNavItem: React.FC<{ item: NavItem; collapsed: boolean }> = ({ item, collapsed }) => {
  const location = useLocation();
  const [expanded, setExpanded] = React.useState(
    item.children?.some(c => location.pathname === c.path) ?? false
  );

  if (item.children && !collapsed) {
    const isActive = item.children.some(c => location.pathname === c.path);
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer',
            'hover:bg-[hsl(var(--muted)/0.6)]',
            isActive ? 'text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.06)]' : 'text-[hsl(var(--muted-foreground))]'
          )}
        >
          {item.icon}
          <span className="flex-1 text-left">{item.label}</span>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {expanded && (
          <div className="ml-3 pl-2 border-l border-[hsl(var(--border))] mt-1 space-y-0.5 animate-fade-in">
            {item.children.map(child => (
              <NavLink
                key={child.path}
                to={child.path}
                end={child.path === '/questions' || child.path === '/exams'}
                className={({ isActive }) => cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200',
                  'hover:bg-[hsl(var(--muted)/0.6)]',
                  isActive
                    ? 'bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] font-bold shadow-xs'
                    : 'text-[hsl(var(--muted-foreground))]'
                )}
              >
                {child.icon}
                <span>{child.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) => cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
        'hover:bg-[hsl(var(--muted)/0.6)]',
        collapsed && 'justify-center px-0',
        isActive
          ? 'bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] font-bold shadow-xs'
          : 'text-[hsl(var(--muted-foreground))]'
      )}
      title={collapsed ? item.label : undefined}
    >
      {item.icon}
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );
};

export const Sidebar: React.FC = () => {
  const { sidebarOpen } = useAppStore();

  return (
    <aside
      className={cn(
        'fixed left-0 top-[var(--topbar-height)] bottom-0 z-30',
        'glass-panel',
        'flex flex-col transition-all duration-300 ease-in-out',
        'overflow-hidden',
        sidebarOpen ? 'w-[var(--sidebar-width)]' : 'w-[var(--sidebar-collapsed-width)]'
      )}
    >
      {/* Logo */}
      <div className={cn('p-4 flex items-center gap-3', !sidebarOpen && 'justify-center')}>
        <div className="w-9 h-9 rounded-2xl bg-[hsl(var(--primary)/0.12)] p-1.5 flex items-center justify-center flex-shrink-0 shadow-xs ring-1 ring-[hsl(var(--primary)/0.25)] overflow-hidden">
          <img src={logoImg} alt={APP_NAME} className="w-full h-full object-contain" />
        </div>
        {sidebarOpen && (
          <div className="animate-fade-in min-w-0">
            <h1 className="text-base font-extrabold tracking-tight text-[hsl(var(--foreground))]">{APP_NAME}</h1>
            <p className="text-[10px] font-semibold tracking-tight text-[hsl(var(--muted-foreground))] truncate">
              Không Gian Luyện Thi Cá Nhân
            </p>
          </div>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map(item => (
          <SidebarNavItem key={item.path + item.label} item={item} collapsed={!sidebarOpen} />
        ))}
      </nav>

      {/* Separator */}
      <div className="mx-4 border-t border-[hsl(var(--border))]" />

      {/* Bottom Nav */}
      <nav className="px-3 py-2 space-y-1">
        {bottomItems.map(item => (
          <SidebarNavItem key={item.path} item={item} collapsed={!sidebarOpen} />
        ))}
      </nav>

      {/* Developer Credit Footer */}
      {sidebarOpen && (
        <div className="px-3.5 py-2.5 mx-3 mb-3 rounded-2xl bg-[hsl(var(--muted)/0.35)] border border-[hsl(var(--border))] text-[10px] text-[hsl(var(--muted-foreground))] animate-fade-in">
          <div className="flex items-center justify-between font-bold text-[hsl(var(--foreground))]">
            <span>{APP_NAME}</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)]">
              {APP_DISPLAY_VERSION}
            </span>
          </div>
          <p className="mt-0.5 truncate">Phát triển: <span className="font-semibold text-[hsl(var(--foreground))]">{APP_AUTHOR}</span></p>
          <p className="text-[9px] opacity-75 truncate">{APP_CONTACT}</p>
        </div>
      )}
    </aside>
  );
};

