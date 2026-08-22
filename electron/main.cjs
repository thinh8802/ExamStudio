const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
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
// Store data in %APPDATA%/com.examprepstudio.desktop (with automatic data migration from legacy paths)
let userDataPath;
if (process.env.PORTABLE_EXECUTABLE_DIR) {
  userDataPath = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'data');
} else {
  const currentPath = path.join(app.getPath('appData'), 'com.examprepstudio.desktop');
  const studioLegacyPath = path.join(app.getPath('appData'), 'com.examstudio.desktop');
  const examoraLegacyPath = path.join(app.getPath('appData'), 'com.examora.desktop');

  if (!fs.existsSync(currentPath)) {
    if (fs.existsSync(studioLegacyPath)) {
      try {
        fs.cpSync(studioLegacyPath, currentPath, { recursive: true });
        console.log('[Migration] Migrated data from com.examstudio.desktop to com.examprepstudio.desktop');
      } catch (e) {}
    } else if (fs.existsSync(examoraLegacyPath)) {
      try {
        fs.cpSync(examoraLegacyPath, currentPath, { recursive: true });
        console.log('[Migration] Migrated data from com.examora.desktop to com.examprepstudio.desktop');
      } catch (e) {}
    }
  }

  userDataPath = currentPath;
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
    message: err ? err.message : 'Lỗi kết nối kiểm tra cập nhật',
  });
});

// IPC Handlers for Updater
ipcMain.handle('updater:check', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result ? result.updateInfo : null };
  } catch (err) {
    console.error('[AutoUpdater] Manual check error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('updater:download', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (err) {
    console.error('[AutoUpdater] Download error:', err);
    return { success: false, error: err.message };
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
// OFFLINE LICENSE VALIDATION & STORAGE IPC
// ============================================
function getLicenseFilePath() {
  return path.join(app.getPath('userData'), 'license.json');
}

function verifyLicenseKeyString(licenseKey) {
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
      const expDate = new Date(payload.exp * 1000).toLocaleDateString('vi-VN');
      return { valid: false, error: `Mã License đã hết hạn sử dụng vào ngày ${expDate}.`, payload };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: 'Không thể giải mã License: ' + err.message };
  }
}

ipcMain.handle('license:getStatus', () => {
  try {
    const licPath = getLicenseFilePath();
    if (!fs.existsSync(licPath)) {
      return { isLicensed: false, payload: null, rawKey: null, activatedAt: null };
    }

    const raw = fs.readFileSync(licPath, 'utf8');
    const data = JSON.parse(raw);

    if (!data || !data.licenseKey) {
      return { isLicensed: false, payload: null, rawKey: null, activatedAt: null };
    }

    const verification = verifyLicenseKeyString(data.licenseKey);
    if (verification.valid && verification.payload) {
      return {
        isLicensed: true,
        payload: verification.payload,
        rawKey: data.licenseKey,
        activatedAt: data.activatedAt || new Date().toISOString()
      };
    } else {
      return {
        isLicensed: false,
        payload: verification.payload || null,
        rawKey: data.licenseKey,
        activatedAt: data.activatedAt || null,
        error: verification.error
      };
    }
  } catch (err) {
    console.error('[License] Read error:', err);
    return { isLicensed: false, payload: null, rawKey: null, activatedAt: null, error: err.message };
  }
});

ipcMain.handle('license:activate', (_event, licenseKey) => {
  try {
    const verification = verifyLicenseKeyString(licenseKey);
    if (!verification.valid || !verification.payload) {
      return { success: false, error: verification.error };
    }

    const licPath = getLicenseFilePath();
    const data = {
      licenseKey: licenseKey.trim(),
      activatedAt: new Date().toISOString(),
      payload: verification.payload
    };

    fs.writeFileSync(licPath, JSON.stringify(data, null, 2), 'utf8');
    console.log('[License] Successfully activated license for:', verification.payload.name);

    return {
      success: true,
      payload: verification.payload,
      activatedAt: data.activatedAt,
      rawKey: data.licenseKey
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
