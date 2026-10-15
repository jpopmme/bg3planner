# BG3 Party Planner

Plan Baldur's Gate 3 builds for every member of your party, save them, and import builds from
guides. See [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) for the roadmap.

## Requirements

Node.js 22.12 or newer (`.nvmrc` pins the major version) and npm 10+.

## Getting started

```sh
npm install
npm run dev
```

`npm run dev` starts both apps:

- web: http://localhost:5173 (Vite; proxies `/api` to the server)
- API: http://127.0.0.1:3000 (try `/api/health`)

## Layout

| Path                 | What it is                                                     |
| -------------------- | -------------------------------------------------------------- |
| `apps/web`           | Vue 3 + Vite + Pinia + Vue Router front end                    |
| `apps/server`        | Fastify API (party storage, guide import)                      |
| `packages/shared`    | Types, schemas and the rules engine, used by web and server    |
| `packages/gamedata`  | Versioned BG3 dataset and the scripts that generate it         |
| `packages/importer`  | Build-guide parsers (Gamestegy first)                          |

Workspace packages export their TypeScript source directly. Vite and `tsx` compile them on the
fly, and the server's production build (`tsup`) bundles them.

## Scripts

| Command                | Does                                                        |
| ---------------------- | ----------------------------------------------------------- |
| `npm run dev`          | Run web and API with hot reload                             |
| `npm run build`        | Production builds (`apps/web/dist`, `apps/server/dist`)     |
| `npm test`             | All Vitest suites (`npm run test:watch` to watch)           |
| `npm run typecheck`    | `tsc` / `vue-tsc` in every workspace                        |
| `npm run lint`         | ESLint                                                      |
| `npm run format`       | Prettier (`format:check` to verify only)                    |
| `npm run check`        | lint + format check + typecheck + tests, as CI runs them    |

Run the built server with `npm start -w @bg3planner/server`. It reads `PORT`, `HOST` and
`LOG_LEVEL` from the environment. The web dev server reads `API_URL` to change its proxy target.
