import { User } from './user.model.js';

/** Única camada que fala Mongoose para usuários. */

export function findAll() {
  return User.find().sort({ name: 1 }).lean();
}

export function findById(id) {
  return User.findById(id).lean();
}

/** Inclui o hash: usado só no login. */
export function findByEmailWithHash(email) {
  return User.findOne({ email }).select('+passwordHash').lean();
}

export function existsWithEmail(email) {
  return User.exists({ email }).then(Boolean);
}

export function create(data) {
  return User.create(data).then((doc) => doc.toObject());
}

export function updateById(id, data) {
  return User.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
}

export function touchLastLogin(id) {
  return User.updateOne({ _id: id }, { lastLoginAt: new Date() });
}

/** Quantos SUPER_ADMIN ativos existem além do informado. */
export function countOtherActiveSuperAdmins(excludeId, role) {
  return User.countDocuments({ _id: { $ne: excludeId }, role, active: true });
}
