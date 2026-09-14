import { Moto } from '../motos/moto.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { buildSlug, resolveUniqueSlug } from '../../utils/slug.js';
import * as repository from './brand.repository.js';

/**
 * Regra de negócio de marcas. Não conhece Express nem Mongoose.
 */

export function listPublic() {
  return repository.findPublic();
}

export function listAll() {
  return repository.findAll();
}

export async function getById(id) {
  const brand = await repository.findById(id);
  if (!brand) throw ApiError.notFound('Marca não encontrada');
  return brand;
}

export async function create({ name, logo, active }) {
  const slug = await resolveUniqueSlug(buildSlug([name]), repository.existsWithSlug);

  try {
    return await repository.create({ name, slug, logo, active });
  } catch (error) {
    throw translateDuplicate(error, name);
  }
}

export async function update(id, data) {
  await getById(id); // 404 antes de tentar escrever

  // O slug NÃO é regerado ao renomear: ele já pode estar em links indexados
  // e compartilhados (decisão D-07).
  try {
    return await repository.updateById(id, data);
  } catch (error) {
    throw translateDuplicate(error, data.name);
  }
}

/**
 * Exclusão de marca em uso é bloqueada: apagá-la deixaria motos órfãs e
 * quebraria a página de detalhe. A alternativa oferecida é desativar.
 */
export async function remove(id) {
  await getById(id);

  const inUse = await Moto.countDocuments({ brand: id });
  if (inUse > 0) {
    throw new ApiError(
      409,
      `Esta marca possui ${inUse} moto(s) cadastrada(s) e não pode ser excluída. ` +
        'Desative-a (active: false) para ocultá-la do site.',
    );
  }

  await repository.deleteById(id);
}

function translateDuplicate(error, name) {
  if (error?.code === 11000) {
    return new ApiError(409, `Já existe uma marca chamada "${name}"`);
  }
  return error;
}
