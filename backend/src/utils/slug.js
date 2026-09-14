import slugify from 'slugify';

/**
 * Geração de slug para URL amigável.
 *
 * O slug é **imutável após a criação** (decisão D-07): regravá-lo quebraria
 * links já indexados pelo Google e já compartilhados no WhatsApp.
 */

/**
 * Monta o slug base a partir das partes informadas, ignorando vazios.
 * Ex.: ('Honda', 'CB 500F', null, 2024) → "honda-cb-500f-2024"
 *
 * @param {Array<string | number | null | undefined>} parts
 * @returns {string}
 */
export function buildSlug(parts) {
  return slugify(parts.filter(Boolean).join(' '), {
    lower: true,
    strict: true, // remove pontuação
    locale: 'pt',
    trim: true,
  });
}

/**
 * Resolve colisão acrescentando um sufixo curto.
 * Ex.: "honda-cb-500f-2024" → "honda-cb-500f-2024-7b3f"
 *
 * @param {string} base
 * @param {(candidate: string) => Promise<boolean>} exists
 * @param {() => string} [randomSuffix] injetável para teste determinístico
 * @returns {Promise<string>}
 */
export async function resolveUniqueSlug(base, exists, randomSuffix = defaultSuffix) {
  if (!(await exists(base))) return base;

  // Tentativas limitadas: com sufixo de 4 hex a chance de colidir repetidamente
  // é desprezível, e um laço infinito seria pior do que falhar alto.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `${base}-${randomSuffix()}`;
    if (!(await exists(candidate))) return candidate;
  }

  throw new Error(`Não foi possível gerar um slug único a partir de "${base}"`);
}

function defaultSuffix() {
  return Math.random().toString(16).slice(2, 6);
}
