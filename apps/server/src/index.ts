import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp } from './app';
import { PartyStore } from './party-store';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '127.0.0.1';
const databasePath = process.env.DATABASE_PATH ?? 'data/bg3planner.db';
// The web build sits next to the server's in the repository (apps/web/dist); Docker sets WEB_ROOT.
const webRoot = process.env.WEB_ROOT ?? fileURLToPath(new URL('../../web/dist', import.meta.url));

if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });

const app = buildApp({
  store: new PartyStore(databasePath),
  logger: { level: process.env.LOG_LEVEL ?? 'info' },
  ...(existsSync(webRoot) ? { webRoot } : {}),
});

try {
  await app.listen({ port, host });
  if (!existsSync(webRoot)) app.log.info(`No web build at ${webRoot}; serving the API only`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
