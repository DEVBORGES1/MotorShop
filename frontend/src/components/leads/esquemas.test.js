import { describe, expect, it } from 'vitest';

import { esquemaContato, esquemaInteresse, esquemaVenda } from './esquemas.js';

const contato = { name: 'Maria Silva', phone: '(49) 99999-8888', email: '', consent: true };
const erros = (resultado) => resultado.error?.issues.map((issue) => issue.path.join('.')) ?? [];

describe('formulário de interesse', () => {
  it('aceita nome, telefone e consentimento; normaliza o telefone', () => {
    const resultado = esquemaInteresse.safeParse(contato);
    expect(resultado.success).toBe(true);
    expect(resultado.data.phone).toBe('+5549999998888');
  });

  it('exige a caixa de consentimento marcada', () => {
    expect(erros(esquemaInteresse.safeParse({ ...contato, consent: false }))).toContain('consent');
  });

  it('recusa telefone sem DDD', () => {
    expect(erros(esquemaInteresse.safeParse({ ...contato, phone: '99999-8888' }))).toContain(
      'phone',
    );
  });
});

describe('formulário de contato', () => {
  it('exige mensagem', () => {
    expect(erros(esquemaContato.safeParse({ ...contato, message: '' }))).toContain('message');
  });
});

describe('formulário de venda', () => {
  it('exige marca, modelo, ano e km, e aceita preço e estado em branco', () => {
    expect(
      erros(esquemaVenda.safeParse({ ...contato, year: undefined, mileage: undefined })),
    ).toEqual(expect.arrayContaining(['brand', 'model', 'year', 'mileage']));

    const ok = esquemaVenda.safeParse({
      ...contato,
      brand: 'Honda',
      model: 'CG 160',
      year: 2020,
      mileage: 30000,
    });
    expect(ok.success).toBe(true);
  });

  it('recusa ano fora da faixa', () => {
    expect(
      erros(esquemaVenda.safeParse({ ...contato, brand: 'H', model: 'M', year: 1800, mileage: 0 })),
    ).toContain('year');
  });
});
