import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildApp } from './app';
import { PartyStore } from './party-store';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '127.0.0.1';
const databasePath = process.env.DATABASE_PATH ?? 'data/bg3planner.db';

if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });

const app = buildApp({
  store: new PartyStore(databasePath),
  logger: { level: process.env.LOG_LEVEL ?? 'info' },
});

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
