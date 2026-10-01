import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';

const PORT = Number(process.env.PORT) || 8000;
const ROOT = path.dirname(url.fileURLToPath(import.meta.url));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md':   'text/markdown; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  try {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/') reqPath = '/index.html';
    const fullPath = path.join(ROOT, reqPath);
    if (!fullPath.startsWith(ROOT)) { res.writeHead(403).end(); return; }

    let stat;
    try { stat = await fs.stat(fullPath); } catch { res.writeHead(404).end('Not found'); return; }
    const target = stat.isDirectory() ? path.join(fullPath, 'index.html') : fullPath;

    const data = await fs.readFile(target);
    const ext = path.extname(target).toLowerCase();
    res.writeHead(200, { 'content-type': MIME[ext] ?? 'application/octet-stream' });
    res.end(data);
  } catch (e) {
    res.writeHead(500).end(String(e));
  }
});

server.listen(PORT, () => {
  console.log(`\n  Dragon Tactics serving at http://localhost:${PORT}/\n  Ctrl+C to stop\n`);
});
