import { ABILITIES, type Ability, SKILLS, type Skill } from '@bg3planner/shared';
import type { GameData } from '@bg3planner/gamedata';
import type { DerivedCharacter } from './derive';
import { ACT_NAMES, itemConflicts } from './equipment';
import type { Party } from './party';
import { MAX_ACTIVE } from './party';

export interface PartyIssue {
  severity: 'error' | 'warning';
  /** The member the issue is about, if it is about one. */
  memberId?: string;
  message: string;
}

/** Problems with the party as a whole (each character's own build is checked separately). */
export function partyIssues(party: Party, data: GameData): PartyIssue[] {
  const issues: PartyIssue[] = [];
  const seen = new Map<string, string>();
  for (const member of party.members) {
    const originId = member.build.originId ?? 'custom';
    const origin = data.origins.find((o) => o.id === originId);
    if (!origin || origin.kind === 'custom') continue;
    if (seen.has(originId)) {
      issues.push({
        severity: 'error',
        memberId: member.id,
        message: `${origin.name} is in the roster twice; there is only one ${origin.name}.`,
      });
    }
    seen.set(originId, member.id);
  }
  // Gear only clashes between characters who fight together.
  const active = party.members.filter((m) => party.activeMemberIds.includes(m.id));
  const names = new Map(active.map((m) => [m.id, m.name || 'Unnamed']));
  for (const { act, itemId, memberIds } of itemConflicts(active, data)) {
    const item = data.items.find((i) => i.id === itemId)!;
    const who = memberIds.map((id) => names.get(id)!);
    const list = `${who.slice(0, -1).join(', ')} and ${who.at(-1)}`;
    issues.push({
      severity: 'warning',
      memberId: memberIds.at(-1)!,
      message: `${ACT_NAMES[act]}: ${list} ${who.length === 2 ? 'both' : 'all'} plan to use ${item.name}, but there is only one.`,
    });
  }
  if (party.activeMemberIds.length === 0) {
    issues.push({ severity: 'warning', message: 'No one is in the active party yet.' });
  } else if (
    party.activeMemberIds.length < MAX_ACTIVE &&
    party.members.length > party.activeMemberIds.length
  ) {
    issues.push({
      severity: 'warning',
      message: `The active party has ${party.activeMemberIds.length} of ${MAX_ACTIVE} places filled.`,
    });
  }
  return issues;
}

export interface Best {
  bonus: number;
  /** Members sharing the best bonus. */
  memberIds: string[];
}

export interface PartySummary {
  skills: Record<Skill, Best>;
  savingThrows: Record<Ability, Best>;
  /** Members who cannot see in the dark. */
  withoutDarkvision: string[];
}

function best(entries: { id: string; bonus: number }[]): Best {
  const bonus = Math.max(...entries.map((e) => e.bonus));
  return { bonus, memberIds: entries.filter((e) => e.bonus === bonus).map((e) => e.id) };
}

/** Who in a group rolls best for each skill and saving throw, and who lacks darkvision. */
export function summariseParty(
  members: { id: string; character: DerivedCharacter }[],
): PartySummary | undefined {
  if (members.length === 0) return undefined;
  return {
    skills: Object.fromEntries(
      SKILLS.map((skill) => [
        skill,
        best(members.map((m) => ({ id: m.id, bonus: m.character.skillBonuses[skill] }))),
      ]),
    ) as Record<Skill, Best>,
    savingThrows: Object.fromEntries(
      ABILITIES.map((ability) => [
        ability,
        best(members.map((m) => ({ id: m.id, bonus: m.character.savingThrowBonuses[ability] }))),
      ]),
    ) as Record<Ability, Best>,
    withoutDarkvision: members.filter((m) => m.character.darkvision === 0).map((m) => m.id),
  };
}
