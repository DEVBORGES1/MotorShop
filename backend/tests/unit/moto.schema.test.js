import { describe, expect, it } from 'vitest';

import {
  createMotoSchema,
  listMotosAdminQuerySchema,
  listMotosQuerySchema,
  updateMotoSchema,
} from '../../src/modules/motos/moto.schema.js';

const motoValida = {
  brand: '507f1f77bcf86cd799439011',
  model: 'CB 500F',
  year: 2024,
  mileage: 4200,
  price: 38900,
  engineCapacity: 471,
  fuel: 'FLEX',
  transmission: 'MANUAL',
  color: 'Vermelha',
};

describe('listMotosQuerySchema — coerção', () => {
  it('converte strings da query nos tipos corretos', () => {
    const parsed = listMotosQuerySchema.parse({ anoMin: '2020', kmMax: '15000', page: '2' });
    expect(parsed.anoMin).toBe(2020);
    expect(parsed.kmMax).toBe(15_000);
    expect(parsed.page).toBe(2);
  });

  it('converte preço de reais para centavos', () => {
    expect(listMotosQuerySchema.parse({ precoMin: '15000' }).precoMin).toBe(1_500_000);
  });

  it('aceita lista separada por vírgula', () => {
    expect(listMotosQuerySchema.parse({ marca: 'honda,yamaha' }).marca).toEqual([
      'honda',
      'yamaha',
    ]);
    expect(listMotosQuerySchema.parse({ combustivel: 'FLEX,ELECTRIC' }).combustivel).toEqual([
      'FLEX',
      'ELECTRIC',
    ]);
  });

  it('aplica os padrões de ordenação e paginação', () => {
    const parsed = listMotosQuerySchema.parse({});
    expect(parsed).toMatchObject({ sort: 'recentes', page: 1, limit: 12 });
  });

  it('rejeita ordenação fora da whitelist', () => {
    expect(listMotosQuerySchema.safeParse({ sort: 'preco' }).success).toBe(false);
    expect(listMotosQuerySchema.safeParse({ sort: '{"$gt":""}' }).success).toBe(false);
  });

  it('rejeita limite acima do teto do servidor', () => {
    expect(listMotosQuerySchema.safeParse({ limit: '100' }).success).toBe(false);
  });

  it('rejeita faixa invertida em vez de devolver lista vazia em silêncio', () => {
    const result = listMotosQuerySchema.safeParse({ precoMin: '50000', precoMax: '10000' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toEqual(['precoMin']);
  });

  it('rejeita parâmetro desconhecido', () => {
    expect(listMotosQuerySchema.safeParse({ ordenar: 'preco' }).success).toBe(false);
  });

  it('não permite ao público filtrar por status', () => {
    expect(listMotosQuerySchema.safeParse({ status: 'INACTIVE' }).success).toBe(false);
  });

  it('permite ao admin filtrar por status', () => {
    expect(listMotosAdminQuerySchema.parse({ status: 'INACTIVE,SOLD' }).status).toEqual([
      'INACTIVE',
      'SOLD',
    ]);
  });
});

describe('createMotoSchema', () => {
  it('aceita uma moto válida e converte o preço', () => {
    const parsed = createMotoSchema.parse(motoValida);
    expect(parsed.price).toBe(3_890_000);
  });

  it.each([
    'brand',
    'model',
    'year',
    'mileage',
    'price',
    'engineCapacity',
    'fuel',
    'transmission',
    'color',
  ])('exige o campo "%s"', (campo) => {
    const { [campo]: _, ...semCampo } = motoValida;
    expect(createMotoSchema.safeParse(semCampo).success).toBe(false);
  });

  it('rejeita campo desconhecido — sem mass assignment', () => {
    expect(createMotoSchema.safeParse({ ...motoValida, slug: 'forjado' }).success).toBe(false);
    expect(createMotoSchema.safeParse({ ...motoValida, createdAt: new Date() }).success).toBe(
      false,
    );
  });

  it('rejeita ObjectId de marca malformado', () => {
    expect(createMotoSchema.safeParse({ ...motoValida, brand: 'nao-e-objectid' }).success).toBe(
      false,
    );
  });

  it('rejeita enum inválido', () => {
    expect(createMotoSchema.safeParse({ ...motoValida, fuel: 'DIESEL' }).success).toBe(false);
    expect(createMotoSchema.safeParse({ ...motoValida, transmission: 'Manual' }).success).toBe(
      false,
    );
  });

  it('rejeita ano futuro além do próximo e ano antigo demais', () => {
    const proximoAno = new Date().getFullYear() + 1;
    expect(createMotoSchema.safeParse({ ...motoValida, year: proximoAno }).success).toBe(true);
    expect(createMotoSchema.safeParse({ ...motoValida, year: proximoAno + 1 }).success).toBe(false);
    expect(createMotoSchema.safeParse({ ...motoValida, year: 1949 }).success).toBe(false);
  });

  it('rejeita preço zero ou negativo', () => {
    expect(createMotoSchema.safeParse({ ...motoValida, price: 0 }).success).toBe(false);
    expect(createMotoSchema.safeParse({ ...motoValida, price: -100 }).success).toBe(false);
  });

  it('exige preço anterior quando a moto está em oferta', () => {
    const result = createMotoSchema.safeParse({ ...motoValida, onSale: true });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toEqual(['previousPrice']);
  });

  it('exige que o preço anterior seja maior que o atual', () => {
    expect(
      createMotoSchema.safeParse({ ...motoValida, onSale: true, previousPrice: 30_000 }).success,
    ).toBe(false);
    expect(
      createMotoSchema.safeParse({ ...motoValida, onSale: true, previousPrice: 42_000 }).success,
    ).toBe(true);
  });

  it('limita a quantidade de opcionais e de imagens', () => {
    expect(
      createMotoSchema.safeParse({ ...motoValida, features: Array(41).fill('x') }).success,
    ).toBe(false);
  });
});

describe('updateMotoSchema', () => {
  it('aceita atualização parcial', () => {
    expect(updateMotoSchema.safeParse({ color: 'Preta' }).success).toBe(true);
    expect(updateMotoSchema.safeParse({}).success).toBe(true);
  });

  it('mantém a proibição de campo desconhecido', () => {
    expect(updateMotoSchema.safeParse({ slug: 'novo-slug' }).success).toBe(false);
  });

  it('mantém a regra de oferta na atualização parcial', () => {
    expect(updateMotoSchema.safeParse({ onSale: true }).success).toBe(false);
  });
});
