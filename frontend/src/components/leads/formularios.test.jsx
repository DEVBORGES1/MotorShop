// @vitest-environment jsdom
import { CONSENT_TEXT_VERSION } from '@motorshop/shared';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as publicService from '@/services/publicService.js';
import { motoDeTeste, renderizar } from '@/test/renderizar.jsx';

import { ContactForm } from './ContactForm.jsx';
import { InterestForm } from './InterestForm.jsx';
import { SellMotoForm } from './SellMotoForm.jsx';

vi.mock('@/services/publicService.js', () => ({ leads: { create: vi.fn() } }));

const enviado = () => publicService.leads.create.mock.lastCall[0];

async function preencherContato(user, { nome = 'Maria Silva', telefone = '49 99999-8888' } = {}) {
  await user.type(screen.getByLabelText(/Seu nome/), nome);
  await user.type(screen.getByLabelText(/WhatsApp ou telefone/), telefone);
}

const marcarConsentimento = (user) =>
  user.click(screen.getByRole('checkbox', { name: /Autorizo/ }));

describe('formulários de lead', () => {
  beforeEach(() => {
    publicService.leads.create.mockResolvedValue({ id: 'l1' });
  });

  describe('ContactForm', () => {
    it('vazio: mostra os erros e não envia', async () => {
      const { user } = renderizar(<ContactForm />, { rota: '/contato' });

      await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));

      expect(await screen.findByText('Marque a autorização para podermos responder')).toBeTruthy();
      expect(screen.getByText('Escreva sua mensagem')).toBeTruthy();
      expect(publicService.leads.create).not.toHaveBeenCalled();
    });

    it('sem marcar o consentimento, não envia (LGPD)', async () => {
      const { user } = renderizar(<ContactForm />, { rota: '/contato' });
      await preencherContato(user);
      await user.type(screen.getByLabelText(/Mensagem/), 'Vocês aceitam troca?');

      await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));

      expect(await screen.findByText('Marque a autorização para podermos responder')).toBeTruthy();
      expect(publicService.leads.create).not.toHaveBeenCalled();
    });

    it('envia o lead com consentimento versionado e a página de origem', async () => {
      const { user } = renderizar(<ContactForm />, { rota: '/contato' });
      await preencherContato(user);
      await user.type(screen.getByLabelText(/Mensagem/), 'Vocês aceitam troca?');
      await marcarConsentimento(user);

      await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));

      expect(await screen.findByText('Recebemos seu contato')).toBeTruthy();
      expect(enviado()).toMatchObject({
        type: 'CONTACT',
        name: 'Maria Silva',
        message: 'Vocês aceitam troca?',
        consent: { accepted: true, textVersion: CONSENT_TEXT_VERSION },
        source: { page: '/contato' },
      });
      expect(enviado()).not.toHaveProperty('email');
    });

    it('depois de enviar, dá para mandar outra mensagem com o formulário limpo', async () => {
      const { user } = renderizar(<ContactForm />, { rota: '/contato' });
      await preencherContato(user);
      await user.type(screen.getByLabelText(/Mensagem/), 'Primeira mensagem');
      await marcarConsentimento(user);
      await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));

      await user.click(await screen.findByRole('button', { name: 'Enviar outra mensagem' }));

      expect(screen.getByLabelText(/Seu nome/).value).toBe('');
    });

    it('erro da API aparece na tela, com o detalhe dos campos', async () => {
      publicService.leads.create.mockRejectedValue(
        Object.assign(new Error('Dados inválidos'), {
          status: 422,
          errors: [{ field: 'phone', message: 'Telefone inválido' }],
        }),
      );
      const { user } = renderizar(<ContactForm />, { rota: '/contato' });
      await preencherContato(user);
      await user.type(screen.getByLabelText(/Mensagem/), 'Oi, tudo bem?');
      await marcarConsentimento(user);

      await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));

      expect(await screen.findByText('Dados inválidos: Telefone inválido')).toBeTruthy();
    });

    it('limite de envios (429): mostra a mensagem do servidor', async () => {
      publicService.leads.create.mockRejectedValue(
        Object.assign(new Error('Muitas tentativas. Aguarde alguns minutos.'), { status: 429 }),
      );
      const { user } = renderizar(<ContactForm />, { rota: '/contato' });
      await preencherContato(user);
      await user.type(screen.getByLabelText(/Mensagem/), 'Oi, tudo bem?');
      await marcarConsentimento(user);

      await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));

      expect(await screen.findByText('Muitas tentativas. Aguarde alguns minutos.')).toBeTruthy();
    });

    it('clique duplo envia uma vez só', async () => {
      let liberar;
      publicService.leads.create.mockReturnValue(new Promise((ok) => (liberar = ok)));
      const { user } = renderizar(<ContactForm />, { rota: '/contato' });
      await preencherContato(user);
      await user.type(screen.getByLabelText(/Mensagem/), 'Oi, tudo bem?');
      await marcarConsentimento(user);

      const botao = screen.getByRole('button', { name: 'Enviar mensagem' });
      await user.dblClick(botao);
      liberar({ id: 'l1' });

      await screen.findByText('Recebemos seu contato');
      expect(publicService.leads.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('InterestForm', () => {
    const formulario = (moto = motoDeTeste()) =>
      renderizar(<InterestForm moto={moto} nome="Honda CB 500F" whatsapp="https://wa.me/1" />, {
        rota: '/motos/honda-cb-500f-2024',
      });

    it('envia o interesse vinculado à moto', async () => {
      const { user } = formulario();
      await preencherContato(user);
      await marcarConsentimento(user);

      await user.click(screen.getByRole('button', { name: 'Enviar interesse' }));

      expect(await screen.findByText(/vai entrar em contato sobre a Honda CB 500F/)).toBeTruthy();
      expect(enviado()).toMatchObject({ type: 'MOTO_INTEREST', moto: 'm1' });
      expect(screen.getByRole('link', { name: /Chame no WhatsApp/ })).toBeTruthy();
    });

    it('moto vendida vira "avise-me de uma similar", com mensagem pronta', async () => {
      const { user } = formulario(motoDeTeste({ status: 'SOLD' }));
      await preencherContato(user);
      await marcarConsentimento(user);

      await user.click(screen.getByRole('button', { name: 'Quero ser avisado' }));

      expect(await screen.findByText('Pedido registrado')).toBeTruthy();
      expect(enviado().message).toMatch(/moto parecida/);
    });
  });

  describe('SellMotoForm', () => {
    it('exige marca, modelo, ano e quilometragem', async () => {
      const { user } = renderizar(<SellMotoForm />, { rota: '/venda-sua-moto' });
      await preencherContato(user);
      await marcarConsentimento(user);

      await user.click(screen.getByRole('button', { name: 'Pedir avaliação' }));

      await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(2));
      expect(publicService.leads.create).not.toHaveBeenCalled();
    });

    it('envia os dados da moto como números, e sem os opcionais vazios', async () => {
      const { user } = renderizar(<SellMotoForm />, { rota: '/venda-sua-moto' });
      await user.type(screen.getByLabelText(/Marca/), 'Yamaha');
      await user.type(screen.getByLabelText(/Modelo/), 'Fazer 250');
      await user.type(screen.getByLabelText(/Ano/), '2019');
      await user.type(screen.getByLabelText(/Quilometragem/), '28000');
      await user.selectOptions(screen.getByLabelText(/Estado geral/), 'Bom — detalhes de uso');
      await preencherContato(user);
      await marcarConsentimento(user);

      await user.click(screen.getByRole('button', { name: 'Pedir avaliação' }));

      expect(await screen.findByText('Recebemos os dados da sua moto')).toBeTruthy();
      expect(enviado()).toMatchObject({
        type: 'SELL_MOTO',
        data: {
          brand: 'Yamaha',
          model: 'Fazer 250',
          year: 2019,
          mileage: 28000,
          condition: 'GOOD',
        },
      });
      expect(enviado().data).not.toHaveProperty('expectedPrice');
    });
  });
});
