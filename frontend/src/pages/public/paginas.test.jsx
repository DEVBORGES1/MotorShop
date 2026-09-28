// @vitest-environment jsdom
import { CONSENT_TEXT_VERSION } from '@motorshop/shared';
import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as publicService from '@/services/publicService.js';
import { LOJA, motoDeTeste, pagina, renderizar } from '@/test/renderizar.jsx';

import { Contato } from './Contato.jsx';
import { Financiamento } from './Financiamento.jsx';
import { Privacidade } from './Privacidade.jsx';
import { VendaSuaMoto } from './VendaSuaMoto.jsx';

vi.mock('@/services/publicService.js', () => ({
  leads: { create: vi.fn() },
  motos: { list: vi.fn() },
}));

const comLoja = (mudancas) => ({ ...LOJA, ...mudancas });
/** Intl usa espaço não separável entre "R$" e o número; `\s` também o reconhece. */
const reais = (texto) => texto.replace(/\s/g, ' ');

/** Página com o estoque vazio: o simulador fica só com o valor digitado. */
const semEstoque = async () => {
  const tela = renderizar(<Financiamento />, { rota: '/financiamento' });
  await screen.findByLabelText('Valor da moto (R$)');
  return tela;
};

const enviarSimulacao = async (user) => {
  await user.click(screen.getByRole('button', { name: 'Enviar esta simulação para a loja' }));
  await user.type(screen.getByLabelText(/Seu nome/), 'Carla');
  await user.type(screen.getByLabelText(/WhatsApp ou telefone/), '49 99111-2222');
  await user.click(screen.getByRole('checkbox', { name: /Autorizo/ }));
  await user.click(screen.getByRole('button', { name: 'Enviar simulação' }));
  await screen.findByText('Simulação enviada');
  return publicService.leads.create.mock.lastCall[0];
};

