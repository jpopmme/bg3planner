import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import { PartyStore } from '../party-store';

const root = mkdtempSync(join(tmpdir(), 'bg3planner-web-'));
mkdirSync(join(root, 'assets'));
writeFileSync(join(root, 'index.html'), '<!doctype html><title>Planner</title>');
writeFileSync(join(root, 'assets', 'index-abc123.js'), 'console.log(1)');
writeFileSync(join(root, 'sw.js'), 'self.addEventListener("fetch", () => {})');
// A precompressed copy, as the web build writes them.
writeFileSync(join(root, 'assets', 'index-abc123.js.gz'), gzipSync('console.log(1)'));

describe('serving the web app', () => {
  const app = buildApp({ store: new PartyStore(':memory:'), webRoot: root });
  afterAll(async () => {
    await app.close();
    rmSync(root, { recursive: true });
  });
  const html = { accept: 'text/html,application/xhtml+xml' };

  it('serves the page and lets the client router handle its paths', async () => {
    for (const url of ['/', '/c/abc', '/p/xyz/c/abc']) {
      const res = await app.inject({ method: 'GET', url, headers: html });
      expect(res.statusCode, url).toBe(200);
      expect(res.body).toContain('<title>Planner</title>');
      expect(res.headers['cache-control']).toBe('no-cache');
    }
  });

  it('caches hashed assets for a year and revalidates the rest', async () => {
    const asset = await app.inject({ method: 'GET', url: '/assets/index-abc123.js' });
    expect(asset.statusCode).toBe(200);
    expect(asset.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(asset.headers['x-content-type-options']).toBe('nosniff');
    const worker = await app.inject({ method: 'GET', url: '/sw.js' });
    expect(worker.headers['cache-control']).toBe('no-cache');
  });

  it('sends the precompressed copy to browsers that accept it', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/assets/index-abc123.js',
      headers: { 'accept-encoding': 'gzip' },
    });
    expect(res.headers['content-encoding']).toBe('gzip');
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  it('keeps 404s for the API and for missing files', async () => {
    const api = await app.inject({ method: 'GET', url: '/api/nope', headers: html });
    expect(api.statusCode).toBe(404);
    expect(api.json()).toEqual({ error: 'Not found' });
    const file = await app.inject({ method: 'GET', url: '/assets/missing.js' });
    expect(file.statusCode).toBe(404);
  });
});
