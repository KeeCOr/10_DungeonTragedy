const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const pkg = require('../package.json');

// Steamworks SDK graceful fallback if running outside Steam.
const STEAM_APP_ID = 480;
let steam = null;
try {
  steam = require('steamworks.js');
  steam.init(STEAM_APP_ID);
  console.log('[Steam] Initialized, user:', steam.localplayer.getName());
} catch (error) {
  console.warn('[Steam] Not available; game runs without Steam features:', error.message);
}

ipcMain.on('steam:available', (event) => { event.returnValue = steam !== null; });
ipcMain.on('steam:getUserName', (event) => { event.returnValue = steam ? steam.localplayer.getName() : null; });
ipcMain.handle('achievement:unlock', async (_, id) => {
  if (!steam) return false;
  try {
    steam.achievement.activate(id);
    return true;
  } catch (error) {
    console.error('[Achievement] unlock:', error);
    return false;
  }
});
ipcMain.on('achievement:isUnlocked', (event, id) => {
  event.returnValue = steam ? steam.achievement.isActivated(id) : false;
});

let server;

async function createWindow() {
  const { startServer } = await import('./http-server.js');
  server = await startServer({ rootDir: path.join(__dirname, '..') });

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    title: `Dragon Tactics v${pkg.version}`,
    autoHideMenuBar: true,
  });

  await win.loadURL(server.url);
  win.webContents.on('before-input-event', (_, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') win.setFullScreen(!win.isFullScreen());
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (server) server.close();
  app.quit();
});
