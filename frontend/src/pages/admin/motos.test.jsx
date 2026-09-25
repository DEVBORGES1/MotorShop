// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { marcasAdmin, motosAdmin } from '@/services/adminService.js';
import { motoDeTeste, pagina, renderizar, VENDEDOR } from '@/test/renderizar.jsx';

import { MotoForm } from './MotoForm.jsx';
import { MotosList } from './MotosList.jsx';

vi.mock('@/services/adminService.js', () => ({
  motosAdmin: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    changeStatus: vi.fn(),
  },
  marcasAdmin: { list: vi.fn() },
}));
// O gestor de fotos tem teste próprio; aqui só importa que aparece na edição.
vi.mock('@/components/admin/fotos/ImageManager.jsx', () => ({
  ImageManager: () => <p>Gestor de fotos</p>,
}));

const MARCAS = [
  { id: 'b1', name: 'Honda' },
  { id: 'b2', name: 'Yamaha' },
];

describe('lista de motos do painel', () => {
  beforeEach(() => {
    motosAdmin.list.mockResolvedValue(pagina([motoDeTeste({ id: 'm1' })]));
  });

  it('lista com marca, modelo e link de edição', async () => {
    renderizar(<MotosList />, { rota: '/admin/motos', usuario: VENDEDOR });

    expect(await screen.findByText(/Honda CB 500F/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Editar' }).getAttribute('href')).toBe(
      '/admin/motos/m1/editar',
    );
    expect(screen.getByText('1 cadastrada')).toBeTruthy();
  });

  it('aba de status filtra a busca e fica na URL', async () => {
    const { user, router } = renderizar(<MotosList />, { rota: '/admin/motos', usuario: VENDEDOR });
    await screen.findByText(/Honda CB 500F/);

    await user.click(screen.getByRole('button', { name: 'Reservada' }));

    await waitFor(() =>
      expect(motosAdmin.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'RESERVED' }),
      ),
    );
    expect(router.state.location.search).toBe('?status=RESERVED');
  });

  it('trocar o status na linha chama a API e recarrega a lista', async () => {
    motosAdmin.changeStatus.mockResolvedValue({});
    const { user } = renderizar(<MotosList />, { rota: '/admin/motos', usuario: VENDEDOR });
    await screen.findByText(/Honda CB 500F/);

    await user.selectOptions(screen.getByLabelText('Status de CB 500F'), 'SOLD');

    expect(motosAdmin.changeStatus).toHaveBeenCalledWith('m1', 'SOLD');
    await waitFor(() => expect(motosAdmin.list).toHaveBeenCalledTimes(2));
  });

  it('falha ao trocar o status aparece na tela', async () => {
    motosAdmin.changeStatus.mockRejectedValue(new Error('Transição de status inválida'));
    const { user } = renderizar(<MotosList />, { rota: '/admin/motos', usuario: VENDEDOR });
    await screen.findByText(/Honda CB 500F/);

    await user.selectOptions(screen.getByLabelText('Status de CB 500F'), 'SOLD');

    expect(await screen.findByText('Transição de status inválida')).toBeTruthy();
  });
});

