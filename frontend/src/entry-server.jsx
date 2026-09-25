import { prerenderToNodeStream } from 'react-dom/static';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router-dom';

import { App } from '@/App.jsx';
import { rotas } from '@/routes/index.jsx';
import { variaveisDoTema } from '@/utils/cor.js';

/**
 * Renderização no servidor das páginas públicas (ARCHITECTURE §11.3).
 *
 * O backend chama `render` com a URL e os dados que já buscou (loja, moto) e
 * põe o HTML resultante dentro de `#root`. O visitante vê a página pronta
 * antes de o JavaScript chegar; quando chega, o React hidrata (main.jsx) em
 * vez de desenhar do zero. É o que tira o LCP do tempo de download do JS.
 *
 * Gerado por `vite build --ssr` em `frontend/dist-ssr/` — fora de `dist/`,
 * que é servida publicamente.
 */

const handler = createStaticHandler(rotas);

/**
 * `prerender` espera o conteúdo inteiro — inclusive as páginas carregadas sob
 * demanda (`lazy`) —, em vez de mandar o "Carregando…" do Suspense.
 *
 * `progressiveChunkSize: Infinity`: desde o React 19.2, um trecho grande (a
 * página do estoque, a da moto) é enviado fora do lugar, escondido, com um
 * `<script>` que o revela — pensado para streaming. A CSP (sem script inline)
 * bloquearia o script e a página ficaria em branco. Aqui não há streaming: o
 * HTML sai inteiro de uma vez, então nada precisa ser separado.
 */
async function renderizar(arvore, signal) {
  const { prelude } = await prerenderToNodeStream(arvore, {
    signal,
    progressiveChunkSize: Number.POSITIVE_INFINITY,
  });
  let html = '';
  for await (const parte of prelude) html += parte;
  return html;
}

/**
 * @param {{ url: string, dados: object, timeoutMs?: number }} opcoes
 *   `url` absoluta; `dados` os mesmos que vão no `#dados-iniciais` do HTML —
 *   o navegador hidrata com eles, e qualquer diferença descartaria este HTML.
 * @returns {Promise<string>} o HTML de dentro de `#root`
 */
export async function render({ url, dados, timeoutMs = 2000 }) {
  const controle = new AbortController();
  const limite = setTimeout(
    () => controle.abort(new Error('Renderização excedeu o tempo')),
    timeoutMs,
  );

  try {
    const contexto = await handler.query(new Request(url, { signal: controle.signal }));
    // Redirecionamento só existiria com `loader`/`action`, que o site não usa.
    if (contexto instanceof Response) throw new Error('Rota respondeu com redirecionamento');

    const router = createStaticRouter(handler.dataRoutes, contexto);
    const arvore = (
      <App dados={dados}>
        {/* `hydrate={false}`: sem o `<script>` de dados do roteador, que a CSP
            (sem script inline) bloquearia; as rotas não têm `loader`. */}
        <StaticRouterProvider router={router} context={contexto} hydrate={false} />
      </App>
    );

    const html = await renderizar(arvore, controle.signal);
    // Garantia: qualquer `<script>` aqui seria bloqueado pela CSP e quebraria
    // a página. Melhor a página renderizada no navegador que uma quebrada.
    if (html.includes('<script')) throw new Error('Renderização gerou <script> inline');
    return html;
  } finally {
    clearTimeout(limite);
  }
}

/**
 * Cores da loja como CSS, para o `<head>`. Sem isto, a página renderizada
 * pintaria com a cor padrão e trocaria para a da loja só quando o JS rodasse.
 * Os valores vêm de `variaveisDoTema`, que só aceita cor hexadecimal válida.
 */
export function estiloDoTema(store) {
  const variaveis = Object.entries(variaveisDoTema(store?.theme?.primary));
  if (!variaveis.length) return '';
  return `:root{${variaveis.map(([nome, valor]) => `${nome}:${valor}`).join(';')}}`;
}
