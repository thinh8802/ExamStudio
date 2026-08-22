// ============================================
// EXAMPREP STUDIO AUTH SERVICE - Master Account & App Lock
// ============================================
// Uses Native WebCrypto PBKDF2-HMAC-SHA256 with 100,000 iterations & random 16-byte salt.
// Session token is strictly kept in RAM (not stored on disk).

export interface OwnerAccountRecord {
  id: string;
  username: string;
  password_hash: string;
  salt_hex: string;
  iterations: number;
  algorithm: string;
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = 'examprep_owner_account';
const LEGACY_STORAGE_KEYS = ['examstudio_owner_account', 'examora_owner_account'];
const SESSION_LOCK_KEY = 'examprep_manual_lock';
const LEGACY_SESSION_LOCK_KEYS = ['examstudio_manual_lock', 'examora_manual_lock'];
const ITERATIONS = 100000;
const KEY_LEN_BITS = 256;
const ALGORITHM = 'PBKDF2-HMAC-SHA256';

function getStoredAccountData(): string | null {
  let data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      const legacyData = localStorage.getItem(legacyKey);
      if (legacyData) {
        localStorage.setItem(STORAGE_KEY, legacyData);
        data = legacyData;
        break;
      }
    }
  }
  return data;
}

// --- Crypto Helpers ---
function buf2hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hex2buf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const enc = new TextEncoder();
  const passKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: iterations,
      hash: 'SHA-256',
    },
    passKey,
    KEY_LEN_BITS
  );

  return buf2hex(derivedBits);
}

class AuthService {
  private authenticated: boolean = false;
  private manualLock: boolean = false;
  private failedAttempts: number = 0;
  private lockUntil: number = 0;

  /**
   * Check if app was manually locked or navigated to landing
   */
  isManualLock(): boolean {
    const isLocked = sessionStorage.getItem(SESSION_LOCK_KEY) === 'true' ||
      LEGACY_SESSION_LOCK_KEYS.some(k => sessionStorage.getItem(k) === 'true');
    return this.manualLock || isLocked;
  }

  setManualLock(locked: boolean): void {
    this.manualLock = locked;
    if (locked) {
      sessionStorage.setItem(SESSION_LOCK_KEY, 'true');
    } else {
      sessionStorage.removeItem(SESSION_LOCK_KEY);
      for (const k of LEGACY_SESSION_LOCK_KEYS) {
        sessionStorage.removeItem(k);
      }
    }
  }

  /**
   * Check if master account has been initialized
   */
  async isAccountSetup(): Promise<boolean> {
    const data = getStoredAccountData();
    if (!data) return false;
    try {
      const parsed = JSON.parse(data);
      return Boolean(parsed.username);
    } catch {
      return false;
    }
  }

  /**
   * Check if password protection is enabled
   */
  async isPasswordProtected(): Promise<boolean> {
    const data = getStoredAccountData();
    if (!data) return false;
    try {
      const parsed = JSON.parse(data);
      return Boolean(parsed.password_hash);
    } catch {
      return false;
    }
  }

