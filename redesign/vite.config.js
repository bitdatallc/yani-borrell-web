import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5180, strictPort: true },
  preview: { port: 5181 },
  build: { outDir: 'dist', assetsInlineLimit: 0 },
});
