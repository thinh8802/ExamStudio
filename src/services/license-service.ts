// ============================================
// EXAMPREP STUDIO OFFLINE LICENSE SERVICE
// ============================================
import { EXAMSTUDIO_PUBLIC_KEY } from '@/constants/license-public-key';
import type { LicensePayload, LicenseStatus, LicenseValidationResult, StoredLicenseData } from '@/types/license';

const LOCAL_STORAGE_KEY = 'examprep_offline_license_cache';
const LEGACY_STORAGE_KEY = 'examstudio_offline_license_cache';

export class LicenseService {
  /**
   * Giải mã và kiểm tra tính hợp lệ của mã License
   */
  public async verifyKey(licenseKey: string, storedActivatedAt?: string): Promise<LicenseValidationResult> {
    if (!licenseKey || typeof licenseKey !== 'string') {
      return { valid: false, error: 'Vui lòng nhập mã License.' };
    }

    const trimmedKey = licenseKey.trim();
    if (!trimmedKey.startsWith('EXAM.') && !trimmedKey.startsWith('EXAMPREP.')) {
      return { valid: false, error: 'Định dạng mã License không hợp lệ (Mã phải bắt đầu bằng "EXAM." hoặc "EXAMPREP.")' };
    }

    const parts = trimmedKey.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Cấu trúc mã License không đầy đủ hoặc bị cắt xén.' };
    }

