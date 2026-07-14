import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

// App name is passed via environment variable for per-app builds
const appName = process.env.APP_NAME || 'operation-result';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  root: path.resolve(__dirname, 'src/apps', appName),
  build: {
    outDir: path.resolve(__dirname, 'dist', appName),
    emptyOutDir: true,
  },
});