  /**
   * Skip password setup (Passwordless mode)
   */
  async skipAccountSetup(username?: string): Promise<{ success: boolean }> {
    const record: OwnerAccountRecord = {
      id: 'master_owner',
      username: username?.trim() || 'Người học',
      password_hash: '',
      salt_hex: '',
      iterations: 0,
      algorithm: 'NONE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    this.authenticated = true;
    this.setManualLock(false);
    this.failedAttempts = 0;
    return { success: true };
  }

  /**
   * Get registered owner username
   */
  async getOwnerUsername(): Promise<string> {
    const data = getStoredAccountData();
    if (!data) return 'Chủ sở hữu';
    try {
      const parsed = JSON.parse(data);
      return parsed.username || 'Chủ sở hữu';
    } catch {
      return 'Chủ sở hữu';
    }
  }

  /**
   * Setup initial master account (First launch)
   */
  async setupAccount(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    const cleanUser = username.trim();
    if (!cleanUser) {
      return { success: false, error: 'Tên người dùng không được để trống' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' };
    }

    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const saltHex = buf2hex(salt.buffer);
      const hash = await deriveKey(password, salt, ITERATIONS);

      const record: OwnerAccountRecord = {
        id: 'master_owner',
        username: cleanUser,
        password_hash: hash,
        salt_hex: saltHex,
        iterations: ITERATIONS,
        algorithm: ALGORITHM,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
      this.authenticated = true;
      this.setManualLock(false);
      this.failedAttempts = 0;
      return { success: true };
    } catch (err: any) {
      console.error('Account setup error:', err);
      return { success: false, error: 'Lỗi mã hóa trong quá trình thiết lập tài khoản' };
    }
  }

  /**
   * Verify password on lock screen with anti brute-force progressive delay
   */
  async login(password: string): Promise<{ success: boolean; error?: string; delayMs?: number }> {
    const now = Date.now();
    if (this.lockUntil > now) {
      const remainingSec = Math.ceil((this.lockUntil - now) / 1000);
      return {
        success: false,
        error: `Quá nhiều lần thử sai. Vui lòng chờ ${remainingSec} giây.`,
        delayMs: this.lockUntil - now,
      };
    }

    const data = getStoredAccountData();
    if (!data) {
      return { success: false, error: 'Chưa thiết lập tài khoản chủ' };
    }

    try {
      const record: OwnerAccountRecord = JSON.parse(data);
      const salt = hex2buf(record.salt_hex);
      const computedHash = await deriveKey(password, salt, record.iterations || ITERATIONS);

      if (computedHash === record.password_hash) {
        this.authenticated = true;
        this.setManualLock(false);
        this.failedAttempts = 0;
        this.lockUntil = 0;
        return { success: true };
      } else {
        this.failedAttempts++;
        if (this.failedAttempts >= 3) {
          // Progressive delay: 3 attempts = 3s, 4 = 6s, 5+ = 15s
          const delaySec = this.failedAttempts === 3 ? 3 : this.failedAttempts === 4 ? 6 : 15;
          this.lockUntil = Date.now() + delaySec * 1000;
        }
        return { success: false, error: 'Mật khẩu không chính xác' };
      }
    } catch (err) {
      console.error('Login verification error:', err);
      return { success: false, error: 'Lỗi xác thực hệ thống' };
    }
  }

  /**
   * Change Master Password
   */
  async changePassword(oldPass: string, newPass: string): Promise<{ success: boolean; error?: string }> {
    const verify = await this.login(oldPass);
    if (!verify.success) {
      return { success: false, error: 'Mật khẩu hiện tại không đúng' };
    }
    if (!newPass || newPass.length < 6) {
      return { success: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự' };
    }

    const currentUsername = await this.getOwnerUsername();
    return this.setupAccount(currentUsername, newPass);
  }

  /**
   * Tắt hoàn toàn mật khẩu đăng nhập (Chế độ Không cần mật khẩu / Mở app trực tiếp)
   */
  async disablePassword(currentPassword?: string): Promise<{ success: boolean; error?: string }> {
    const isProtected = await this.isPasswordProtected();
    if (isProtected && currentPassword !== undefined) {
      const verify = await this.login(currentPassword);
      if (!verify.success) {
        return { success: false, error: 'Mật khẩu hiện tại không chính xác' };
      }
    }

    const currentUsername = await this.getOwnerUsername();
    return this.skipAccountSetup(currentUsername);
  }

  /**
   * In-memory session check
   */
  isAuthenticated(): boolean {
    return this.authenticated;
  }

  /**
   * Lock application immediately
   */
  lock(): void {
    this.authenticated = false;
    this.setManualLock(true);
  }
}

export const authService = new AuthService();
