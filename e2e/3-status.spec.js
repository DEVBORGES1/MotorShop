import { expect, test } from '@playwright/test';

import { abrir, entrar } from './apoio.js';
import { CONTAS } from './dados.mjs';

test('admin marca a moto como vendida e ela sai do catálogo público', async ({ page }) => {
  // Antes: a Biz está no estoque e a página mostra o preço.
  await page.goto('/estoque');
  await expect(page.getByRole('link', { name: 'Honda Biz 125', exact: true })).toBeVisible();
  await page.goto('/motos/honda-biz-125-2022');
  await expect(page.getByText('R$ 13.900,00').first()).toBeVisible();

  await entrar(page, CONTAS.status);
  await page.goto('/admin/motos');
  await page.getByLabel('Status de Biz 125').selectOption({ label: 'Vendida' });
  await expect(page.getByLabel('Status de Biz 125')).toHaveValue('SOLD');

  // Fora da lista pública...
  await page.goto('/estoque');
  await expect(page.getByRole('link', { name: 'Honda CB 500F', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Honda Biz 125', exact: true })).toHaveCount(0);

  // ...e a página continua no ar, como vendida e sem preço (decisão A) — já
  // no HTML do servidor, sem esperar o cache de cinco minutos vencer.
  const resposta = await abrir(page, '/motos/honda-biz-125-2022');
  expect(resposta.status()).toBe(200);
  await expect(page.getByText('Esta moto já foi vendida')).toBeVisible();
  await expect(page.getByText('R$ 13.900,00')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Avise-me de uma similar' }).first()).toBeVisible();
});
