import type { Choice, GameData } from '@bg3planner/gamedata';
import {
  type Act,
  type Answer,
  type Build,
  type BuildSource,
  type ChoiceSlot,
  type Issue,
  availableChoices,
  deriveCharacter,
  validateBuild,
} from '@bg3planner/rules';
import { ABILITIES, type Ability, SKILLS, type Skill } from '@bg3planner/shared';
import { importEquipment } from './equipment';
import { type Named, matchName } from './match';
import { extractPost } from './nuxt';
import {
  type AbilityValue,
  type OverviewLevel,
  type OverviewLine,
  parseAbilityValue,
  readSections,
} from './sections';
import { cleanText, normaliseName } from './text';

export type ImportNote = BuildSource['notes'][number];

export interface ImportResult {
  /** A name for the character, from the guide's title. */
  name: string;
  build: Build;
  /** Everything the importer could not settle, also kept in `build.source.notes`. */
  notes: ImportNote[];
  /** What validating the imported build reports. */
  issues: Issue[];
}

const ABILITY_SHORT: Record<string, Ability> = {
  STR: 'strength',
  DEX: 'dexterity',
  CON: 'constitution',
  INT: 'intelligence',
  WIS: 'wisdom',
  CHA: 'charisma',
};

/** "Eldritch Hexknight - Shadow Blade Build" → "Eldritch Hexknight". */
function characterName(title: string): string {
  return (title.split(' - ')[0] ?? title).replace(/\s+build$/i, '').trim() || title;
}

/** Names that contain a separator themselves ("Create or Destroy Water", "Enlarge/Reduce"). */
const unsplittable = new WeakMap<GameData, string[]>();

/**
 * Splits "A, B or C" (or "A/B") into items, dropping fillers such as "etc.", but keeps the
 * spell names that contain " or " or "/" whole.
 */
