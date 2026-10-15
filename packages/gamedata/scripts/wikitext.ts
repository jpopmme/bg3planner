// Turning bg3.wiki Cargo exports (wikitext with expanded HTML templates) into plain text.

const ENTITIES: Record<string, string> = {
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  nbsp: '\u00a0',
  nobreak: '',
  plus: '+',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n =
        code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return String.fromCodePoint(n);
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/**
 * Replaces `[[File:…]]` links with a space (an icon can stand between words, as in `2d8 Fire`).
 * They can nest other links in their alt text (`[[File:X.png|alt=[[Saving Throw]]|…]]`).
 */
function removeFileLinks(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (text.startsWith('[[File:', i)) {
      let depth = 0;
      do {
        if (text.startsWith('[[', i)) {
          depth++;
          i += 2;
        } else if (text.startsWith(']]', i)) {
          depth--;
          i += 2;
        } else i++;
      } while (depth > 0 && i < text.length);
      out += ' ';
    } else out += text[i++];
  }
  return out;
}

/** Wikitext (with expanded HTML templates) → plain text. */
export function wikiToText(raw: string): string {
  // Template output is escaped up to three times in the export (`&amp;amp;nbsp;`).
  let text = raw;
  for (let previous = ''; previous !== text;) {
    previous = text;
    text = decodeEntities(text);
  }
  text = removeFileLinks(text);
  // Footnotes point at the wiki page's Bugs and Notes sections, which are not shown here.
  text = text.replace(/<sup>[\s\S]*?<\/sup>/g, '');
  text = text.replace(/<[^>]*>/g, '');
  text = text.replace(/\{\{[^{}]*\}\}/g, '');
  text = text.replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1').replace(/\[\[([^\]]*)\]\]/g, '$1');
  text = text.replace(/'{2,}/g, '');
  text = text.replace(/[\u00a0\u2009\u202f]/g, ' ');
  // Pointers to the wiki page's own Notes and Bugs sections.
  text = text.replace(/\s*\[?\s*See:? (Notes|Bugs)\s*\]/g, '');
  // Icons removed above leave brackets behind: `Scarlet Feast ()`, `Knock (+ )`, `( Recharge: …)`.
  text = text.replace(/\(\s*\+?\s*\)/g, '').replace(/\(\s+/g, '(');
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/ +([.,:])/g, '$1')
    .replace(/^ +| +$/gm, '')
    .trim();
}
