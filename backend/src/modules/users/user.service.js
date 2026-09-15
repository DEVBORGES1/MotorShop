import { USER_ROLE } from '@motorshop/shared';

import { ApiError } from '../../utils/ApiError.js';
import * as sessionRepository from '../auth/auth.repository.js';
import { hashPassword } from '../auth/password.js';
import * as repository from './user.repository.js';
import { serializeUser, serializeUserList } from './user.serializer.js';

export async function list() {
  return serializeUserList(await repository.findAll());
}

export async function getById(id) {
  const user = await repository.findById(id);
  if (!user) throw ApiError.notFound('Usuário não encontrado');
  return serializeUser(user);
}

export async function create({ name, email, password, role }) {
  if (await repository.existsWithEmail(email)) {
    throw new ApiError(409, 'Já existe um usuário com este e-mail');
  }

  const user = await repository.create({
    name,
    email,
    role: role ?? USER_ROLE.ADMIN,
    passwordHash: await hashPassword(password),
  });

  return serializeUser(user);
}

/**
 * @param {string} id        usuário alvo
 * @param {object} data      campos validados
 * @param {string} actorId   quem está executando
 */
export async function update(id, data, actorId) {
  const target = await repository.findById(id);
  if (!target) throw ApiError.notFound('Usuário não encontrado');

  const isSelf = String(target._id) === String(actorId);

  // Um super admin não pode se rebaixar nem se desativar: seria trancar a si
  // mesmo do lado de fora, exigindo intervenção manual no banco.
  if (isSelf && data.role && data.role !== target.role) {
    throw ApiError.badRequest('Você não pode alterar o seu próprio papel');
  }
  if (isSelf && data.active === false) {
    throw ApiError.badRequest('Você não pode desativar a si mesmo');
  }

  await ensureNotLastSuperAdmin(target, data);

  if (data.email && data.email !== target.email && (await repository.existsWithEmail(data.email))) {
    throw new ApiError(409, 'Já existe um usuário com este e-mail');
  }

  const { password, ...rest } = data;
  const patch = { ...rest };
  if (password) patch.passwordHash = await hashPassword(password);

  const updated = await repository.updateById(id, patch);

  // Trocar a senha ou desativar a conta encerra as sessões abertas: manter uma
  // sessão viva depois disso anularia o próprio motivo da mudança.
  if (password || data.active === false) {
    await sessionRepository.revokeAllForUser(target._id);
  }

  return serializeUser(updated);
}

/** "Excluir" desativa e encerra as sessões. */
export async function deactivate(id, actorId) {
  if (String(id) === String(actorId)) {
    throw ApiError.badRequest('Você não pode desativar a si mesmo');
  }

  const target = await repository.findById(id);
  if (!target) throw ApiError.notFound('Usuário não encontrado');

  await ensureNotLastSuperAdmin(target, { active: false });

  const updated = await repository.updateById(id, { active: false });
  await sessionRepository.revokeAllForUser(target._id);

  return serializeUser(updated);
}

/**
 * Impede que o sistema fique sem nenhum SUPER_ADMIN ativo — o painel ficaria
 * inacessível sem mexer direto no banco.
 *
 * NOTA: hoje esta guarda é inalcançável pela API. Toda rota de usuários exige
 * um SUPER_ADMIN **ativo**, que já conta como "outro" quando o alvo é outra
 * pessoa; e quando o alvo é ele mesmo, as regras de autoalteração acima barram
 * antes. Mantida deliberadamente como defesa em profundidade: protege quem
 * chamar o serviço por fora do HTTP (um script, por exemplo) e continua válida
 * se as regras de autoalteração mudarem. Coberta por teste no nível do serviço.
 */
async function ensureNotLastSuperAdmin(target, data) {
  const perdeOPapel =
    target.role === USER_ROLE.SUPER_ADMIN &&
    ((data.role && data.role !== USER_ROLE.SUPER_ADMIN) || data.active === false);

  if (!perdeOPapel) return;

  const outros = await repository.countOtherActiveSuperAdmins(target._id, USER_ROLE.SUPER_ADMIN);
  if (outros === 0) {
    throw ApiError.badRequest(
      'Este é o único super administrador ativo. Promova outro usuário antes de alterá-lo.',
    );
  }
}
