/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Caminhos relativos: a mesma build serve o link web, a app Capacitor e qualquer subpasta.
  base: './',
  build: {
    rollupOptions: {
      output: {
        // Nomes fixos para a página publicada (web/artifact.html) apontar sempre para os mesmos ficheiros.
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/app.[ext]'
      }
    }
  },
  test: {
    include: ['tests/**/*.test.ts']
  }
});
