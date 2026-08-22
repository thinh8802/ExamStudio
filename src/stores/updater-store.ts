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
          errorMessage: payload.message || null,
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
        set({ status: 'error', errorMessage: res.error });
        toast.error(`Không thể kiểm tra cập nhật: ${res.error}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối kiểm tra cập nhật';
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
        set({ status: 'error', errorMessage: res.error });
        toast.error(`Lỗi tải bản cập nhật: ${res.error}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi tải bản cập nhật';
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
