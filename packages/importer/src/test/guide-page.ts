import { stringify } from 'devalue';

/** Overview rows: one level, its class cell, and the lines in its Selection column. */
export interface OverviewRow {
  level: number;
  className: string;
  lines: string[];
}

/** An overview table shaped like Gamestegy's ("Level | Class | Selection", rowspans per level). */
export function overviewTable(rows: OverviewRow[]): string {
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
  return `<h2>Leveling Overview</h2><table class="expandable-table"><thead><tr><th>Level</th><th>Class</th><th>Selection</th></tr></thead><tbody>${body}</tbody></table>`;
}

/** A tagged game entity, the way guides mark spells and features. */
export const entity = (name: string, type = 'action') =>
  `<span class="bg3-actions" data-bg3-id="1" data-bg3-type="${type}"><span class="bg3-name">${name}</span></span>\u200b`;

export const simpleTable = (heading: string, firstColumn: string[]) =>
  `<h3>${heading}</h3><table><tbody><tr><th>${heading}</th><th>Description</th></tr>${firstColumn
    .map((c) => `<tr><td>${c}</td><td>Why it is good.</td></tr>`)
    .join('')}</tbody></table>`;

/** A post page with the article embedded the way Nuxt embeds it. */
export function guidePage(article: string, title = 'Test Guide - Example Build'): string {
  const payload = stringify({
    data: {
      'gamePostPage:bg3:1:test': { post: { title, text: article, build_data: { classes: [] } } },
    },
  });
  return `<!doctype html><html><body><div id="__nuxt"></div><script type="application/json" data-nuxt-data="nuxt-app" id="__NUXT_DATA__">${payload}</script></body></html>`;
}
