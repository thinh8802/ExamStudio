// ============================================
// EXAMPREP STUDIO LICENSE ZUSTAND STORE
// ============================================
import { create } from 'zustand';
import { licenseService } from '@/services/license-service';
import type { LicensePayload } from '@/types/license';

interface LicenseState {
  isLicensed: boolean;
  isLoading: boolean;
  payload: LicensePayload | null;
  rawKey: string | null;
  activatedAt: string | null;
  error: string | null;

  // Actions
  checkLicense: () => Promise<boolean>;
  activateLicense: (key: string) => Promise<{ success: boolean; error?: string }>;
  deactivateLicense: () => Promise<void>;
}

export const useLicenseStore = create<LicenseState>((set, get) => ({
  isLicensed: false,
  isLoading: true,
  payload: null,
  rawKey: null,
  activatedAt: null,
  error: null,

  checkLicense: async () => {
    set({ isLoading: true, error: null });
    try {
      const status = await licenseService.getStatus();
      set({
        isLicensed: status.isLicensed,
        payload: status.payload,
        rawKey: status.rawKey,
        activatedAt: status.activatedAt,
        error: status.error || null,
        isLoading: false,
      });
      return status.isLicensed;
    } catch (err: any) {
      set({
        isLicensed: false,
        isLoading: false,
        error: err.message || 'Lỗi khi kiểm tra bản quyền',
      });
      return false;
    }
  },

  activateLicense: async (key: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await licenseService.activate(key);
      if (res.success && res.payload) {
        set({
          isLicensed: true,
          payload: res.payload,
          rawKey: key.trim(),
          activatedAt: new Date().toISOString(),
          error: null,
          isLoading: false,
        });
        return { success: true };
      } else {
        set({
          isLicensed: false,
          isLoading: false,
          error: res.error || 'Mã License không hợp lệ',
        });
        return { success: false, error: res.error };
      }
    } catch (err: any) {
      const errMsg = err.message || 'Lỗi kết nối kiểm tra License';
      set({ isLoading: false, error: errMsg });
      return { success: false, error: errMsg };
    }
  },

  deactivateLicense: async () => {
    await licenseService.deactivate();
    set({
      isLicensed: false,
      payload: null,
      rawKey: null,
      activatedAt: null,
      error: null,
    });
  },
}));
