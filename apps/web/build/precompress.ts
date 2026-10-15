import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import type { Plugin, ResolvedConfig } from 'vite';

const COMPRESSIBLE = /\.(html|js|css|json|svg|webmanifest)$/;
/** Smaller files gain little and cost a request header's worth either way. */
const MIN_BYTES = 1024;

function* files(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else yield path;
  }
}

/** Writes `.br` and `.gz` copies of text files next to them, for the server to send as they are. */
export function precompressDir(dir: string): string[] {
  const written: string[] = [];
  for (const path of files(dir)) {
    if (!COMPRESSIBLE.test(path)) continue;
    const content = readFileSync(path);
    if (content.length < MIN_BYTES) continue;
    writeFileSync(
      `${path}.br`,
      brotliCompressSync(content, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }),
    );
    writeFileSync(`${path}.gz`, gzipSync(content, { level: 9 }));
    written.push(path);
  }
  return written;
}

export function precompress(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'bg3planner-precompress',
    apply: 'build',
    configResolved(resolved) {
      config = resolved;
    },
    closeBundle() {
      precompressDir(join(config.root, config.build.outDir));
    },
  };
}
