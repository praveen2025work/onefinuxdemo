import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { gridCssPlugin } from './grid-css.js';

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const themeDir = path.resolve(webRoot, '../theme');

// The grid library: <ofx-grid> as one classic script (React and Wijmo inside) plus its stylesheet, built into dist/lib
// so the console serves them at /lib/onefinux-grid.js and /lib/onefinux-grid.css for any other app to load. A classic
// script (not an ES module) loads from another origin without CORS headers on the console's server.
export default defineConfig({
  plugins: [react(), gridCssPlugin({ webRoot, themeDir })],
  resolve: { alias: { '@theme': themeDir } },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'dist/lib',
    emptyOutDir: true,
    copyPublicDir: false,
    cssCodeSplit: false,
    lib: { entry: path.resolve(webRoot, 'src/grid/element.jsx'), formats: ['iife'], name: 'OneFinanceGrid', fileName: () => 'onefinux-grid.js' },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
