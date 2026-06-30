import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  build: {
    rollupOptions: {
      input: 'index.dev.html',
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
    modulePreload: false,
  },
  server: {
    port: 5180,
    strictPort: true,
    open: '/index.dev.html',
  },
  plugins: [
    {
      name: 'dev-index-redirect',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/' || req.url === '/index.html') {
            req.url = '/index.dev.html';
          }
          next();
        });
      },
    },
    {
      name: 'file-protocol-html',
      transformIndexHtml(html) {
        if (process.env.NODE_ENV !== 'production') return html;
        return html
          .replace(/\s+crossorigin/g, '')
          .replace(/<script type="module"/g, '<script defer')
          .replace(/<script src=/g, '<script defer src=');
      },
    },
  ],
});
