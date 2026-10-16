import { gameData } from '@bg3planner/gamedata';
import {
  GuideFormatError,
  IMPORTER_VERSION,
  embeddedBuildUrl,
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

/** Build panel data is a few dozen KB. */
const MAX_BUILD_BYTES = 1024 * 1024;

/**
 * Downloads the data behind a guide's build panels from Gamestegy's API. Only that API's build
 * endpoint is ever requested (the URL comes from `embeddedBuildUrl`, built from the post id).
 */
export async function fetchEmbeddedBuild(url: string): Promise<unknown> {
  const target = new URL(url);
  if (
    target.protocol !== 'https:' ||
    target.hostname !== 'backend.gamestegy.com' ||
    !/^\/api\/bg3-builds\/post\/\d+$/.test(target.pathname)
  ) {
    throw new FetchError('Not a Gamestegy build address.');
  }
  let res: Response;
  try {
    res = await fetch(target, {
      headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new FetchError('Gamestegy’s build data could not be reached.');
  }
  if (!res.ok) throw new FetchError(`Gamestegy answered HTTP ${res.status}.`);
  const body = await res.text();
  if (body.length > MAX_BUILD_BYTES) throw new FetchError('The build data is too large.');
  try {
    return JSON.parse(body);
  } catch {
    throw new FetchError('The build data could not be read.');
  }
}

export interface ImportRoutesOptions {
  store: PartyStore;
  /** Replaceable in tests. */
  fetchGuide?: (url: string) => Promise<string>;
  /** Replaceable in tests. */
  fetchBuild?: (url: string) => Promise<unknown>;
  now?: () => Date;
}

/**
 * Imports a build guide, from its URL (fetched here, once per day per guide) or from page HTML
 * the player pasted. Only the parsed result is cached, never the guide page.
 */
export const importRoutes: FastifyPluginAsync<ImportRoutesOptions> = async (
  app,
  {
    store,
    fetchGuide: fetchPage = fetchGuide,
    fetchBuild = fetchEmbeddedBuild,
    now = () => new Date(),
  },
) => {
  /** The guide's build panel data, or none if it has no panels or they cannot be loaded. */
  const panelData = async (page: string): Promise<unknown[]> => {
    const url = embeddedBuildUrl(page);
    if (!url) return [];
    try {
      return [await fetchBuild(url)];
    } catch (error) {
      app.log.warn({ err: error, url }, 'build panel data not loaded');
      return [];
    }
  };

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
            builds: await panelData(html),
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
        const result = importGamestegyGuide(page, gameData, {
          url: guideUrl.href,
          now: fetchedAt,
          builds: await panelData(page),
        });
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
