import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
};

export async function startServer({ rootDir, host = '127.0.0.1', port = 0 }) {
  const root = path.resolve(rootDir);
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url || '/', `http://${host}`).pathname;
      const decoded = decodeURIComponent(pathname);
      const requested = decoded === '/' ? 'index.html' : decoded.replace(/^[/\\]+/, '');
      const target = path.resolve(root, requested);
      if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
        res.writeHead(403).end();
        return;
      }
      const stat = await fs.stat(target);
      const file = stat.isDirectory() ? path.join(target, 'index.html') : target;
      const body = await fs.readFile(file);
      res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      res.end(body);
    } catch (error) {
      if (error instanceof URIError) res.writeHead(400).end('Bad request');
      else if (error && error.code === 'ENOENT') res.writeHead(404).end('Not found');
      else res.writeHead(500).end('Server error');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;
  return {
    host,
    port: actualPort,
    url: `http://${host}:${actualPort}/`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  };
}
