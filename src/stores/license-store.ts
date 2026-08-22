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
  expiresAt: string | null;
  error: string | null;

  // Actions
  checkLicense: (silent?: boolean) => Promise<boolean>;
  activateLicense: (key: string) => Promise<{ success: boolean; payload?: LicensePayload; expiresAt?: string | null; error?: string }>;
  deactivateLicense: () => Promise<void>;
}

export const useLicenseStore = create<LicenseState>((set, get) => ({
  isLicensed: false,
  isLoading: true,
  payload: null,
  rawKey: null,
  activatedAt: null,
  expiresAt: null,
  error: null,

  checkLicense: async (silent = false) => {
    if (!silent) {
      set({ isLoading: true, error: null });
    }
    try {
      const status = await licenseService.getStatus();
      set({
        isLicensed: status.isLicensed,
        payload: status.payload,
        rawKey: status.rawKey,
        activatedAt: status.activatedAt,
        expiresAt: status.expiresAt || null,
        error: status.error || null,
        isLoading: false,
      });
      return status.isLicensed;
    } catch (err: any) {
      set({
        isLicensed: false,
        isLoading: false,
        expiresAt: null,
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
        const nowMs = Date.now();
        let calculatedExp: string | null = null;
        if (res.payload.dur && res.payload.dur > 0) {
          calculatedExp = new Date(nowMs + res.payload.dur * 1000).toISOString();
        } else if (res.payload.exp && res.payload.exp > 0) {
          calculatedExp = new Date(res.payload.exp * 1000).toISOString();
        }

        set({
          isLicensed: true,
          payload: res.payload,
          rawKey: key.trim(),
          activatedAt: new Date().toISOString(),
          expiresAt: calculatedExp,
          error: null,
          isLoading: false,
        });
        return { success: true, payload: res.payload, expiresAt: calculatedExp };
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
      expiresAt: null,
      error: null,
    });
  },
}));
