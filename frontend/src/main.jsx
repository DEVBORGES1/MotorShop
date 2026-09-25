import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/App.jsx';
import '@/styles/index.css';
import { registrarChegada } from '@/utils/origem.js';

// Antes de qualquer navegação interna: referrer e UTM só valem na chegada.
registrarChegada();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
