import { GAME_DATA_VERSION } from '@bg3planner/gamedata';
import type { HealthResponse } from '@bg3planner/shared';
import type { FastifyPluginAsync } from 'fastify';
import pkg from '../../package.json' with { type: 'json' };

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async (): Promise<HealthResponse> => ({
    status: 'ok',
    version: pkg.version,
    gameDataVersion: GAME_DATA_VERSION,
  }));
};
