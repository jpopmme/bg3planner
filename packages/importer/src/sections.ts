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

/** One slot of a gear table: its label and the items suggested for it, best first. */
export interface GearRow {
  /** As the guide writes it, e.g. "Melee (One-Handed)" or "Rings". */
  slot: string;
  /** Item names: tagged item links, or a cell's plain text when it has none. */
  items: string[];
}

/** One gear table (or several under the same heading). */
export interface GearSetup {
  /** The h4 above it, e.g. "High Damage Setup"; absent directly under the act heading. */
  title?: string;
  rows: GearRow[];
}

export interface ActGear {
  act: 1 | 2 | 3;
  setups: GearSetup[];
}

export interface GuideSections {
  overview: OverviewLevel[];
  /** The "Equipment Recommendations" section, per act. */
  equipment: ActGear[];
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

/**
 * A table as a grid of cells with row and column spans resolved, so `grid[row][col]` is the cell
 * covering that position (the same element repeats across the rows it spans).
 */
function tableGrid($: CheerioAPI, table: Cheerio<Element>): Element[][] {
  const grid: Element[][] = [];
  table
    .find('tr')
    .toArray()
    .forEach((tr, r) => {
      const row = (grid[r] ??= []);
      let c = 0;
      for (const cell of $(tr).children('td, th').toArray()) {
        while (row[c]) c++;
        const rows = Number(cell.attribs.rowspan) || 1;
        const cols = Number(cell.attribs.colspan) || 1;
        for (let dr = 0; dr < rows; dr++) {
          for (let dc = 0; dc < cols; dc++) (grid[r + dr] ??= [])[c + dc] = cell;
        }
        c += cols;
      }
    });
  return grid;
}

/** Rows of a "Slot | Item | Description" table, with the items of each slot in order. */
function parseGearTable($: CheerioAPI, table: Cheerio<Element>): GearRow[] {
  const rows: GearRow[] = [];
  const seenCells = new Set<Element>();
  for (const [slotCell, itemCell] of tableGrid($, table)) {
    if (!slotCell || !itemCell || slotCell.tagName === 'th' || seenCells.has(itemCell)) continue;
    seenCells.add(itemCell);
    const slot = text($(slotCell));
    const tagged = $(itemCell)
      .find('[data-bg3-type="equipment"] .bg3-name')
      .toArray()
      .map((n) => text($(n)));
    const plain = text($(itemCell));
    const items = tagged.length ? tagged : plain && plain !== '-' ? [plain] : [];
    let row = rows.at(-1);
    if (row?.slot !== slot) rows.push((row = { slot, items: [] }));
    for (const item of items) if (!row.items.includes(item)) row.items.push(item);
  }
  return rows;
}

function parseEquipment($: CheerioAPI): ActGear[] {
  const section = sectionAfter($, /equipment|gear/i, 'h2');
  if (!section) return [];
  const acts: ActGear[] = [];
  // The act being read; an h3 that names no act (e.g. "Consumables") ends it.
  let act: ActGear | undefined;
  let setup: GearSetup | undefined;
  for (const el of section.toArray()) {
    const node = $(el);
    const tag = el.tagName.toLowerCase();
    if (tag === 'h3') {
      const number = /\bact\s*([123])\b/i.exec(text(node))?.[1];
      act = number ? { act: Number(number) as ActGear['act'], setups: [] } : undefined;
      if (act) acts.push(act);
      setup = undefined;
    } else if (!act) {
      continue;
    } else if (tag === 'h4') {
      setup = { title: text(node), rows: [] };
      act.setups.push(setup);
    } else {
      const tables = node.is('table') ? node : node.find('table');
      for (const table of tables.toArray()) {
        const rows = parseGearTable($, $(table));
        if (!rows.length) continue;
        if (!setup) act.setups.push((setup = { rows: [] }));
        setup.rows.push(...rows);
      }
    }
  }
  return acts.map((a) => ({ ...a, setups: a.setups.filter((s) => s.rows.length > 0) }));
}

/** Pulls the parts of a guide article the importer understands. */
export function readSections(articleHtml: string): GuideSections {
  const $ = load(articleHtml);
  const abilityTable = parseAbilityTable($);
  return {
    overview: parseOverview($),
    equipment: parseEquipment($),
    races: firstColumn($, firstTable(sectionAfter($, /^(custom )?races?$/i))),
    backgrounds: firstColumn($, firstTable(sectionAfter($, /^backgrounds?$/i))),
    ...(abilityTable ? { abilityTable } : {}),
  };
}
