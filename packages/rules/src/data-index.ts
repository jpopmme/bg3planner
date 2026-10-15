import type {
  Background,
  ClassDef,
  Feat,
  Feature,
  GameData,
  Item,
  Origin,
  OptionGroup,
  Race,
  Spell,
  SubclassDef,
  Subrace,
  WeaponType,
} from '@bg3planner/gamedata';

/** Id lookups over a dataset, built once per dataset. */
export interface DataIndex {
  data: GameData;
  classes: Map<string, ClassDef>;
  subclasses: Map<string, SubclassDef>;
  races: Map<string, Race>;
  subraces: Map<string, Subrace>;
  backgrounds: Map<string, Background>;
  feats: Map<string, Feat>;
  origins: Map<string, Origin>;
  features: Map<string, Feature>;
  optionGroups: Map<string, OptionGroup>;
  spells: Map<string, Spell>;
  weaponTypes: Map<string, WeaponType>;
  items: Map<string, Item>;
}

const cache = new WeakMap<GameData, DataIndex>();

const byId = <T extends { id: string }>(items: T[]) => new Map(items.map((i) => [i.id, i]));

export function indexData(data: GameData): DataIndex {
  let index = cache.get(data);
  if (!index) {
    index = {
      data,
      classes: byId(data.classes),
      subclasses: byId(data.subclasses),
      races: byId(data.races),
      subraces: byId(data.races.flatMap((r) => r.subraces)),
      backgrounds: byId(data.backgrounds),
      feats: byId(data.feats),
      origins: byId(data.origins),
      features: byId(data.features),
      optionGroups: byId(data.optionGroups),
      spells: byId(data.spells),
      weaponTypes: byId(data.weaponTypes),
      items: byId(data.items),
    };
    cache.set(data, index);
  }
  return index;
}
