import { FUEL, MOTO_LIMITS, MOTO_STATUS, TRANSMISSION, values } from '@motorshop/shared';
import mongoose from 'mongoose';

import { imageSchema } from '../brands/brand.model.js';

const motoSchema = new mongoose.Schema(
  {
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
    model: { type: String, required: true, trim: true, maxlength: 80 },
    version: { type: String, trim: true, maxlength: 80, default: null },

    year: { type: Number, required: true, min: MOTO_LIMITS.MIN_YEAR },
    mileage: { type: Number, required: true, min: 0 },

    // Em CENTAVOS inteiros (decisão D-04). A API converte na borda.
    price: { type: Number, required: true, min: 1 },
    previousPrice: { type: Number, default: null, min: 1 },

    engineCapacity: {
      type: Number,
      required: true,
      min: MOTO_LIMITS.MIN_ENGINE_CAPACITY,
      max: MOTO_LIMITS.MAX_ENGINE_CAPACITY,
    },
    fuel: { type: String, required: true, enum: values(FUEL) },
    transmission: { type: String, required: true, enum: values(TRANSMISSION) },
    color: { type: String, required: true, trim: true, maxlength: 40 },

    // Dado sensível do veículo: `select: false` garante que nenhuma query
    // genérica o devolva por descuido. Nunca é exposto publicamente (§8.4).
    licensePlate: { type: String, trim: true, uppercase: true, default: null, select: false },

    description: {
      type: String,
      trim: true,
      maxlength: MOTO_LIMITS.MAX_DESCRIPTION,
      default: null,
    },
    features: { type: [String], default: [] },

    images: { type: [imageSchema], default: [] },
    mainImageId: { type: String, default: null },

    featured: { type: Boolean, default: false },
    onSale: { type: Boolean, default: false },

    status: { type: String, enum: values(MOTO_STATUS), default: MOTO_STATUS.AVAILABLE },

    // Imutável após a criação (decisão D-07): regravá-lo quebraria links já
    // indexados e já compartilhados no WhatsApp.
    slug: { type: String, required: true, trim: true, lowercase: true, immutable: true },
  },
  { timestamps: true },
);

/**
 * Índices — ARCHITECTURE §9.4.
 *
 * Leitura domina (visitantes) e escrita é rara (a loja cadastra poucas motos
 * por dia), o que favorece índices. Ainda assim eles não são gratuitos: os
 * filtros de refinamento (km, cilindrada, combustível, câmbio, cor) foram
 * deliberadamente deixados de fora — atuam sobre um conjunto já reduzido pelos
 * índices abaixo. Entram se o `explain()` mostrar necessidade.
 */
motoSchema.index({ slug: 1 }, { unique: true });
motoSchema.index({ status: 1, featured: -1, createdAt: -1 }); // home e listagem padrão
motoSchema.index({ status: 1, brand: 1, price: 1 }); // filtro por marca + faixa de preço
motoSchema.index({ status: 1, price: 1 }); // ordenar por preço sem filtrar marca
motoSchema.index({ status: 1, year: -1 }); // ordenar/filtrar por ano
motoSchema.index(
  { model: 'text', version: 'text', description: 'text' },
  { name: 'moto_text_search', weights: { model: 10, version: 5, description: 1 } },
);

export const Moto = mongoose.model('Moto', motoSchema);
