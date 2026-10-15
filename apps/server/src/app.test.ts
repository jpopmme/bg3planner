import { GAME_DATA_VERSION } from '@bg3planner/gamedata';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { PartyStore } from './party-store';

describe('GET /api/health', () => {
  const app = buildApp({ store: new PartyStore(':memory:') });
  afterAll(() => app.close());

  it('reports status and data version', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      status: 'ok',
      version: '0.0.0',
      gameDataVersion: GAME_DATA_VERSION,
    });
  });

  it('returns 404 for unknown routes', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nope' });
    expect(res.statusCode).toBe(404);
  });
});
