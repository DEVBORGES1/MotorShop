import { describe, expect, it } from 'vitest';

import { linkWhatsApp, mensagemInteresse, normalizarNumero } from './whatsapp.js';

describe('normalizarNumero', () => {
  it('põe o DDI no celular com DDD', () => {
    expect(normalizarNumero('(49) 99811-2215')).toBe('5549998112215');
  });

  it('põe o DDI no fixo com DDD', () => {
    expect(normalizarNumero('49 3565-5098')).toBe('554935655098');
  });

  it('não duplica o DDI de quem já digitou completo', () => {
    expect(normalizarNumero('+55 (49) 99811-2215')).toBe('5549998112215');
  });

  it('recusa número curto demais para ser discado', () => {
    expect(normalizarNumero('99811')).toBeNull();
    expect(normalizarNumero('')).toBeNull();
    expect(normalizarNumero(null)).toBeNull();
  });
});

describe('linkWhatsApp', () => {
  it('monta o link com a mensagem codificada', () => {
    expect(linkWhatsApp('49998112215', 'Olá, tudo bem?')).toBe(
      'https://wa.me/5549998112215?text=Ol%C3%A1%2C%20tudo%20bem%3F',
    );
  });

  it('dispensa a mensagem', () => {
    expect(linkWhatsApp('49998112215')).toBe('https://wa.me/5549998112215');
    expect(linkWhatsApp('49998112215', '   ')).toBe('https://wa.me/5549998112215');
  });

  it('devolve null quando a loja não configurou WhatsApp', () => {
    // Quem chama usa isso para esconder o botão em vez de abrir um link morto.
    expect(linkWhatsApp(null, 'oi')).toBeNull();
  });
});

describe('mensagemInteresse', () => {
  it('nomeia a moto e inclui o endereço da página', () => {
    const moto = { brand: { name: 'Honda' }, model: 'CB 500F', year: 2023 };

    expect(mensagemInteresse(moto, 'https://loja.com/moto/cb-500f')).toBe(
      'Olá! Tenho interesse na Honda CB 500F 2023 (https://loja.com/moto/cb-500f). Ela ainda está disponível?',
    );
  });

  it('cai numa mensagem genérica quando não há moto', () => {
    expect(mensagemInteresse(null)).toBe('Olá! Vi o site e gostaria de mais informações.');
  });
});
