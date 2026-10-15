import { describe, expect, it } from 'vitest';
import { precacheList, workerSource } from './service-worker';

describe('precacheList', () => {
  it('caches the page, built files and public files, skipping maps and .woff fonts', () => {
    expect(
      precacheList([
        'index.html',
        'assets/index-abc.js',
        'assets/index-abc.js.map',
        'assets/font-1.woff2',
        'assets/font-1.woff',
      ]),
    ).toEqual([
      '/',
      '/assets/font-1.woff2',
      '/assets/index-abc.js',
      '/favicon.svg',
      '/icons/apple-touch-icon.png',
      '/icons/icon-192.png',
      '/icons/icon-512.png',
      '/manifest.webmanifest',
    ]);
  });
});

describe('workerSource', () => {
  it('names its cache after the files, so a new build replaces the old cache', () => {
    const a = workerSource(['/', '/assets/a.js']);
    const b = workerSource(['/', '/assets/b.js']);
    const cache = (source: string) => /const CACHE = '([^']+)'/.exec(source)?.[1];
    expect(cache(a)).toMatch(/^bg3planner-[0-9a-f]{12}$/);
    expect(cache(a)).not.toBe(cache(b));
    expect(a).toContain('const PRECACHE = ["/","/assets/a.js"];');
  });

  it('is valid JavaScript that leaves the API alone', () => {
    const source = workerSource(['/']);
    expect(() => new Function(source)).not.toThrow();
    expect(source).toContain("url.pathname.startsWith('/api/')");
  });
});
