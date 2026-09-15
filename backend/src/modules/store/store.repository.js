import { StoreSettings } from './store.model.js';

const SINGLETON_KEY = 'default';

/** Campos expostos publicamente — allowlist. `seo` e internos ficam de fora. */
const PUBLIC_FIELDS = 'name slogan logo theme contact address social businessHours seo features';

export function findPublic() {
  return StoreSettings.findOne({ key: SINGLETON_KEY }, PUBLIC_FIELDS).lean();
}

export function findFull() {
  return StoreSettings.findOne({ key: SINGLETON_KEY }).lean();
}

/**
 * Atualiza criando o documento se ainda não existir: a loja nunca fica sem
 * configuração, e não é preciso um passo de instalação separado.
 */
export function upsert(data) {
  return StoreSettings.findOneAndUpdate(
    { key: SINGLETON_KEY },
    { ...data, key: SINGLETON_KEY },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean();
}
