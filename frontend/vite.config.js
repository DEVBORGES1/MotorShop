import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * JS com prioridade baixa. As páginas públicas chegam prontas do servidor
 * (renderização no servidor): o JS só liga a interatividade. Com prioridade
 * alta, ~150 kB de script disputavam a conexão do celular com o CSS, as fontes
 * e a foto da moto — justamente o que aparece na tela.
 */
const scriptsComPrioridadeBaixa = () => ({
  name: 'motorshop:scripts-com-prioridade-baixa',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler: (html) =>
      html
        .replaceAll('<script type="module"', '<script type="module" fetchpriority="low"')
        .replaceAll('<link rel="modulepreload"', '<link rel="modulepreload" fetchpriority="low"'),
  },
});

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), tailwindcss(), scriptsComPrioridadeBaixa()],

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
  //
  // O build do servidor (`--ssr`, em dist-ssr/) não copia `public/` nem gera
  // manifesto: só o código que renderiza as páginas.
  build: isSsrBuild ? { copyPublicDir: false } : { manifest: true },

  // Sem proxy para /api de propósito: chamar a API na origem real exercita a
  // configuração de CORS em desenvolvimento, em vez de mascará-la.
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
}));
