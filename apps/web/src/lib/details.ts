import { type Choice, gameData, loadDescriptions } from '@bg3planner/gamedata';
import { itemBasics, itemById, rarityName } from './items';
import { titleCase } from './names';

/** Something the player can ask about. */
export type DetailsTarget =
  | { kind: 'spell' | 'feature' | 'feat' | 'item'; id: string }
  | { kind: 'option'; group: string; id: string };

export interface Details {
  title: string;
  subtitle: string;
  /** Paragraphs or "• " bullets. */
  lines: string[];
  /** Where to read more on bg3.wiki. */
  wikiUrl: string;
}

let descriptions: Promise<Record<string, string>> | undefined;
/** Loaded once, the first time someone opens details. */
export const descriptionsReady = () => (descriptions ??= loadDescriptions());

const wikiPage = (page: string) =>
  `https://bg3.wiki/wiki/${encodeURIComponent(page.replace(/ /g, '_'))}`;
/** For names without a known page: the wiki's search goes straight to an exact title. */
const wikiSearch = (name: string) =>
  `https://bg3.wiki/w/index.php?search=${encodeURIComponent(name)}`;

const ACTION_TYPES = { action: 'Action', bonus: 'Bonus action', reaction: 'Reaction' } as const;
const FEATURE_KINDS = {
  passive: 'Passive feature',
  action: 'Action',
  reaction: 'Reaction',
} as const;

/** What a choice's option can show details about, if anything. */
export function choiceTarget(choice: Choice, id: string): DetailsTarget | undefined {
  switch (choice.type) {
    case 'feat':
      return { kind: 'feat', id };
    case 'option':
      return { kind: 'option', group: choice.group, id };
    case 'cantrip':
    case 'spell':
    case 'replace-spell':
      return { kind: 'spell', id };
    default:
      return undefined;
  }
}

export function detailsKey(target: DetailsTarget): string {
  return target.kind === 'option'
    ? `option:${target.group}:${target.id}`
    : `${target.kind}:${target.id}`;
}

/**
 * Title, summary line and description of a target, or undefined if it is unknown. `texts` is
 * null while the descriptions are still loading.
 */
export function describe(
  target: DetailsTarget,
  texts: Record<string, string> | null,
): Details | undefined {
  const text = texts?.[detailsKey(target)];
  const lines = () =>
    !texts
      ? ['Loading the description…']
      : text
        ? text.split('\n')
        : ['No description is available.'];
  switch (target.kind) {
    case 'spell': {
      const spell = gameData.spells.find((s) => s.id === target.id);
      if (!spell) return undefined;
      const level = spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`;
      const school = spell.school ? ` ${titleCase(spell.school)}` : '';
      return {
        title: spell.name,
        subtitle: [
          `${level}${school}`,
          ACTION_TYPES[spell.actionType],
          spell.concentration && 'Concentration',
          spell.ritual && 'Ritual',
        ]
          .filter(Boolean)
          .join(' · '),
        lines: lines(),
        wikiUrl: wikiPage(spell.wikiPage),
      };
    }
    case 'feature': {
      const feature = gameData.features.find((f) => f.id === target.id);
      if (!feature) return undefined;
      return {
        title: feature.name,
        subtitle: FEATURE_KINDS[feature.kind],
        lines: lines(),
        wikiUrl: wikiSearch(feature.name),
      };
    }
    case 'feat': {
      const feat = gameData.feats.find((f) => f.id === target.id);
      if (!feat) return undefined;
      return { title: feat.name, subtitle: 'Feat', lines: lines(), wikiUrl: wikiSearch(feat.name) };
    }
    case 'option': {
      const group = gameData.optionGroups.find((g) => g.id === target.group);
      const option = group?.options.find((o) => o.id === target.id);
      if (!group || !option) return undefined;
      return {
        title: option.name,
        subtitle: group.name,
        lines: lines(),
        wikiUrl: wikiSearch(option.name),
      };
    }
    case 'item': {
      const item = itemById(target.id);
      if (!item) return undefined;
      const passives = item.passives.length ? [`Passives: ${item.passives.join(', ')}`] : [];
      const effects = [...item.effects, ...passives];
      return {
        title: item.name,
        subtitle: [rarityName(item), itemBasics(item), item.unique && 'One of a kind']
          .filter(Boolean)
          .join(' · '),
        lines: effects.length ? effects : ['No special properties.'],
        wikiUrl: wikiPage(item.wikiPage),
      };
    }
  }
}
