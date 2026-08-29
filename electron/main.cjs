const { app, BrowserWindow } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Steamworks SDK — graceful fallback if running outside Steam
// TODO: Replace APP_ID (480 = Spacewar test app) with actual Steam App ID before release
const STEAM_APP_ID = 480;
let steam = null;
try {
  steam = require('steamworks.js');
  steam.init(STEAM_APP_ID);
  console.log('[Steam] Initialized, user:', steam.localplayer.getName());
} catch (e) {
  console.warn('[Steam] Not available — game runs without Steam features:', e.message);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
};

let server;

function startGameServer(root) {
  server = http.createServer((req, res) => {
    try {
      let reqPath = decodeURIComponent(req.url.split('?')[0]);
      if (reqPath === '/') reqPath = '/index.html';
      const fullPath = path.join(root, reqPath);
      if (!fullPath.startsWith(root)) { res.writeHead(403).end(); return; }

      if (!fs.existsSync(fullPath)) { res.writeHead(404).end('Not found'); return; }
      const stat = fs.statSync(fullPath);
      const target = stat.isDirectory() ? path.join(fullPath, 'index.html') : fullPath;

      const data = fs.readFileSync(target);
      const ext = path.extname(target).toLowerCase();
      res.writeHead(200, { 'content-type': MIME[ext] ?? 'application/octet-stream' });
      res.end(data);
    } catch (e) {
      res.writeHead(500).end(String(e));
    }
  });

  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

async function createWindow() {
  const root = path.join(__dirname, '..');
  const port = await startGameServer(root);

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Dragon Tactics',
    autoHideMenuBar: true,
  });

  win.loadURL(`http://127.0.0.1:${port}/`);

  // F11 — fullscreen toggle
  win.webContents.on('before-input-event', (_, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      win.setFullScreen(!win.isFullScreen());
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (server) server.close();
  app.quit();
});
