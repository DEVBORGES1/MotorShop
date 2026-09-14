import { describe, expect, it } from 'vitest';

import {
  createBrandSchema,
  objectIdParamSchema,
  updateBrandSchema,
} from '../../src/modules/brands/brand.schema.js';

describe('createBrandSchema', () => {
  it('aceita uma marca válida', () => {
    expect(createBrandSchema.parse({ name: 'Honda' })).toEqual({ name: 'Honda' });
  });

  it('remove espaços em volta do nome', () => {
    expect(createBrandSchema.parse({ name: '  Honda  ' }).name).toBe('Honda');
  });

  it('exige nome não vazio', () => {
    expect(createBrandSchema.safeParse({ name: '' }).success).toBe(false);
    expect(createBrandSchema.safeParse({ name: '   ' }).success).toBe(false);
    expect(createBrandSchema.safeParse({}).success).toBe(false);
  });

  it('rejeita slug enviado pelo cliente — é gerado pelo servidor', () => {
    expect(createBrandSchema.safeParse({ name: 'Honda', slug: 'forjado' }).success).toBe(false);
  });
});

describe('updateBrandSchema', () => {
  it('aceita atualização parcial', () => {
    expect(updateBrandSchema.safeParse({ active: false }).success).toBe(true);
  });

  it('mantém a proibição de campo desconhecido', () => {
    expect(updateBrandSchema.safeParse({ slug: 'x' }).success).toBe(false);
  });
});

describe('objectIdParamSchema', () => {
  it('aceita ObjectId válido', () => {
    expect(objectIdParamSchema.safeParse({ id: '507f1f77bcf86cd799439011' }).success).toBe(true);
  });

  it.each(['123', 'nao-e-id', '507f1f77bcf86cd79943901', '../../etc/passwd'])(
    'rejeita "%s"',
    (id) => {
      expect(objectIdParamSchema.safeParse({ id }).success).toBe(false);
    },
  );
});
