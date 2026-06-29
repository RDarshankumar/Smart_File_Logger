import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  outDir: 'dist',
  target: 'node18',
  platform: 'node',
  external: [],
  noExternal: [],
  banner: {
    js: '/* smart-file-logger — Production-ready file logger for Node.js */',
  },
});
