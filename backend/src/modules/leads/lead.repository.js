import { Lead } from './lead.model.js';

/** Única camada que fala Mongoose para leads. */

const MOTO_POPULATE = {
  path: 'moto',
  select: 'brand model version year slug status',
  populate: { path: 'brand', select: 'name slug' },
};

/** Filtro a partir de parâmetros já validados. Nada do cliente vira chave de query. */
export function buildFilter({ types, statuses, from, to } = {}) {
  const filter = {};

  if (types?.length) filter.type = { $in: types };
  if (statuses?.length) filter.status = { $in: statuses };
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = to;
  }

  return filter;
}

export async function findPaginated({ filter, skip, limit }) {
  const [items, total] = await Promise.all([
    Lead.find(filter)
      .populate(MOTO_POPULATE)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Lead.countDocuments(filter),
  ]);

  return { items, total };
}

export function findById(id) {
  return Lead.findById(id).populate(MOTO_POPULATE).lean();
}

export function create(data) {
  return Lead.create(data).then((doc) => doc.toObject());
}

/** Lead igual enviado há pouco — clique duplo ou reenvio. */
export function findRecentDuplicate({ type, phone, moto, since }) {
  return Lead.findOne({ type, phone, moto: moto ?? null, createdAt: { $gte: since } })
    .sort({ createdAt: -1 })
    .lean();
}

export function update(id, { status, note }) {
  const change = {};
  if (status) change.$set = { status };
  if (note) change.$push = { notes: note };

  return Lead.findByIdAndUpdate(id, change, { new: true, runValidators: true })
    .populate(MOTO_POPULATE)
    .lean();
}

export function deleteById(id) {
  return Lead.findByIdAndDelete(id).lean();
}
