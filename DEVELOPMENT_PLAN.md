# BG3 Party Planner — Development Plan

A self-hosted clone of the [Gamestegy BG3 Build Planner](https://gamestegy.com/bg3/build-planner),
built with **Node.js + Vue 3**, extended to:

1. plan a build for **every member of a party** (not just one character),
2. **save** parties and builds (locally and on a server), and
3. **pre-load** a build from a Gamestegy build guide such as
   [Eldritch Hexknight](https://gamestegy.com/post/bg3/1604/eldritch-hexknight-build#starting-the-game).

---

## 1. What we found about the reference site

These findings shape the importer and the data layer.

| Topic | Finding | Consequence for us |
|---|---|---|
| Tech stack | Gamestegy is a **Nuxt 3 (Vue)** app. Its API lives at `https://backend.gamestegy.com/api`. | Vue is a natural fit; the UI patterns map well. |
| Builds and parties | The API has `/bg3-builds/:publicId` (12-char ids such as `AbC123_-xYz9`), `/bg3-builds/batch`, `/bg3-parties`, and `/bg3-parties/:id/checklist`. Unsaved builds go in `localStorage`. | Their planner already has a party mode. We copy the idea of "local-first, then server". |
| Game data | Classes, spells and items are **not** in the initial JS bundle. They load lazily from the backend. | We need **our own game dataset** (see §4). We should not depend on their private API. |
| Guide pages | Each post is server-rendered. The full article is embedded as JSON in `<script id="__NUXT_DATA__">`, which is a `devalue`-flattened Nuxt payload. `post.build_data` holds `{classes, tier, tags, overview}`, and `post.text` holds the article HTML (~270 KB). | The importer can parse **structured JSON + semantic HTML**, so we don't need to scrape the visible DOM. |
| Article markup | Headings are predictable: `h3 "Level N …"` and `h4 Class / Subclass / Fighting Style / Abilities / Cantrips / Spells / Replace Spell / Feat / Expanded`. Every game entity is tagged, for example `<span class="bg3-actions" data-bg3-id="5537" data-bg3-type="action"><span class="bg3-name">Shadow Blade</span>`. Types seen: `action`, `passive-feature`, `equipment`, `consumable`, `condition`, `mechanic`, `other-item`. | Entities can be pulled out reliably by **name + type**. Ids are Gamestegy's own, so we map them by name to our ids. |
| Ability table | Values are written like `16 (15+1)` and `17 (15+2)`. | Parse them into a base score plus a racial bonus. |
| Race section | A table of several recommended races, with the first row preferred. | Import the first as the selection and keep the rest as "alternatives". |
| Equipment | Sections are titled `Act 1`, `Act 2 - mid-game`, `Act 3 - Final Build setup`. | Our equipment model is **per act**. |
| Access | A plain bot fetch got **HTTP 403**. A browser-like `User-Agent` got 200. | Fetching is fragile. We need a **paste-HTML / upload-file fallback**, caching, and polite rate limits. |

> **Legal note.** Guide text and Gamestegy ids are Gamestegy's content. Icons and game data are
> Larian's. Import only the *structured choices* (race, class per level, feats, spell names, item names).
> Store the source URL as a link back, and never republish article text. Check Gamestegy's Terms before
> making the app public. For personal or private use this is low risk.

---

## 2. Goals and scope

### MVP (must have)
- Character creation: origin (Tav, Dark Urge, or an origin companion), race and subrace, background,
  27-point buy (8–15), floating +2/+1 racial bonus, skills, and expertise.
- A **level 1→12 timeline** with free multiclassing. Each level chooses a class and resolves that
  class level's choices: subclass, fighting style, feat or ASI, cantrips, spells known or prepared,
  spell replacement, invocations, metamagic, maneuvers, and so on.
- Derived stats: ability modifiers, proficiency bonus, HP, spell slots (including multiclass
  caster-level math, with warlock pact slots kept separate), and a features list.
- **Party**: a roster of characters with an active party of 4 and a party overview.
- **Persistence**: autosave to `localStorage`, server save (SQLite), JSON export/import, and share links.
- **Importer**: paste a Gamestegy build URL (or its HTML) → draft build → review screen → save.

### Later
- Equipment planner per act, with duplicate-item detection across the party.
- Tooltips with full spell and item descriptions, plus icons.
- Party analysis: skill coverage, damage types, healers and controllers, saving throws.
- User accounts. Sharing parties between devices without accounts already works through share links.
- Support for other guide sources (bg3.wiki, Reddit or Mobalytics-style builds) through the same importer interface.

### Not in scope
- Combat simulation and DPS calculators.
- Mod support.

---

## 3. Architecture

```
bg3planner/
├─ apps/
│  ├─ web/          Vue 3 + Vite + TypeScript + Pinia + Vue Router (SPA)
│  └─ server/       Node 20+ / Fastify + TypeScript + SQLite (Drizzle ORM)
├─ packages/
│  ├─ shared/       Types, Zod schemas, the rules engine (pure TS, used by web and server)
│  ├─ gamedata/     Versioned BG3 dataset (JSON) + build scripts that generate it
│  └─ importer/     Gamestegy parser (cheerio + devalue), used by the server
└─ npm workspaces · Vitest · Playwright · ESLint/Prettier · GitHub Actions
```

**Why a plain Vite SPA and not Nuxt:** the planner is an interactive client-side tool with no SEO
needs. A SPA plus a small Fastify API is simpler to build, test and host. Nuxt is still an option if
SSR is wanted later, because the components would carry over.

**Key libraries**
- Web: `vue@3`, `pinia` (+ `pinia-plugin-persistedstate`), `vue-router`, `@vueuse/core`,
  a UI kit (PrimeVue or Naive UI), and `lz-string` for share-link compression.
- Server: `fastify`, `@fastify/rate-limit`, `drizzle-orm` + `better-sqlite3`, `zod`.
- Importer: `undici` (fetch), `devalue` (`unflatten` for the Nuxt payload), `cheerio`, and
  `fuse.js` (fuzzy name matching).

**Rules engine (`packages/shared`)**
- A pure function `deriveCharacter(build, gameData) → DerivedCharacter`, with no Vue dependency,
  so it can be unit-tested heavily.
- `availableChoices(build, level, gameData)` returns what the UI must ask at each level.
- `validate(build, gameData) → Issue[]` reports problems such as over-spent point buy, a missing
  subclass, a duplicate feat or an over-level spell. It shows warnings and does not block edits.

---

## 4. Game data strategy (the biggest risk)

The planner is only as good as its dataset. Plan:

1. **Hand-curated core rules** (small and stable), written as typed JSON in `packages/gamedata`:
   classes and their 1–12 progression tables, subclasses, races and subraces, backgrounds, feats,
   fighting styles, invocations, metamagic, maneuvers, and the spell-slot tables.
2. **Generated catalogs** (large): spells/actions, passives, and equipment. The candidate sources are:
   - **bg3.wiki** (MediaWiki/Cargo API, CC BY-NC-SA, needs attribution). This is the easiest start.
   - **Game files extracted with LSLib / BG3 Modder's Multitool** (`Stats/Generated/Data/*.txt`,
     localization). This is the authoritative source, but needs more work.
   - Start with bg3.wiki. Keep the generator scripts in `packages/gamedata/scripts` so the data can be
     rebuilt after a game patch.
3. **Versioning:** each dataset carries a `gameVersion` (e.g. `patch-8`). Each saved build stores the
   dataset version it was made with, so migrations stay possible. Patch 8 added new subclasses, and
   more changes are likely.
4. **Stable ids:** use slugs such as `spell:shadow-blade` and `feat:great-weapon-master`, never row
   numbers. Keep an `aliases[]` per entity for importer matching (for example `Defence` ↔ `Defense`).
5. **Icons:** at first, show text with a class-colour badge. Icons can come later from extracted game
   assets for personal use. Do not hotlink Gamestegy's CDN.

---

## 5. Data model (stored as JSON, validated with Zod)

```ts
interface Party {
  id: string; name: string; schemaVersion: number;
  members: Character[];          // roster (any size)
  activeMemberIds: string[];     // max 4
  notes?: string; createdAt: string; updatedAt: string;
}

interface Character {
  id: string; name: string;
  origin: 'tav' | 'durge' | 'astarion' | 'gale' | 'karlach' | 'laezel' | 'shadowheart' | 'wyll'
        | 'halsin' | 'jaheira' | 'minsc' | 'minthara';   // locks race/background where the game does
  build: Build;
}

interface Build {
  gameDataVersion: string;
  raceId: string; subraceId?: string; backgroundId: string;
  abilities: { base: Record<Ability, number>; racialBonus: Partial<Record<Ability, 1 | 2>> };
  skills: string[]; expertise: string[];
  levels: LevelChoice[];         // index 0 = character level 1, up to 12
  equipment: Record<'act1' | 'act2' | 'act3', Partial<Record<EquipSlot, string>>>;
  alternatives?: { races?: string[]; notes?: string };
  source?: { kind: 'gamestegy' | 'manual'; url?: string; title?: string; importedAt?: string };
  notes?: string;
}

interface LevelChoice {
  classId: string;               // class taken at this character level
  subclassId?: string;
  feat?: { id: string; abilityIncrease?: Partial<Record<Ability, number>>; choices?: Record<string, string> };
  fightingStyle?: string;
  cantripsLearned?: string[];
  spellsLearned?: string[];
  spellReplaced?: { from: string; to: string };
  invocations?: string[]; metamagic?: string[]; maneuvers?: string[];
  otherChoices?: Record<string, string | string[]>;   // e.g. Draconic ancestry, Totem animal
  notes?: string;
}
```

**Server tables:** `parties(id, owner_token, data JSON, updated_at)`, `import_cache(url, fetched_at, html_hash, result JSON)`.
At first, ownership is an **edit token** created when a party is first saved. It is stored in localStorage and sent as a header,
so editing needs no accounts. The read-only share URL is `/p/:id`.

---

## 6. UI outline

- **Party screen:** cards for every roster member (name, class split such as `11 Fighter / 1 Warlock`,
  race, key stats), drag them into 4 "active" slots, and buttons to add, duplicate, import or delete.
- **Character planner** (mirrors Gamestegy's layout):
  - *Left:* character summary — abilities, AC/HP, proficiency, spell slots, features list.
  - *Center:* tabs **Creation** (origin, race, background, point buy, skills) → **Levels** (a 12-row timeline;
    each row shows its class and pending choices, with ⚠ markers for unresolved ones) → **Equipment** (per act) → **Notes**.
  - *Right:* a details panel for the selected spell, feat or item.
- **Import dialog:** a URL field and a "paste HTML" fallback. A review screen then shows the parsed build
  and highlights entries that could not be matched, so the user can fix them with an autocomplete before saving.
- **Save state indicator:** "Saved locally" / "Synced" / "Offline", plus Export JSON and Copy share link.

---

## 7. Gamestegy importer design (`packages/importer`)

```
URL ─▶ fetch (server-side, browser UA, 1 req/s, 24h cache)  ─┐
HTML (pasted / uploaded) ────────────────────────────────────┤
                                                             ▼
        extract <script id="__NUXT_DATA__"> → devalue.unflatten → find object with `build_data`
                                                             ▼
        post.build_data → classes, overview, tags, tier
        post.text (HTML) → cheerio
          ├─ "Starting the Game" → race table (row 1 = pick, others = alternatives), Background
          ├─ "Abilities" table   → "16 (15+1)" ⇒ base 15, racial +1
          ├─ "Skills and Expertise" list
          ├─ each h3 /^Level (\d+)(?: - (\w+) Lv (\d+))?/
          │     h4 Class      → class name (multiclass detection from "Warlock Lv 1")
          │     h4 Subclass   → subclass
          │     h4 Fighting Style / Feat / Cantrips / Spells / Replace Spell / Expanded
          │         → entity spans [data-bg3-type][data-bg3-id] + .bg3-name text
          └─ "Equipment Recommendations" → h3 Act 1 / Act 2 / Act 3 → equipment entities
                                                             ▼
        name → our id matcher (exact → aliases → fuzzy, scoped by type)
                                                             ▼
        ImportResult { build: Build (draft), unresolved: [...], warnings: [...] }
```

- **Class tracking:** a level header without a class tag continues the current class
  (`Level 2` while Fighter means Fighter 2). Headers such as `Level 9 - Warlock Lv 1` switch class.
- **Robustness:** every section parser is optional. A missing section produces a warning and does
  not fail the import. Unmatched entities go into `unresolved` for manual fixing.
- **Tests:** a local snapshot of the Hexknight page plus 4–5 other guides covering different
  shapes (single class, triple multiclass, caster, monk, a guide with "Respec at level X"). Keep these
  fixtures out of the public repo, or reduce them to the extracted JSON.
- **Pluggable:** an `Importer` interface `{ canHandle(url), import(html|url) }`, so other sources can be added later.

---

## 8. Milestones

Estimates assume one developer working part-time.

| # | Milestone | Deliverables | Done when |
|---|---|---|---|
| **M0** | Project setup (2–3 days) | npm workspaces, Vite+Vue+TS app, Fastify app, shared package, ESLint/Prettier, Vitest, CI on GitHub Actions | `npm run dev` starts web and API, and CI is green |
| **M1** | Game data v1 (1–2 weeks) | Curated classes (all 12 + all subclasses), races, backgrounds, feats, spell-slot tables, and a spell catalog generated from bg3.wiki. Zod-validated with a `gameVersion` | The data tests pass: every class has 12 levels, every referenced id exists, and the slot tables match the game |
| **M2** | Rules engine (1 week) | `deriveCharacter`, `availableChoices`, `validate`; point buy; multiclass slot math | More than 90% unit-test coverage on `shared`, and known builds (e.g. 11 EK / 1 Hexblade) give the correct slots and features |
| **M3** | Single-character planner UI (2 weeks) | Creation tab, level timeline with per-level choice pickers, summary panel, validation markers | You can fully build the Hexknight by hand and every choice resolves |
| **M4** | Persistence (1 week) | Pinia + localStorage autosave, `/api/parties` CRUD with edit tokens, JSON export/import, compressed share URL, schema migrations | Reloading or switching devices restores the party, and an old schema version migrates |
| **M5** | Party planner (1 week) | Roster, 4 active slots, origin-companion presets (locked race/background), party overview (skills, saves, roles) | A 4-member party can be created, saved and shared |
| **M6** | Gamestegy importer (1–2 weeks) | `packages/importer`, `/api/import` endpoint with cache and rate limit, paste-HTML fallback, review/fix UI | The Hexknight URL imports to a build with the correct race, background, abilities, 12 levels, feats and spells, and anything unmatched is listed for review |
| **M7** | Equipment planner (1–2 weeks) | Item catalog, slot filtering, per-act loadouts, duplicate-unique-item warnings across the party, importer fills equipment | Hexknight's Act 1–3 gear imports, and a duplicated unique item raises a warning |
| **M8** | Polish (ongoing) | Tooltips/details panel, icons, dark theme, responsive layout, PWA/offline, Playwright E2E, Docker image | Lighthouse ≥ 90, and E2E covers create → import → save → share |

The critical path is **M1 → M2 → M3**. M4 and M5 can overlap with M3. M6 needs M1's name/alias data.

---

## 9. Testing strategy

- **Unit (Vitest):** rules engine (point buy, modifiers, slot tables, multiclass), Zod schemas,
  importer section parsers, name matcher.
- **Golden builds:** a few well-known builds written as JSON with their expected derived output (slots, feats, features).
- **Importer fixtures:** saved guide HTML → expected `ImportResult` snapshot.
- **E2E (Playwright):** create a party → add a character → import a guide → edit → reload → still saved.
- **CI:** lint, typecheck, unit tests on every push. E2E runs on the main branch.

---

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Game data is incomplete or wrong | Start with curated core rules, add data tests, rebuild from the source with scripts, and use a `gameVersion` tag |
| Gamestegy blocks fetching or changes its markup | Paste/upload HTML fallback, tolerant per-section parsers, fixtures that catch regressions, and caching |
| Copyright / ToS | Import structured choices only, link back to the source, keep fixtures private, check the ToS before a public launch |
| Game patches change the rules | Versioned dataset, `gameDataVersion` stored on each build, migration hooks |
| Scope creep (tooltips, icons, sims) | Strict MVP (M0–M6), with the rest kept behind the milestone order |

---

## 11. Open questions

1. **Hosting:** a local-only personal tool (runs on your PC), or deployed online so you can open it from a phone or share it with friends?
2. **Accounts:** are edit tokens and share links enough, or do you want real logins (e.g. Google/Discord)?
3. **Game version:** target the current patch only (Patch 8 subclasses included)?
4. **Equipment:** is it part of the MVP, or can it wait until after the importer?
5. **Other guide sources** to support besides Gamestegy?

---

## 12. Immediate next steps

1. Answer the open questions above.
2. M0: scaffold the monorepo (`apps/web`, `apps/server`, `packages/shared`, `packages/gamedata`, `packages/importer`).
3. Spike (half a day): make the importer extract the Hexknight `__NUXT_DATA__` and print the level
   table, to confirm that approach early.
4. Start M1 with the Fighter, Warlock and their subclasses, so the Hexknight build works end-to-end first.
