import mongoose from 'mongoose';

/** Metadados de imagem. O binário vive no provedor externo, nunca no Mongo. */
export const imageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    publicId: { type: String, required: true },
    url: { type: String, required: true },
    width: { type: Number },
    height: { type: Number }, // width/height evitam salto de layout (CLS)
    alt: { type: String, trim: true },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    logo: { type: imageSchema, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Unicidade case-insensitive: "Honda" e "honda" são a mesma marca.
brandSchema.index({ name: 1 }, { unique: true, collation: { locale: 'pt', strength: 2 } });
brandSchema.index({ slug: 1 }, { unique: true });
brandSchema.index({ active: 1, name: 1 });

export const Brand = mongoose.model('Brand', brandSchema);