describe('cadastro e edição de moto', () => {
  beforeEach(() => {
    marcasAdmin.list.mockResolvedValue(MARCAS);
  });

  const novaMoto = () =>
    renderizar(<MotoForm />, {
      rota: '/admin/motos/nova',
      caminho: '/admin/motos/nova',
      usuario: VENDEDOR,
      outrasRotas: [
        { path: '/admin/motos/:id/editar', element: <MotoForm /> },
        { path: '/admin/motos', element: <p>Lista</p> },
      ],
    });

  async function preencher(user) {
    // As marcas chegam da API depois do formulário: espera a opção existir.
    await screen.findByRole('option', { name: 'Honda' });
    await user.selectOptions(screen.getByLabelText(/Marca/), 'Honda');
    await user.type(screen.getByLabelText(/Modelo/), 'CB 500F');
    await user.type(screen.getByLabelText(/^Ano/), '2024');
    await user.type(screen.getByLabelText(/Cor/), 'Vermelha');
    await user.type(screen.getByLabelText(/Quilometragem/), '4200');
    await user.type(screen.getByLabelText(/Cilindrada/), '471');
    await user.selectOptions(screen.getByLabelText(/Combustível/), 'Gasolina');
    await user.selectOptions(screen.getByLabelText(/Câmbio/), 'Manual');
    await user.type(screen.getByLabelText(/^Preço \(R\$\)/), '38900');
  }

  it('vazio: aponta os campos obrigatórios e não envia', async () => {
    const { user } = novaMoto();

    await user.click(await screen.findByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Selecione a marca')).toBeTruthy();
    expect(screen.getByText('Informe o modelo')).toBeTruthy();
    expect(motosAdmin.create).not.toHaveBeenCalled();
  });

  it('cadastra sem mandar campos vazios e segue para as fotos', async () => {
    motosAdmin.create.mockResolvedValue({ id: 'nova1' });
    motosAdmin.get.mockResolvedValue(
      motoDeTeste({ id: 'nova1', brand: { id: 'b1', name: 'Honda' } }),
    );
    const { user, router } = novaMoto();
    await preencher(user);

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/motos/nova1/editar'));
    const enviado = motosAdmin.create.mock.lastCall[0];
    expect(enviado).toMatchObject({ brand: 'b1', model: 'CB 500F', year: 2024, price: 38900 });
    expect(enviado).not.toHaveProperty('licensePlate');
    expect(enviado).not.toHaveProperty('version');
    expect(await screen.findByText('Moto cadastrada. Agora adicione as fotos.')).toBeTruthy();
    expect(await screen.findByText('Gestor de fotos')).toBeTruthy();
  });

  it('em oferta, exige preço anterior maior que o atual', async () => {
    const { user } = novaMoto();
    await preencher(user);
    await user.click(screen.getByRole('checkbox', { name: 'Em oferta' }));
    await user.type(screen.getByLabelText(/Preço anterior/), '30000');

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Deve ser maior que o preço atual')).toBeTruthy();
    expect(motosAdmin.create).not.toHaveBeenCalled();
  });

  it('erro de campo vindo do servidor aparece com o detalhe', async () => {
    motosAdmin.create.mockRejectedValue(
      Object.assign(new Error('Dados inválidos'), {
        errors: [{ field: 'year', message: 'Ano fora do intervalo' }],
      }),
    );
    const { user } = novaMoto();
    await preencher(user);

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Dados inválidos: year Ano fora do intervalo')).toBeTruthy();
  });

  it('edição: carrega a moto, salva as mudanças e volta para a lista', async () => {
    motosAdmin.get.mockResolvedValue(
      motoDeTeste({ id: 'm1', brand: { id: 'b1', name: 'Honda' }, licensePlate: 'ABC1D23' }),
    );
    motosAdmin.update.mockResolvedValue({});
    const { user, router } = renderizar(<MotoForm />, {
      rota: '/admin/motos/m1/editar',
      caminho: '/admin/motos/:id/editar',
      usuario: VENDEDOR,
      outrasRotas: [{ path: '/admin/motos', element: <p>Lista</p> }],
    });

    // O formulário aparece e os dados entram logo em seguida (reset do
    // react-hook-form num efeito): espera o valor, não só o campo.
    const modelo = await screen.findByDisplayValue('CB 500F');
    expect(modelo).toBe(screen.getByLabelText(/Modelo/));
    expect(screen.getByLabelText(/Placa/).value).toBe('ABC1D23');
    await user.clear(modelo);
    await user.type(modelo, 'CB 500X');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/motos'));
    expect(motosAdmin.update).toHaveBeenCalledWith(
      'm1',
      expect.objectContaining({ model: 'CB 500X' }),
    );
  });
});
