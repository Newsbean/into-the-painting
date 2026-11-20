import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// Dev server only: lets the running game hand rendered frames (and audio) to
// disk under ./capture. It is how the showcase film is recorded frame by frame.
const captureSink = () => ({
  name: 'capture-sink',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__capture', (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        return res.end();
      }
      // only this machine may write here, even when the server is opened to the network (npm run dev:lan)
      const from = req.socket.remoteAddress || '';
      if (!/^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(from)) {
        res.statusCode = 403;
        return res.end('local only');
      }
      const url = new URL(req.url, 'http://local');
      const name = (url.searchParams.get('name') || '').replace(/\\/g, '/');
      if (!/^[\w\-./]+$/.test(name) || name.includes('..') || name.startsWith('/')) {
        res.statusCode = 400;
        return res.end('bad name');
      }
      const file = path.join(process.cwd(), 'capture', name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const out = fs.createWriteStream(file);
      req.pipe(out);
      out.on('finish', () => res.end('ok'));
      out.on('error', (e) => {
        res.statusCode = 500;
        res.end(String(e));
      });
    });
  },
});

// npm run dev          the page reloads itself when a file is saved
// npm run dev:steady   it does not (--mode steady): for film capture and automated runs,
//                      where a reload halfway through would spoil the take
// npm run dev:lan      also reachable from other devices on the same network
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [captureSink()],
  server: { host: '127.0.0.1', hmr: mode !== 'steady' },
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
}));
