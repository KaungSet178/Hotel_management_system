import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { paymentProofStore } from '../shared/vite-payment-proofs.mjs';

export default defineConfig({
  plugins: [react(), tailwindcss(), paymentProofStore()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    open: false,
  },
  build: {
    target: 'es2022',
  },
});