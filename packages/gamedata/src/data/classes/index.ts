import type { ClassDef, SubclassDef } from '../../schema';
import { fighter, fighterSubclasses } from './fighter';
import { warlock, warlockSubclasses } from './warlock';

export const classes: ClassDef[] = [fighter, warlock];
export const subclasses: SubclassDef[] = [...fighterSubclasses, ...warlockSubclasses];
