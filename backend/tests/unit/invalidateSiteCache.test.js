import { EventEmitter } from 'node:events';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { invalidateSiteCache } from '../../src/middlewares/invalidateSiteCache.js';
import * as cache from '../../src/seo/cache.js';

/** Resposta mínima: o middleware só escuta o `finish` e lê o status. */
function responder(method, statusCode) {
  const res = Object.assign(new EventEmitter(), { statusCode });
  const next = vi.fn();
  invalidateSiteCache({ method }, res, next);
  res.emit('finish');
  return next;
}

describe('invalidateSiteCache', () => {
  afterEach(() => vi.restoreAllMocks());

  it('alteração bem-sucedida no painel apaga o cache do site', () => {
    const limpar = vi.spyOn(cache, 'clearCache');

    for (const method of ['POST', 'PATCH', 'DELETE'])
      expect(responder(method, 200)).toHaveBeenCalled();

    expect(limpar).toHaveBeenCalledTimes(3);
  });

  it('leitura ou alteração recusada não mexe no cache', () => {
    const limpar = vi.spyOn(cache, 'clearCache');

    responder('GET', 200);
    responder('PATCH', 422);
    responder('DELETE', 403);

    expect(limpar).not.toHaveBeenCalled();
  });
});
