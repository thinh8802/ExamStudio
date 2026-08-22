// ============================================
// ELECTRON PRELOAD SCRIPT - ExamPrep Studio Secure IPC Bridge
// ============================================
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:check'),
    downloadUpdate: () => ipcRenderer.invoke('updater:download'),
    quitAndInstall: () => ipcRenderer.invoke('updater:quitAndInstall'),
    getAppVersion: () => ipcRenderer.invoke('updater:getVersion'),
    onUpdateStatus: (callback) => {
      const subscription = (_event, payload) => callback(payload);
      ipcRenderer.on('updater:status', subscription);
      return () => {
        ipcRenderer.removeListener('updater:status', subscription);
      };
    },
  },
  license: {
    getStatus: () => ipcRenderer.invoke('license:getStatus'),
    getMachineId: () => ipcRenderer.invoke('license:getMachineId'),
    activate: (licenseKey, options) => ipcRenderer.invoke('license:activate', licenseKey, options),
    deactivate: () => ipcRenderer.invoke('license:deactivate'),
  },
});
