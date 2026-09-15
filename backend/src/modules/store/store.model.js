import mongoose from 'mongoose';

import { imageSchema } from '../brands/brand.model.js';

/**
 * Configuração da loja — **documento único** (singleton).
 *
 * É a peça central do produto revendável: tudo que muda de uma loja para outra
 * mora aqui, e não no código. Trocar de cliente é trocar este documento, não
 * recompilar a aplicação.
 *
 * Já é a futura entidade `Store`/`Tenant` (ARCHITECTURE §14.3): quando houver
 * multi-loja, ela deixa de ser singleton e vira coleção.
 */

const businessHourSchema = new mongoose.Schema(
  {
    weekday: { type: Number, required: true, min: 0, max: 6 }, // 0 = domingo
    opensAt: { type: String, default: null }, // "08:00"
    closesAt: { type: String, default: null },
    closed: { type: Boolean, default: false },
  },
  { _id: false },
);

const storeSchema = new mongoose.Schema(
  {
    // Chave fixa: garante que exista no máximo um documento de configuração.
    key: { type: String, default: 'default', unique: true, immutable: true },

    name: { type: String, required: true, trim: true, maxlength: 80 },
    legalName: { type: String, trim: true, maxlength: 140, default: null },
    slogan: { type: String, trim: true, maxlength: 140, default: null },

    logo: { type: imageSchema, default: null },
    ogImage: { type: imageSchema, default: null },

    // Tokens de tema: o frontend os aplica como variáveis CSS, sem rebuild.
    theme: {
      primary: { type: String, default: '#4CD62B' },
      secondary: { type: String, default: '#0A0B0A' },
      accent: { type: String, default: '#38C172' },
    },

    contact: {
      whatsapp: { type: String, trim: true, default: null },
      phone: { type: String, trim: true, default: null },
      email: { type: String, trim: true, lowercase: true, default: null },
    },

    address: {
      street: { type: String, trim: true, default: null },
      number: { type: String, trim: true, default: null },
      complement: { type: String, trim: true, default: null },
      district: { type: String, trim: true, default: null },
      city: { type: String, trim: true, default: null },
      state: { type: String, trim: true, uppercase: true, maxlength: 2, default: null },
      zipCode: { type: String, trim: true, default: null },
      mapsUrl: { type: String, trim: true, default: null },
    },

    social: {
      instagram: { type: String, trim: true, default: null },
      facebook: { type: String, trim: true, default: null },
      youtube: { type: String, trim: true, default: null },
    },

    businessHours: { type: [businessHourSchema], default: [] },

    seo: {
      defaultTitle: { type: String, trim: true, maxlength: 70, default: null },
      defaultDescription: { type: String, trim: true, maxlength: 180, default: null },
      siteUrl: { type: String, trim: true, default: null },
    },

    // Interruptores por cliente: permitem vender o produto com módulos ligados
    // ou desligados sem manter um branch de código por loja.
    features: {
      financingEnabled: { type: Boolean, default: true },
      sellMotoEnabled: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

export const StoreSettings = mongoose.model('StoreSettings', storeSchema);
