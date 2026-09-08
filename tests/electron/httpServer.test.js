import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import url from 'node:url';
import { startServer } from '../../electron/http-server.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function requestRaw(host, port, rawPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host, port, path: rawPath, method: 'GET' }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function withServer(fn) {
  const instance = await startServer({ rootDir: PROJECT_ROOT, host: '127.0.0.1', port: 0 });
  try {
    await fn(instance);
  } finally {
    await instance.close();
  }
}

test('binds to 127.0.0.1 on an ephemeral port', async () => {
  await withServer(async ({ host, port, url: serverUrl }) => {
    assert.strictEqual(host, '127.0.0.1');
    assert.ok(Number.isInteger(port) && port > 0);
    assert.strictEqual(serverUrl, `http://127.0.0.1:${port}/`);
  });
});

test('serves index.html at / with html content-type', async () => {
  await withServer(async ({ host, port }) => {
    const res = await requestRaw(host, port, '/');
    assert.strictEqual(res.statusCode, 200);
    assert.match(res.headers['content-type'], /text\/html/);
    assert.match(res.body, /Dragon Tactics/);
  });
});

test('serves .ogg assets with audio/ogg content-type', async () => {
  await withServer(async ({ host, port }) => {
    const res = await requestRaw(host, port, '/assets/audio/generated/ui_click.ogg');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['content-type'], 'audio/ogg');
  });
});

test('rejects encoded path traversal outside the project root', async () => {
  await withServer(async ({ host, port }) => {
    const res = await requestRaw(host, port, '/%2e%2e/%2e%2e/%2e%2e/%2e%2e/windows/win.ini');
    assert.ok([400, 403, 404].includes(res.statusCode));
  });
});

test('rejects malformed percent-encoding without crashing the server', async () => {
  await withServer(async ({ host, port }) => {
    const res = await requestRaw(host, port, '/%zz');
    assert.strictEqual(res.statusCode, 400);
    const followUp = await requestRaw(host, port, '/');
    assert.strictEqual(followUp.statusCode, 200);
  });
});

test('close() shuts the server down cleanly', async () => {
  const instance = await startServer({ rootDir: PROJECT_ROOT, host: '127.0.0.1', port: 0 });
  await instance.close();
  await assert.rejects(() => requestRaw('127.0.0.1', instance.port, '/'));
});