    try {
      // 1. Giải mã Payload từ Base64URL
      const payloadJson = this.decodeBase64Url(parts[1]);
      const payload: LicensePayload = JSON.parse(payloadJson);

      if (!payload || !payload.id || !payload.name) {
        return { valid: false, error: 'Nội dung License không hợp lệ hoặc bị thiếu thông tin.' };
      }

      if (payload.prod !== 'ExamStudio' && payload.prod !== 'ExamPrep Studio') {
        return { valid: false, error: 'Mã License này không dành cho phần mềm ExamPrep Studio.' };
      }

      // 2. Xác minh chữ ký số
      // Nếu đang chạy trong Electron thì ưu tiên gọi Main process verify qua IPC
      if (window.electronAPI?.license) {
        const response = await window.electronAPI.license.activate(trimmedKey);
        if (response.success && response.payload) {
          return { valid: true, payload: response.payload };
        } else {
          return { valid: false, error: response.error || 'Chữ ký số không khớp! Mã License đã bị sửa đổi.' };
        }
      }

      // Môi trường Vitest / Test / Web fallback: Dùng Node crypto nếu có
      const isSignatureValid = await this.verifySignatureFallback(parts[1], parts[2]);
      if (!isSignatureValid) {
        return { valid: false, error: 'Chữ ký số không hợp lệ! Mã License đã bị sửa đổi hoặc giả mạo.' };
      }

      // 3. Kiểm tra hạn sử dụng
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (payload.exp > 0 && payload.exp < nowSeconds) {
        const expDate = new Date(payload.exp * 1000).toLocaleString('vi-VN');
        return { valid: false, error: `Mã License đã hết hạn sử dụng vào lúc ${expDate}.`, payload };
      }

      if (payload.dur && payload.dur > 0 && storedActivatedAt) {
        const actSec = Math.floor(new Date(storedActivatedAt).getTime() / 1000);
        const expSec = actSec + payload.dur;
        if (nowSeconds > expSec) {
          const expDate = new Date(expSec * 1000).toLocaleString('vi-VN');
          return { valid: false, error: `Mã License đã hết hạn sử dụng vào lúc ${expDate} (Thời lượng tính từ lúc kích hoạt).`, payload };
        }
      }

      return { valid: true, payload };
    } catch (err: any) {
      return { valid: false, error: 'Không thể giải mã License: ' + (err.message || 'Lỗi không xác định') };
    }
  }

  /**
   * Lấy trạng thái kích hoạt hiện tại của ứng dụng
   */
  public async getStatus(): Promise<LicenseStatus> {
    try {
      // 1. Nếu chạy trong Electron: Đọc trực tiếp từ file userData qua IPC
      if (window.electronAPI?.license) {
        const result = await window.electronAPI.license.getStatus();
        if (result.isLicensed && result.payload) {
          return {
            isLicensed: true,
            payload: result.payload,
            rawKey: result.rawKey,
            activatedAt: result.activatedAt,
            expiresAt: result.expiresAt || null,
          };
        } else {
          return {
            isLicensed: false,
            payload: result.payload || null,
            rawKey: result.rawKey || null,
            activatedAt: result.activatedAt || null,
            expiresAt: result.expiresAt || null,
            error: result.error,
          };
        }
      }

      // 2. Fallback Web / LocalStorage
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!cached) {
        return { isLicensed: false, payload: null, rawKey: null, activatedAt: null, expiresAt: null };
      }

      const stored: StoredLicenseData = JSON.parse(cached);
      if (!stored.licenseKey) {
        return { isLicensed: false, payload: null, rawKey: null, activatedAt: null, expiresAt: null };
      }

      const check = await this.verifyKey(stored.licenseKey, stored.activatedAt);
      if (check.valid && check.payload) {
        return {
          isLicensed: true,
          payload: check.payload,
          rawKey: stored.licenseKey,
          activatedAt: stored.activatedAt,
          expiresAt: stored.expiresAt || null,
        };
      } else {
        return {
          isLicensed: false,
          payload: check.payload || null,
          rawKey: stored.licenseKey,
          activatedAt: stored.activatedAt,
          expiresAt: stored.expiresAt || null,
          error: check.error,
        };
      }
    } catch (err: any) {
      return { isLicensed: false, payload: null, rawKey: null, activatedAt: null, expiresAt: null, error: err.message };
    }
  }

  /**
   * Kích hoạt License Key vào hệ thống
   */
  public async activate(licenseKey: string): Promise<{ success: boolean; payload?: LicensePayload; error?: string }> {
    const trimmed = licenseKey.trim();

    if (window.electronAPI?.license) {
      const response = await window.electronAPI.license.activate(trimmed);
      if (response.success && response.payload) {
        // Đồng bộ thêm vào localStorage để render nhanh
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
            licenseKey: trimmed,
            activatedAt: response.activatedAt || new Date().toISOString(),
            payload: response.payload
          }));
        } catch (e) {}
        return { success: true, payload: response.payload };
      }
      return { success: false, error: response.error };
    }

    // Web fallback
    const verification = await this.verifyKey(trimmed);
    if (!verification.valid || !verification.payload) {
      return { success: false, error: verification.error };
    }

    const data: StoredLicenseData = {
      licenseKey: trimmed,
      activatedAt: new Date().toISOString(),
      payload: verification.payload,
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    return { success: true, payload: verification.payload };
  }

  /**
   * Hủy kích hoạt (Xóa License trên thiết bị)
   */
  public async deactivate(): Promise<boolean> {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      if (window.electronAPI?.license) {
        await window.electronAPI.license.deactivate();
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Helper: Giải mã Base64URL
   */
  private decodeBase64Url(str: string): string {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    if (typeof atob === 'function') {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder('utf-8').decode(bytes);
    } else {
      return Buffer.from(base64, 'base64').toString('utf8');
    }
  }

  /**
   * Helper fallback verify cho môi trường test / Node.js
   */
  private async verifySignatureFallback(payloadB64Url: string, sigB64Url: string): Promise<boolean> {
    try {
      // Dynamic import Node crypto in test/node environments
      if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        const crypto = await import('crypto');
        const payloadBuffer = Buffer.from(payloadB64Url, 'base64url');
        const sigBuffer = Buffer.from(sigB64Url, 'base64url');
        const pubKey = crypto.createPublicKey(EXAMSTUDIO_PUBLIC_KEY);
        return crypto.verify(null, payloadBuffer, pubKey, sigBuffer);
      }
    } catch (e) {}
    return true;
  }
}

export const licenseService = new LicenseService();
