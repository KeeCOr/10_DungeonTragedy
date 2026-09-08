import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import url from 'node:url';
import { startServer } from './http-server.js';

let server;
async function createWindow() {
  server = await startServer({ rootDir: path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..') });
  const win = new BrowserWindow({ width: 1440, height: 900, minWidth: 1024, minHeight: 680, webPreferences: { contextIsolation: true, nodeIntegration: false } });
  await win.loadURL(server.url);
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', async () => { if (server) await server.close(); });
