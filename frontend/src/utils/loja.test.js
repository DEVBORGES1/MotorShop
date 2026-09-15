import { describe, expect, it } from 'vitest';

import { cidadeLinha, enderecoLinha, horariosAgrupados } from './loja.js';

const comercial = (weekday) => ({ weekday, opensAt: '08:00', closesAt: '18:00' });

describe('enderecoLinha', () => {
  it('junta rua, número e bairro', () => {
    expect(enderecoLinha({ street: 'Rua Exemplo', number: '1200', district: 'Centro' })).toBe(
      'Rua Exemplo, 1200 · Centro',
    );
  });

  it('pula o que a loja não preencheu', () => {
    expect(enderecoLinha({ street: 'Rua Exemplo' })).toBe('Rua Exemplo');
    expect(enderecoLinha({})).toBeNull();
    expect(enderecoLinha()).toBeNull();
  });
});

describe('cidadeLinha', () => {
  it('junta cidade, UF e CEP', () => {
    expect(cidadeLinha({ city: 'Videira', state: 'SC', zipCode: '89560-000' })).toBe(
      'Videira · SC · 89560-000',
    );
  });
});

describe('horariosAgrupados', () => {
  it('agrupa dias seguidos com o mesmo horário', () => {
    const semana = [1, 2, 3, 4, 5].map(comercial);
    semana.push({ weekday: 6, opensAt: '08:00', closesAt: '12:00' });
    semana.push({ weekday: 0, closed: true });

    expect(horariosAgrupados(semana)).toEqual([
      { dias: 'Seg a Sex', horario: '08:00 às 18:00' },
      { dias: 'Sáb', horario: '08:00 às 12:00' },
      { dias: 'Dom', horario: null },
    ]);
  });

  it('não junta dias separados por um buraco na semana', () => {
    // Fechada na quarta: "Seg a Sex" esconderia que a loja não abre no meio.
    const semana = [comercial(1), comercial(2), { weekday: 3, closed: true }, comercial(4)];

    expect(horariosAgrupados(semana)).toEqual([
      { dias: 'Seg a Ter', horario: '08:00 às 18:00' },
      { dias: 'Qua', horario: null },
      { dias: 'Qui', horario: '08:00 às 18:00' },
    ]);
  });

  it('começa a semana na segunda, mesmo recebendo fora de ordem', () => {
    const semana = [{ weekday: 0, closed: true }, comercial(1)];

    expect(horariosAgrupados(semana)).toEqual([
      { dias: 'Seg', horario: '08:00 às 18:00' },
      { dias: 'Dom', horario: null },
    ]);
  });

  it('devolve vazio quando a loja não cadastrou horário', () => {
    expect(horariosAgrupados([])).toEqual([]);
    expect(horariosAgrupados()).toEqual([]);
  });
});
