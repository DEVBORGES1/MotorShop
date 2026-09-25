import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/App.jsx';
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
import { registrarChegada } from '@/utils/origem.js';
import { config as configurarZod } from 'zod';

// A validação (zod) tenta compilar funções com `new Function` para ganhar
// velocidade. A CSP do site proíbe eval — corretamente —, e a tentativa vira
// uma violação registrada no console. Formulários pequenos não precisam disso.
configurarZod({ jitless: true });

// Antes de qualquer navegação interna: referrer e UTM só valem na chegada.
registrarChegada();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
