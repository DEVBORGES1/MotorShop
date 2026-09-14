/**
 * Envelope único de resposta da API (ARCHITECTURE §6.2 e §6.3).
 *
 * Toda resposta passa por `ok()` ou `fail()`. É o que garante que o cliente
 * nunca precise adivinhar o formato de um endpoint.
 */

/**
 * @param {unknown} [data]
 * @param {{ message?: string | null, meta?: object | null }} [options]
 */
export function ok(data = null, { message = null, meta = null } = {}) {
  const body = { success: true, data, message };
  if (meta) body.meta = meta;
  return body;
}

/**
 * @param {string} message
 * @param {{ errors?: Array<object>, requestId?: string }} [options]
 */
export function fail(message, { errors = [], requestId } = {}) {
  const body = { success: false, message, errors };
  if (requestId) body.requestId = requestId;
  return body;
}
