import { CONSENT_TEXT_VERSION, createLeadSchema, normalizePhoneBR } from '@motorshop/shared';
import { describe, expect, it } from 'vitest';

const consent = { accepted: true, textVersion: CONSENT_TEXT_VERSION };
const contato = { name: 'Maria Silva', phone: '(49) 99999-8888', consent };
const motoId = '64b000000000000000000001';

const parse = (dados) => createLeadSchema.safeParse(dados);
const campos = (resultado) => resultado.error?.issues.map((issue) => issue.path.join('.'));

describe('normalizePhoneBR', () => {
  it('normaliza celular e fixo com DDD para E.164', () => {
    expect(normalizePhoneBR('(49) 99999-8888')).toBe('+5549999998888');
    expect(normalizePhoneBR('49 3565-5098')).toBe('+554935655098');
  });

  it('aceita o DDI já digitado', () => {
    expect(normalizePhoneBR('+55 49 9 9999-8888')).toBe('+5549999998888');
    expect(normalizePhoneBR('5549999998888')).toBe('+5549999998888');
  });

  it('recusa número sem DDD, curto demais ou com DDD impossível', () => {
    expect(normalizePhoneBR('99999-8888')).toBeNull();
    expect(normalizePhoneBR('123')).toBeNull();
    expect(normalizePhoneBR('(01) 99999-8888')).toBeNull();
    expect(normalizePhoneBR('')).toBeNull();
    expect(normalizePhoneBR(null)).toBeNull();
  });

  it('recusa celular de 11 dígitos sem o 9 depois do DDD', () => {
    expect(normalizePhoneBR('49 8 9999-8888')).toBeNull();
  });
});

describe('createLeadSchema', () => {
  it('aceita os quatro tipos e normaliza o telefone', () => {
    const tipos = [
      { type: 'MOTO_INTEREST', moto: motoId },
      { type: 'SELL_MOTO', data: { brand: 'Honda', model: 'CG 160', year: 2020, mileage: 30000 } },
      { type: 'CONTACT', message: 'Vocês aceitam troca?' },
      {
        type: 'FINANCING',
        moto: motoId,
        data: { vehiclePrice: 30000, downPayment: 6000, installments: 36 },
      },
    ];

    for (const tipo of tipos) {
      const resultado = parse({ ...contato, ...tipo });
      expect(resultado.success, tipo.type).toBe(true);
      expect(resultado.data.phone).toBe('+5549999998888');
    }
  });

  it('recusa tipo desconhecido', () => {
    expect(parse({ ...contato, type: 'SPAM' }).success).toBe(false);
  });

  it('recusa data incompatível com o tipo', () => {
    // Dados de venda num lead de interesse: chave desconhecida, não ignorada.
    const resultado = parse({
      ...contato,
      type: 'MOTO_INTEREST',
      moto: motoId,
      data: { brand: 'Honda' },
    });
    expect(resultado.success).toBe(false);
  });

  it('interesse exige a moto', () => {
    expect(campos(parse({ ...contato, type: 'MOTO_INTEREST' }))).toContain('moto');
  });

  it('venda exige marca, modelo, ano e km', () => {
    const resultado = parse({ ...contato, type: 'SELL_MOTO', data: {} });
    expect(campos(resultado)).toEqual(
      expect.arrayContaining(['data.brand', 'data.model', 'data.year', 'data.mileage']),
    );
  });

  it('contato exige mensagem', () => {
    expect(campos(parse({ ...contato, type: 'CONTACT' }))).toContain('message');
  });

  it('financiamento recusa entrada maior que o valor', () => {
    const resultado = parse({
      ...contato,
      type: 'FINANCING',
      data: { vehiclePrice: 10000, downPayment: 12000, installments: 12 },
    });
    expect(campos(resultado)).toContain('data.downPayment');
  });

  it('exige consentimento aceito e na versão atual', () => {
    const base = { ...contato, type: 'CONTACT', message: 'Olá, tudo bem?' };
    expect(parse({ ...base, consent: undefined }).success).toBe(false);
    expect(
      parse({ ...base, consent: { accepted: false, textVersion: CONSENT_TEXT_VERSION } }).success,
    ).toBe(false);
    expect(parse({ ...base, consent: { accepted: true, textVersion: 'antiga' } }).success).toBe(
      false,
    );
  });

  it('não aceita data de consentimento vinda do cliente', () => {
    const resultado = parse({
      ...contato,
      type: 'CONTACT',
      message: 'Olá, tudo bem?',
      consent: { ...consent, at: '2000-01-01' },
    });
    expect(resultado.success).toBe(false);
  });

  it('recusa campo de controle interno (mass assignment)', () => {
    const base = { ...contato, type: 'CONTACT', message: 'Olá, tudo bem?' };
    expect(parse({ ...base, status: 'WON' }).success).toBe(false);
    expect(parse({ ...base, notes: [] }).success).toBe(false);
  });

  it('e-mail vazio do formulário conta como ausente', () => {
    const resultado = parse({ ...contato, email: '', type: 'CONTACT', message: 'Olá, tudo bem?' });
    expect(resultado.success).toBe(true);
    expect(resultado.data.email).toBeUndefined();
  });

  it('aceita o honeypot, para o servidor poder descartar em silêncio', () => {
    const resultado = parse({
      ...contato,
      type: 'CONTACT',
      message: 'Olá, tudo bem?',
      website: 'http://spam',
    });
    expect(resultado.success).toBe(true);
  });

  it('aceita origem com UTM e recusa página que não é caminho', () => {
    const base = { ...contato, type: 'CONTACT', message: 'Olá, tudo bem?' };
    expect(
      parse({ ...base, source: { page: '/contato', utm: { source: 'instagram' } } }).success,
    ).toBe(true);
    expect(parse({ ...base, source: { page: 'https://outro.site' } }).success).toBe(false);
  });
});
