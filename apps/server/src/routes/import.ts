import { gameData } from '@bg3planner/gamedata';
import {
  GuideFormatError,
  IMPORTER_VERSION,
  importGamestegyGuide,
  isGamestegyGuideUrl,
} from '@bg3planner/importer';
import type { FastifyPluginAsync } from 'fastify';
import type { PartyStore } from '../party-store';

/** Guide pages are around 0.75 MB; anything far bigger is not one. */
export const MAX_GUIDE_BYTES = 3 * 1024 * 1024;
const CACHE_HOURS = 24;
const USER_AGENT = 'bg3planner/0.1 (+https://github.com/jpopmme/bg3planner)';

export class FetchError extends Error {}

/** Downloads a guide page, refusing redirects away from Gamestegy and oversized responses. */
export async function fetchGuide(url: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html' },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new FetchError('Gamestegy could not be reached.');
  }
  if (!res.ok) throw new FetchError(`Gamestegy answered HTTP ${res.status}.`);
  if (!isGamestegyGuideUrl(new URL(res.url || url))) {
    throw new FetchError('The guide link redirected somewhere else.');
  }
  if (Number(res.headers.get('content-length') ?? 0) > MAX_GUIDE_BYTES) {
    throw new FetchError('The page is too large to be a guide.');
  }
  const html = await res.text();
  if (html.length > MAX_GUIDE_BYTES) throw new FetchError('The page is too large to be a guide.');
  return html;
}

export interface ImportRoutesOptions {
  store: PartyStore;
  /** Replaceable in tests. */
  fetchGuide?: (url: string) => Promise<string>;
  now?: () => Date;
}

/**
 * Imports a build guide, from its URL (fetched here, once per day per guide) or from page HTML
 * the player pasted. Only the parsed result is cached, never the guide page.
 */
export const importRoutes: FastifyPluginAsync<ImportRoutesOptions> = async (
  app,
  { store, fetchGuide: fetchPage = fetchGuide, now = () => new Date() },
) => {
  app.post<{ Body: { url?: unknown; html?: unknown } }>(
    '/import',
    {
      bodyLimit: MAX_GUIDE_BYTES + 64 * 1024,
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const { url, html } = request.body ?? {};
      let guideUrl: URL | undefined;
      if (typeof url === 'string' && url.trim()) {
        try {
          guideUrl = new URL(url.trim());
        } catch {
          guideUrl = undefined;
        }
        if (!guideUrl || !isGamestegyGuideUrl(guideUrl)) {
          return reply.code(400).send({
            error:
              'Only Gamestegy Baldur’s Gate 3 build guides can be imported, with links like https://gamestegy.com/post/bg3/1604/eldritch-hexknight-build.',
          });
        }
      }

      try {
        if (typeof html === 'string' && html.trim()) {
          return importGamestegyGuide(html, gameData, {
            ...(guideUrl ? { url: guideUrl.href } : {}),
            now: now(),
          });
        }
        if (!guideUrl) {
          return reply
            .code(400)
            .send({ error: 'Give a guide link, or paste the guide page’s HTML.' });
        }

        const key = `${gameData.version}|${IMPORTER_VERSION}|${guideUrl.href}`;
        const fetchedAt = now();
        const cached = store.getCachedImport(
          key,
          new Date(fetchedAt.getTime() - CACHE_HOURS * 3600_000),
        );
        if (cached) return JSON.parse(cached);

        const page = await fetchPage(guideUrl.href);
        const result = importGamestegyGuide(page, gameData, { url: guideUrl.href, now: fetchedAt });
        store.putCachedImport(key, JSON.stringify(result), fetchedAt);
        return result;
      } catch (error) {
        if (error instanceof GuideFormatError) {
          return reply.code(422).send({ error: error.message });
        }
        if (error instanceof FetchError) {
          return reply.code(502).send({
            error: `${error.message} You can paste the guide page’s HTML instead.`,
          });
        }
        throw error;
      }
    },
  );
};
