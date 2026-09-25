import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // O frontend lê o SEU PRÓPRIO .env (frontend/.env), separado do .env da raiz
  // que serve o backend. Não é preferência de organização: um .env compartilhado
  // faz o `NODE_ENV=development` do backend contaminar o build do frontend, que
  // passa a embarcar o React de desenvolvimento em produção. Além disso mantém o
  // arquivo com segredos longe do workspace que gera bundle público.

  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },

  server: { port: 5173 },

  // Manifesto (dist/.vite/manifest.json): o servidor o lê para anunciar no
  // HTML o chunk da página pedida (`modulepreload`), em paralelo com o JS
  // principal — em vez de o navegador só descobri-lo depois de executá-lo.
  build: { manifest: true },

  // Sem proxy para /api de propósito: chamar a API na origem real exercita a
  // configuração de CORS em desenvolvimento, em vez de mascará-la.
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
