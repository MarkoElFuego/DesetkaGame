import { defineConfig } from 'vite';

export default defineConfig({
  base: '/DesetkaGame/',
  root: '.',
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  server: {
    open: true,
  },
});
