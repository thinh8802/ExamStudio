const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');
const crypto = require('crypto');
const { autoUpdater } = require('electron-updater');

// Public Key an toàn để Verify chữ ký số License (Ed25519)
const LICENSE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAvuwEDV6Mn2uVY99rJsEmkfn2yTgAu/Xu7MGAdIwNzBM=
-----END PUBLIC KEY-----`;

app.setName('ExamPrep Studio');

// Startup Performance Optimizations
app.commandLine.appendSwitch('disable-features', 'Translate,OptimizationHints,MediaRouter');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

// Configure User Data Path:
// Store data cleanly in %APPDATA%/ExamPrep Studio (with automatic data migration from legacy paths)
let userDataPath;
if (process.env.PORTABLE_EXECUTABLE_DIR) {
  userDataPath = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'data');
} else {
  const cleanPath = path.join(app.getPath('appData'), 'ExamPrep Studio');
  const legacyPaths = [
    path.join(app.getPath('appData'), 'com.examprepstudio.desktop'),
    path.join(app.getPath('appData'), 'ExamStudio'),
    path.join(app.getPath('appData'), 'com.examstudio.desktop'),
    path.join(app.getPath('appData'), 'com.examora.desktop')
  ];

  if (!fs.existsSync(cleanPath)) {
    for (const oldPath of legacyPaths) {
      if (fs.existsSync(oldPath)) {
        try {
          fs.cpSync(oldPath, cleanPath, { recursive: true });
          console.log(`[Migration] Migrated data from ${path.basename(oldPath)} to ExamPrep Studio`);
          break;
        } catch (e) {}
      }
    }
  }

  userDataPath = cleanPath;
}

try {
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
} catch (e) {
  console.error('Failed to ensure userData directory:', e);
}

app.setPath('userData', userDataPath);

let mainWindow = null;

autoUpdater.autoDownload = true; // Silent background auto-download like VS Code & Chrome
autoUpdater.autoInstallOnAppQuit = true; // Auto-install update when user closes the app

// Cho phép auto-update mượt mà không bị Windows chặn khi dùng chứng chỉ ký số độc lập / self-signed
if (autoUpdater) {
  try {
    autoUpdater.verifyUpdateCodeSignature = () => Promise.resolve(null);
    Object.defineProperty(autoUpdater, 'verifyUpdateCodeSignature', {
      value: () => Promise.resolve(null),
      writable: true,
      configurable: true,
    });
  } catch (e) {
    console.warn('[AutoUpdater] Warning configuring signature verifier override:', e);
  }
}

function sanitizeUpdaterError(err) {
  if (!err) return 'Lỗi kết nối kiểm tra cập nhật';
  const msg = typeof err === 'string' ? err : (err.message || String(err));
  if (
    msg.includes('not signed by the application owner') ||
    msg.includes('certificate') ||
    msg.includes('Get-AuthenticodeSignature') ||
    msg.includes('ERR_UPDATER_INVALID_SIGNATURE') ||
    msg.includes('Status: 2')
  ) {
    return 'Bản phát hành độc lập (chưa ký Authenticode thương mại). Bạn có thể cập nhật tự động hoặc tải trực tiếp từ GitHub Releases.';
  }
  if (msg.includes('latest.yml') || msg.includes('404') || msg.includes('HttpError: 404')) {
    return 'Không tìm thấy tệp cấu hình phiên bản (latest.yml) trên GitHub Releases. Đang đồng bộ dữ liệu phát hành...';
  }
  if (msg.includes('net::ERR_') || msg.includes('ENOTFOUND') || msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
    return 'Không thể kết nối tới GitHub Releases. Vui lòng kiểm tra lại mạng Internet của bạn.';
  }
  return msg;
}

function sendUpdaterStatus(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:status', payload);
  }
}

// AutoUpdater Event Listeners
autoUpdater.on('checking-for-update', () => {
  console.log('[AutoUpdater] Checking for updates...');
  sendUpdaterStatus({ status: 'checking' });
});

autoUpdater.on('update-available', (info) => {
  console.log('[AutoUpdater] Update available:', info.version);
  sendUpdaterStatus({
    status: 'available',
    version: info.version,
    releaseDate: info.releaseDate,
    releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : '',
  });
});

autoUpdater.on('update-not-available', (info) => {
  console.log('[AutoUpdater] Update not available. Current version is latest:', info.version);
  sendUpdaterStatus({
    status: 'not-available',
    version: info.version,
  });
});

autoUpdater.on('download-progress', (progressObj) => {
  sendUpdaterStatus({
    status: 'downloading',
    percent: Math.round(progressObj.percent || 0),
    bytesPerSecond: progressObj.bytesPerSecond || 0,
    transferred: progressObj.transferred || 0,
    total: progressObj.total || 0,
  });
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('[AutoUpdater] Update downloaded successfully:', info.version);
  sendUpdaterStatus({
    status: 'downloaded',
    version: info.version,
    releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : '',
  });
});

autoUpdater.on('error', (err) => {
  console.error('[AutoUpdater] Error encountered:', err ? err.message : 'Unknown error');
  sendUpdaterStatus({
    status: 'error',
    message: sanitizeUpdaterError(err),
  });
});

// IPC Handlers for Updater
ipcMain.handle('updater:check', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result ? result.updateInfo : null };
  } catch (err) {
    console.error('[AutoUpdater] Manual check error:', err);
    return { success: false, error: sanitizeUpdaterError(err) };
  }
});

ipcMain.handle('updater:download', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (err) {
    console.error('[AutoUpdater] Download error:', err);
    return { success: false, error: sanitizeUpdaterError(err) };
  }
});

ipcMain.handle('updater:quitAndInstall', () => {
  setImmediate(() => {
    autoUpdater.quitAndInstall(false, true);
  });
  return { success: true };
});

ipcMain.handle('updater:getVersion', () => {
  return app.getVersion();
});

// ============================================
// OFFLINE & HYBRID LICENSE VALIDATION & STORAGE IPC
// ============================================
function getLicenseFilePath() {
  return path.join(app.getPath('userData'), 'license.json');
}

/**
 * Sinh Machine ID duy nhất & ổn định cho từng máy tính
 */
function getMachineId() {
  try {
    if (process.platform === 'win32') {
      const regOut = execSync('reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
        windowsHide: true,
      });
      const match = regOut.match(/MachineGuid\s+REG_SZ\s+([a-fA-F0-9-]+)/i);
      if (match && match[1]) {
        const hash = crypto.createHash('sha256').update('EPS-SALT-V1-' + match[1].trim().toLowerCase()).digest('hex');
        return `EPS-${hash.substring(0, 4).toUpperCase()}-${hash.substring(4, 8).toUpperCase()}-${hash.substring(8, 12).toUpperCase()}`;
      }
    }
  } catch (e) {}

  try {
    const interfaces = os.networkInterfaces();
    let macAddress = '';
    if (interfaces) {
      for (const key of Object.keys(interfaces)) {
        const ifaceList = interfaces[key];
        if (Array.isArray(ifaceList)) {
          for (const iface of ifaceList) {
            if (iface && iface.mac && iface.mac !== '00:00:00:00:00:00') {
              macAddress = iface.mac;
              break;
            }
          }
        }
        if (macAddress) break;
      }
    }

    const fallbackSeed = os.hostname() + '-' + os.userInfo().username + '-' + os.arch() + '-' + macAddress;
    const hash = crypto.createHash('sha256').update('EPS-FALLBACK-V1-' + fallbackSeed).digest('hex');
    return `EPS-${hash.substring(0, 4).toUpperCase()}-${hash.substring(4, 8).toUpperCase()}-${hash.substring(8, 12).toUpperCase()}`;
  } catch (e) {
    try {
      const devIdPath = path.join(app.getPath('userData'), 'device_id.txt');
      if (fs.existsSync(devIdPath)) {
        return fs.readFileSync(devIdPath, 'utf8').trim();
      }
      const newDevId = `EPS-${crypto.randomBytes(6).toString('hex').toUpperCase().match(/.{1,4}/g).join('-')}`;
      fs.writeFileSync(devIdPath, newDevId, 'utf8');
      return newDevId;
    } catch (e2) {
      return `EPS-DEV-${Date.now().toString(36).toUpperCase()}`;
    }
  }
}

function verifyLicenseKeyString(licenseKey, storedActivatedAt) {
  const trimmed = typeof licenseKey === 'string' ? licenseKey.trim() : '';
  if (!trimmed.startsWith('EXAM.') && !trimmed.startsWith('EXAMPREP.')) {
    return { valid: false, error: 'Định dạng mã License không hợp lệ (Mã chuẩn phải bắt đầu bằng EXAM. hoặc EXAMPREP.)' };
  }

  const parts = licenseKey.trim().split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Cấu trúc mã License không đầy đủ hoặc bị cắt xén.' };
  }

  try {
    const payloadBuffer = Buffer.from(parts[1], 'base64url');
    const signatureBuffer = Buffer.from(parts[2], 'base64url');
    const payload = JSON.parse(payloadBuffer.toString('utf8'));

    const publicKey = crypto.createPublicKey(LICENSE_PUBLIC_KEY);
    const isValid = crypto.verify(null, payloadBuffer, publicKey, signatureBuffer);

    if (!isValid) {
      return { valid: false, error: 'Chữ ký số không khớp! Mã License đã bị sửa đổi hoặc không hợp lệ.' };
    }

    if (payload.prod !== 'ExamStudio' && payload.prod !== 'ExamPrep Studio') {
      return { valid: false, error: 'Mã License này không dành cho ứng dụng ExamPrep Studio.' };
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp > 0 && payload.exp < now) {
      const expDate = new Date(payload.exp * 1000).toLocaleString('vi-VN');
      return { valid: false, error: `Mã License đã hết hạn sử dụng vào lúc ${expDate}.`, payload };
    }

    if (payload.dur > 0 && storedActivatedAt) {
      const actSec = Math.floor(new Date(storedActivatedAt).getTime() / 1000);
      const expSec = actSec + payload.dur;
      if (now > expSec) {
        const expDate = new Date(expSec * 1000).toLocaleString('vi-VN');
        return { valid: false, error: `Mã License đã hết hạn sử dụng vào lúc ${expDate} (Thời lượng tính từ lúc kích hoạt).`, payload };
      }
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: 'Không thể giải mã License: ' + err.message };
  }
}

ipcMain.handle('license:getMachineId', () => {
  return getMachineId();
});

ipcMain.handle('license:getStatus', () => {
  try {
    const licPath = getLicenseFilePath();
    if (!fs.existsSync(licPath)) {
      return { isLicensed: false, payload: null, rawKey: null, activatedAt: null, expiresAt: null, machineId: getMachineId() };
    }

    const raw = fs.readFileSync(licPath, 'utf8');
    const data = JSON.parse(raw);

    if (!data || !data.licenseKey) {
      return { isLicensed: false, payload: null, rawKey: null, activatedAt: null, expiresAt: null, machineId: getMachineId() };
    }

    const currentMachineId = getMachineId();

    // 1. Kiểm tra khóa thiết bị (Device Machine Binding)
    if (data.machineId && data.machineId !== 'EPS-DEVICE-DEFAULT' && data.machineId !== currentMachineId) {
      return {
        isLicensed: false,
        payload: null,
        rawKey: data.licenseKey,
        activatedAt: data.activatedAt || null,
        expiresAt: data.expiresAt || null,
        machineId: currentMachineId,
        error: '⛔ Phát hiện thiết bị không khớp! Bản quyền này thuộc về một máy tính khác.'
      };
    }

    // Tự động nâng cấp machineId từ EPS-DEVICE-DEFAULT sang machine ID thật của thiết bị này
    if (data.machineId === 'EPS-DEVICE-DEFAULT') {
      data.machineId = currentMachineId;
      try {
        fs.writeFileSync(licPath, JSON.stringify(data, null, 2), 'utf8');
      } catch (e) {}
    }

    // 2. Kiểm tra hạn sử dụng nếu có expiresAt
    if (data.expiresAt) {
      const expMs = new Date(data.expiresAt).getTime();
      if (Date.now() > expMs) {
        const expStr = new Date(expMs).toLocaleString('vi-VN');
        return {
          isLicensed: false,
          payload: data.payload || null,
          rawKey: data.licenseKey,
          activatedAt: data.activatedAt || null,
          expiresAt: data.expiresAt,
          machineId: currentMachineId,
          error: `Mã bản quyền đã hết hạn sử dụng vào lúc ${expStr}.`
        };
      }
    }

    // 3. Nếu là mã online kích hoạt qua Supabase (có payload hợp lệ)
    if (data.isOnlineVerified || data.payload) {
      return {
        isLicensed: true,
        payload: data.payload,
        rawKey: data.licenseKey,
        activatedAt: data.activatedAt || new Date().toISOString(),
        expiresAt: data.expiresAt || null,
        machineId: currentMachineId
      };
    }

    // 4. Fallback verify chữ ký offline
    const verification = verifyLicenseKeyString(data.licenseKey, data.activatedAt);
    if (verification.valid && verification.payload) {
      return {
        isLicensed: true,
        payload: verification.payload,
        rawKey: data.licenseKey,
        activatedAt: data.activatedAt || new Date().toISOString(),
        expiresAt: data.expiresAt || null,
        machineId: currentMachineId
      };
    } else {
      return {
        isLicensed: false,
        payload: verification.payload || null,
        rawKey: data.licenseKey,
        activatedAt: data.activatedAt || null,
        expiresAt: data.expiresAt || null,
        machineId: currentMachineId,
        error: verification.error
      };
    }
  } catch (err) {
    console.error('[License] Read error:', err);
    return { isLicensed: false, payload: null, rawKey: null, activatedAt: null, expiresAt: null, machineId: getMachineId(), error: err.message };
  }
});

ipcMain.handle('license:activate', (_event, licenseKey, extraOptions) => {
  try {
    const licPath = getLicenseFilePath();
    const nowMs = Date.now();
    const currentMachineId = getMachineId();
    const trimmedKey = typeof licenseKey === 'string' ? licenseKey.trim() : '';

    // A. Nếu được kích hoạt online từ Supabase
    if (extraOptions && extraOptions.remotePayload) {
      const remote = extraOptions.remotePayload;
      const payload = {
        v: 1,
        id: remote.id || `EPS-SUPA-${Date.now().toString(36).toUpperCase()}`,
        name: remote.customer_name || 'ExamPrep Studio User',
        email: remote.customer_email || '',
        prod: 'ExamPrep Studio',
        type: remote.license_type || 'subscription',
        iat: Math.floor(nowMs / 1000),
        exp: remote.expires_at ? Math.floor(new Date(remote.expires_at).getTime() / 1000) : 0,
      };

      const data = {
        licenseKey: trimmedKey,
        activatedAt: remote.activated_at || new Date(nowMs).toISOString(),
        expiresAt: remote.expires_at || null,
        machineId: currentMachineId,
        isOnlineVerified: true,
        payload: payload
      };

      fs.writeFileSync(licPath, JSON.stringify(data, null, 2), 'utf8');
      console.log('[License] Successfully activated via Supabase for:', payload.name, 'on Machine:', currentMachineId);

      return {
        success: true,
        payload: payload,
        activatedAt: data.activatedAt,
        expiresAt: data.expiresAt,
        rawKey: data.licenseKey,
        machineId: currentMachineId
      };
    }

    // B. Fallback offline Ed25519 verification
    const verification = verifyLicenseKeyString(trimmedKey);
    if (!verification.valid || !verification.payload) {
      return { success: false, error: verification.error };
    }

    let expiresAt = null;
    if (verification.payload.dur > 0) {
      expiresAt = new Date(nowMs + verification.payload.dur * 1000).toISOString();
    } else if (verification.payload.exp > 0) {
      expiresAt = new Date(verification.payload.exp * 1000).toISOString();
    }

    const data = {
      licenseKey: trimmedKey,
      activatedAt: new Date(nowMs).toISOString(),
      expiresAt: expiresAt,
      machineId: currentMachineId,
      payload: verification.payload
    };

    fs.writeFileSync(licPath, JSON.stringify(data, null, 2), 'utf8');
    console.log('[License] Successfully activated offline for:', verification.payload.name, 'on Machine:', currentMachineId);

    return {
      success: true,
      payload: verification.payload,
      activatedAt: data.activatedAt,
      expiresAt: data.expiresAt,
      rawKey: data.licenseKey,
      machineId: currentMachineId
    };
  } catch (err) {
    console.error('[License] Activation error:', err);
    return { success: false, error: 'Lỗi khi lưu dữ liệu kích hoạt: ' + err.message };
  }
});

ipcMain.handle('license:deactivate', () => {
  try {
    const licPath = getLicenseFilePath();
    if (fs.existsSync(licPath)) {
      fs.unlinkSync(licPath);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 480,
    minHeight: 480,
    title: 'ExamPrep Studio',
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#090d16',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  Menu.setApplicationMenu(null);

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
    }
    
    // Auto-check for updates silently after 4s (only in packaged mode or if configured)
    if (app.isPackaged) {
      setTimeout(() => {
        try {
          autoUpdater.checkForUpdates().catch(err => {
            console.log('[AutoUpdater] Silent check skipped/failed:', err.message);
          });
        } catch (e) {}
      }, 4000);

      // Periodic background check every 60 minutes
      setInterval(() => {
        try {
          autoUpdater.checkForUpdates().catch(() => {});
        } catch (e) {}
      }, 60 * 60 * 1000);
    }
  });

  // Fallback to ensure window shows even if ready-to-show is delayed
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  }, 1200);

  // Global shortcuts for DevTools (F12) and Fullscreen (F11)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
  });

  // Handle external links (e.g. Facebook, Gmail) to open in system default web browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('mailto:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Intercept navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') && (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('mailto:'))) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  mainWindow.loadFile(indexPath).catch(err => {
    console.error('Failed to load index.html:', err);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
