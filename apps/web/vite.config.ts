import path from 'node:path';
import process from 'node:process';
import react from '@vitejs/plugin-react';
import { tanstackRouterGenerator } from '@tanstack/router-plugin/vite';
import { defineConfig } from 'vite';

process.setMaxListeners(20);

const __dirname = import.meta.dirname;

export default defineConfig({
  plugins: [tanstackRouterGenerator({ target: 'react' }), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
});
