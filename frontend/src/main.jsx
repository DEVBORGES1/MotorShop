import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { App } from '@/App.jsx';
import { lerDadosIniciais } from '@/contexts/DadosIniciaisContext.jsx';
/*
 * Fontes servidas pelo próprio site (pacotes @fontsource), só o subconjunto
 * latino — cobre todo o português — e só os pesos usados. Antes vinham do
 * Google Fonts, e isso custava:
 *  - 780 ms de CSS de terceiro bloqueando a primeira pintura (Lighthouse);
 *  - o IP de cada visitante enviado ao Google (dado pessoal, LGPD);
 *  - dois domínios a mais liberados na CSP.
 * Todas com `font-display: swap`: o texto aparece na fonte do sistema e troca
 * quando a fonte chega, sem bloquear.
 */
import '@fontsource/archivo/latin-500.css';
import '@fontsource/archivo/latin-600.css';
import '@fontsource/archivo/latin-700.css';
import '@fontsource/archivo/latin-800.css';
import '@fontsource/barlow/latin-400.css';
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow/latin-700.css';
import '@/styles/index.css';
import { rotas } from '@/routes/index.jsx';
import { registrarChegada } from '@/utils/origem.js';
import { config as configurarZod } from 'zod';

// A validação (zod) tenta compilar funções com `new Function` para ganhar
// velocidade. A CSP do site proíbe eval — corretamente —, e a tentativa vira
// uma violação registrada no console. Formulários pequenos não precisam disso.
configurarZod({ jitless: true });

// Antes de qualquer navegação interna: referrer e UTM só valem na chegada.
registrarChegada();

const aplicacao = (
  <StrictMode>
    <App dados={lerDadosIniciais()}>
      <RouterProvider router={createBrowserRouter(rotas)} />
    </App>
  </StrictMode>
);

// Página pública: o servidor já mandou o HTML pronto (entry-server.jsx) e o
// React só "hidrata" — liga os eventos ao que já está na tela, sem redesenhar.
// Painel (e o Vite em desenvolvimento): a raiz vem vazia e o React monta tudo.
// Hidrata assim que o JS roda: é o que liga os eventos. Clique numa parte da
// página que ainda está hidratando é guardado e repetido pelo React depois.
const raiz = document.getElementById('root');
if (raiz.firstElementChild) hydrateRoot(raiz, aplicacao);
else createRoot(raiz).render(aplicacao);
