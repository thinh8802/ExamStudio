// ============================================
// UPDATER TYPES & GLOBAL ELECTRON API
// ============================================

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export interface UpdateInfo {
  version?: string;
  releaseDate?: string;
  releaseNotes?: string;
}

export interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export interface UpdaterStatusPayload {
  status: UpdateStatus;
  version?: string;
  releaseDate?: string;
  releaseNotes?: string;
  percent?: number;
  bytesPerSecond?: number;
  transferred?: number;
  total?: number;
  message?: string;
}

export interface LicenseActivationResponse {
  success: boolean;
  payload?: any;
  activatedAt?: string;
  rawKey?: string;
  error?: string;
}

export interface ElectronLicenseStatus {
  isLicensed: boolean;
  payload: any | null;
  rawKey: string | null;
  activatedAt: string | null;
  expiresAt?: string | null;
  error?: string;
}

export interface ElectronAPI {
  updater?: {
    checkForUpdates: () => Promise<{ success: boolean; updateInfo?: UpdateInfo | null; error?: string }>;
    downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
    quitAndInstall: () => Promise<{ success: boolean }>;
    getAppVersion: () => Promise<string>;
    onUpdateStatus: (callback: (payload: UpdaterStatusPayload) => void) => () => void;
  };
  license?: {
    getStatus: () => Promise<ElectronLicenseStatus>;
    activate: (licenseKey: string) => Promise<LicenseActivationResponse>;
    deactivate: () => Promise<{ success: boolean; error?: string }>;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
