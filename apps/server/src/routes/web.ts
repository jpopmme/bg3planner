import fastifyStatic from '@fastify/static';
import type { FastifyPluginAsync } from 'fastify';

export interface WebRoutesOptions {
  /** The web app's build output (apps/web/dist). */
  root: string;
}

/**
 * Serves the built web app next to the API. Hashed files under /assets never change, so browsers
 * may keep them for a year; everything else is revalidated so a new release shows up at once.
 * Any other GET that asks for HTML gets index.html, letting the client router handle the path.
 */
export const webRoutes: FastifyPluginAsync<WebRoutesOptions> = async (app, { root }) => {
  await app.register(fastifyStatic, {
    root,
    wildcard: false,
    // The web build ships .br and .gz copies of its text files (apps/web/build/precompress.ts).
    preCompressed: true,
    cacheControl: false,
    setHeaders(res, path) {
      res.header(
        'Cache-Control',
        /[\\/]assets[\\/]/.test(path) ? 'public, max-age=31536000, immutable' : 'no-cache',
      );
    },
  });

  app.setNotFoundHandler((request, reply) => {
    const wantsPage =
      request.method === 'GET' &&
      !request.url.startsWith('/api/') &&
      (request.headers.accept ?? '').includes('text/html');
    if (wantsPage) return reply.header('Cache-Control', 'no-cache').sendFile('index.html');
    return reply.code(404).send({ error: 'Not found' });
  });
};
