import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const diagrams = path.resolve(webRoot, '../../docs/design/diagrams');

// The console is same-origin with the hub in the bank. In local dev we proxy /api (REST + SSE) to the
// hub on 7070 so the browser never has to think about CORS and EventSource streams straight through.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@diagrams': diagrams },
  },
  server: {
    port: 5173,
    fs: { allow: [webRoot, diagrams] },
    proxy: {
      '/api': {
        target: 'http://localhost:7070',
        changeOrigin: true,
      },
      '/sim': {
        target: 'http://localhost:7081',
        changeOrigin: true,
      },
    },
  },
});
