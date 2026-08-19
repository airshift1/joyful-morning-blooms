import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      // Proxy to local Ollama HTTP API during development
      '/api/ollama': {
        target: 'http://localhost:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ollama/, ''),
      },
      // Proxy to local Coqui TTS HTTP API during development
      '/api/coqui': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/coqui/, ''),
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
});
