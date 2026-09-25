// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { leadsAdmin } from '@/services/adminService.js';
import { DONO, pagina, renderizar, VENDEDOR } from '@/test/renderizar.jsx';

import { Leads } from './Leads.jsx';

vi.mock('@/services/adminService.js', () => ({
  leadsAdmin: {
    list: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    removeMany: vi.fn(),
  },
}));

const consent = { accepted: true, at: '2026-09-20T13:00:00.000Z', textVersion: '2026-09-v1' };
const LEADS = [
  {
    id: 'l1',
    type: 'MOTO_INTEREST',
    name: 'Maria Silva',
    phone: '+5549999998888',
    email: 'maria@exemplo.com',
    status: 'NEW',
    moto: {
      slug: 'honda-cb',
      model: 'CB 500F',
      year: 2024,
      brand: { name: 'Honda' },
      status: 'AVAILABLE',
    },
    notes: [],
    source: { page: '/motos/honda-cb', utm: { source: 'instagram', campaign: 'verao' } },
    consent,
    createdAt: '2026-09-20T13:00:00.000Z',
  },
  {
    id: 'l2',
    type: 'SELL_MOTO',
    name: 'João Souza',
    phone: '+5549988887777',
    status: 'IN_PROGRESS',
    data: { brand: 'Yamaha', model: 'Fazer', year: 2019, mileage: 28000, expectedPrice: 14000 },
    notes: [],
    source: {},
    consent,
    createdAt: '2026-09-19T13:00:00.000Z',
  },
];

const telaDeLeads = (usuario = VENDEDOR, rota = '/admin/leads') =>
  renderizar(<Leads />, { rota, usuario });

