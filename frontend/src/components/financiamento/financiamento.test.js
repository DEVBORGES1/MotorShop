import { FINANCING_DISCLAIMER } from '@motorshop/shared';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { StoreContext } from '@/contexts/StoreContext.jsx';

import { AvisoSimulacao } from './AvisoSimulacao.jsx';
import { FinancingSimulator } from './FinancingSimulator.jsx';

const loja = (financing) => ({
  store: {
    name: 'Loja Teste',
    contact: {},
    features: { financingEnabled: true },
    financing,
  },
  isLoading: false,
});

const render = (props, financing) =>
  renderToStaticMarkup(
    h(StoreContext.Provider, { value: loja(financing) }, h(FinancingSimulator, props)),
  );

const configurada = {
  monthlyRate: 1.79,
  installmentOptions: [12, 24, 36, 48],
  minDownPaymentPercent: 20,
};
/** Intl usa espaço não separável entre "R$" e o número. */
const texto = (html) => html.replace(/\u00a0/g, ' ');

describe('FinancingSimulator', () => {
  it('traz o aviso legal', () => {
    expect(render({ valorFixo: 30000 }, configurada)).toContain(FINANCING_DISCLAIMER);
  });

  it('com o preço da moto, já abre simulando: entrada mínima e maior prazo', () => {
    const html = texto(render({ valorFixo: 30000 }, configurada));

    expect(html).toContain('R$ 30.000,00');
    expect(html).toContain('value="6000"'); // entrada mínima de 20%
    expect(html).toContain('48 parcelas de');
    expect(html).toContain('R$ 749,39');
    expect(html).toContain('1,79% a.m.');
  });

  it('mostra só os prazos que a loja oferece', () => {
    const html = render({ valorFixo: 30000 }, { ...configurada, installmentOptions: [12, 24] });
    expect(html).toContain('12x');
    expect(html).toContain('24x');
    expect(html).not.toContain('48x');
  });

  it('sem valor informado, pede o valor em vez de mostrar NaN', () => {
    const html = render({}, configurada);
    expect(html).toContain('Informe o valor da moto');
    expect(html).not.toMatch(/NaN|Infinity/);
  });

  it('usa a taxa da loja: taxa zero não cobra juros', () => {
    const html = texto(
      render(
        { valorFixo: 12000 },
        { ...configurada, monthlyRate: 0, minDownPaymentPercent: 0, installmentOptions: [12] },
      ),
    );
    expect(html).toContain('R$ 1.000,00'); // 12.000 / 12
  });
});

describe('AvisoSimulacao', () => {
  it('é anunciado como nota', () => {
    const html = renderToStaticMarkup(h(AvisoSimulacao));
    expect(html).toContain('role="note"');
    expect(html).toContain('Não constitui proposta de crédito');
  });
});
