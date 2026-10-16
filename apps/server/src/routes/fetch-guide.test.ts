import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_GUIDE_BYTES, fetchEmbeddedBuild, fetchGuide } from './import';

const URL_OK = 'https://gamestegy.com/post/bg3/1/x';
const respond = (
  overrides: Partial<{ ok: boolean; status: number; url: string; length: string; body: string }>,
) =>
  vi.fn(async () => ({
    ok: overrides.ok ?? true,
    status: overrides.status ?? 200,
    url: overrides.url ?? URL_OK,
    headers: new Headers(overrides.length ? { 'content-length': overrides.length } : {}),
    text: async () => overrides.body ?? '<html></html>',
  }));

afterEach(() => vi.unstubAllGlobals());

describe('fetchGuide', () => {
  it('returns the page and says who is asking', async () => {
    const fetchMock = respond({ body: 'page' });
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchGuide(URL_OK)).toBe('page');
    const init = (fetchMock.mock.calls[0] as unknown[])[1] as { headers: Record<string, string> };
    expect(init.headers['user-agent']).toMatch(/^bg3planner\//);
  });

  it('refuses error statuses, redirects elsewhere and oversized pages', async () => {
    vi.stubGlobal('fetch', respond({ ok: false, status: 404 }));
    await expect(fetchGuide(URL_OK)).rejects.toThrow('Gamestegy answered HTTP 404.');
    vi.stubGlobal('fetch', respond({ url: 'https://evil.example/post/bg3/1/x' }));
    await expect(fetchGuide(URL_OK)).rejects.toThrow('redirected somewhere else');
    vi.stubGlobal('fetch', respond({ length: String(MAX_GUIDE_BYTES + 1) }));
    await expect(fetchGuide(URL_OK)).rejects.toThrow('too large');
    vi.stubGlobal('fetch', respond({ body: 'x'.repeat(MAX_GUIDE_BYTES + 1) }));
    await expect(fetchGuide(URL_OK)).rejects.toThrow('too large');
  });

  it('reports network failures plainly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('getaddrinfo ENOTFOUND'))),
    );
    await expect(fetchGuide(URL_OK)).rejects.toThrow('Gamestegy could not be reached.');
  });
});

describe('fetchEmbeddedBuild', () => {
  const BUILD_URL = 'https://backend.gamestegy.com/api/bg3-builds/post/42';

  it('returns the build data', async () => {
    vi.stubGlobal('fetch', respond({ body: '{"id":7}' }));
    expect(await fetchEmbeddedBuild(BUILD_URL)).toEqual({ id: 7 });
  });

  it('only requests Gamestegy build data', async () => {
    const fetchMock = respond({ body: '{}' });
    vi.stubGlobal('fetch', fetchMock);
    for (const url of [
      'https://evil.example/api/bg3-builds/post/42',
      'http://backend.gamestegy.com/api/bg3-builds/post/42',
      'https://backend.gamestegy.com/api/users/me',
    ]) {
      await expect(fetchEmbeddedBuild(url)).rejects.toThrow('Not a Gamestegy build address.');
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses errors, oversized and unreadable answers', async () => {
    vi.stubGlobal('fetch', respond({ ok: false, status: 500 }));
    await expect(fetchEmbeddedBuild(BUILD_URL)).rejects.toThrow('HTTP 500');
    vi.stubGlobal('fetch', respond({ body: 'x'.repeat(1024 * 1024 + 1) }));
    await expect(fetchEmbeddedBuild(BUILD_URL)).rejects.toThrow('too large');
    vi.stubGlobal('fetch', respond({ body: '<html>' }));
    await expect(fetchEmbeddedBuild(BUILD_URL)).rejects.toThrow('could not be read');
  });
});
