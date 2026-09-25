import { randomBytes } from 'node:crypto';

import { LEAD_LIMITS, PUBLIC_DETAIL_STATUSES } from '@motorshop/shared';

import { logger } from '../../config/logger.js';
import { ApiError } from '../../utils/ApiError.js';
import { buildMeta, buildPagination } from '../../utils/pagination.js';
import * as motoRepository from '../motos/moto.repository.js';
import * as repository from './lead.repository.js';
import { dataToStorage, serializeCreated, serializeLead } from './lead.serializer.js';

/**
 * Regra de negócio de leads.
 *
 * Log: só `id` e `type`. Telefone, e-mail e nome **nunca** vão para o log
 * (ARCHITECTURE §8.7, risco R-08) — log é copiado, retido e lido por gente
 * que não precisa desses dados.
 */

/**
 * Cria um lead a partir do formulário público.
 *
 * @param {object} input corpo já validado por `createLeadSchema`
 * @param {{ now?: Date }} [options] relógio injetável, para teste
 */
export async function create(input, { now = new Date() } = {}) {
  const { website, consent, source, ...lead } = input;

  // Honeypot preenchido: robô. Responde como sucesso e não grava nada —
  // um erro ensinaria o robô a deixar o campo em branco.
  if (website) {
    logger.info({ type: lead.type }, 'Lead descartado pelo honeypot');
    return { id: randomBytes(12).toString('hex'), type: lead.type, createdAt: now };
  }

  if (lead.moto) {
    const visivel = await motoRepository.existsPublic(lead.moto, PUBLIC_DETAIL_STATUSES);
    if (!visivel) {
      throw new ApiError(422, 'Dados inválidos', [
        { field: 'moto', code: 'not_found', message: 'Moto não encontrada' },
      ]);
    }
  }

  // Mesmo telefone, mesmo tipo e mesma moto há instantes: clique duplo ou
  // reenvio. Devolve o lead que já existe em vez de criar outro — a loja não
  // precisa ligar duas vezes para a mesma pessoa.
  const repetido = await repository.findRecentDuplicate({
    type: lead.type,
    phone: lead.phone,
    moto: lead.moto,
    since: new Date(now.getTime() - LEAD_LIMITS.DUPLICATE_WINDOW_MS),
  });
  if (repetido) {
    logger.info({ leadId: String(repetido._id), type: lead.type }, 'Envio repetido de lead');
    return serializeCreated(repetido);
  }

  const created = await repository.create({
    ...lead,
    data: dataToStorage(lead.type, lead.data),
    source: source ?? {},
    // A data do aceite é do servidor: o cliente não escolhe quando consentiu.
    consent: { accepted: true, at: now, textVersion: consent.textVersion },
  });

  logger.info({ leadId: String(created._id), type: created.type }, 'Lead criado');
  return serializeCreated(created);
}

export async function list(query) {
  const { page, limit, skip } = buildPagination(query);
  const filter = repository.buildFilter({
    types: query.tipo,
    statuses: query.status,
    from: query.de,
    to: query.ate,
  });

  const { items, total } = await repository.findPaginated({ filter, skip, limit });
  return { items: items.map(serializeLead), meta: buildMeta({ page, limit, total }) };
}

export async function getById(id) {
  const lead = await repository.findById(id);
  if (!lead) throw ApiError.notFound('Lead não encontrado');
  return serializeLead(lead);
}

/** Muda o status e/ou acrescenta uma anotação, assinada por quem escreveu. */
export async function update(id, { status, note }, user) {
  const updated = await repository.update(id, {
    status,
    note: note
      ? { text: note, author: user.id, authorName: user.name, createdAt: new Date() }
      : null,
  });
  if (!updated) throw ApiError.notFound('Lead não encontrado');
  return serializeLead(updated);
}

/**
 * Exclusão definitiva — pedido do titular (LGPD). Diferente das motos, que
 * são desativadas, aqui manter o registro seria justamente o problema.
 */
export async function remove(id, user) {
  const removed = await repository.deleteById(id);
  if (!removed) throw ApiError.notFound('Lead não encontrado');
  logger.info({ leadId: id, userId: user.id }, 'Lead excluído a pedido (LGPD)');
}
