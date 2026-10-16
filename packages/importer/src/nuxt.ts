import { unflatten } from 'devalue';

/** The build guide embedded in a Gamestegy post page. */
export interface GuidePost {
  /** Gamestegy's post id, as in /post/bg3/<id>/<slug>. */
  id?: number;
  title: string;
  /** Article HTML. */
  text: string;
  /** Gamestegy's own build summary, e.g. `{ classes: ['fighter', 'warlock'], tier: 'S+' }`. */
  buildData?: { classes?: string[]; overview?: string };
}

// Nuxt wraps reactive state in typed entries; only the value inside matters here.
const unwrap = (value: unknown) => value;
const NUXT_REVIVERS: Record<string, (value: unknown) => unknown> = {
  Reactive: unwrap,
  ShallowReactive: unwrap,
  Ref: unwrap,
  ShallowRef: unwrap,
  EmptyRef: () => undefined,
  EmptyShallowRef: () => undefined,
  NuxtError: unwrap,
  Island: unwrap,
};

export class GuideFormatError extends Error {}

/** Finds the first object (depth-first) for which `match` holds. */
function find(
  value: unknown,
  match: (o: Record<string, unknown>) => boolean,
): Record<string, unknown> | undefined {
  const seen = new Set<unknown>();
  const stack = [value];
  while (stack.length) {
    const next = stack.pop();
    if (!next || typeof next !== 'object' || seen.has(next)) continue;
    seen.add(next);
    if (!Array.isArray(next) && match(next as Record<string, unknown>)) {
      return next as Record<string, unknown>;
    }
    stack.push(...Object.values(next));
  }
  return undefined;
}

/**
 * Reads the guide from a post page. Gamestegy renders posts with Nuxt, which embeds the whole
 * article in `<script id="__NUXT_DATA__">` as a devalue-flattened payload.
 */
export function extractPost(html: string): GuidePost {
  const match = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) {
    throw new GuideFormatError('This page does not contain a Gamestegy guide (no Nuxt data).');
  }
  let payload: unknown;
  try {
    payload = unflatten(JSON.parse(match[1]!), NUXT_REVIVERS);
  } catch {
    throw new GuideFormatError('The guide data on this page could not be read.');
  }
  const post = find(
    payload,
    (o) => typeof o.text === 'string' && typeof o.title === 'string' && 'build_data' in o,
  );
  if (!post) throw new GuideFormatError('This page is not a build guide.');
  return {
    ...(Number.isSafeInteger(post.id) ? { id: post.id as number } : {}),
    title: String(post.title).trim(),
    text: String(post.text),
    ...(post.build_data && typeof post.build_data === 'object'
      ? { buildData: post.build_data as GuidePost['buildData'] }
      : {}),
  };
}
