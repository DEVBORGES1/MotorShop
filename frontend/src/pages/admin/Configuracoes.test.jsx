// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { storeAdmin } from '@/services/adminService.js';
import { DONO, renderizar, VENDEDOR } from '@/test/renderizar.jsx';

import { Configuracoes } from './Configuracoes.jsx';

vi.mock('@/services/adminService.js', () => ({ storeAdmin: { get: vi.fn(), update: vi.fn() } }));

const SALVA = {
  name: 'Motos do Vale',
  slogan: 'Revisadas',
  contact: { whatsapp: '49999990000', phone: '', email: 'contato@vale.test' },
  address: { street: 'Rua A', number: '10', city: 'Videira', state: 'SC' },
  social: { instagram: 'https://instagram.com/vale' },
  theme: { primary: '#ff5500', secondary: '#0a0b0a', accent: '#38c172' },
  features: { financingEnabled: true, sellMotoEnabled: true },
  financing: { monthlyRate: 1.79, installmentOptions: [24, 36], minDownPaymentPercent: 20 },
  businessHours: [{ weekday: 1, opensAt: '08:00', closesAt: '18:00', closed: false }],
};

const tela = (usuario) => renderizar(<Configuracoes />, { usuario });
const salvar = (user) => user.click(screen.getByRole('button', { name: 'Salvar configurações' }));

describe('configurações da loja', () => {
  beforeEach(() => {
    storeAdmin.get.mockResolvedValue(SALVA);
    storeAdmin.update.mockResolvedValue(SALVA);
  });

  it('ADMIN só visualiza: campos travados e sem botão de salvar', async () => {
    tela(VENDEDOR);

    expect(await screen.findByDisplayValue('Motos do Vale')).toHaveProperty('disabled', true);
    expect(screen.getByText(/Somente super administradores/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Salvar configurações' })).toBeNull();
  });

  it('salvar reenvia TODAS as seções — campo esquecido seria apagado', async () => {
    const { user } = tela(DONO);
    const nome = await screen.findByDisplayValue('Motos do Vale');

    await user.clear(nome);
    await user.type(nome, 'Motos do Vale Ltda');
    await user.click(screen.getByRole('switch', { name: /^Financiamento/ }));
    await user.click(screen.getByRole('checkbox', { name: '12x' }));
    await salvar(user);

    expect(await screen.findByText('Configurações salvas.')).toBeTruthy();
    const enviado = storeAdmin.update.mock.lastCall[0];
    expect(enviado).toMatchObject({
      name: 'Motos do Vale Ltda',
      contact: { whatsapp: '49999990000', phone: null, email: 'contato@vale.test' },
      address: { street: 'Rua A', number: '10', city: 'Videira', state: 'SC', complement: null },
      social: { instagram: 'https://instagram.com/vale', facebook: null },
      features: { financingEnabled: false, sellMotoEnabled: true },
      financing: { monthlyRate: 1.79, installmentOptions: [12, 24, 36], minDownPaymentPercent: 20 },
      theme: { primary: '#ff5500' },
    });
    // A semana inteira vai junto: dia fechado é explícito, não ausente.
    expect(enviado.businessHours).toHaveLength(7);
    expect(enviado.businessHours).toContainEqual({
      weekday: 1,
      opensAt: '08:00',
      closesAt: '18:00',
      closed: false,
    });
    expect(enviado.businessHours).toContainEqual({
      weekday: 0,
      opensAt: null,
      closesAt: null,
      closed: true,
    });
  });

  it('horário com fechamento antes da abertura: aponta o dia e não salva', async () => {
    const { user } = tela(DONO);
    const fechamento = await screen.findByLabelText('Fechamento — Segunda');

    await user.clear(fechamento);
    await user.type(fechamento, '07:00');
    await salvar(user);

    expect(await screen.findByText('Revise os horários destacados.')).toBeTruthy();
    expect(storeAdmin.update).not.toHaveBeenCalled();
  });

  it('abrir um dia fechado mostra os campos de horário', async () => {
    const { user } = tela(DONO);
    await screen.findByDisplayValue('Motos do Vale');

    await user.click(screen.getByRole('switch', { name: 'Sábado' }));

    expect(screen.getByLabelText('Abertura — Sábado')).toBeTruthy();
  });

  it('loja ainda não configurada (404): formulário vazio, pronto para preencher', async () => {
    storeAdmin.get.mockRejectedValue(Object.assign(new Error('não configurada'), { status: 404 }));
    const { user } = tela(DONO);

    const nome = await screen.findByLabelText('Nome da loja');
    await waitFor(() => expect(nome.value).toBe(''));
    await user.type(nome, 'Loja Nova');
    await salvar(user);

    await waitFor(() => expect(storeAdmin.update).toHaveBeenCalled());
    expect(storeAdmin.update.mock.lastCall[0]).toMatchObject({
      name: 'Loja Nova',
      financing: { monthlyRate: null, installmentOptions: [], minDownPaymentPercent: 0 },
    });
  });

  it('recusa do servidor mostra o campo e o motivo', async () => {
    storeAdmin.update.mockRejectedValue(
      Object.assign(new Error('Dados inválidos'), {
        errors: [{ field: 'social.youtube', message: 'Use um link https' }],
      }),
    );
    const { user } = tela(DONO);
    await screen.findByDisplayValue('Motos do Vale');

    await salvar(user);

    expect(
      await screen.findByText('Dados inválidos: social.youtube Use um link https'),
    ).toBeTruthy();
  });
});
