import { env } from '../config/env.js';

/**
 * Cache em memória de processo, com validade (ARCHITECTURE §12.4).
 *
 * Robôs de busca e de preview visitam muito; sem isto, cada visita de robô
 * seria uma ida ao banco. Uma mudança feita no painel apaga o cache na hora
 * (`clearCache`, chamado por `invalidateSiteCache`): com a página inteira
 * renderizada a partir dele, esperar cinco minutos mostraria moto vendida
 * como disponível, com preço antigo. Em teste, desligado: cada caso vê o
 * banco atual.
 */
const TTL_MS = env.isTest ? 0 : 5 * 60 * 1000;
const MAX_ENTRIES = 1000;
const entries = new Map();

export async function cached(key, load) {
  const hit = entries.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;

  const value = await load();
  if (TTL_MS > 0) {
    // Teto de entradas: slugs inventados por robôs não podem crescer a memória.
    if (entries.size >= MAX_ENTRIES) entries.delete(entries.keys().next().value);
    entries.set(key, { value, expires: Date.now() + TTL_MS });
  }
  return value;
}

/** Esvazia o cache: a próxima visita busca tudo no banco. */
export function clearCache() {
  entries.clear();
}
