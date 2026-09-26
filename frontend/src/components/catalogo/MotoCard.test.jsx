// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DONO, motoDeTeste, renderizar } from '@/test/renderizar.jsx';

import { MotoCard } from './MotoCard.jsx';

const card = (moto) => renderizar(<MotoCard moto={moto} />);

describe('MotoCard', () => {
  it('mostra nome, ficha resumida e preço, com link para a página da moto', () => {
    card(motoDeTeste());

    const link = screen.getByRole('link', { name: 'Honda CB 500F' });
    expect(link.getAttribute('href')).toBe('/motos/honda-cb-500f-2024');
    expect(screen.getByText(/2024 · 4\.200 km · 471 cc/)).toBeTruthy();
    expect(screen.getByText(/R\$\s*38\.900/)).toBeTruthy();
  });

  it('botão de interesse abre o WhatsApp com a moto e o link absoluto dela', () => {
    card(motoDeTeste());

    const whatsapp = screen.getByRole('link', { name: /Tenho interesse/ });
    const href = decodeURIComponent(whatsapp.getAttribute('href'));
    expect(href).toMatch(/^https:\/\/wa\.me\/5549999990000/);
    expect(href).toContain('Honda CB 500F 2024');
    expect(href).toContain('https://loja.test/motos/honda-cb-500f-2024');
    expect(whatsapp.getAttribute('rel')).toContain('noopener');
  });

  it('oferta mostra o preço antigo riscado e o selo', () => {
    card(motoDeTeste({ onSale: true, previousPrice: 42000 }));

    expect(screen.getByText('Oferta')).toBeTruthy();
    expect(screen.getByText(/R\$\s*42\.000/).className).toContain('line-through');
  });

  it('"oferta" com preço antigo menor não é oferta — o selo não aparece', () => {
    card(motoDeTeste({ onSale: true, previousPrice: 30000 }));

    expect(screen.queryByText('Oferta')).toBeNull();
  });

  it('reservada ganha selo; sem foto, um aviso no lugar da imagem', () => {
    card(motoDeTeste({ status: 'RESERVED' }));

    expect(screen.getByText('Reservada')).toBeTruthy();
    expect(screen.getByText('sem foto')).toBeTruthy();
  });

  it('com foto, usa o texto alternativo e carregamento preguiçoso', () => {
    card(
      motoDeTeste({
        images: [{ id: 'f1', url: 'https://img.test/f1.jpg', alt: 'Lateral da CB', order: 0 }],
        mainImageId: 'f1',
      }),
    );

    const foto = screen.getByRole('img', { name: 'Lateral da CB' });
    expect(foto.getAttribute('loading')).toBe('lazy');
  });

  it('loja sem WhatsApp: sem botão quebrado', () => {
    renderizar(<MotoCard moto={motoDeTeste()} />, {
      store: { name: 'Loja', contact: {}, features: {} },
    });

    expect(screen.queryByRole('link', { name: /Tenho interesse/ })).toBeNull();
  });

  it('visitante não vê o atalho "Editar"', () => {
    card(motoDeTeste());
    expect(screen.queryByRole('link', { name: /Editar/ })).toBeNull();
  });

  it('equipe logada vê "Editar", que leva ao formulário da moto no painel', () => {
    renderizar(<MotoCard moto={motoDeTeste()} />, { usuario: DONO });
    const editar = screen.getByRole('link', { name: 'Editar Honda CB 500F' });
    expect(editar.getAttribute('href')).toBe('/admin/motos/m1/editar');
  });
});
