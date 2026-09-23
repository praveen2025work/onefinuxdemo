import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { javaDevProxies } from './dev-proxy.js';
import { helixStubPlugin } from './helix-stub.js';

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const diagrams = path.resolve(webRoot, '../../docs/design/diagrams');

// The console is same-origin with the hub in the bank. In local dev we proxy /api (REST + SSE) to the
// hub on 7070 and /sim to 7081. Strip Origin on that hop so Spring CORS does not see the Vite port.
// Port 7091: 5173 is commonly taken by other Vite apps on a demo laptop.
// host 0.0.0.0: Ethernet / WiFi IPv4 (not only localhost) can load the UI.
export default defineConfig({
  plugins: [react(), helixStubPlugin()],
  resolve: {
    alias: { '@diagrams': diagrams },
  },
  server: {
    host: '0.0.0.0',
    port: 7091,
    strictPort: true,
    fs: { allow: [webRoot, diagrams] },
    proxy: javaDevProxies(),
  },
});
