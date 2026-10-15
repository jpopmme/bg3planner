import type { EquipSlot } from '@bg3planner/rules';

/**
 * Outline icons for the equipment slots, drawn for this app on a 24×24 grid with round 1.75px
 * strokes. Each entry is a list of SVG path `d` strings.
 */
export const SLOT_ICONS: Record<EquipSlot, string[]> = {
  head: ['M5 15a7 7 0 0 1 14 0v5h-4.5v-5h-5v5H5z', 'M12 4v4', 'M9.5 15h5'],
  cloak: ['M9 3h6l1 3-2 1.5L19 21H5l5-13.5L8 6z', 'M12 9v12'],
  armour: ['M8 3l2.5 2h3L16 3l4 3-2.5 4V21h-11V10L4 6z', 'M9.5 12h5', 'M9.5 16h5'],
  gloves: [
    'M7.5 21v-4.5L5 12V8a1.5 1.5 0 0 1 3 0V5.5a1.5 1.5 0 0 1 3 0V5a1.5 1.5 0 0 1 3 0v.5a1.5 1.5 0 0 1 3 0V12l1.4-1.4a1.6 1.6 0 0 1 2.3 2.3L16 17.5V21z',
    'M7.5 18h8.5',
  ],
  boots: ['M7 3h6v9.5l5 2a2.5 2.5 0 0 1 1.5 2.3V19H7z', 'M7 21h12.5', 'M7 8h6'],
  amulet: ['M6.5 3l5.5 8.5L17.5 3', 'M12 11.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z'],
  ring1: ['M12 9a6 6 0 1 0 0 12 6 6 0 0 0 0-12z', 'M10 6.5L12 4l2 2.5L12 9z'],
  ring2: ['M12 9a6 6 0 1 0 0 12 6 6 0 0 0 0-12z', 'M10 6.5L12 4l2 2.5L12 9z'],
  meleeMain: ['M21 3v3L10.5 16.5l-3-3L18 3z', 'M5 12l7 7', 'M7.5 16.5L3.5 20.5'],
  meleeOff: ['M12 3l8 3v6c0 4.8-3.4 8-8 9-4.6-1-8-4.2-8-9V6z', 'M12 7v10', 'M8 11h8'],
  rangedMain: [
    'M8 3c6.5 4 6.5 14 0 18',
    'M8 3v18',
    'M3 12h16',
    'M16.5 9.5L19 12l-2.5 2.5',
    'M3 10l2 2-2 2',
  ],
  rangedOff: ['M3 9c5-4 13-4 18 0', 'M3 9l9 4 9-4', 'M12 5v15', 'M12 16l-3.5 4.5'],
};
