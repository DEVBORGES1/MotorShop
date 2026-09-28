// @vitest-environment jsdom
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DONO, renderizar } from '@/test/renderizar.jsx';

import { LeadDetalhe } from './LeadDetalhe.jsx';

vi.mock('@/services/adminService.js', () => ({ leadsAdmin: {} }));

const simulacao = (data) => ({
  id: 'l1',
  type: 'FINANCING',
  name: 'Carla Souza',
  phone: '+5549991112222',
  status: 'NEW',
  createdAt: '2026-09-01T10:00:00.000Z',
  source: {},
  consent: { accepted: true, at: '2026-09-01T10:00:00.000Z', textVersion: '1' },
  notes: [],
  moto: null,
  data: {
    vehiclePrice: 30000,
    installments: 48,
    monthlyRate: 1.79,
    installmentValue: 612.3,
    ...data,
  },
});

const blocoDaSimulacao = () =>
  screen.getByRole('heading', { name: 'Simulação', level: 3 }).closest('section');

describe('LeadDetalhe — simulação de financiamento', () => {
  it('com moto na troca, mostra quanto da entrada é a moto do cliente', () => {
    renderizar(
      <LeadDetalhe
        lead={simulacao({ downPayment: 14000, tradeInValue: 8000 })}
        onAtualizado={() => {}}
        onExcluido={() => {}}
      />,
      { usuario: DONO },
    );

    const bloco = within(blocoDaSimulacao());
    expect(bloco.getByText('Moto na troca')).toBeTruthy();
    expect(bloco.getByText(/R\$\s8\.000,00 da entrada \(estimativa do cliente\)/)).toBeTruthy();
    expect(bloco.getByText(/R\$\s14\.000,00/)).toBeTruthy();
  });

  it('sem troca, a linha não aparece', () => {
    renderizar(
      <LeadDetalhe
        lead={simulacao({ downPayment: 6000 })}
        onAtualizado={() => {}}
        onExcluido={() => {}}
      />,
      { usuario: DONO },
    );

    expect(within(blocoDaSimulacao()).queryByText('Moto na troca')).toBeNull();
  });
});
