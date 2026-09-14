import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The console is same-origin with the hub in the bank. In local dev we proxy /api (REST + SSE) to the
// hub on 7070 so the browser never has to think about CORS and EventSource streams straight through.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
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
