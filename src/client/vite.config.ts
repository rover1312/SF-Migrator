import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // Repo scripts run Vite from the repo root, so point it at the client dir
  // where index.html lives. Build output lands in src/client/dist/.
  root: 'src/client',
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    outDir: 'dist',
  },
});
