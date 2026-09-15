import { useContext } from 'react';

import { StoreContext } from '@/contexts/StoreContext.jsx';

/** Configuração da loja. Ver `StoreProvider`. */
export function useStore() {
  const context = useContext(StoreContext);

  if (!context) {
    throw new Error('useStore precisa estar dentro de <StoreProvider>');
  }

  return context;
}
