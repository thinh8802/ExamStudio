import React from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/utils';
import { useAppStore } from '@/stores/app-store';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { UpdateNotificationWidget } from '@/components/common/UpdateNotificationWidget';

export const AppLayout: React.FC = () => {
  const { sidebarOpen } = useAppStore();

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Topbar />
      <Sidebar />
      <main
        className={cn(
          'pt-[var(--topbar-height)] transition-all duration-300 ease-in-out min-h-screen',
          sidebarOpen
            ? 'ml-[var(--sidebar-width)]'
            : 'ml-[var(--sidebar-collapsed-width)]'
        )}
      >
        <div className="p-6 animate-fade-in-up">
          <Outlet />
        </div>
      </main>
      <UpdateNotificationWidget />
    </div>
  );
};
