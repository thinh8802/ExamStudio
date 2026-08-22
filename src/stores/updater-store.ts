// ============================================
// UPDATER STORE - Zustand State Management for Auto Update
// ============================================
import { create } from 'zustand';
import toast from 'react-hot-toast';
import type { UpdateStatus, UpdateInfo, DownloadProgress, UpdaterStatusPayload } from '@/types/updater';

interface UpdaterState {
  status: UpdateStatus;
  updateInfo: UpdateInfo | null;
  progress: DownloadProgress | null;
  errorMessage: string | null;
  lastCheckedAt: Date | null;
  isBannerDismissed: boolean;
  isElectron: boolean;
  
  // Actions
  initListener: () => () => void;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  quitAndInstall: () => Promise<void>;
  dismissBanner: () => void;
  resetStatus: () => void;
}

function cleanErrorMessage(rawMsg: string | null | undefined): string {
  if (!rawMsg) return 'Lỗi kết nối kiểm tra cập nhật';
  if (
    rawMsg.includes('not signed by the application owner') ||
    rawMsg.includes('certificate') ||
    rawMsg.includes('Get-AuthenticodeSignature') ||
    rawMsg.includes('ERR_UPDATER_INVALID_SIGNATURE') ||
    rawMsg.includes('Status: 2')
  ) {
    return 'Bản phát hành độc lập (chưa ký Authenticode thương mại). Bạn có thể tải và cài đặt trực tiếp từ GitHub Releases.';
  }
  if (rawMsg.includes('latest.yml') || rawMsg.includes('404') || rawMsg.includes('HttpError: 404')) {
    return 'Không tìm thấy tệp cấu hình phiên bản (latest.yml) trên GitHub Releases. Đang đồng bộ dữ liệu phát hành...';
  }
  if (rawMsg.includes('net::ERR_') || rawMsg.includes('ENOTFOUND') || rawMsg.includes('ETIMEDOUT') || rawMsg.includes('ECONNREFUSED') || rawMsg.includes('fetch failed')) {
    return 'Không thể kết nối tới GitHub Releases. Vui lòng kiểm tra lại kết nối mạng Internet.';
  }
  return rawMsg;
}

export const useUpdaterStore = create<UpdaterState>((set, get) => ({
  status: 'idle',
  updateInfo: null,
  progress: null,
  errorMessage: null,
  lastCheckedAt: null,
  isBannerDismissed: false,
  isElectron: typeof window !== 'undefined' && Boolean(window.electronAPI?.updater),

  initListener: () => {
    if (typeof window === 'undefined' || !window.electronAPI?.updater) {
      return () => {};
    }

    const unsubscribe = window.electronAPI.updater.onUpdateStatus((payload: UpdaterStatusPayload) => {
      console.log('[Updater Store] Received status:', payload);
      
      set((state) => {
        const nextState: Partial<UpdaterState> = {
          status: payload.status,
          errorMessage: payload.message ? cleanErrorMessage(payload.message) : null,
        };

        if (payload.status === 'checking') {
          nextState.lastCheckedAt = new Date();
        }

        if (payload.status === 'available') {
          nextState.updateInfo = {
            version: payload.version,
            releaseDate: payload.releaseDate,
            releaseNotes: payload.releaseNotes,
          };
          nextState.isBannerDismissed = false;
        }

        if (payload.status === 'downloading') {
          nextState.progress = {
            percent: payload.percent || 0,
            bytesPerSecond: payload.bytesPerSecond || 0,
            transferred: payload.transferred || 0,
            total: payload.total || 0,
          };
        }

        if (payload.status === 'downloaded') {
          nextState.progress = { percent: 100, bytesPerSecond: 0, transferred: 0, total: 0 };
        }

        return nextState;
      });
    });

    return unsubscribe;
  },

  checkForUpdates: async () => {
    const isElectron = get().isElectron;
    if (!isElectron || !window.electronAPI?.updater) {
      toast('Ứng dụng đang chạy ở chế độ Web/Preview.');
      return;
    }

    set({ status: 'checking', errorMessage: null, lastCheckedAt: new Date() });
    try {
      const res = await window.electronAPI.updater.checkForUpdates();
      if (!res.success && res.error) {
        const sanitized = cleanErrorMessage(res.error);
        set({ status: 'error', errorMessage: sanitized });
        toast.error(`Không thể kiểm tra cập nhật: ${sanitized}`);
      }
    } catch (err) {
      const msg = cleanErrorMessage(err instanceof Error ? err.message : String(err));
      set({ status: 'error', errorMessage: msg });
      toast.error(msg);
    }
  },

  downloadUpdate: async () => {
    const isElectron = get().isElectron;
    if (!isElectron || !window.electronAPI?.updater) return;

    set({ status: 'downloading', errorMessage: null, progress: { percent: 0, bytesPerSecond: 0, transferred: 0, total: 0 } });
    try {
      const res = await window.electronAPI.updater.downloadUpdate();
      if (!res.success && res.error) {
        const sanitized = cleanErrorMessage(res.error);
        set({ status: 'error', errorMessage: sanitized });
        toast.error(`Lỗi tải bản cập nhật: ${sanitized}`);
      }
    } catch (err) {
      const msg = cleanErrorMessage(err instanceof Error ? err.message : String(err));
      set({ status: 'error', errorMessage: msg });
      toast.error(msg);
    }
  },

  quitAndInstall: async () => {
    const isElectron = get().isElectron;
    if (!isElectron || !window.electronAPI?.updater) return;

    try {
      await window.electronAPI.updater.quitAndInstall();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi cài đặt cập nhật');
    }
  },

  dismissBanner: () => set({ isBannerDismissed: true }),
  resetStatus: () => set({ status: 'idle', errorMessage: null }),
}));
