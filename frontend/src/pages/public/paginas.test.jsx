// @vitest-environment jsdom
import { CONSENT_TEXT_VERSION } from '@motorshop/shared';
import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as publicService from '@/services/publicService.js';
import { LOJA, renderizar } from '@/test/renderizar.jsx';

import { Contato } from './Contato.jsx';
import { Financiamento } from './Financiamento.jsx';
import { Privacidade } from './Privacidade.jsx';
import { VendaSuaMoto } from './VendaSuaMoto.jsx';

vi.mock('@/services/publicService.js', () => ({ leads: { create: vi.fn() } }));

const comLoja = (mudancas) => ({ ...LOJA, ...mudancas });

describe('financiamento', () => {
  beforeEach(() => publicService.leads.create.mockResolvedValue({ id: 'l1' }));

  it('simula: valor e entrada viram parcela; mudar o prazo recalcula', async () => {
    const { user } = renderizar(<Financiamento />, { rota: '/financiamento' });

    await user.type(screen.getByLabelText('Valor da moto (R$)'), '30000');
    const entrada = screen.getByLabelText(/^Entrada/);
    // A entrada acompanha o mínimo da loja (20%) quando o valor sobe.
    await waitFor(() => expect(entrada.value).toBe('6000'));
    expect(screen.getByText('48 parcelas de')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /^12x/ }));

    expect(screen.getByText('12 parcelas de')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^12x/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('entrada abaixo do mínimo da loja explica o motivo em vez de calcular', async () => {
    const { user } = renderizar(<Financiamento />, { rota: '/financiamento' });
    await user.type(screen.getByLabelText('Valor da moto (R$)'), '30000');
    const entrada = screen.getByLabelText(/^Entrada/);

    await user.clear(entrada);
    await user.type(entrada, '1000');

    expect(await screen.findByText(/entrada mínima/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Enviar esta simulação para a loja' })).toBeNull();
  });

  it('envia a simulação como lead — só os parâmetros, a taxa quem calcula é o servidor', async () => {
    const { user } = renderizar(<Financiamento />, { rota: '/financiamento' });
    await user.type(screen.getByLabelText('Valor da moto (R$)'), '30000');
    await user.click(screen.getByRole('button', { name: /^24x/ }));

    await user.click(screen.getByRole('button', { name: 'Enviar esta simulação para a loja' }));
    await user.type(screen.getByLabelText(/Seu nome/), 'Carla');
    await user.type(screen.getByLabelText(/WhatsApp ou telefone/), '49 99111-2222');
    await user.click(screen.getByRole('checkbox', { name: /Autorizo/ }));
    await user.click(screen.getByRole('button', { name: 'Enviar simulação' }));

    expect(await screen.findByText('Simulação enviada')).toBeTruthy();
    const lead = publicService.leads.create.mock.lastCall[0];
    expect(lead).toMatchObject({
      type: 'FINANCING',
      data: { vehiclePrice: 30000, downPayment: 6000, installments: 24 },
      consent: { accepted: true, textVersion: CONSENT_TEXT_VERSION },
    });
    expect(lead.data).not.toHaveProperty('monthlyRate');
  });

  it('taxa não configurada: sem simulação inventada, só o contato', () => {
    renderizar(<Financiamento />, {
      rota: '/financiamento',
      store: comLoja({ financing: { monthlyRate: null, installmentOptions: [] } }),
    });

    expect(screen.getByText(/simulação online ainda não está disponível/)).toBeTruthy();
    expect(screen.queryByLabelText('Valor da moto (R$)')).toBeNull();
  });

  it('módulo desligado: a página não existe', () => {
    renderizar(<Financiamento />, {
      rota: '/financiamento',
      store: comLoja({ features: { financingEnabled: false, sellMotoEnabled: true } }),
    });

    expect(screen.getByText('Página não encontrada')).toBeTruthy();
  });
});

describe('venda sua moto', () => {
  it('módulo ligado mostra o formulário; desligado, 404', () => {
    const ligado = renderizar(<VendaSuaMoto />, { rota: '/venda-sua-moto' });
    expect(screen.getByRole('button', { name: 'Pedir avaliação' })).toBeTruthy();
    ligado.unmount();

    renderizar(<VendaSuaMoto />, {
      rota: '/venda-sua-moto',
      store: comLoja({ features: { financingEnabled: true, sellMotoEnabled: false } }),
    });
    expect(screen.getByText('Página não encontrada')).toBeTruthy();
  });
});

describe('contato', () => {
  it('mostra os canais e o endereço da loja — tudo da configuração, nada fixo no código', () => {
    renderizar(<Contato />, { rota: '/contato' });

    expect(screen.getByRole('heading', { name: 'Contato' })).toBeTruthy();
    expect(screen.getByText(/Rua das Motos, 10/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /contato@loja\.test/ }).getAttribute('href')).toBe(
      'mailto:contato@loja.test',
    );
    expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeTruthy();
  });

  it('outra loja, outros dados', () => {
    renderizar(<Contato />, {
      rota: '/contato',
      store: comLoja({ name: 'Motos do Vale', contact: { whatsapp: null, email: 'oi@vale.test' } }),
    });

    expect(screen.getByText(/Fale com a Motos do Vale/)).toBeTruthy();
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).toBeNull();
  });
});

describe('privacidade', () => {
  it('nomeia a loja como controladora, cita a versão do consentimento e não promete prazo', () => {
    renderizar(<Privacidade />, { rota: '/privacidade' });

    expect(screen.getByText(/Loja Teste Ltda é a responsável/)).toBeTruthy();
    expect(screen.getByText(`Versão ${CONSENT_TEXT_VERSION}`)).toBeTruthy();
    const retencao = screen.getByRole('heading', {
      name: 'Por quanto tempo guardamos',
    }).parentElement;
    expect(within(retencao).getByText(/Enquanto forem úteis para o atendimento/)).toBeTruthy();
    expect(within(retencao).queryByText(/meses|anos/)).toBeNull();
  });
});
