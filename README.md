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
| `packages/shared`    | Small helpers and types used everywhere (abilities, skills)    |
| `packages/gamedata`  | Versioned BG3 dataset and the scripts that generate it         |
| `packages/rules`     | Rules engine: build model, character sheet, choices, validation |
| `packages/importer`  | Build-guide parsers (Gamestegy first)                          |

Workspace packages export their TypeScript source directly. Vite and `tsx` compile them on the
fly, and the server's production build (`tsup`) bundles them.

## Scripts

| Command                | Does                                                        |
| ---------------------- | ----------------------------------------------------------- |
| `npm run dev`          | Run web and API with hot reload                             |
| `npm run build`        | Production builds (`apps/web/dist`, `apps/server/dist`)     |
| `npm test`             | All Vitest suites (`npm run test:watch` to watch)           |
| `npm run coverage`     | Tests with a coverage report                                |
| `npm run typecheck`    | `tsc` / `vue-tsc` in every workspace                        |
| `npm run lint`         | ESLint                                                      |
| `npm run format`       | Prettier (`format:check` to verify only)                    |
| `npm run check`        | lint + format check + typecheck + tests, as CI runs them    |

Run the built server with `npm start -w @bg3planner/server`. It reads `PORT`, `HOST`,
`LOG_LEVEL` and `DATABASE_PATH` (default `data/bg3planner.db`, created if missing; `:memory:` for
a throwaway database) from the environment. The web dev server reads `API_URL` to change its proxy
target.

## Parties

The home page is your party: up to 12 characters, four of them in the active party and the rest
at camp. **Add a character** creates a custom character, The Dark Urge, or one of the origin
characters and companions, whose race, subrace and background are fixed as in the game (their
class is free, as after a respec). Each origin can be in the roster once. **Who rolls best**
compares the active party's skill and saving throw bonuses and lists who lacks darkvision.

## Saving and sharing

The planner saves the party in the browser on every change, so a reload never loses work.
**Share** puts a copy online and gives three links:

- **View link** `/p/<id>`: opens the party read-only; viewers can keep a copy of their own.
- **Edit link** `/p/<id>#edit=<token>`: makes the party editable on another device. Both devices
  then save online a moment after each change; if both changed it, the planner asks which version
  to keep.
- **Snapshot link** `/s#<data>`: the whole party compressed into the URL. Works without the
  server and never changes.

**Export file** / **Import file** save and load a `.bg3party.json` file.

Saved parties carry a `schemaVersion`. Older formats are upgraded when they are read (in the
browser, on import and on the server); see `migrateParty` in `packages/rules/src/party.ts`.

### API

| Method and path          | Auth                    | Does                                                   |
| ------------------------ | ----------------------- | ------------------------------------------------------ |
| `POST /api/parties`      | none                    | Stores a party; returns `id`, `editToken`, `revision`  |
| `GET /api/parties/:id`   | none                    | Returns `party`, `revision`, `updatedAt`               |
| `PUT /api/parties/:id`   | `Bearer <editToken>`    | Body `{ party, revision }`; 409 with `current` if the stored revision moved on |
| `DELETE /api/parties/:id`| `Bearer <editToken>`    | Deletes the online copy                                |

The server keeps only a SHA-256 hash of each edit token.
