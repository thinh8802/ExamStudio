// ============================================
// EXAMPREP STUDIO LICENSE TYPES
// ============================================

export type LicenseType = 'lifetime' | 'subscription' | 'trial';

export interface LicensePayload {
  v: number;
  id: string;
  name: string;
  email: string;
  prod: string;
  type: LicenseType;
  iat: number; // Unix timestamp in seconds
  exp: number; // 0 for Lifetime, otherwise fixed Unix timestamp in seconds
  dur?: number; // Duration in seconds counting from activation moment (ví dụ 30 ngày = 2592000s, 30 phút = 1800s)
}

export interface LicenseValidationResult {
  valid: boolean;
  error?: string;
  payload?: LicensePayload;
}

export interface StoredLicenseData {
  licenseKey: string;
  activatedAt: string;
  expiresAt?: string;
  payload: LicensePayload;
}

export interface LicenseStatus {
  isLicensed: boolean;
  payload: LicensePayload | null;
  rawKey: string | null;
  activatedAt: string | null;
  expiresAt?: string | null;
  error?: string;
}
