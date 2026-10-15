# BG3 Party Planner

Plan Baldur's Gate 3 builds for every member of your party, save them, and import builds from
guides. See [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) for the roadmap.

## Requirements

Node.js 22.12 or newer (`.nvmrc` pins the major version) and npm 10+. `package-lock.json` is
written by npm 11: npm 10 installs from it fine, but use `npx npm@11 install …` when adding
packages, or npm 10 rewrites many unrelated lines.

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
| `npm run test:e2e`     | Playwright end-to-end tests against a production build      |

Run the built server with `npm start -w @bg3planner/server`. It serves the API and the built web
app (`apps/web/dist`, or `WEB_ROOT`), and reads `PORT`, `HOST`, `LOG_LEVEL` and `DATABASE_PATH`
(default `data/bg3planner.db`, created if missing; `:memory:` for a throwaway database) from the
environment. The server build is one self-contained bundle: it needs no `node_modules`. The web dev
server reads `API_URL` to change its proxy target.

`npm run test:e2e` builds both apps, starts the server on port 4321 with an in-memory database and
runs `e2e/tests` (create a party → import a guide → reload → share; offline use; phone layout).
Install the browser once with `npx playwright install chromium`, or point
`PLAYWRIGHT_CHROMIUM_PATH` at a Chromium you already have.

## Docker

```sh
docker build -t bg3planner .
docker run -p 3000:3000 -v bg3planner-data:/data bg3planner
```

The image runs the server as an unprivileged user, serves the web app on port 3000 and keeps
parties in SQLite under `/data` (mount a volume to keep them). It has a health check on
`/api/health`. CI builds the image and smoke-tests it.

## Offline and installing

After the first visit the planner works offline: a service worker (generated at build time by
`apps/web/build/service-worker.ts`) keeps the app's files, and parties live in the browser anyway.
Saving or sharing online and importing from a link need the server. Browsers offer to install the
planner as an app (it has a web manifest and icons). Hashed files are cached for a year and sent
precompressed (Brotli or gzip); the page itself is always revalidated, so new releases show up on
the next load.

## Using the planner

Names in the sheet, the level rows and the equipment tab are underlined with dots: click one (or
the **i** beside a picker option) for what it does, from bg3.wiki, with a link to its wiki page.
The card closes with Escape or a click elsewhere; on phones it rises from the bottom. The footer
picks a light or dark theme, or follows the system's.

## Classes

All twelve classes and their subclasses through Patch 8 are in the planner, levels 1–12 with
multiclassing. Each level row asks for that level's choices: subclass, spells and cantrips, feats,
fighting styles, invocations, metamagic, manoeuvres, Favoured Enemy and Natural Explorer, Circle of
the Land spells, expertise and more. Domain, Oath and Circle spells show as always prepared.
Clerics, Druids and Paladins prepare spells from their whole list and Wizards from their spellbook,
so the sheet shows how many they prepare a day rather than a fixed list. The class data lives in
`packages/gamedata/src/data/classes/`, one file per class, written from bg3.wiki.

## Parties

The home page is your party: up to 12 characters, four of them in the active party and the rest
at camp. **Add a character** creates a custom character, The Dark Urge, or one of the origin
characters and companions, whose race, subrace and background are fixed as in the game (their
class is free, as after a respec). Each origin can be in the roster once. **Who rolls best**
compares the active party's skill and saving throw bonuses and lists who lacks darkvision.

## Equipment

Each character's **Equipment** tab plans gear per act (Act 1, 2 and 3), slot by slot: head, cloak,
armour, gloves, boots, amulet, two rings, and melee and ranged weapons for both hands. Search the
item catalogue by name or effect. The planner checks that each item fits its slot, that
two-handed weapons leave the off hand free, that dual-wielding uses light weapons or the Dual
Wielder feat, and warns about armour, shields or weapons the character is not proficient with.
The character sheet shows the chosen act with its gear on: Armour Class (with a breakdown), plus
ability scores, hit points, saving throws and skills where an item's effect can be read.

Most magic items exist once in the game. When two characters in the active party plan the same
one in the same act, both the slot and the party page warn about it.

The catalogue (935 items) is generated from bg3.wiki by
`npm run generate:items -w @bg3planner/gamedata`, and the descriptions of spells, features, feats
and options by `npm run generate:descriptions -w @bg3planner/gamedata`; see
`packages/gamedata/ATTRIBUTION.md`. Descriptions load only when a details card first opens.

## Importing build guides

**Import from a guide** (party page) turns a Gamestegy BG3 build guide into a character. Give the
guide's link, or, if the server cannot fetch it, paste the page's source. The importer reads the
guide's *Leveling Overview* table plus its race, background and ability tables, and places every
pick with the rules engine, so only legal choices are imported. Its *Equipment Recommendations*
fill each act's gear: the first item per slot that the rules allow, from the first setup, keeping
the previous act's item where an act lists nothing new. Guides that respec into a different first level
("Fighter 1 (respec as first level)") are imported as the respecced build. A review screen shows
what the guide leaves to you ("any spell", a spell to replace, alternative feats and items); those notes stay with the
character next to their levels and acts.

Only the parsed choices and short notes are stored, with a link back to the guide; guide text is
never kept. The server fetches a guide at most once a day (identifying itself as `bg3planner`).
Real guide pages used for testing go in `packages/importer/fixtures/private/` (git-ignored); CI
tests run on synthetic pages built in `src/test/guide-page.ts`.

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
| `POST /api/import`       | none (20/min)           | Body `{ url }` (Gamestegy guide link) or `{ html }`; returns the draft build and notes |

The server keeps only a SHA-256 hash of each edit token.
