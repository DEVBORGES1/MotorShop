import { pageSeo, serializeJsonLd } from '@motorshop/shared';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { useBaseDoSite } from '@/contexts/DadosIniciaisContext.jsx';
import { useStore } from '@/hooks/useStore.js';

/**
 * Metadados da página durante a navegação SPA.
 *
 * O HTML inicial já chega com tudo (o servidor injeta — backend/src/seo); este
 * hook só mantém o `<head>` coerente quando o React troca de página sem
 * recarregar. Usa as mesmas funções do servidor (`@motorshop/shared`), então
 * o título da aba e o do preview não divergem. Mexe só em tags marcadas com
 * `data-seo`, as mesmas que o servidor escreveu.
 *
 * @param {{ title: string, description?: string, robots?: string, ogType?: string,
 *           image?: string|null, canonicalPath?: string, jsonLd?: object[] } | null} seo
 *   `null` enquanto a página ainda não sabe (dados carregando): nada muda.
 */
export function useSeo(seo) {
  const { store } = useStore();
  const { pathname } = useLocation();
  const base = useBaseDoSite(store);
  const chave = seo ? JSON.stringify(seo) : null;

  useEffect(() => {
    if (!chave) return;
    const dados = JSON.parse(chave);
    const canonical = `${base}${dados.canonicalPath ?? pathname}`;

    document.title = dados.title;
    definirMeta('name', 'description', dados.description);
    definirMeta('name', 'robots', dados.robots);
    definirLink('canonical', canonical);

    definirMeta('property', 'og:site_name', store.name);
    definirMeta('property', 'og:type', dados.ogType ?? 'website');
    definirMeta('property', 'og:title', dados.title);
    definirMeta('property', 'og:description', dados.description);
    definirMeta('property', 'og:url', canonical);
    definirMeta('property', 'og:image', dados.image);
    definirMeta('name', 'twitter:card', dados.image ? 'summary_large_image' : 'summary');
    definirMeta('name', 'twitter:title', dados.title);
    definirMeta('name', 'twitter:description', dados.description);
    definirMeta('name', 'twitter:image', dados.image);

    // Dados estruturados da página anterior não podem ficar para a próxima.
    document
      .querySelectorAll('script[type="application/ld+json"][data-seo]')
      .forEach((script) => script.remove());
    for (const item of dados.jsonLd ?? []) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.seo = '';
      script.textContent = serializeJsonLd(item);
      document.head.append(script);
    }
  }, [chave, pathname, store.name, base]);
}

/** Cria, atualiza ou remove (valor vazio) uma `<meta data-seo>`. */
function definirMeta(atributo, chave, valor) {
  let tag = document.head.querySelector(`meta[${atributo}="${chave}"]`);
  if (!valor) {
    tag?.remove();
    return;
  }
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(atributo, chave);
    tag.dataset.seo = '';
    document.head.append(tag);
  }
  tag.setAttribute('content', valor);
}

function definirLink(rel, href) {
  let tag = document.head.querySelector(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.rel = rel;
    tag.dataset.seo = '';
    document.head.append(tag);
  }
  tag.href = href;
}

/**
 * Atalho para páginas estáticas: os metadados de `pageSeo` (os mesmos do
 * servidor) mais o que a página acrescentar.
 */
export function usePaginaSeo(pagina, extra = {}) {
  const { store } = useStore();
  useSeo({ ...pageSeo(pagina, store), ...extra });
}
