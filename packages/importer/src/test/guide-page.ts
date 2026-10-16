import { stringify } from 'devalue';

/** Overview rows: one level, its class cell, and the lines in its Selection column. */
export interface OverviewRow {
  level: number;
  className: string;
  lines: string[];
}

/** An overview table shaped like Gamestegy's ("Level | Class | Selection", rowspans per level). */
export function overviewTable(rows: OverviewRow[], heading = 'Leveling Overview'): string {
  const body = rows
    .flatMap(({ level, className, lines }) => {
      const cells = lines.length ? lines : ['-'];
      return cells.map((line, i) =>
        i === 0
          ? `<tr><td rowspan="${cells.length}">${level}</td><td rowspan="${cells.length}">${className}</td><td>${line}</td></tr>`
          : `<tr><td>${line}</td></tr>`,
      );
    })
    .join('');
  return `<h2>${heading}</h2><table class="expandable-table"><thead><tr><th>Level</th><th>Class</th><th>Selection</th></tr></thead><tbody>${body}</tbody></table>`;
}

/** A tagged game entity, the way guides mark spells and features. */
export const entity = (name: string, type = 'action') =>
  `<span class="bg3-actions" data-bg3-id="1" data-bg3-type="${type}"><span class="bg3-name">${name}</span></span>\u200b`;

export const simpleTable = (heading: string, firstColumn: string[]) =>
  `<h3>${heading}</h3><table><tbody><tr><th>${heading}</th><th>Description</th></tr>${firstColumn
    .map((c) => `<tr><td>${c}</td><td>Why it is good.</td></tr>`)
    .join('')}</tbody></table>`;

/** An item link the way guides tag equipment. */
export const itemLink = (name: string) =>
  `<a class="bg3-equipment bg3-object-block" href="#" data-bg3-id="1" data-bg3-type="equipment"><img class="bg3-icon-block" alt="${name} icon bg3"><span class="bg3-name">${name}</span></a>`;

/**
 * A gear table shaped like Gamestegy's ("Slot | Item | Description"): the slot cell spans its
 * items' rows. Items in `[brackets]` are written as plain text instead of item links.
 */
export function gearTable(rows: { slot: string; items: string[] }[]): string {
  const cell = (item: string) => (item.startsWith('[') ? item.slice(1, -1) : itemLink(item));
  const body = rows
    .flatMap(({ slot, items }) =>
      items.map((item, i) =>
        i === 0
          ? `<tr><td rowspan="${items.length}"><img alt="slot bg3">${slot}</td><td>${cell(item)}</td><td>Why it is good.</td></tr>`
          : `<tr><td>${cell(item)}</td><td>Also good.</td></tr>`,
      ),
    )
    .join('');
  return `<table><tbody><tr><th>Slot</th><th>Item</th><th>Description</th></tr>${body}</tbody></table>`;
}

/** The placeholder Gamestegy leaves in the article for a build panel it fills in later. */
export const buildPanel = (buildId: number, sets: string) =>
  `<figure class="bg3-equipment-embed"><strong>BG3 Build Equipment Embed</strong><br>Build ID: ${buildId}<br>Mode: Full Equipment<br>Sets: ${sets}</figure>`;

/** A post page with the article embedded the way Nuxt embeds it. */
export function guidePage(
  article: string,
  title = 'Test Guide - Example Build',
  postId = 1,
): string {
  const payload = stringify({
    data: {
      'gamePostPage:bg3:1:test': {
        post: { id: postId, title, text: article, build_data: { classes: [] } },
      },
    },
  });
  return `<!doctype html><html><body><div id="__nuxt"></div><script type="application/json" data-nuxt-data="nuxt-app" id="__NUXT_DATA__">${payload}</script></body></html>`;
}
