import { createContext, useEffect, useMemo, useState } from 'react';

import { storeFallback } from '@/config/storeFallback.js';
import * as publicService from '@/services/publicService.js';
import { variaveisDoTema } from '@/utils/cor.js';

export const StoreContext = createContext(null);

/**
 * Configuração da loja — nome, contato, endereço, horários, tema e módulos.
 *
 * Carrega uma vez, no topo da aplicação: é o que permite que nenhuma tela
 * tenha dado de loja escrito no código. Enquanto a resposta não chega (ou se
 * a API estiver fora), vale `storeFallback`, então o site renderiza mesmo sem
 * configuração — genérico, nunca com dados de outra loja.
 */
export function StoreProvider({ children }) {
  const [store, setStore] = useState(storeFallback);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ativo = true;

    publicService.store
      .get()
      .then((config) => ativo && config && setStore({ ...storeFallback, ...config }))
      .catch(() => {
        // Site fora do ar por falta de configuração seria pior que site
        // genérico: mantém o fallback e segue.
      })
      .finally(() => ativo && setIsLoading(false));

    return () => {
      ativo = false;
    };
  }, []);

  // O tema vira variável CSS no elemento raiz: trocar a cor da loja repinta
  // a interface inteira sem rebuild e sem componente que saiba a cor.
  useEffect(() => {
    const variaveis = variaveisDoTema(store.theme?.primary);
    const raiz = document.documentElement;

    Object.entries(variaveis).forEach(([nome, valor]) => raiz.style.setProperty(nome, valor));

    return () => {
      Object.keys(variaveis).forEach((nome) => raiz.style.removeProperty(nome));
    };
  }, [store.theme?.primary]);

  const value = useMemo(() => ({ store, isLoading }), [store, isLoading]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
