import { describe, expect, it } from 'vitest';

import { extrairUtm, origemDaChegada, origemDoLead } from './origem.js';

describe('extrairUtm', () => {
  it('lê só os parâmetros utm_ preenchidos', () => {
    expect(extrairUtm('?utm_source=instagram&utm_campaign=verao&utm_medium=&x=1')).toEqual({
      source: 'instagram',
      campaign: 'verao',
    });
  });

  it('sem UTM, devolve undefined', () => {
    expect(extrairUtm('?page=2')).toBeUndefined();
    expect(extrairUtm('')).toBeUndefined();
  });

  it('corta valores longos demais para a API', () => {
    expect(extrairUtm(`?utm_source=${'a'.repeat(300)}`).source).toHaveLength(100);
  });
});

describe('origemDaChegada', () => {
  it('guarda referrer externo', () => {
    expect(
      origemDaChegada({ referrer: 'https://www.google.com/', search: '', host: 'loja.com.br' }),
    ).toEqual({ referrer: 'https://www.google.com/', utm: undefined });
  });

  it('descarta referrer do próprio site — é navegação interna', () => {
    const origem = origemDaChegada({
      referrer: 'https://loja.com.br/estoque',
      search: '',
      host: 'loja.com.br',
    });
    expect(origem.referrer).toBeUndefined();
  });

  it('tolera referrer inválido', () => {
    expect(origemDaChegada({ referrer: 'lixo', search: '', host: 'x' }).referrer).toBeUndefined();
  });
});

describe('origemDoLead', () => {
  it('junta a página do formulário à origem da chegada', () => {
    expect(
      origemDoLead('/contato', { referrer: 'https://instagram.com/', utm: { source: 'ig' } }),
    ).toEqual({ page: '/contato', referrer: 'https://instagram.com/', utm: { source: 'ig' } });
  });

  it('sem chegada registrada, manda só a página', () => {
    expect(origemDoLead('/contato', {})).toEqual({ page: '/contato' });
  });
});
