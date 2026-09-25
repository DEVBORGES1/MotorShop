import { describe, expect, it } from 'vitest';

import { updateStoreSchema } from '../../src/modules/store/store.schema.js';

const valido = (dados) => updateStoreSchema.safeParse(dados).success;

const semana = [1, 2, 3, 4, 5].map((weekday) => ({
  weekday,
  opensAt: '08:00',
  closesAt: '18:00',
  closed: false,
}));

describe('updateStoreSchema — horários', () => {
  it('aceita a semana comercial com sábado meio período e domingo fechado', () => {
    const horarios = [
      ...semana,
      { weekday: 6, opensAt: '08:00', closesAt: '12:00', closed: false },
      { weekday: 0, opensAt: null, closesAt: null, closed: true },
    ];
    expect(valido({ businessHours: horarios })).toBe(true);
  });

  it('aceita lista vazia — a loja que não quer exibir horários', () => {
    expect(valido({ businessHours: [] })).toBe(true);
  });

  it('exige abertura e fechamento em dia aberto', () => {
    expect(valido({ businessHours: [{ weekday: 1, opensAt: '08:00', closed: false }] })).toBe(
      false,
    );
    expect(valido({ businessHours: [{ weekday: 1 }] })).toBe(false);
  });

  it('recusa fechamento antes ou igual à abertura', () => {
    expect(valido({ businessHours: [{ weekday: 1, opensAt: '18:00', closesAt: '08:00' }] })).toBe(
      false,
    );
    expect(valido({ businessHours: [{ weekday: 1, opensAt: '08:00', closesAt: '08:00' }] })).toBe(
      false,
    );
  });

  it('recusa horas impossíveis', () => {
    expect(valido({ businessHours: [{ weekday: 1, opensAt: '08:00', closesAt: '25:00' }] })).toBe(
      false,
    );
    expect(valido({ businessHours: [{ weekday: 1, opensAt: '08:60', closesAt: '18:00' }] })).toBe(
      false,
    );
  });

  it('recusa o mesmo dia repetido', () => {
    expect(valido({ businessHours: [semana[0], semana[0]] })).toBe(false);
  });
});

describe('updateStoreSchema — links', () => {
  it('aceita links https do mapa e das redes', () => {
    expect(
      valido({
        address: { mapsUrl: 'https://maps.app.goo.gl/abc123' },
        social: { youtube: 'https://youtube.com/@loja', instagram: null },
      }),
    ).toBe(true);
  });

  it('recusa javascript: — o link vira href no site público', () => {
    expect(valido({ address: { mapsUrl: 'javascript:alert(1)' } })).toBe(false);
    expect(valido({ social: { youtube: 'javascript:alert(1)' } })).toBe(false);
  });

  it('recusa @usuario solto no lugar do link', () => {
    expect(valido({ social: { instagram: '@loja' } })).toBe(false);
  });
});

describe('updateStoreSchema — módulos e identidade', () => {
  it('aceita ligar e desligar módulos', () => {
    expect(valido({ features: { financingEnabled: false, sellMotoEnabled: true } })).toBe(true);
  });

  it('recusa módulo desconhecido', () => {
    expect(valido({ features: { leilaoEnabled: true } })).toBe(false);
  });

  it('aceita razão social e complemento', () => {
    const { data } = updateStoreSchema.safeParse({
      legalName: '  Loja Exemplo Ltda  ',
      address: { complement: 'Sala 2' },
    });
    expect(data.legalName).toBe('Loja Exemplo Ltda');
    expect(data.address.complement).toBe('Sala 2');
  });
});
