const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const storage = require('./storage');
const reminders = require('./reminders');
const { exportDay, exportDiary } = require('./export');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1000,
    minHeight: 660,
    title: '个人体系',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', '..', 'dist', 'renderer', 'index.html'));
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  storage.init();

  ipcMain.handle('store:get', () => storage.get());
  ipcMain.handle('store:set', (_e, data) => {
    storage.set(data);
    return true;
  });
  ipcMain.handle('export:day', (_e, dateStr) => exportDay(mainWindow, storage.get(), dateStr));
  ipcMain.handle('export:diary', (_e, dateStr) => exportDiary(mainWindow, storage.get(), dateStr));

  createWindow();
  reminders.setup();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