describe('tela de leads', () => {
  beforeEach(() => {
    leadsAdmin.list.mockResolvedValue(pagina(LEADS));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('lista os leads com o assunto de cada um', async () => {
    telaDeLeads();

    expect(await screen.findByText('Maria Silva')).toBeTruthy();
    expect(screen.getByText('Honda CB 500F 2024')).toBeTruthy();
    expect(screen.getByText('Yamaha Fazer 2019')).toBeTruthy();
    expect(screen.getByText('2 contatos')).toBeTruthy();
  });

  it('filtro de status vai para a URL e para a busca, voltando à página 1', async () => {
    const { user, router } = telaDeLeads(VENDEDOR, '/admin/leads?page=3');
    await screen.findByText('Maria Silva');

    await user.selectOptions(screen.getByLabelText('Status'), 'NEW');

    await waitFor(() =>
      expect(leadsAdmin.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'NEW', page: 1 }),
      ),
    );
    expect(router.state.location.search).toBe('?status=NEW');
  });

  it('abre o detalhe: contato, origem da campanha e consentimento', async () => {
    const { user } = telaDeLeads();

    await user.click(await screen.findByRole('button', { name: 'Maria Silva' }));

    const detalhe = screen.getByRole('dialog');
    expect(within(detalhe).getByText('instagram / verao')).toBeTruthy();
    expect(within(detalhe).getByText(/texto 2026-09-v1/)).toBeTruthy();
    const whatsapp = within(detalhe).getByRole('link', { name: 'WhatsApp' });
    expect(decodeURIComponent(whatsapp.getAttribute('href'))).toContain('Olá, Maria!');
  });

  it('mudar o status atualiza a linha sem recarregar a lista', async () => {
    leadsAdmin.update.mockResolvedValue({ ...LEADS[0], status: 'WON' });
    const { user } = telaDeLeads();
    await user.click(await screen.findByRole('button', { name: 'Maria Silva' }));

    await user.selectOptions(within(screen.getByRole('dialog')).getByLabelText('Status'), 'WON');

    expect(leadsAdmin.update).toHaveBeenCalledWith('l1', { status: 'WON' });
    await waitFor(() =>
      expect(within(screen.getByRole('table')).getByText('Convertido')).toBeTruthy(),
    );
    expect(leadsAdmin.list).toHaveBeenCalledTimes(1);
  });

  it('anotação da equipe é enviada e o campo limpa', async () => {
    leadsAdmin.update.mockResolvedValue({
      ...LEADS[0],
      notes: [
        { text: 'Liguei, retorna amanhã', authorName: 'Ana', createdAt: '2026-09-21T10:00:00Z' },
      ],
    });
    const { user } = telaDeLeads();
    await user.click(await screen.findByRole('button', { name: 'Maria Silva' }));
    const detalhe = screen.getByRole('dialog');

    await user.type(within(detalhe).getByLabelText('Nova anotação'), 'Liguei, retorna amanhã');
    await user.click(within(detalhe).getByRole('button', { name: 'Adicionar anotação' }));

    expect(leadsAdmin.update).toHaveBeenCalledWith('l1', { note: 'Liguei, retorna amanhã' });
    expect(await within(detalhe).findByText(/Ana ·/)).toBeTruthy();
    expect(within(detalhe).getByLabelText('Nova anotação').value).toBe('');
  });

  it('ADMIN não vê exclusão, nem em lote nem no detalhe', async () => {
    const { user } = telaDeLeads(VENDEDOR);
    await user.click(await screen.findByRole('button', { name: 'Maria Silva' }));

    expect(screen.queryByRole('checkbox', { name: /Selecionar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Excluir dados/ })).toBeNull();
  });

  it('dono exclui um lead pelo detalhe, depois de confirmar', async () => {
    leadsAdmin.remove.mockResolvedValue();
    const { user } = telaDeLeads(DONO);
    await user.click(await screen.findByRole('button', { name: 'Maria Silva' }));

    await user.click(screen.getByRole('button', { name: /Excluir dados/ }));

    expect(window.confirm).toHaveBeenCalled();
    expect(leadsAdmin.remove).toHaveBeenCalledWith('l1');
    await waitFor(() => expect(screen.queryByText('Maria Silva')).toBeNull());
    expect(screen.getByText('1 contato')).toBeTruthy();
  });

  it('dono seleciona vários e exclui de uma vez (decisão E)', async () => {
    leadsAdmin.removeMany.mockResolvedValue({ deleted: 2 });
    const { user } = telaDeLeads(DONO);
    await screen.findByText('Maria Silva');

    await user.click(
      screen.getByRole('checkbox', { name: 'Selecionar todos os leads desta página' }),
    );
    expect(screen.getByText('2 selecionados')).toBeTruthy();
    leadsAdmin.list.mockResolvedValue(pagina([]));
    await user.click(screen.getByRole('button', { name: 'Excluir selecionados' }));

    expect(leadsAdmin.removeMany).toHaveBeenCalledWith(['l1', 'l2']);
    expect(await screen.findByText(/Nenhum lead ainda/)).toBeTruthy();
  });

  it('cancelar a confirmação não exclui nada', async () => {
    window.confirm.mockReturnValue(false);
    const { user } = telaDeLeads(DONO);
    await user.click(
      await screen.findByRole('checkbox', { name: 'Selecionar lead de João Souza' }),
    );

    await user.click(screen.getByRole('button', { name: 'Excluir selecionados' }));

    expect(leadsAdmin.removeMany).not.toHaveBeenCalled();
    expect(screen.getByText('1 selecionado')).toBeTruthy();
  });

  it('falha na exclusão em lote mostra o erro e mantém a seleção', async () => {
    leadsAdmin.removeMany.mockRejectedValue(new Error('Sem conexão com o servidor'));
    const { user } = telaDeLeads(DONO);
    await user.click(
      await screen.findByRole('checkbox', { name: 'Selecionar lead de João Souza' }),
    );

    await user.click(screen.getByRole('button', { name: 'Excluir selecionados' }));

    expect(await screen.findByText('Sem conexão com o servidor')).toBeTruthy();
    expect(screen.getByText('1 selecionado')).toBeTruthy();
  });
});