describe('financiamento', () => {
  beforeEach(() => {
    publicService.leads.create.mockResolvedValue({ id: 'l1' });
    publicService.motos.list.mockResolvedValue(pagina([]));
  });

  it('simula: valor e entrada viram parcela; mudar o prazo recalcula', async () => {
    const { user } = await semEstoque();

    await user.type(screen.getByLabelText('Valor da moto (R$)'), '30000');
    const entrada = screen.getByLabelText(/^Entrada/);
    // A entrada acompanha o mínimo da loja (20%) quando o valor sobe.
    await waitFor(() => expect(entrada.value).toBe('6.000'));
    expect(screen.getByText('48 parcelas de')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /^12x/ }));

    expect(screen.getByText('12 parcelas de')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^12x/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('valor digitado aparece formatado em reais ao sair do campo, e a entrada mostra o %', async () => {
    const { user } = await semEstoque();
    const valor = screen.getByLabelText('Valor da moto (R$)');

    await user.type(valor, '30000');
    await user.tab();

    expect(valor.value).toBe('30.000');
    expect(screen.getByText(/20% do valor · mínimo R\$\s6\.000,00 \(20%\)/)).toBeTruthy();
  });

  it('entrada abaixo do mínimo da loja explica o motivo em vez de calcular', async () => {
    const { user } = await semEstoque();
    await user.type(screen.getByLabelText('Valor da moto (R$)'), '30000');
    const entrada = screen.getByLabelText(/^Entrada/);

    await user.clear(entrada);
    await user.type(entrada, '1000');

    expect(await screen.findByText(/entrada mínima/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Enviar esta simulação para a loja' })).toBeNull();
  });

  it('envia a simulação como lead — só os parâmetros, a taxa quem calcula é o servidor', async () => {
    const { user } = await semEstoque();
    await user.type(screen.getByLabelText('Valor da moto (R$)'), '30000');
    await user.click(screen.getByRole('button', { name: /^24x/ }));

    const lead = await enviarSimulacao(user);
    expect(lead).toMatchObject({
      type: 'FINANCING',
      data: { vehiclePrice: 30000, downPayment: 6000, installments: 24 },
      consent: { accepted: true, textVersion: CONSENT_TEXT_VERSION },
    });
    expect(lead.data).not.toHaveProperty('monthlyRate');
    expect(lead.data).not.toHaveProperty('tradeInValue');
    expect(lead).not.toHaveProperty('moto');
  });

  describe('a partir do estoque', () => {
    const cb = motoDeTeste({ id: 'cb', slug: 'honda-cb-500f-2024', price: 30000 });
    const mt = motoDeTeste({
      id: 'mt',
      slug: 'yamaha-mt-03-2023',
      brand: { name: 'Yamaha', slug: 'yamaha' },
      model: 'MT-03',
      year: 2023,
      price: 20000,
    });
    const reservada = motoDeTeste({ id: 'rs', model: 'Reservada', status: 'RESERVED' });

    beforeEach(() => publicService.motos.list.mockResolvedValue(pagina([mt, cb, reservada])));

    it('já abre simulando a moto mais recente, sem pedir o valor', async () => {
      renderizar(<Financiamento />, { rota: '/financiamento' });

      const escolha = await screen.findByLabelText('Moto para simular');
      expect(escolha.value).toBe('mt');
      // Só as disponíveis, em ordem alfabética, e a saída para digitar.
      expect(
        within(escolha)
          .getAllByRole('option')
          .map((o) => reais(o.textContent)),
      ).toEqual([
        'Honda CB 500F 2024 · R$ 30.000,00',
        'Yamaha MT-03 2023 · R$ 20.000,00',
        'Outro valor (digitar)',
      ]);
      expect(screen.queryByLabelText('Valor da moto (R$)')).toBeNull();
      expect(screen.getByText('48 parcelas de')).toBeTruthy();
      expect(screen.getByLabelText(/^Entrada/).value).toBe('4.000');
      expect(screen.getByRole('link', { name: /Ver fotos e ficha/ }).getAttribute('href')).toBe(
        '/motos/yamaha-mt-03-2023',
      );
    });

    it('trocar a moto recalcula a partir do mínimo dela e o lead vai ligado à moto', async () => {
      const { user } = renderizar(<Financiamento />, { rota: '/financiamento' });

      await user.selectOptions(await screen.findByLabelText('Moto para simular'), 'cb');
      expect(screen.getByLabelText(/^Entrada/).value).toBe('6.000');

      const lead = await enviarSimulacao(user);
      expect(lead).toMatchObject({
        moto: 'cb',
        data: { vehiclePrice: 30000, downPayment: 6000, installments: 48 },
      });
    });

    it('"Outro valor" volta ao campo digitado', async () => {
      const { user } = renderizar(<Financiamento />, { rota: '/financiamento' });

      await user.selectOptions(await screen.findByLabelText('Moto para simular'), 'outro');

      expect(screen.getByLabelText('Valor da moto (R$)')).toBeTruthy();
      expect(screen.queryByRole('link', { name: /Ver fotos e ficha/ })).toBeNull();
    });

    it('moto na troca soma na entrada, baixa a parcela e vai no lead', async () => {
      const { user } = renderizar(<Financiamento />, { rota: '/financiamento' });
      await user.selectOptions(await screen.findByLabelText('Moto para simular'), 'cb');
      const parcelaSemTroca = screen.getByText('48 parcelas de').nextSibling.textContent;

      await user.click(screen.getByRole('switch', { name: /moto para dar na troca/ }));
      await user.type(screen.getByLabelText('Valor estimado da sua moto (R$)'), '8000');

      expect(screen.getByLabelText(/^Entrada em dinheiro/).value).toBe('6.000');
      expect(
        screen.getByText((_, el) =>
          /^Entrada de R\$\s14\.000,00: R\$\s6\.000,00 em dinheiro \+ R\$\s8\.000,00 da sua moto$/.test(
            el?.textContent ?? '',
          ),
        ),
      ).toBeTruthy();
      expect(screen.getByText('48 parcelas de').nextSibling.textContent).not.toBe(parcelaSemTroca);

      const lead = await enviarSimulacao(user);
      expect(lead.data).toEqual({
        vehiclePrice: 30000,
        downPayment: 14000,
        installments: 48,
        tradeInValue: 8000,
      });
    });

    it('com a troca cobrindo o mínimo, dá para simular sem dinheiro na entrada', async () => {
      const { user } = renderizar(<Financiamento />, { rota: '/financiamento' });
      await user.selectOptions(await screen.findByLabelText('Moto para simular'), 'cb');

      await user.click(screen.getByRole('switch', { name: /moto para dar na troca/ }));
      await user.type(screen.getByLabelText('Valor estimado da sua moto (R$)'), '7000');
      const dinheiro = screen.getByLabelText(/^Entrada em dinheiro/);
      await user.clear(dinheiro);
      await user.type(dinheiro, '0');

      expect(screen.getByText('48 parcelas de')).toBeTruthy();
      expect(screen.queryByText(/entrada mínima/i)).toBeNull();
    });

    it('trocar de moto mantém a troca informada', async () => {
      const { user } = renderizar(<Financiamento />, { rota: '/financiamento' });
      const escolha = await screen.findByLabelText('Moto para simular');

      await user.click(screen.getByRole('switch', { name: /moto para dar na troca/ }));
      await user.type(screen.getByLabelText('Valor estimado da sua moto (R$)'), '3000');
      await user.selectOptions(escolha, 'cb');

      expect(screen.getByRole('switch', { name: /moto para dar na troca/ }).checked).toBe(true);
      expect(screen.getByLabelText('Valor estimado da sua moto (R$)').value).toBe('3.000');
      // Mínimo da CB (6.000) menos a troca (3.000).
      expect(screen.getByLabelText(/^Entrada em dinheiro/).value).toBe('3.000');
    });

    it('loja sem "Venda sua moto" não oferece a troca', async () => {
      renderizar(<Financiamento />, {
        rota: '/financiamento',
        store: comLoja({ features: { financingEnabled: true, sellMotoEnabled: false } }),
      });

      await screen.findByLabelText('Moto para simular');
      expect(screen.queryByRole('switch', { name: /moto para dar na troca/ })).toBeNull();
    });
  });

  it('se o estoque não carregar, o simulador segue com o valor digitado', async () => {
    publicService.motos.list.mockRejectedValue(new Error('fora do ar'));
    renderizar(<Financiamento />, { rota: '/financiamento' });

    expect(await screen.findByLabelText('Valor da moto (R$)')).toBeTruthy();
    expect(screen.queryByLabelText('Moto para simular')).toBeNull();
  });

  it('abertura mostra os destaques que valem para a loja', async () => {
    renderizar(<Financiamento />, { rota: '/financiamento' });

    const abertura = screen.getByRole('heading', { level: 1 }).closest('section');
    expect(within(abertura).getByText('Em até 48x')).toBeTruthy();
    expect(within(abertura).getByText('Sua moto na troca')).toBeTruthy();
    await screen.findByLabelText('Valor da moto (R$)');
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
