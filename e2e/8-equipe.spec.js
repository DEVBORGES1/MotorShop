import { expect, test } from '@playwright/test';

import { abrir, entrar } from './apoio.js';
import { CONTAS } from './dados.mjs';

/**
 * Atalhos da equipe no site: o dono entra pelo ícone da navbar e, logado, vê
 * a faixa "Conectado como" e o botão "Editar" nas motos. O visitante comum não
 * vê nada disso — e o site nem pergunta pela sessão dele.
 */

test('visitante: ícone leva ao login, que avisa ser da equipe; nenhuma chamada de sessão', async ({
  page,
}) => {
  const pedidosDeSessao = [];
  page.on('request', (r) => r.url().includes('/api/auth/') && pedidosDeSessao.push(r.url()));

  const resposta = await abrir(page, '/motos/yamaha-fazer-250-2019');
  const html = await resposta.text();
  // O HTML do servidor (em cache, igual para todos) não tem nada da equipe.
  expect(html).not.toContain('Conectado como');
  expect(html).not.toContain('Editar moto');
  await expect(page.getByRole('link', { name: 'Editar moto' })).toHaveCount(0);
  expect(pedidosDeSessao).toEqual([]);

  await page.getByRole('link', { name: 'Área da equipe da loja' }).click();
  await expect(page).toHaveURL('/admin/login');
  await expect(page.getByText(/Área restrita à equipe da loja/)).toBeVisible();
  await page.getByRole('link', { name: 'Voltar ao site' }).click();
  await expect(page).toHaveURL('/');
});

test('equipe logada: faixa no site, "Editar" abre o formulário da moto, "Sair" volta ao normal', async ({
  page,
}) => {
  await entrar(page, CONTAS.conferencia);

  // Recarregar o site (não navegar dentro do app): a sessão é restaurada pelo
  // cookie, como quando o dono abre o site no dia seguinte.
  await abrir(page, '/motos/yamaha-fazer-250-2019');
  const faixa = page.getByRole('navigation', { name: 'Acesso da equipe' });
  await expect(faixa).toContainText(`Conectado como ${CONTAS.conferencia.name}`);
  await expect(page.getByRole('link', { name: 'Painel da loja' })).toHaveAttribute(
    'href',
    '/admin',
  );

  await page.getByRole('link', { name: 'Editar moto' }).click();
  await expect(page).toHaveURL(/\/admin\/motos\/[0-9a-f]{24}\/editar$/);
  await expect(page.getByLabel(/Modelo/)).toHaveValue('Fazer 250');

  // Nos cards do estoque também.
  await abrir(page, '/estoque');
  await expect(page.getByRole('link', { name: 'Editar Yamaha Fazer 250' })).toBeVisible();

  await faixa.getByRole('button', { name: 'Sair' }).click();
  await expect(faixa).toHaveCount(0);
  await abrir(page, '/estoque');
  await expect(page.getByRole('link', { name: /^Editar/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Área da equipe da loja' })).toBeVisible();
});
