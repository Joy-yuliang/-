const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getData: () => ipcRenderer.invoke('store:get'),
  setData: (data) => ipcRenderer.invoke('store:set', data),
  exportDay: (dateStr) => ipcRenderer.invoke('export:day', dateStr),
  exportDiary: (dateStr) => ipcRenderer.invoke('export:diary', dateStr),
  exportLogs: () => ipcRenderer.invoke('export:logs'),
});
