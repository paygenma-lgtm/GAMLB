import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  // Точка входа — app.html (не index.html, который статичный)
  root: '.',
  build: {
    rollupOptions: {
      input: {
        app: path.resolve(__dirname, 'app.html'),
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
