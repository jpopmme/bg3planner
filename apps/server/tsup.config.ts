import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node22',
  clean: true,
  // One self-contained file: workspace packages ship TypeScript source, and bundling the
  // third-party ones too means a deployment (or the Docker image) needs no node_modules.
  noExternal: [/.*/],
  // Bundled CommonJS packages call require() for Node built-ins.
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
  // Keep `node:` prefixes: `node:sqlite` only exists with the prefix.
  removeNodeProtocol: false,
});
