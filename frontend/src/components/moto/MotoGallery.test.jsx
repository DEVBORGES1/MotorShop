// @vitest-environment jsdom
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderizar } from '@/test/renderizar.jsx';

import { MotoGallery } from './MotoGallery.jsx';

const fotos = [1, 2, 3].map((n) => ({
  id: `f${n}`,
  url: `https://img.test/f${n}.jpg`,
  alt: `Foto ${n} da CB`,
  width: 1600,
  height: 1200,
}));

const galeria = (imagens = fotos) =>
  renderizar(<MotoGallery imagens={imagens} nome="Honda CB 500F" />);

const fotoPrincipal = () =>
  within(screen.getByRole('button', { name: /Ampliar foto/ })).getByRole('img');

describe('MotoGallery', () => {
  it('sem fotos, avisa em vez de mostrar uma área vazia', () => {
    galeria([]);
    expect(screen.getByText('Sem fotos desta moto')).toBeTruthy();
  });

  it('setas trocam a foto e voltam ao início depois da última', async () => {
    const { user } = galeria();

    expect(fotoPrincipal().getAttribute('alt')).toBe('Foto 1 da CB');
    await user.click(screen.getAllByRole('button', { name: 'Próxima foto' })[0]);
    expect(fotoPrincipal().getAttribute('alt')).toBe('Foto 2 da CB');
    await user.click(screen.getAllByRole('button', { name: 'Foto anterior' })[0]);
    await user.click(screen.getAllByRole('button', { name: 'Foto anterior' })[0]);
    expect(fotoPrincipal().getAttribute('alt')).toBe('Foto 3 da CB');
  });

  it('miniatura leva direto à foto', async () => {
    const { user } = galeria();

    await user.click(screen.getByRole('button', { name: 'Ver foto 3 de 3' }));
    expect(fotoPrincipal().getAttribute('alt')).toBe('Foto 3 da CB');
    expect(screen.getByRole('button', { name: /Ampliar foto — Foto 3 de 3/ })).toBeTruthy();
  });

  it('teclado: setas e Home/End', async () => {
    const { user } = galeria();

    screen.getByRole('button', { name: /Ampliar foto/ }).focus();
    await user.keyboard('{ArrowRight}');
    expect(fotoPrincipal().getAttribute('alt')).toBe('Foto 2 da CB');
    await user.keyboard('{End}');
    expect(fotoPrincipal().getAttribute('alt')).toBe('Foto 3 da CB');
    await user.keyboard('{Home}');
    expect(fotoPrincipal().getAttribute('alt')).toBe('Foto 1 da CB');
  });

  it('clique amplia; o botão de fechar fecha', async () => {
    const { user } = galeria();

    await user.click(screen.getByRole('button', { name: /Ampliar foto/ }));
    expect(screen.getByRole('button', { name: 'Fechar fotos ampliadas' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Fechar fotos ampliadas' }));
    expect(screen.queryByRole('button', { name: 'Fechar fotos ampliadas' })).toBeNull();
  });

  it('uma foto só: sem setas nem contador', () => {
    galeria(fotos.slice(0, 1));

    expect(screen.queryByRole('button', { name: 'Próxima foto' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ampliar foto' })).toBeTruthy();
  });
});
