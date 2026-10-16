export { importGamestegyGuide, type ImportNote, type ImportResult } from './gamestegy';

/**
 * Bumped whenever the importer reads guides differently, so cached results from an older importer
 * are not reused. 2: gear per act. 3: all classes, respecs, subclasses from the title.
 * 4: Gamestegy build panels (gear and abilities), "Build Overview" tables.
 */
export const IMPORTER_VERSION = 4;
export { GuideFormatError, extractPost, type GuidePost } from './nuxt';
export { matchName } from './match';
export { embeddedBuildUrl } from './embeds';

/** Whether a URL is a Gamestegy BG3 post the importer can read. */
export function isGamestegyGuideUrl(url: URL): boolean {
  return (
    url.protocol === 'https:' &&
    (url.hostname === 'gamestegy.com' || url.hostname === 'www.gamestegy.com') &&
    /^\/post\/bg3\/\d+\/[\w-]+\/?$/.test(url.pathname)
  );
}
