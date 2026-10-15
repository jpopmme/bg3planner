import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyServerOptions } from 'fastify';
import type { PartyStore } from './party-store';
import { healthRoutes } from './routes/health';
import { partyRoutes } from './routes/parties';

export interface AppOptions extends FastifyServerOptions {
  store: PartyStore;
}

export function buildApp({ store, ...options }: AppOptions) {
  // A party with twelve level-12 characters is well under 100 KB.
  const app = Fastify({ bodyLimit: 256 * 1024, ...options });
  app.register(rateLimit, { max: 300, timeWindow: '1 minute' });
  app.register(healthRoutes, { prefix: '/api' });
  app.register(partyRoutes, { prefix: '/api', store });
  app.addHook('onClose', async () => store.close());
  return app;
}
