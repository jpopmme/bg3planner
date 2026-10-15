export { importGamestegyGuide, type ImportNote, type ImportResult } from './gamestegy';
export { GuideFormatError, extractPost, type GuidePost } from './nuxt';
export { matchName } from './match';

/** Whether a URL is a Gamestegy BG3 post the importer can read. */
export function isGamestegyGuideUrl(url: URL): boolean {
  return (
    url.protocol === 'https:' &&
    (url.hostname === 'gamestegy.com' || url.hostname === 'www.gamestegy.com') &&
    /^\/post\/bg3\/\d+\/[\w-]+\/?$/.test(url.pathname)
  );
}
