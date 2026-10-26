import fs from 'node:fs';
import path from 'node:path';

/**
 * The design standard lives in frontend/theme (one copy). The console imports it, and partner screens link
 * it from the console host: /theme/onefinux-tokens.css and /theme/onefinux-wijmo.css. In dev the middleware
 * serves the files; in a build they are emitted into dist/theme, so nginx and IIS serve them as static files.
 */
export const THEME_FILES = ['onefinux-tokens.css', 'onefinux-wijmo.css'];

export function themeFileFor(urlPath) {
  const m = /^\/theme\/([a-z0-9-]+\.css)$/.exec(String(urlPath || '').split('?')[0]);
  return m && THEME_FILES.includes(m[1]) ? m[1] : null;
}

export function sharedThemePlugin(themeDir) {
  return {
    name: 'ofx-shared-theme',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = themeFileFor(req.url);
        if (!file) return next();
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(fs.readFileSync(path.join(themeDir, file)));
      });
    },
    generateBundle() {
      for (const file of THEME_FILES) {
        this.emitFile({ type: 'asset', fileName: `theme/${file}`, source: fs.readFileSync(path.join(themeDir, file), 'utf8') });
      }
    },
  };
}
