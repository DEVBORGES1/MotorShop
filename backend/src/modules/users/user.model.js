import { USER_ROLE, values } from '@motorshop/shared';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 160,
    },

    // `select: false` garante que nenhuma query genérica devolva o hash por
    // descuido. Para lê-lo é preciso pedir explicitamente com `+passwordHash`.
    passwordHash: { type: String, required: true, select: false },

    role: { type: String, enum: values(USER_ROLE), default: USER_ROLE.ADMIN },

    // Usuário é DESATIVADO, nunca excluído: o histórico de quem cadastrou o quê
    // continua fazendo sentido, e a exclusão é irreversível.
    active: { type: Boolean, default: true },

    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });

export const User = mongoose.model('User', userSchema);
