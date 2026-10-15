import { load } from 'cheerio';
import type { Feat, Feature, OptionGroup, Spell } from '../src/schema';
import { decodeEntities, wikiToText } from './wikitext';

/** Fields requested from the `spells`, `passives` and `actions` Cargo tables. */
export const DESCRIPTION_FIELDS = ['_pageName=page', 'name', 'description'] as const;

export interface CargoDescriptionRow {
  page: string;
  name: string | null;
  description: string | null;
}

export interface DescriptionSources {
  spells: CargoDescriptionRow[];
  passives: CargoDescriptionRow[];
  actions: CargoDescriptionRow[];
  /** The bg3.wiki "Feats" page rendered to HTML (`?action=render`). */
  featsHtml: string;
}

export interface Described {
  spells: Pick<Spell, 'id' | 'wikiPage'>[];
  features: Pick<Feature, 'id' | 'name' | 'kind'>[];
  feats: Pick<Feat, 'id' | 'name'>[];
  optionGroups: Pick<OptionGroup, 'id' | 'name' | 'options'>[];
}

/** Keys in descriptions.json: `spell:hex`, `feature:action-surge`, `feat:alert`, `option:<group>:<id>`. */
export const descriptionKey = {
  spell: (id: string) => `spell:${id}`,
  feature: (id: string) => `feature:${id}`,
  feat: (id: string) => `feat:${id}`,
  option: (group: string, id: string) => `option:${group}:${id}`,
};

/** Plain text with one line per paragraph or bullet; bullets start with "• ". */
export function descriptionText(raw: string): string {
  return wikiToText(raw)
    .split('\n')
    .map((line) => line.replace(/^[*#]+\s*/, '• ').replace(/^:+\s*/, ''))
    .filter((line) => line && line !== '•')
    .join('\n');
}

/** Lower-case letters and digits, with US spellings made British as our data writes them. */
const normalise = (name: string) =>
  decodeEntities(name)
    .toLowerCase()
    .replace(/defense/g, 'defence')
    .replace(/armor\b/g, 'armour')
    .replace(/[^a-z0-9]/g, '');

function byName(rows: CargoDescriptionRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (!row.description) continue;
    for (const key of [row.name, row.page]) {
      if (key && !map.has(normalise(key))) map.set(normalise(key), row.description);
    }
  }
  return map;
}

/** Feat name → its bullet points, from the rendered Feats page. */
export function featDescriptions(html: string): Map<string, string> {
  const $ = load(html);
  const feats = new Map<string, string[]>();
  let current: string[] | undefined;
  $('tr').each((_, tr) => {
    const group = $(tr).children('th[scope="rowgroup"]');
    if (group.length) {
      current = [];
      feats.set(normalise(group.text().trim()), current);
    }
    if (!current) return;
    $(tr)
      .children('td')
      .find('li')
      .each((_, li) => {
        // Nested lists are read as their own bullets.
        const own = $(li).clone();
        own.find('ul, ol').remove();
        const text = own
          .text()
          .replace(/\s+/g, ' ')
          .replace(/ +([.,:])/g, '$1')
          .trim();
        if (text) current!.push(`• ${text}`);
      });
  });
  return new Map([...feats].map(([name, lines]) => [name, lines.join('\n')]));
}

/**
 * Descriptions for everything the planner names, keyed by `descriptionKey`, plus the keys no
 * source describes.
 */
export function toDescriptions(
  ours: Described,
  sources: DescriptionSources,
): { descriptions: Record<string, string>; missing: string[] } {
  const descriptions: Record<string, string> = {};
  const missing: string[] = [];
  const put = (key: string, raw: string | undefined) => {
    if (raw) descriptions[key] = raw;
    else missing.push(key);
  };

  const spells = new Map(sources.spells.map((r) => [decodeEntities(r.page), r.description]));
  for (const spell of ours.spells) {
    const raw = spells.get(spell.wikiPage);
    put(descriptionKey.spell(spell.id), raw ? descriptionText(raw) : undefined);
  }

  const passives = byName(sources.passives);
  const actions = byName(sources.actions);
  const find = (names: string[], actionFirst: boolean) => {
    const tables = actionFirst ? [actions, passives] : [passives, actions];
    for (const table of tables) {
      for (const name of names) {
        const raw = table.get(normalise(name));
        if (raw) return descriptionText(raw);
      }
    }
    return undefined;
  };

  for (const feature of ours.features) {
    put(descriptionKey.feature(feature.id), find([feature.name], feature.kind !== 'passive'));
  }

  const feats = featDescriptions(sources.featsHtml);
  for (const feat of ours.feats) put(descriptionKey.feat(feat.id), feats.get(normalise(feat.name)));

  for (const group of ours.optionGroups) {
    for (const option of group.options) {
      // The game names some options after their group or how they are used:
      // "Arcane Shot: Banishing Arrow", "Elemental Adept: Fire", "Trip Attack (Melee)".
      const names = [
        option.name,
        `${group.name}: ${option.name}`,
        `Arcane Shot: ${option.name}`,
        `Elemental Adept: ${option.name}`,
        `${option.name} (Melee)`,
      ];
      put(descriptionKey.option(group.id, option.id), find(names, false));
    }
  }
  return { descriptions, missing };
}
