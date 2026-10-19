import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  server: { port: 5180, strictPort: true },
  preview: { port: 5181 },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        terms: resolve(import.meta.dirname, 'terms-and-conditions/index.html'),
        privacy: resolve(import.meta.dirname, 'privacy-policy/index.html'),
        notfound: resolve(import.meta.dirname, '404.html'),
      },
    },
  },
});
