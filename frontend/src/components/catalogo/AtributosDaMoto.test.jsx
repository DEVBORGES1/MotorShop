// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AtributosDaMoto } from './AtributosDaMoto.jsx';

const itens = () => screen.queryAllByRole('listitem').map((item) => item.textContent);

describe('AtributosDaMoto', () => {
  it('mostra ano, quilometragem, cilindrada e câmbio', () => {
    render(
      <AtributosDaMoto
        moto={{ year: 2022, mileage: 9000, engineCapacity: 125, transmission: 'AUTOMATIC' }}
      />,
    );

    expect(itens()).toEqual(['2022', '9.000 km', '125 cc', 'Automático']);
  });

  it('atributo que o cadastro não tem some da lista, sem traço nem "undefined"', () => {
    render(<AtributosDaMoto moto={{ year: 2020, mileage: null }} />);

    expect(itens()).toEqual(['2020']);
  });

  it('0 km é dado (moto zero), não ausência', () => {
    render(<AtributosDaMoto moto={{ mileage: 0 }} />);

    expect(itens()).toEqual(['0 km']);
  });

  it('sem nenhum atributo, não desenha lista vazia', () => {
    const { container } = render(<AtributosDaMoto moto={{}} />);

    expect(container.innerHTML).toBe('');
  });
});