function items(value: string, data: GameData): string[] {
  let whole = unsplittable.get(data);
  if (!whole) {
    whole = data.spells.map((s) => s.name).filter((n) => / or |\//i.test(n));
    unsplittable.set(data, whole);
  }
  const kept: string[] = [];
  // "+1 Wisdom, +1 Constitution" is one feat's increases, not two items.
  let text = value.replace(/(\+\d\s*[a-z]+)\s*,\s*(?=\+\d)/gi, '$1 ');
  for (const name of whole) {
    const at = text.toLowerCase().indexOf(name.toLowerCase());
    if (at < 0) continue;
    text = `${text.slice(0, at)}§${kept.length}§${text.slice(at + name.length)}`;
    kept.push(name);
  }
  return text
    .split(/,|\bor\b|\//i)
    .map((s) => cleanText(s.replace(/§(\d+)§/g, (_, i: string) => kept[Number(i)]!)))
    .map((s) => s.replace(/\.$/, ''))
    .filter((s) => s && !/^(etc|and so on)$/i.test(s));
}

const isOpen = (item: string) => /^any(thing)?\b/i.test(item);

/** Words that every subclass of a kind shares and a guide's title leaves out. */
const SUBCLASS_FILLER = new Set('the of college circle oath path way school domain'.split(' '));

/** The subclass a title such as "Valour Bard Build" names, among `subclasses`. */
function subclassFromTitle(title: string, subclasses: Named[]): Named | undefined {
  const words = (text: string) =>
    normaliseName(text)
      .split(' ')
      .filter((w) => w && !SUBCLASS_FILLER.has(w))
      .map((w) => w.replace(/s$/, ''));
  const inTitle = new Set(words(title));
  const found = subclasses.filter((s) => {
    const key = words(s.name);
    return key.length > 0 && key.every((w) => inTitle.has(w));
  });
  return found.length === 1 ? found[0] : undefined;
}

/**
 * The class at each level of a respec header such as "Respec Character:Level 1 - SorcererLevel
 * 2-6 - ClericLevel 7 - Monk", or undefined if the text is not one.
 */
function respecPlan(text: string, data: GameData): string[] | undefined {
  if (!/^respec character/i.test(text)) return undefined;
  const plan: (string | undefined)[] = [];
  const parts = text.matchAll(
    /level\s*(\d+)(?:\s*-\s*(\d+))?\s*[-–]\s*([a-z]+?)(?=\s*\d*\s*(?:level|$))/gi,
  );
  for (const [, from, to, name] of parts) {
    const id = matchName(name!, data.classes)?.id;
    if (!id) return undefined;
    for (let l = Number(from); l <= Number(to ?? from); l++) plan[l - 1] = id;
  }
  return plan.length && plan.every(Boolean) ? (plan as string[]) : undefined;
}

/**
 * Many guides end their levelling with a respec into a different first level: "Fighter 1 (respec
 * as first level)", a line saying to respec and start with the level's class, or a header laying
 * out the new order ("Respec Character:Level 1 - Cleric 1Level 2-11 - Bard"). The planner keeps
 * the final build, so the levels are put in the respecced order and renumbered.
 */
function applyRespec(levels: OverviewLevel[], data: GameData): OverviewLevel[] {
  type Tagged = { entry: OverviewLevel; classId: string | undefined };
  const tagged: Tagged[] = levels.map((entry) => ({
    entry,
    classId: matchName(className(entry.className), data.classes)?.id,
  }));
  let ordered: Tagged[] | undefined;
  for (const [at, { entry, classId }] of tagged.entries()) {
    if (at === 0) continue;
    const plan = respecPlan(entry.className, data);
    if (plan) {
      // The header's own level is the one the levels so far lack (Cleric 1 above).
      if (plan.length !== at + 1) return levels;
      const before = tagged.slice(0, at);
      const lacking = plan.find(
        (id) => plan.filter((p) => p === id).length > before.filter((t) => t.classId === id).length,
      );
      if (!lacking) return levels;
      const pool = [...before, { entry, classId: lacking }];
      const reordered = plan.map((id) => {
        const i = pool.findIndex((t) => t.classId === id);
        return i < 0 ? undefined : pool.splice(i, 1)[0];
      });
      if (reordered.some((t) => !t)) return levels;
      ordered = [...(reordered as Tagged[]), ...tagged.slice(at + 1)];
      break;
    }
    const startsWithIt =
      /respec as first level/i.test(entry.className) ||
      entry.lines.some((line) => /\brespec\b.*\b(1st|first) level\b/i.test(line.value));
    if (startsWithIt && classId) {
      ordered = [tagged[at]!, ...tagged.filter((_, i) => i !== at)];
      break;
    }
  }
  if (!ordered || ordered[0]!.entry === levels[0]) return levels;
  // The old first class's skills now come from the class taken first, where they fit.
  const skills: QuietLine[] = (levels[0]?.lines ?? [])
    .filter((line) => /^skills?$/i.test(line.label))
    .map((line) => ({ ...line, quiet: true }));
  return ordered.map(({ entry, classId }, i) => ({
    ...entry,
    level: i + 1,
    className: data.classes.find((c) => c.id === classId)?.name ?? entry.className,
    lines: [
      ...entry.lines.filter((line) => !/\brespec\b/i.test(line.value)),
      ...(i === 0 ? skills : []),
    ],
  }));
}

/** A line tried without notes when nothing fits: skills moved by a respec. */
type QuietLine = OverviewLine & { quiet?: boolean };

/**
 * "Fighter 1(respec as first level)" → "Fighter". Also "Respec Character:Level 1 - Cleric 1Level
 * 2-7 - Sorcerer" (Cleric 1 first, then the guide's levels so far), as `applyRespec` reads it.
 */
const className = (text: string) => text.replace(/\s*\d*\s*\(.*$/, '').trim();

/** Ability increases written in a feat line, e.g. "Ability Improvement - +2 Charisma". */
function abilityIncreases(text: string): Partial<Record<Ability, number>> {
  const result: Partial<Record<Ability, number>> = {};
  for (const m of text.matchAll(
    /\+(\d)\s*(strength|dexterity|constitution|intelligence|wisdom|charisma)/gi,
  )) {
    const ability = m[2]!.toLowerCase() as Ability;
    result[ability] = (result[ability] ?? 0) + Number(m[1]);
  }
  return result;
}

/** "Great Weapon Master: All In" → "Great Weapon Master"; "Athlete - +1 Strength" → "Athlete". */
function featName(item: string): string {
  return cleanText(item.split(/:| - |\+\d/)[0] ?? item);
}

/**
 * Scores from "STR - 8, DEX - 16 (15+1), ...", or undefined if the text has none. Some guides
 * list several setups in one line; the first full set is used.
 */
function abilitiesFromLine(text: string): Record<string, AbilityValue> | undefined {
  const result: Record<string, AbilityValue> = {};
  for (const m of text.matchAll(
    /\b(STR|DEX|CON|INT|WIS|CHA)\s*[-–:]\s*(\d+\s*(?:\(\s*\d+\s*\+\s*\d\s*\))?)/g,
  )) {
    const ability = ABILITY_SHORT[m[1]!]!;
    const value = parseAbilityValue(m[2]!);
    if (value && !result[ability]) result[ability] = value;
    if (Object.keys(result).length === 6) break;
  }
  return Object.keys(result).length === 6 ? result : undefined;
}

/**
 * Point-buy bases and racial bonuses from the guide's final scores. Where the guide writes
 * "16 (15+1)" that split is used; a bare score above 15 must include the racial bonus.
 */
function toBuildAbilities(values: Record<string, AbilityValue>): Build['abilities'] {
  const base = {} as Record<Ability, number>;
  const racialBonus: Build['abilities']['racialBonus'] = {};
  for (const ability of ABILITIES) {
    const v = values[ability]!;
    let bonus = v.bonus ?? (v.value > 15 ? v.value - 15 : 0);
    if (bonus !== 1 && bonus !== 2) bonus = 0;
    base[ability] = v.base ?? v.value - bonus;
    if (bonus) racialBonus[ability] = bonus as 1 | 2;
  }
  return { base, racialBonus };
}

/** Names the planner shows for a choice's options, for matching against the guide's text. */
function candidates(slot: ChoiceSlot, data: GameData, ids: string[]): Named[] {
  const lookup = (list: { id: string; name: string }[]) =>
    ids.flatMap((id) => list.filter((x) => x.id === id));
  switch (slot.choice.type) {
    case 'subclass':
      return lookup(data.subclasses);
    case 'feat':
      return lookup(data.feats);
    case 'option':
      return lookup(
        data.optionGroups.find(
          (g) => g.id === (slot.choice as Extract<Choice, { type: 'option' }>).group,
        )?.options ?? [],
      );
    case 'cantrip':
    case 'spell':
    case 'replace-spell':
      return lookup(data.spells);
    case 'weapon-proficiency':
      return lookup(data.weaponTypes);
    case 'skill':
    case 'expertise':
    case 'ability-increase':
      return ids.map((id) => ({ id, name: id.replace(/-/g, ' ') }));
  }
}

const capacity = (choice: Choice) => ('count' in choice ? choice.count : 1);

type Kind =
  | { type: 'subclass' }
  | { type: 'option'; group: string }
  | { type: 'cantrip' }
  | { type: 'spell'; prefer: 'regular' | 'any-school' | 'extra' }
  | { type: 'feat' }
  | { type: 'replace-spell' }
  | { type: 'skill' }
  | { type: 'expertise' }
  /** Granted automatically (Domain, Oath and Circle spells) or cosmetic (a Cleric's deity). */
  | { type: 'automatic' }
  /**
   * Spells to prepare each day or to copy from scrolls: a note, since the planner tracks
   * neither. `what` starts the note: "Spells to prepare".
   */
  | { type: 'note'; what: string }
  /** A choice the planner labels the same way ("Magical Secrets"). */
  | { type: 'labelled'; label: string }
  /** Unknown label: try any option choice at this level ("Circle of Land: Underdark"). */
  | { type: 'any-option' };

/** What an overview label such as "Eldritch Invocations" asks for. */
function kindOf(label: string, data: GameData): Kind | undefined {
  const l = label.toLowerCase();
  if (/subclass/.test(l)) return { type: 'subclass' };
  if (/^(domain|oath|circle) spells?$|^deity$/.test(l)) return { type: 'automatic' };
  if (/prepare/.test(l)) return { type: 'note', what: 'Spells to prepare' };
  if (/^scribe/.test(l)) return { type: 'note', what: 'Spells to copy from scrolls' };
  if (/expertise/.test(l)) return { type: 'expertise' };
  if (/fighting style/.test(l)) return { type: 'option', group: 'fighting-styles' };
  if (/invocation/.test(l)) return { type: 'option', group: 'eldritch-invocations' };
  if (/pact boon/.test(l)) return { type: 'option', group: 'pact-boons' };
  if (/manoeuvre|maneuver/.test(l)) return { type: 'option', group: 'manoeuvres' };
  if (/arcane shot/.test(l)) return { type: 'option', group: 'arcane-shots' };
  if (/cantrip/.test(l)) return { type: 'cantrip' };
  if (/mystic arcanum/.test(l)) return { type: 'spell', prefer: 'extra' };
  if (/expanded/.test(l)) return { type: 'spell', prefer: 'any-school' };
  if (/replace/.test(l)) return { type: 'replace-spell' };
  if (/^spells?$/.test(l)) return { type: 'spell', prefer: 'regular' };
  if (/^feats?$/.test(l)) return { type: 'feat' };
  if (/^skills?$/.test(l)) return { type: 'skill' };
  // Any other option group by its name, singular or plural ("Metamagic", "Favoured Enemy").
  const wanted = normaliseName(label).replace(/s$/, '');
  const group = data.optionGroups.find((g) => normaliseName(g.name).replace(/s$/, '') === wanted);
  return group ? { type: 'option', group: group.id } : undefined;
}

/**
 * Turns a Gamestegy build guide page into a draft build. Choices are placed with the rules
 * engine, level by level, so everything imported is something the planner allows; whatever
 * cannot be placed becomes a note for the player to settle.
 */
export function importGamestegyGuide(
  html: string,
  data: GameData,
  options: { url?: string; now?: Date } = {},
): ImportResult {
  const post = extractPost(html);
  const sections = readSections(post.text);
  const notes: ImportNote[] = [];
  const note = (message: string, level?: number) =>
    notes.push({ ...(level ? { level } : {}), message });
  const gearNote = (message: string, act: Act) => notes.push({ act, message });

  // ---- Race and background: the guide's first suggestion that the planner knows
  const raceOptions: (Named & { raceId: string; subraceId?: string })[] = data.races.flatMap(
    (r) => [
      { id: r.id, name: r.name, raceId: r.id },
      ...r.subraces.map((s) => ({ id: s.id, name: s.name, raceId: r.id, subraceId: s.id })),
    ],
  );
  const races = sections.races.flatMap((text) => {
    const found = matchName(text.split(/ - |:/)[0]!, raceOptions);
    return found ? [found as (typeof raceOptions)[number]] : [];
  });
  const race = races[0] ?? { id: 'human', name: 'Human', raceId: 'human' };
  if (!races.length) note('The guide names no race the planner knows; Human was used.');
  if (races.length > 1)
    note(
      `Other races the guide suggests: ${races
        .slice(1)
        .map((r) => r.name)
        .join(', ')}.`,
    );
  const raceDef = data.races.find((r) => r.id === race.raceId)!;
  if (!('subraceId' in race && race.subraceId) && raceDef.subraces.length > 0) {
    note(`The guide suggests ${raceDef.name} without a subrace; choose one.`);
  }

  const backgrounds = sections.backgrounds.flatMap(
    (text) => matchName(text, data.backgrounds) ?? [],
  );
  const background = backgrounds[0] ?? data.backgrounds[0]!;
  if (!backgrounds.length) note(`The guide names no background; ${background.name} was used.`);
  if (backgrounds.length > 1) {
    note(
      `Other backgrounds the guide suggests: ${backgrounds
        .slice(1)
        .map((b) => b.name)
        .join(', ')}.`,
    );
  }

  // ---- Abilities: the overview's line, else the first ability table
  const abilityLine = sections.overview
    .flatMap((l) => l.lines)
    .map((line) => abilitiesFromLine(`${line.label}: ${line.value}`))
    .find(Boolean);
  const abilityValues = abilityLine ?? sections.abilityTable;
  const setups = sections.overview
    .flatMap((l) => l.lines)
    .map((line) => (`${line.label}: ${line.value}`.match(/\bSTR\s*[-–:]/g) ?? []).length)
    .reduce((a, b) => Math.max(a, b), 0);
  if (setups > 1) note('The guide offers more than one ability score setup; the first was used.');
  const abilities: Build['abilities'] = abilityValues
    ? toBuildAbilities(abilityValues)
    : {
        base: Object.fromEntries(ABILITIES.map((a) => [a, 8])) as Record<Ability, number>,
        racialBonus: {},
      };
  if (!abilityValues) note('The guide gives no ability scores; all were left at 8.');

  const build: Build = {
    gameDataVersion: data.version,
    raceId: race.raceId,
    ...('subraceId' in race && race.subraceId ? { subraceId: race.subraceId } : {}),
    backgroundId: background.id,
    abilities,
    levels: [],
  };

  // ---- Levels
  const sorted = [...sections.overview].sort((a, b) => a.level - b.level);
  const levels = applyRespec(sorted, data);
  if (levels !== sorted) {
    note(
      `The guide respecs to take ${className(levels[0]!.className)} first, so the build starts with it.`,
    );
  }
  if (!levels.length) {
    note('The guide has no levelling overview table, so no levels were imported.');
    const classId = post.buildData?.classes?.find((c) => data.classes.some((d) => d.id === c));
    build.levels.push({ classId: classId ?? data.classes[0]!.id, answers: {} });
  }

  for (const entry of levels) {
    if (entry.level !== build.levels.length + 1 || entry.level > 12) continue;
    const cls = matchName(className(entry.className), data.classes);
    if (!cls) {
      note(
        `The class at level ${entry.level} ("${entry.className}") is not one the planner knows, so levels from ${entry.level} on were not imported.`,
        entry.level,
      );
      break;
    }
    build.levels.push({ classId: cls.id, answers: {} });
    importLevel(build, entry, data, post.title, note);
  }
  if (build.levels.length === 0) build.levels.push({ classId: data.classes[0]!.id, answers: {} });

  // ---- Gear, once the levels say what the character is proficient with
  if (sections.equipment.length) importEquipment(build, sections.equipment, data, gearNote);
  else note('The guide has no gear recommendations by act, so no equipment was imported.');

  build.source = {
    kind: 'gamestegy',
    ...(options.url ? { url: options.url } : {}),
    title: post.title,
    importedAt: (options.now ?? new Date()).toISOString(),
    notes: notes.slice(0, 200).map((n) => ({ ...n, message: n.message.slice(0, 500) })),
  };

  return {
    name: characterName(post.title),
    build,
    notes,
    issues: validateBuild(build, data),
  };
}

/** Places one overview level's picks into the build's choices for that level. */
function importLevel(
  build: Build,
  entry: OverviewLevel,
  data: GameData,
  title: string,
  note: (message: string, level?: number) => void,
) {
  const level = entry.level;
  const answers = build.levels[level - 1]!.answers;
  const slotsNow = () => availableChoices(build, data, level);
  const taken = (slot: ChoiceSlot) =>
    Array.isArray(answers[slot.key]) ? (answers[slot.key] as string[]) : [];
  const offered = (slot: ChoiceSlot) => (slot.options.kind === 'ids' ? slot.options.ids : []);
  /** Whether this level's class prepares from its whole list and has no spell picks. */
  const preparesWholeList = () => {
    const classId = build.levels[level - 1]!.classId;
    const cls = data.classes.find((c) => c.id === classId);
    return (
      cls?.spellcasting?.preparation === 'whole-list' &&
      !slotsNow().some((s) => s.choice.type === 'spell')
    );
  };

  /**
   * Puts one named pick into the first fitting choice (lowest `rank` first). Returns true when
   * placed, 'full' when it fits a choice that is already full, false when nothing fits.
   */
  const place = (
    text: string,
    fits: (slot: ChoiceSlot) => boolean,
    rank: (slot: ChoiceSlot) => number = () => 0,
  ) => {
    const slots = slotsNow()
      .filter((s) => fits(s) && s.options.kind === 'ids')
      .sort((a, b) => rank(a) - rank(b));
    let matchedSomewhere = false;
    // "Metamagic: Twinned Spell" names the pick after a label; try the part after it too.
    const names = text.includes(': ') ? [text, text.slice(text.lastIndexOf(': ') + 2)] : [text];
    for (const slot of slots) {
      const options = candidates(slot, data, offered(slot));
      const found = names.map((n) => matchName(n, options)).find(Boolean);
      if (!found) continue;
      matchedSomewhere = true;
      if (taken(slot).includes(found.id)) return true;
      if (taken(slot).length >= capacity(slot.choice)) continue;
      answers[slot.key] = [...taken(slot), found.id];
      return true;
    }
    return matchedSomewhere ? 'full' : false;
  };

  // Subclasses and features first: they decide which other choices exist at this level.
  const order = (label: string) => {
    const kind = kindOf(label, data)?.type;
    return kind === 'subclass' ? 0 : kind === 'feat' ? 2 : kind === 'replace-spell' ? 3 : 1;
  };
  const lines = [...entry.lines].sort((a, b) => order(a.label) - order(b.label));

  // Guides for one subclass often never name it in the overview: take it from the title.
  if (!lines.some((line) => kindOf(line.label, data)?.type === 'subclass')) {
    for (const slot of slotsNow()) {
      if (slot.choice.type !== 'subclass' || slot.answer !== undefined) continue;
      const found = subclassFromTitle(title, candidates(slot, data, offered(slot)));
      if (!found) continue;
      answers[slot.key] = [found.id];
      note(`${found.name}, from the guide's title.`, level);
    }
  }

  for (const line of lines as QuietLine[]) {
    if (line.quiet) {
      for (const pick of items(line.value, data)) place(pick, (s) => s.key === 'class-skills');
      continue;
    }
    if (!line.label && abilitiesFromLine(line.value)) continue;
    if (/^abilities$/i.test(line.label)) continue;
    const labelled = slotsNow().find(
      (s) => line.label && normaliseName(s.label) === normaliseName(line.label),
    );
    const kind: Kind | undefined =
      kindOf(line.label, data) ??
      (labelled ? { type: 'labelled', label: labelled.label } : undefined) ??
      (line.label ? { type: 'any-option' } : undefined);
    if (!kind) {
      note(`Not understood: "${line.value}".`, level);
      continue;
    }
    if (kind.type === 'automatic') continue;
    if (kind.type === 'note') {
      const named = items(line.value, data).filter((p) => !isOpen(p));
      if (named.length) note(`${kind.what}: ${named.join(', ')}.`, level);
      continue;
    }
    // Clerics, Druids and Paladins pick no spells: a guide's spells are what to prepare.
    if (kind.type === 'spell' && kind.prefer === 'regular' && preparesWholeList()) {
      const named = items(line.value, data).filter((p) => !isOpen(p));
      if (named.length) note(`Spells to prepare: ${named.join(', ')}.`, level);
      continue;
    }
    // Replacements read "A -> B"; "any unused spell -> B" still names the new spell.
    if (kind.type === 'replace-spell') {
      if (!line.value.includes(' -> ')) {
        note(`The guide leaves spell replacement open here.`, level);
        continue;
      }
      for (const pick of line.value.split(/,(?![^(]*\))/)) {
        const [from, to] = pick.split(' -> ').map((s) => cleanText(s ?? ''));
        if (!to) continue;
        const slot = slotsNow().find(
          (s) => s.choice.type === 'replace-spell' && s.answer === undefined,
        );
        if (!slot || slot.options.kind !== 'replace') {
          note(`No spell can be replaced here; the guide suggests ${to}.`, level);
          continue;
        }
        const target = matchName(to, candidates(slot, data, slot.options.to));
        const source =
          from && !isOpen(from)
            ? matchName(from, candidates(slot, data, slot.options.from))
            : undefined;
        if (target && source) {
          answers[slot.key] = { from: source.id, to: target.id } as Answer;
        } else if (target) {
          note(`Replace a spell you rarely use with ${target.name}.`, level);
        } else {
          note(`Could not place the replacement "${cleanText(pick)}".`, level);
        }
      }
      continue;
    }

    const picks = items(line.value, data);
    if (picks.length === 0 || picks.every(isOpen)) {
      note(`The guide leaves ${line.label.toLowerCase()} open here.`, level);
      continue;
    }

    if (kind.type === 'feat') {
      // One feat per level: take the first suggestion that can be taken; the rest are notes.
      // A suggestion the character cannot take (an ability already at 20) gives way to the next.
      const named = picks.filter((p) => !isOpen(p));
      let first: string | undefined;
      let followUpNotes: string[] = [];
      for (const [i, pick] of named.entries()) {
        const before = structuredClone(answers);
        if (place(featName(pick), (s) => s.choice.type === 'feat') !== true) continue;
        const increases = abilityIncreases(pick);
        followUpNotes = [];
        for (const slot of slotsNow().filter((s) => s.key.startsWith('feat:'))) {
          if (slot.choice.type === 'ability-increase' && Object.keys(increases).length) {
            answers[slot.key] = increases;
          } else if (answers[slot.key] === undefined) {
            followUpNotes.push(`Choose ${slot.label.toLowerCase()} for ${featName(pick)}.`);
          }
        }
        const broken = validateBuild(build, data).some(
          (issue) =>
            issue.severity === 'error' &&
            issue.characterLevel === level &&
            !!issue.key?.startsWith('feat:'),
        );
        if (broken && i < named.length - 1) {
          for (const key of Object.keys(answers)) delete answers[key];
          Object.assign(answers, before);
          continue;
        }
        first = pick;
        break;
      }
      const rest = named.filter((p) => p !== first);
      if (first) {
        for (const message of followUpNotes) note(message, level);
      } else if (named.length) {
        note(`None of the suggested feats can be taken here: ${named.join(', ')}.`, level);
      }
      if (first && rest.length) note(`Other feats the guide suggests: ${rest.join(', ')}.`, level);
      continue;
    }

    const extras: string[] = [];
    const unplaced: string[] = [];
    for (const pick of picks) {
      if (isOpen(pick)) continue;
      let placed: boolean | 'full';
      if (kind.type === 'subclass') {
        placed = place(pick, (s) => s.choice.type === 'subclass');
        // "Evocation" for Evocation School, "Giants" for Path of Giants.
        const slot = slotsNow().find((s) => s.choice.type === 'subclass' && !s.answer);
        const found = slot && subclassFromTitle(pick, candidates(slot, data, offered(slot)));
        if (!placed && slot && found) {
          answers[slot.key] = [found.id];
          placed = true;
        }
      } else if (kind.type === 'option') {
        placed = place(pick, (s) => s.choice.type === 'option' && s.choice.group === kind.group);
      } else if (kind.type === 'cantrip') {
        placed = place(pick, (s) => s.choice.type === 'cantrip');
      } else if (kind.type === 'expertise') {
        placed = place(pick, (s) => s.choice.type === 'expertise');
      } else if (kind.type === 'labelled') {
        placed = place(pick, (s) => s.label === kind.label);
      } else if (kind.type === 'any-option') {
        placed = place(pick, (s) => s.choice.type === 'option');
      } else if (kind.type === 'skill') {
        // Skills the background or race already grant need no pick.
        const skill = matchName(
          pick,
          SKILLS.map((id) => ({ id, name: id.replace(/-/g, ' ') })),
        );
        // A Skills line where only expertise is chosen (Rogue 6) names the expertise.
        const now = slotsNow();
        if (
          !now.some((s) => s.choice.type === 'skill') &&
          now.some((s) => s.choice.type === 'expertise')
        ) {
          placed = place(pick, (s) => s.choice.type === 'expertise');
        } else if (skill && deriveCharacter(build, data).skills.includes(skill.id as Skill)) {
          continue;
        } else {
          // Class skills first; a race's free skill (Human) takes what is left.
          placed = place(
            pick,
            (s) => s.choice.type === 'skill',
            (s) => (s.key === 'class-skills' ? 0 : 1),
          );
        }
      } else {
        const anySchool = (s: ChoiceSlot) => /any school/i.test(s.label);
        placed = place(
          pick,
          (s) =>
            s.choice.type === 'spell' &&
            (kind.prefer === 'extra' ? !!s.choice.extra : !s.choice.extra),
          (s) => (kind.prefer === 'any-school' ? (anySchool(s) ? 0 : 1) : anySchool(s) ? 1 : 0),
        );
      }
      if (placed === 'full') extras.push(pick);
      else if (!placed) unplaced.push(pick);
    }
    // A label the importer only guessed at, with nothing placed: say so once.
    if (
      kind.type === 'any-option' &&
      unplaced.length &&
      unplaced.length === picks.filter((p) => !isOpen(p)).length
    ) {
      note(`Not understood: "${line.label}: ${line.value}".`, level);
    } else {
      for (const pick of unplaced) {
        note(`"${pick}" (${line.label.toLowerCase()}) could not be placed at this level.`, level);
      }
    }
    if (extras.length)
      note(`Also suggested (${line.label.toLowerCase()}): ${extras.join(', ')}.`, level);
    if (picks.some(isOpen))
      note(`The guide leaves some ${line.label.toLowerCase()} open here.`, level);
  }
}
