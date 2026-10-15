import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyServerOptions } from 'fastify';
import type { PartyStore } from './party-store';
import { healthRoutes } from './routes/health';
import { type ImportRoutesOptions, importRoutes } from './routes/import';
import { partyRoutes } from './routes/parties';
import { webRoutes } from './routes/web';

export interface AppOptions extends FastifyServerOptions {
  store: PartyStore;
  /** Overrides for the import route (tests use a fake guide fetcher). */
  importOptions?: Omit<ImportRoutesOptions, 'store'>;
  /** The built web app to serve alongside the API; without it, only the API is served. */
  webRoot?: string;
}

export function buildApp({ store, importOptions, webRoot, ...options }: AppOptions) {
  // A party with twelve level-12 characters is well under 100 KB.
  const app = Fastify({ bodyLimit: 256 * 1024, ...options });
  app.register(rateLimit, { max: 300, timeWindow: '1 minute' });
  app.register(healthRoutes, { prefix: '/api' });
  app.register(partyRoutes, { prefix: '/api', store });
  app.register(importRoutes, { prefix: '/api', store, ...importOptions });
  if (webRoot) app.register(webRoutes, { root: webRoot });
  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  });
  app.addHook('onClose', async () => store.close());
  return app;
}
