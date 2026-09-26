import { StoreSettings } from './store.model.js';

const SINGLETON_KEY = 'default';

/**
 * Campos expostos publicamente — allowlist; internos ficam de fora.
 * `legalName` vai para a política de privacidade (quem é o controlador dos
 * dados) e `ogImage` para o preview de link — os dois faltavam aqui, e o site
 * mostrava o nome fantasia no lugar da razão social e nunca a imagem.
 */
const PUBLIC_FIELDS =
  'name legalName slogan logo ogImage theme contact address social businessHours highlights seo features financing';

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
