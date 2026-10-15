import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { afterAll, describe, expect, it } from 'vitest';
import { precompressDir } from './precompress';

const dir = mkdtempSync(join(tmpdir(), 'bg3planner-dist-'));
afterAll(() => rmSync(dir, { recursive: true }));

describe('precompressDir', () => {
  it('writes .br and .gz copies of large text files only', () => {
    mkdirSync(join(dir, 'assets'));
    const big = 'console.log("hello");\n'.repeat(200);
    writeFileSync(join(dir, 'assets', 'app.js'), big);
    writeFileSync(join(dir, 'small.css'), 'a{}');
    writeFileSync(join(dir, 'icon.png'), Buffer.alloc(4096));

    expect(precompressDir(dir)).toEqual([join(dir, 'assets', 'app.js')]);
    const path = join(dir, 'assets', 'app.js');
    expect(brotliDecompressSync(readFileSync(`${path}.br`)).toString()).toBe(big);
    expect(gunzipSync(readFileSync(`${path}.gz`)).toString()).toBe(big);
  });
});
