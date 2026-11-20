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

export default defineConfig({
  base: './',
  plugins: [captureSink()],
  server: { host: '127.0.0.1', hmr: false },
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
});
