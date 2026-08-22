// ============================================
// UPDATE NOTIFICATION WIDGET - Thông Báo Cập Nhật Tự Động
// ============================================
import React, { useEffect } from 'react';
import { Sparkles, Download, RefreshCw, X, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useUpdaterStore } from '@/stores/updater-store';
import { Button } from '@/components/ui';

export const UpdateNotificationWidget: React.FC = () => {
  const {
    status,
    updateInfo,
    progress,
    isBannerDismissed,
    initListener,
    downloadUpdate,
    quitAndInstall,
    dismissBanner,
  } = useUpdaterStore();

  useEffect(() => {
    const unsub = initListener();
    return unsub;
  }, [initListener]);

  // Only show notification when the update has finished downloading in the background
  if (isBannerDismissed || status !== 'downloaded') {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-slide-in-right p-4 rounded-3xl bg-[hsl(var(--card))] border-2 border-emerald-500/30 shadow-2xl shadow-emerald-500/10 text-[hsl(var(--foreground))] space-y-3 backdrop-blur-md">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-500 shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[hsl(var(--foreground))]">
              Sẵn Sàng Nâng Cấp Phiên Bản Mới
            </h4>
            <span className="text-[10.5px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              Phiên bản mới: v{updateInfo?.version || 'Mới nhất'}
            </span>
          </div>
        </div>

        <button
          onClick={dismissBanner}
          className="p-1 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
          title="Đóng (Sẽ tự nâng cấp khi bạn tắt app)"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="space-y-3">
        <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
          <span>Bản cập nhật đã tải xong ngầm và sẽ tự động cài đặt khi bạn đóng ứng dụng.</span>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={dismissBanner}
            className="text-xs font-semibold cursor-pointer"
          >
            Để sau (Tự cài khi đóng)
          </Button>
          <Button
            variant="default"
            size="sm"
            icon={<ArrowRight size={13} />}
            onClick={quitAndInstall}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs"
          >
            Khởi động lại ngay
          </Button>
        </div>
      </div>

    </div>
  );
};
