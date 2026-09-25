import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { logger } from '../config/logger.js';

/**
 * Renderizador das páginas públicas no servidor (ARCHITECTURE §11.3).
 *
 * O código que renderiza é o do próprio site (frontend/src/entry-server.jsx),
 * gerado pelo build em `frontend/dist-ssr/`, ao lado de `dist/`. Sem esse
 * build, ou se ele falhar ao carregar, o site continua funcionando como antes:
 * o HTML sai com a meta e os dados, e o React desenha no navegador.
 *
 * @returns {((opcoes: { url: string, dados: object }) => Promise<{ html: string, tema: string }>) | null}
 */
export function createRenderer(frontendDir) {
  const entry = join(frontendDir, '..', 'dist-ssr', 'entry-server.js');
  if (!existsSync(entry)) {
    logger.info(
      { entry },
      'Build de renderização no servidor ausente — páginas renderizam no navegador',
    );
    return null;
  }

  const modulo = import(pathToFileURL(entry).href).catch((error) => {
    logger.error({ err: error, entry }, 'Falha ao carregar a renderização no servidor');
    return null;
  });

  return async ({ url, dados }) => {
    const ssr = await modulo;
    if (!ssr) throw new Error('Renderização no servidor indisponível');
    return { html: await ssr.render({ url, dados }), tema: ssr.estiloDoTema(dados.store) };
  };
}
