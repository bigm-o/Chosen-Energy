/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3100,  // Changed to avoid conflict
    allowedHosts: ["chosen-energy-production.up.railway.app"],
    proxy: {
      '/api': {
        target: 'http://localhost:5100',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    allowedHosts: ["chosen-energy-production.up.railway.app"],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
