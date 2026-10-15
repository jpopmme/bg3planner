import { type Cheerio, type CheerioAPI, load } from 'cheerio';
import type { AnyNode, Element } from 'domhandler';
import { cleanText } from './text';

/** One line of a level in the guide's "Leveling Overview" table, e.g. "Cantrips: A, B". */
export interface OverviewLine {
  /** Text before the first colon, e.g. "Cantrips"; empty for unlabelled lines. */
  label: string;
  /** Text after the label. */
  value: string;
}

export interface OverviewLevel {
  level: number;
  /** Class named in the table, e.g. "Fighter" from "Fighter 3". */
  className: string;
  classLevel?: number;
  lines: OverviewLine[];
}

export interface AbilityValue {
  /** Score as the guide states it, e.g. 16. */
  value: number;
  /** Point-buy base and racial bonus when the guide splits them, as in "16 (15+1)". */
  base?: number;
  bonus?: number;
}

export interface GuideSections {
  overview: OverviewLevel[];
  /** First column of the races table, in the guide's order of preference. */
  races: string[];
  backgrounds: string[];
  /** From the first ability table, if the overview gives none. */
  abilityTable?: Record<string, AbilityValue>;
}

const text = (node: Cheerio<AnyNode>) => cleanText(node.text());

/** The heading whose text matches, then the elements up to the next heading of the same rank. */
function sectionAfter(
  $: CheerioAPI,
  pattern: RegExp,
  tags = 'h2, h3, h4',
): Cheerio<Element> | undefined {
  const heading = $(tags)
    .filter((_, el) => pattern.test(text($(el))))
    .first();
  if (!heading.length) return undefined;
  const rank = heading.prop('tagName')!.toLowerCase();
  const stopAt = ['h2', 'h3', 'h4'].slice(0, ['h2', 'h3', 'h4'].indexOf(rank) + 1).join(', ');
  return heading.nextUntil(stopAt) as Cheerio<Element>;
}

function firstTable(section: Cheerio<Element> | undefined): Cheerio<Element> | undefined {
  if (!section) return undefined;
  const table = section.filter('table').add(section.find('table')).first();
  return table.length ? table : undefined;
}

/** First-column texts of a table's body rows. */
function firstColumn($: CheerioAPI, table: Cheerio<Element> | undefined): string[] {
  if (!table) return [];
  return table
    .find('tr')
    .toArray()
    .map((tr) => $(tr).children('td').first())
    .filter((td) => td.length > 0)
    .map((td) => text(td))
    .filter(Boolean);
}

function parseLine(raw: string): OverviewLine {
  const line = raw.replace(/\s*(?:->|→|=>)\s*/g, ' -> ');
  const colon = line.indexOf(':');
  // A label is a short lead-in such as "Eldritch Invocations"; abilities like "STR - 8" have none.
  if (colon > 0 && colon <= 30 && !/\d/.test(line.slice(0, colon))) {
    return { label: line.slice(0, colon).trim(), value: line.slice(colon + 1).trim() };
  }
  return { label: '', value: line.trim() };
}

function parseOverview($: CheerioAPI): OverviewLevel[] {
  const table = firstTable(sectionAfter($, /lev(e)?ll?ing overview/i, 'h2, h3'));
  if (!table) return [];
  const levels: OverviewLevel[] = [];
  for (const tr of table.find('tbody tr').toArray()) {
    const cells = $(tr).children('td');
    if (cells.length >= 3) {
      const level = Number.parseInt(text(cells.eq(0)), 10);
      const classCell = text(cells.eq(1));
      const classMatch = classCell.match(/^(.*?)\s*(\d+)?$/);
      if (!Number.isInteger(level)) continue;
      levels.push({
        level,
        className: classMatch?.[1]?.trim() ?? classCell,
        ...(classMatch?.[2] ? { classLevel: Number(classMatch[2]) } : {}),
        lines: [],
      });
    }
    const current = levels.at(-1);
    const lineCell = cells.last();
    if (current && lineCell.length) {
      const line = parseLine(text(lineCell));
      if (line.value && line.value !== '-') current.lines.push(line);
    }
  }
  return levels;
}

const ABILITY_CELLS: Record<string, string> = {
  strength: 'strength',
  dexterity: 'dexterity',
  constitution: 'constitution',
  intelligence: 'intelligence',
  wisdom: 'wisdom',
  charisma: 'charisma',
};

/** Reads "16 (15+1)" or "8". */
export function parseAbilityValue(raw: string): AbilityValue | undefined {
  const m = raw.match(/(\d+)\s*(?:\(\s*(\d+)\s*\+\s*(\d)\s*\))?/);
  if (!m) return undefined;
  return {
    value: Number(m[1]),
    ...(m[2] ? { base: Number(m[2]), bonus: Number(m[3]) } : {}),
  };
}

function parseAbilityTable($: CheerioAPI): Record<string, AbilityValue> | undefined {
  const table = $('table')
    .filter((_, el) => {
      const headers = $(el)
        .find('tr')
        .first()
        .children()
        .toArray()
        .map((c) => text($(c)).toLowerCase());
      return headers[0] === 'ability' && headers[1] === 'value';
    })
    .first();
  if (!table.length) return undefined;
  const result: Record<string, AbilityValue> = {};
  for (const tr of table.find('tr').toArray()) {
    const cells = $(tr).children('td');
    const ability = ABILITY_CELLS[text(cells.eq(0)).toLowerCase()];
    const value = parseAbilityValue(text(cells.eq(1)));
    if (ability && value) result[ability] = value;
  }
  return Object.keys(result).length === 6 ? result : undefined;
}

/** Pulls the parts of a guide article the importer understands. */
export function readSections(articleHtml: string): GuideSections {
  const $ = load(articleHtml);
  const abilityTable = parseAbilityTable($);
  return {
    overview: parseOverview($),
    races: firstColumn($, firstTable(sectionAfter($, /^(custom )?races?$/i))),
    backgrounds: firstColumn($, firstTable(sectionAfter($, /^backgrounds?$/i))),
    ...(abilityTable ? { abilityTable } : {}),
  };
}
