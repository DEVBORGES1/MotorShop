import { clearCache } from '../seo/cache.js';

const LEITURA = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Toda alteração bem-sucedida no painel (moto, fotos, status, marca, loja)
 * apaga o cache das páginas públicas: o visitante vê a mudança na próxima
 * visita, não cinco minutos depois.
 *
 * Fica na montagem das rotas, e não em cada serviço: os serviços continuam
 * sem saber que o site existe. Apagar tudo é mais simples que acertar a
 * chave de cada mudança, e o cache se refaz na primeira visita.
 *
 * O cache é da memória do processo — com várias instâncias, precisaria ser
 * compartilhado (o mesmo limite do rate limit, R-06).
 */
export function invalidateSiteCache(req, res, next) {
  if (!LEITURA.has(req.method)) {
    res.on('finish', () => {
      if (res.statusCode < 400) clearCache();
    });
  }
  next();
}
