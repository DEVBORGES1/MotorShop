import { CONSENT_TEXT_VERSION } from '@motorshop/shared';
import { describe, expect, it } from 'vitest';

import { montarLead } from './lead.js';

const contato = { name: 'Maria', phone: '+5549999998888', email: '', website: '' };

describe('montarLead', () => {
  it('interesse: vincula a moto e não manda data', () => {
    const lead = montarLead('MOTO_INTEREST', contato, {
      motoId: 'abc',
      source: { page: '/motos/x' },
    });

    expect(lead).toEqual({
      type: 'MOTO_INTEREST',
      name: 'Maria',
      phone: '+5549999998888',
      moto: 'abc',
      source: { page: '/motos/x' },
      consent: { accepted: true, textVersion: CONSENT_TEXT_VERSION },
    });
  });

  it('venda: move os campos da moto para data, sem os vazios', () => {
    const lead = montarLead('SELL_MOTO', {
      ...contato,
      brand: 'Honda',
      model: 'CG 160',
      year: 2020,
      mileage: 0,
      expectedPrice: undefined,
      condition: '',
    });

    expect(lead.data).toEqual({ brand: 'Honda', model: 'CG 160', year: 2020, mileage: 0 });
    expect(lead).not.toHaveProperty('brand');
  });

  it('contato: mensagem no corpo, sem data nem moto', () => {
    const lead = montarLead('CONTACT', { ...contato, message: 'Olá!' });
    expect(lead.message).toBe('Olá!');
    expect(lead).not.toHaveProperty('data');
    expect(lead).not.toHaveProperty('moto');
  });

  it('não manda e-mail nem honeypot vazios', () => {
    const lead = montarLead('CONTACT', { ...contato, message: 'Olá!' });
    expect(lead).not.toHaveProperty('email');
    expect(lead).not.toHaveProperty('website');
  });

  it('manda o honeypot quando preenchido — o servidor decide descartar', () => {
    expect(montarLead('CONTACT', { ...contato, website: 'x' }).website).toBe('x');
  });
});
