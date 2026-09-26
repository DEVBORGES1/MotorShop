// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { marcasAdmin, usuariosAdmin } from '@/services/adminService.js';
import { DONO, renderizar, VENDEDOR } from '@/test/renderizar.jsx';

import { Marcas } from './Marcas.jsx';
import { Usuarios } from './Usuarios.jsx';

vi.mock('@/services/adminService.js', () => ({
  marcasAdmin: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  usuariosAdmin: { list: vi.fn(), create: vi.fn(), update: vi.fn(), deactivate: vi.fn() },
}));

const linhaDe = (texto) => screen.getByText(texto).closest('tr');

describe('marcas', () => {
  beforeEach(() => {
    marcasAdmin.list.mockResolvedValue([
      { id: 'b1', name: 'Honda', slug: 'honda', active: true },
      { id: 'b2', name: 'Kasinski', slug: 'kasinski', active: false },
    ]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('lista as marcas com a situação de cada uma', async () => {
    renderizar(<Marcas />, { usuario: VENDEDOR });

    expect(await screen.findByText('Honda')).toBeTruthy();
    expect(within(linhaDe('Honda')).getByText('Ativa')).toBeTruthy();
    expect(within(linhaDe('Kasinski')).getByText('Inativa')).toBeTruthy();
  });

  it('adiciona uma marca e limpa o campo', async () => {
    marcasAdmin.create.mockResolvedValue({});
    const { user } = renderizar(<Marcas />, { usuario: VENDEDOR });
    await screen.findByText('Honda');

    await user.type(screen.getByLabelText('Nome da nova marca'), '  Royal Enfield ');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    expect(marcasAdmin.create).toHaveBeenCalledWith({ name: 'Royal Enfield' });
    await waitFor(() => expect(screen.getByLabelText('Nome da nova marca').value).toBe(''));
    expect(marcasAdmin.list).toHaveBeenCalledTimes(2);
  });

  it('nome em branco não habilita o envio', async () => {
    const { user } = renderizar(<Marcas />, { usuario: VENDEDOR });
    await screen.findByText('Honda');

    await user.type(screen.getByLabelText('Nome da nova marca'), '   ');

    expect(screen.getByRole('button', { name: 'Adicionar' }).disabled).toBe(true);
  });

  it('desativar e ativar alternam a situação', async () => {
    marcasAdmin.update.mockResolvedValue({});
    const { user } = renderizar(<Marcas />, { usuario: VENDEDOR });
    await screen.findByText('Honda');

    await user.click(within(linhaDe('Honda')).getByRole('button', { name: 'Desativar' }));
    await user.click(within(linhaDe('Kasinski')).getByRole('button', { name: 'Ativar' }));

    expect(marcasAdmin.update).toHaveBeenCalledWith('b1', { active: false });
    expect(marcasAdmin.update).toHaveBeenCalledWith('b2', { active: true });
  });

  it('marca com motos não sai: a explicação do servidor aparece', async () => {
    marcasAdmin.remove.mockRejectedValue(new Error('A marca tem motos vinculadas — desative'));
    const { user } = renderizar(<Marcas />, { usuario: VENDEDOR });
    await screen.findByText('Honda');

    await user.click(within(linhaDe('Honda')).getByRole('button', { name: 'Excluir' }));

    expect(window.confirm).toHaveBeenCalledWith('Excluir a marca "Honda"?');
    expect(await screen.findByText('A marca tem motos vinculadas — desative')).toBeTruthy();
  });

  it('cancelar a confirmação não exclui', async () => {
    window.confirm.mockReturnValue(false);
    const { user } = renderizar(<Marcas />, { usuario: VENDEDOR });
    await screen.findByText('Honda');

    await user.click(within(linhaDe('Honda')).getByRole('button', { name: 'Excluir' }));

    expect(marcasAdmin.remove).not.toHaveBeenCalled();
  });
});

describe('usuários', () => {
  beforeEach(() => {
    usuariosAdmin.list.mockResolvedValue([
      { ...DONO, email: 'dono@loja.test', active: true, lastLoginAt: '2026-09-20T12:00:00Z' },
      { ...VENDEDOR, email: 'ana@loja.test', active: true, lastLoginAt: null },
      { id: 'u3', name: 'Ex-funcionário', email: 'ex@loja.test', role: 'ADMIN', active: false },
    ]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('marca "você" e não oferece desativar a própria conta', async () => {
    renderizar(<Usuarios />, { usuario: DONO });

    const propria = (await screen.findByText('Dono da Loja')).closest('tr');
    expect(within(propria).getByText('(você)')).toBeTruthy();
    expect(within(propria).queryByRole('button', { name: 'Desativar' })).toBeNull();
    expect(within(linhaDe('Ex-funcionário')).getByText('Inativo')).toBeTruthy();
  });

  it('cria usuário com o papel escolhido e limpa o formulário', async () => {
    usuariosAdmin.create.mockResolvedValue({});
    const { user } = renderizar(<Usuarios />, { usuario: DONO });
    await screen.findByText('Dono da Loja');

    await user.type(screen.getByLabelText(/^Nome/), 'Bruno');
    await user.type(screen.getByLabelText(/^E-mail/), 'bruno@loja.test');
    await user.type(screen.getByLabelText(/^Senha/), 'chave-do-bruno-2026');
    await user.click(screen.getByRole('button', { name: 'Criar usuário' }));

    expect(usuariosAdmin.create).toHaveBeenCalledWith({
      name: 'Bruno',
      email: 'bruno@loja.test',
      password: 'chave-do-bruno-2026',
      role: 'ADMIN',
    });
    expect(await screen.findByText('Usuário criado.')).toBeTruthy();
    expect(screen.getByLabelText(/^Nome/).value).toBe('');
  });

  it('senha recusada pelo servidor: mostra a regra', async () => {
    usuariosAdmin.create.mockRejectedValue(
      Object.assign(new Error('Dados inválidos'), {
        errors: [{ message: 'A senha é previsível demais. Escolha outra.' }],
      }),
    );
    const { user } = renderizar(<Usuarios />, { usuario: DONO });
    await screen.findByText('Dono da Loja');

    await user.type(screen.getByLabelText(/^Nome/), 'Bruno');
    await user.click(screen.getByRole('button', { name: 'Criar usuário' }));

    expect(
      await screen.findByText('Dados inválidos: A senha é previsível demais. Escolha outra.'),
    ).toBeTruthy();
  });

  it('desativar pede confirmação e avisa que as sessões caem', async () => {
    usuariosAdmin.deactivate.mockResolvedValue({});
    const { user } = renderizar(<Usuarios />, { usuario: DONO });
    await screen.findByText('Ana Vendas');

    await user.click(within(linhaDe('Ana Vendas')).getByRole('button', { name: 'Desativar' }));

    expect(window.confirm.mock.lastCall[0]).toMatch(/sessões abertas serão encerradas/);
    expect(usuariosAdmin.deactivate).toHaveBeenCalledWith('u2');
  });

  it('editar envia só o que mudou; senha em branco mantém a atual', async () => {
    usuariosAdmin.update.mockResolvedValue({});
    const { user } = renderizar(<Usuarios />, { usuario: DONO });
    await screen.findByText('Ana Vendas');

    await user.click(within(linhaDe('Ana Vendas')).getByRole('button', { name: 'Editar' }));
    const nome = screen.getByLabelText(/^Nome/, { selector: '#editar-name' });
    await user.clear(nome);
    await user.type(nome, 'Ana Souza');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(usuariosAdmin.update).toHaveBeenCalledWith('u2', { name: 'Ana Souza' });
    expect(await screen.findByText('Usuário atualizado.')).toBeTruthy();
  });

  it('conta inativa com senha errada: define senha nova e reativa, sem apagar nada', async () => {
    usuariosAdmin.update.mockResolvedValue({});
    const { user } = renderizar(<Usuarios />, { usuario: DONO });
    await screen.findByText('Ex-funcionário');

    await user.click(within(linhaDe('Ex-funcionário')).getByRole('button', { name: 'Editar' }));
    await user.type(screen.getByLabelText(/^Nova senha/), 'nova-chave-forte-2026');
    await user.click(screen.getByRole('checkbox', { name: /Conta ativa/ }));
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(usuariosAdmin.update).toHaveBeenCalledWith('u3', {
      password: 'nova-chave-forte-2026',
      active: true,
    });
  });

  it('"Reativar" na linha da conta inativa', async () => {
    usuariosAdmin.update.mockResolvedValue({});
    const { user } = renderizar(<Usuarios />, { usuario: DONO });
    await screen.findByText('Ex-funcionário');

    await user.click(within(linhaDe('Ex-funcionário')).getByRole('button', { name: 'Reativar' }));

    expect(usuariosAdmin.update).toHaveBeenCalledWith('u3', { active: true });
    expect(await screen.findByText('Ex-funcionário reativado.')).toBeTruthy();
  });

  it('na própria conta, o papel fica travado e não há opção de desativar', async () => {
    const { user } = renderizar(<Usuarios />, { usuario: DONO });
    await screen.findByText('Dono da Loja');

    await user.click(within(linhaDe('Dono da Loja')).getByRole('button', { name: 'Editar' }));

    expect(screen.getByLabelText(/^Papel/, { selector: '#editar-role' }).disabled).toBe(true);
    expect(screen.queryByRole('checkbox', { name: /Conta ativa/ })).toBeNull();
  });
});
