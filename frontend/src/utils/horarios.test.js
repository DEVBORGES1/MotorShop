import { describe, expect, it } from 'vitest';

import {
  abrirDia,
  horariosParaEnvio,
  horariosParaFormulario,
  validarHorarios,
} from './horarios.js';

const linha = (weekday, aberto, opensAt = '', closesAt = '') => ({
  weekday,
  nome: '',
  aberto,
  opensAt,
  closesAt,
});

describe('horariosParaFormulario', () => {
  it('sempre devolve os sete dias, começando na segunda', () => {
    const linhas = horariosParaFormulario([]);
    expect(linhas.map((l) => l.weekday)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(linhas.every((l) => !l.aberto)).toBe(true);
  });

  it('marca como aberto o dia com horário, e fechado o que falta', () => {
    const linhas = horariosParaFormulario([
      { weekday: 1, opensAt: '08:00', closesAt: '18:00', closed: false },
      { weekday: 0, opensAt: null, closesAt: null, closed: true },
    ]);

    expect(linhas[0]).toMatchObject({ weekday: 1, aberto: true, opensAt: '08:00' });
    expect(linhas[1]).toMatchObject({ weekday: 2, aberto: false, opensAt: '' });
    expect(linhas[6]).toMatchObject({ weekday: 0, aberto: false });
  });

  it('trata dia "aberto" sem horário como fechado — é assim que o site o exibe', () => {
    const [segunda] = horariosParaFormulario([{ weekday: 1, opensAt: '08:00', closed: false }]);
    expect(segunda.aberto).toBe(false);
  });
});

describe('abrirDia', () => {
  it('copia o horário do primeiro dia aberto', () => {
    const linhas = [linha(1, true, '09:00', '19:00'), linha(6, false)];
    expect(abrirDia(linhas, 6)[1]).toMatchObject({
      aberto: true,
      opensAt: '09:00',
      closesAt: '19:00',
    });
  });

  it('usa horário comercial quando nenhum dia está aberto', () => {
    expect(abrirDia([linha(1, false)], 1)[0]).toMatchObject({
      opensAt: '08:00',
      closesAt: '18:00',
    });
  });

  it('preserva o horário que o dia já tinha', () => {
    const linhas = [linha(1, true, '09:00', '19:00'), linha(6, false, '08:00', '12:00')];
    expect(abrirDia(linhas, 6)[1]).toMatchObject({ opensAt: '08:00', closesAt: '12:00' });
  });
});

describe('validarHorarios', () => {
  it('aceita dias fechados sem horário', () => {
    expect(validarHorarios([linha(0, false)])).toEqual({});
  });

  it('exige abertura e fechamento em dia aberto', () => {
    expect(validarHorarios([linha(1, true, '08:00', '')])).toHaveProperty('1');
  });

  it('recusa fechamento antes ou igual à abertura', () => {
    expect(validarHorarios([linha(1, true, '18:00', '08:00')])).toHaveProperty('1');
    expect(validarHorarios([linha(2, true, '08:00', '08:00')])).toHaveProperty('2');
  });
});

describe('horariosParaEnvio', () => {
  it('manda os sete dias, com nulo nos fechados', () => {
    const enviado = horariosParaEnvio([linha(1, true, '08:00', '18:00'), linha(0, false, '08:00')]);
    expect(enviado).toEqual([
      { weekday: 1, opensAt: '08:00', closesAt: '18:00', closed: false },
      { weekday: 0, opensAt: null, closesAt: null, closed: true },
    ]);
  });

  it('semana inteira fechada vira lista vazia — o site esconde o bloco de horários', () => {
    expect(horariosParaEnvio([linha(1, false), linha(0, false)])).toEqual([]);
  });
});
