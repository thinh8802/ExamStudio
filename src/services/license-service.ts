// ============================================
// EXAMPREP STUDIO HYBRID LICENSE SERVICE
// (Supabase 1-Time Machine Binding + 100% Offline Cache)
// ============================================
import { EXAMSTUDIO_PUBLIC_KEY } from '@/constants/license-public-key';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from '@/constants/supabase-config';
import type { LicensePayload, LicenseStatus, LicenseValidationResult, StoredLicenseData } from '@/types/license';

const LOCAL_STORAGE_KEY = 'examprep_offline_license_cache';
const LEGACY_STORAGE_KEY = 'examstudio_offline_license_cache';
const BROWSER_HWID_KEY = 'eps_browser_machine_id';
// Thời gian tối thiểu giữa hai lần kiểm tra revoke online (15 phút)
const REVOKE_CHECK_INTERVAL_MS = 15 * 60 * 1000;
const REVOKE_CHECK_TS_KEY = 'eps_revoke_check_ts';

export class LicenseService {
  /**
   * Lấy Machine ID duy nhất của máy tính
   */
  public async getMachineId(): Promise<string> {
    try {
      if (window.electronAPI?.license?.getMachineId) {
        const id = await window.electronAPI.license.getMachineId();
        if (id) return id;
      }
    } catch (e) {}

    // Fallback trên Web/Browser
    let browserHwid = localStorage.getItem(BROWSER_HWID_KEY);
    if (!browserHwid) {
      browserHwid = `EPS-WEB-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      localStorage.setItem(BROWSER_HWID_KEY, browserHwid);
    }
    return browserHwid;
  }

  /**
   * Giải mã và kiểm tra tính hợp lệ của mã License (Offline)
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
      if (window.electronAPI?.license) {
        const response = await window.electronAPI.license.activate(trimmedKey);
        if (response.success && response.payload) {
          return { valid: true, payload: response.payload };
        } else {
          return { valid: false, error: response.error || 'Chữ ký số không khớp! Mã License đã bị sửa đổi.' };
        }
      }

      // Fallback môi trường web/test
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
   * Kiểm tra online xem license có bị xóa/revoke trên Supabase không.
   * Chỉ chạy nếu có internet và có Supabase config.
   * Trả về: 'ok' | 'revoked' | 'not_found' | 'skip' (không có mạng / chưa cấu hình)
   */
  private async checkRevocationOnline(licenseKey: string, force = false): Promise<'ok' | 'revoked' | 'not_found' | 'skip'> {
    if (!isSupabaseConfigured() || !licenseKey) return 'skip';

    // Throttle: chỉ check mỗi 15 phút — force=true (load trang) vẫn giữ cooldown 5 giây
    const lastCheck = parseInt(localStorage.getItem(REVOKE_CHECK_TS_KEY) || '0', 10);
    const minCooldown = force ? 5000 : REVOKE_CHECK_INTERVAL_MS;
    if (Date.now() - lastCheck < minCooldown) return 'skip';

    try {
      // Dùng RPC check_license_status (SECURITY DEFINER) — an toàn, bypass RLS
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/check_license_status`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_license_key: licenseKey.trim() }),
        signal: AbortSignal.timeout(8000),
      });

      // Lưu timestamp ngay khi nhận được response (trước parse JSON)
      // để tránh spam nếu server trả về lỗi/malformed JSON
      localStorage.setItem(REVOKE_CHECK_TS_KEY, Date.now().toString());

      if (!res.ok) return 'skip';

      const data: { found: boolean; status: string } = await res.json();
      if (!data.found) return 'not_found'; // đã bị xóa khỏi Supabase
      if (data.status === 'revoked') return 'revoked'; // đã bị thu hồi
      return 'ok';
    } catch {
      return 'skip'; // timeout / offline — giữ nguyên
    }
  }

  /**
   * Lấy trạng thái kích hoạt hiện tại của ứng dụng
   * (Local cache — với online revoke check khi có mạng)
   */
  public async getStatus(): Promise<LicenseStatus> {
    try {
      const machineId = await this.getMachineId();

      // 1. Nếu chạy trong Electron: Đọc trực tiếp từ file userData qua IPC
      if (window.electronAPI?.license) {
        const result = await window.electronAPI.license.getStatus();
        if (result.isLicensed && result.payload) {
          // Kiểm tra revoke online ngay khi load trang (force=true), không block UX
          this.checkRevocationOnline(result.rawKey || '', true).then(async (revStatus) => {
            if (revStatus === 'revoked' || revStatus === 'not_found') {
              await this.deactivate();
              // Force reload để UI cập nhật
              window.location.reload();
            }
          }).catch(() => {});

          return {
            isLicensed: true,
            payload: result.payload,
            rawKey: result.rawKey,
            activatedAt: result.activatedAt,
            expiresAt: result.expiresAt || null,
            machineId: result.machineId || machineId,
          };
        } else {
          return {
            isLicensed: false,
            payload: result.payload || null,
            rawKey: result.rawKey || null,
            activatedAt: result.activatedAt || null,
            expiresAt: result.expiresAt || null,
            machineId: result.machineId || machineId,
            error: result.error,
          };
        }
      }

      // 2. Fallback Web / LocalStorage
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!cached) {
        return { isLicensed: false, payload: null, rawKey: null, activatedAt: null, expiresAt: null, machineId };
      }

      const stored: StoredLicenseData = JSON.parse(cached);
      if (!stored.licenseKey) {
        return { isLicensed: false, payload: null, rawKey: null, activatedAt: null, expiresAt: null, machineId };
      }

      // Kiểm tra revoke online ngay khi load trang (force=true, chạy song song)
      this.checkRevocationOnline(stored.licenseKey, true).then(async (revStatus) => {
        if (revStatus === 'revoked' || revStatus === 'not_found') {
          await this.deactivate();
          window.location.reload();
        }
      }).catch(() => {});

      // Kiểm tra hạn sử dụng nếu có
      if (stored.expiresAt) {
        const expMs = new Date(stored.expiresAt).getTime();
        if (Date.now() > expMs) {
          return {
            isLicensed: false,
            payload: stored.payload || null,
            rawKey: stored.licenseKey,
            activatedAt: stored.activatedAt,
            expiresAt: stored.expiresAt,
            machineId,
            error: `Mã bản quyền đã hết hạn vào lúc ${new Date(expMs).toLocaleString('vi-VN')}.`,
          };
        }
      }

      return {
        isLicensed: true,
        payload: stored.payload,
        rawKey: stored.licenseKey,
        activatedAt: stored.activatedAt,
        expiresAt: stored.expiresAt || null,
        machineId,
      };
    } catch (err: any) {
      return { isLicensed: false, payload: null, rawKey: null, activatedAt: null, expiresAt: null, error: err.message };
    }
  }

  /**
   * Kích hoạt License Key vào hệ thống (Xác thực 1-Lần qua Supabase, chống share mã)
   */
  public async activate(licenseKey: string): Promise<{ success: boolean; payload?: LicensePayload; error?: string }> {
    const trimmed = licenseKey.trim();
    if (!trimmed) {
      return { success: false, error: 'Vui lòng nhập mã bản quyền.' };
    }

    const machineId = await this.getMachineId();

    // 1. NẾU SUPABASE ĐÃ ĐƯỢC CẤU HÌNH: Kích hoạt Online qua Supabase RPC
    if (isSupabaseConfigured()) {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/activate_license`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            p_license_key: trimmed,
            p_machine_id: machineId,
          }),
        });

        if (response.ok) {
          const remoteResult = await response.json();

          // Nếu Supabase từ chối (Mã sai, hoặc ĐÃ BỊ MÁY KHÁC KÍCH HOẠT)
          if (remoteResult && remoteResult.success === false) {
            return { success: false, error: remoteResult.error || 'Không thể kích hoạt bản quyền.' };
          }

          // Kích hoạt thành công trên Supabase -> Lưu vào thiết bị này
          if (remoteResult && remoteResult.success === true) {
            if (window.electronAPI?.license) {
              const ipcRes = await window.electronAPI.license.activate(trimmed, {
                remotePayload: remoteResult,
                machineId,
              });

              if (ipcRes.success && ipcRes.payload) {
                try {
                  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
                    licenseKey: trimmed,
                    activatedAt: ipcRes.activatedAt || new Date().toISOString(),
                    expiresAt: ipcRes.expiresAt || null,
                    machineId,
                    payload: ipcRes.payload,
                  }));
                } catch (e) {}
                return { success: true, payload: ipcRes.payload };
              }
              return { success: false, error: ipcRes.error };
            }

            // Web fallback
            const payload: LicensePayload = {
              v: 1,
              id: `EPS-SUPA-${Date.now().toString(36).toUpperCase()}`,
              name: remoteResult.customer_name || 'ExamPrep Studio User',
              email: remoteResult.customer_email || '',
              prod: 'ExamPrep Studio',
              type: remoteResult.license_type || 'subscription',
              iat: Math.floor(Date.now() / 1000),
              exp: remoteResult.expires_at ? Math.floor(new Date(remoteResult.expires_at).getTime() / 1000) : 0,
            };

            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
              licenseKey: trimmed,
              activatedAt: remoteResult.activated_at || new Date().toISOString(),
              expiresAt: remoteResult.expires_at || null,
              machineId,
              payload,
            }));

            return { success: true, payload };
          }
        } else {
          const errText = await response.text();
          console.warn('[Supabase] RPC error HTTP:', response.status, errText);
        }
      } catch (err: any) {
        console.warn('[Supabase] Network/connection error:', err.message);
        // Nếu lỗi mạng, thông báo rõ ràng cho người dùng
        return {
          success: false,
          error: 'Không thể kết nối đến máy chủ xác thực bản quyền. Vui lòng kiểm tra kết nối Internet trong lần kích hoạt đầu tiên!',
        };
      }
    }

    // 2. FALLBACK NẾU CHƯA CẤU HÌNH SUPABASE HOẶC DÙNG MÃ OFFLINE CHỮ KÝ SỐ ED25519
    if (window.electronAPI?.license) {
      const response = await window.electronAPI.license.activate(trimmed);
      if (response.success && response.payload) {
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
            licenseKey: trimmed,
            activatedAt: response.activatedAt || new Date().toISOString(),
            expiresAt: response.expiresAt || null,
            machineId,
            payload: response.payload,
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
      machineId,
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
