import {
  buildPanel,
  entity,
  guidePage,
  overviewTable,
  simpleTable,
} from '@bg3planner/importer/test-helpers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../app';
import { PartyStore } from '../party-store';
import { FetchError } from './import';

const GUIDE_URL = 'https://gamestegy.com/post/bg3/1586/hexblade-warlock-build';
const page = guidePage(
  simpleTable('Races', ['Half-Orc']) +
    simpleTable('Background', ['Soldier']) +
    overviewTable([
      {
        level: 1,
        className: 'Warlock 1',
        lines: ['Subclass: The Hexblade', `Cantrips: ${entity('Eldritch Blast')}, Friends`],
      },
    ]),
  'Hexblade Warlock - Test Build',
);

/** A guide whose Act 1 gear is only in a Gamestegy build panel. */
const panelPage = guidePage(
  overviewTable([{ level: 1, className: 'Fighter 1', lines: [] }]) +
    '<h2>Equipment Recommendations</h2><h3>Act 1</h3>' +
    buildPanel(7, 'Act 1'),
  'Panel Fighter - Test Build',
  42,
);
const panelBuild = {
  id: 7,
  equipment: { sets: [{ name: 'Act 1', equipment: { helmet: [{ itemId: 1 }] } }] },
  equipmentItems: [{ id: 1, display_name: 'Helmet of Grit' }],
};

let fetchGuide: ReturnType<typeof vi.fn<(url: string) => Promise<string>>>;
let fetchBuild: ReturnType<typeof vi.fn<(url: string) => Promise<unknown>>>;
let now: Date;
let app: ReturnType<typeof buildApp>;

beforeEach(() => {
  fetchGuide = vi.fn(async () => page);
  fetchBuild = vi.fn(async () => panelBuild);
  now = new Date('2026-10-15T12:00:00Z');
  app = buildApp({
    store: new PartyStore(':memory:'),
    importOptions: { fetchGuide, fetchBuild, now: () => now },
  });
});
afterEach(() => app.close());

const post = (payload: object) => app.inject({ method: 'POST', url: '/api/import', payload });

describe('POST /api/import', () => {
  it('imports a guide from its link', async () => {
    const res = await post({ url: GUIDE_URL });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe('Hexblade Warlock');
    expect(body.build).toMatchObject({ raceId: 'half-orc', backgroundId: 'soldier' });
    expect(body.build.levels[0].answers['class:0']).toEqual(['the-hexblade']);
    expect(body.build.source).toMatchObject({ url: GUIDE_URL, importedAt: now.toISOString() });
    expect(fetchGuide).toHaveBeenCalledWith(GUIDE_URL);
  });

  it('fetches each guide once a day', async () => {
    await post({ url: GUIDE_URL });
    await post({ url: GUIDE_URL });
    expect(fetchGuide).toHaveBeenCalledTimes(1);
    now = new Date('2026-10-16T13:00:00Z');
    await post({ url: GUIDE_URL });
    expect(fetchGuide).toHaveBeenCalledTimes(2);
  });

  it('imports pasted page HTML without fetching', async () => {
    const res = await post({ html: page });
    expect(res.statusCode).toBe(200);
    expect(res.json().build.source.url).toBeUndefined();
    expect(fetchGuide).not.toHaveBeenCalled();
  });

  it('loads the gear of build panels from Gamestegy, for links and pasted pages', async () => {
    fetchGuide.mockResolvedValue(panelPage);
    for (const payload of [{ url: GUIDE_URL }, { html: panelPage }]) {
      const res = await post(payload);
      expect(res.statusCode).toBe(200);
      expect(res.json().build.equipment.act1).toEqual({ head: 'helmet-of-grit' });
    }
    expect(fetchBuild).toHaveBeenCalledWith('https://backend.gamestegy.com/api/bg3-builds/post/42');
    // Guides without panels need no second request.
    fetchBuild.mockClear();
    await post({ html: page });
    expect(fetchBuild).not.toHaveBeenCalled();
  });

  it('still imports a guide whose panel data cannot be loaded', async () => {
    fetchBuild.mockRejectedValueOnce(new FetchError('Gamestegy answered HTTP 500.'));
    const res = await post({ html: panelPage });
    expect(res.statusCode).toBe(200);
    expect(res.json().build.equipment).toBeUndefined();
    expect(res.json().notes.map((n: { message: string }) => n.message)).toContain(
      'Some of the guide’s gear or ability scores are in Gamestegy build panels that could not be loaded.',
    );
  });

  it('only fetches Gamestegy guide links', async () => {
    for (const url of [
      'https://example.com/post/bg3/1/x',
      'http://gamestegy.com/post/bg3/1/x',
      'https://gamestegy.com/bg3/build-planner',
      'not a url',
    ]) {
      const res = await post({ url });
      expect(res.statusCode).toBe(400);
    }
    expect(fetchGuide).not.toHaveBeenCalled();
  });

  it('needs a link or HTML', async () => {
    expect((await post({})).statusCode).toBe(400);
  });

  it('explains pages that are not guides', async () => {
    const res = await post({ html: '<html><body>Hello</body></html>' });
    expect(res.statusCode).toBe(422);
    expect(res.json().error).toMatch(/does not contain a Gamestegy guide/);
  });

  it('suggests pasting when Gamestegy cannot be fetched', async () => {
    fetchGuide.mockRejectedValueOnce(new FetchError('Gamestegy answered HTTP 403.'));
    const res = await post({ url: GUIDE_URL });
    expect(res.statusCode).toBe(502);
    expect(res.json().error).toBe(
      'Gamestegy answered HTTP 403. You can paste the guide page’s HTML instead.',
    );
  });

  it('accepts full guide pages but refuses oversized bodies', async () => {
    const big = `${page}${' '.repeat(2 * 1024 * 1024)}`;
    expect((await post({ html: big })).statusCode).toBe(200);
    expect((await post({ html: ' '.repeat(4 * 1024 * 1024) })).statusCode).toBe(413);
  });
});
