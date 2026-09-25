import { expect, test } from '@playwright/test';

import { abrir, entrar } from './apoio.js';
import { CONTAS } from './dados.mjs';

test('visitante envia "venda sua moto" e o lead aparece no painel', async ({ page }) => {
  await abrir(page, '/venda-sua-moto');

  await page.getByLabel(/^Marca/).fill('Suzuki');
  await page.getByLabel(/^Modelo/).fill('Intruder 125');
  await page.getByLabel(/^Ano/).fill('2016');
  await page.getByLabel(/^Quilometragem/).fill('41000');
  await page.getByLabel(/Valor pretendido/).fill('7500');
  await page.getByLabel(/Seu nome/).fill('Vendedor da Suzuki');
  await page.getByLabel(/WhatsApp ou telefone/).fill('49 97766-5544');
  await page.getByRole('checkbox', { name: /Autorizo/ }).check();
  await page.getByRole('button', { name: 'Pedir avaliação' }).click();
  await expect(page.getByText('Recebemos os dados da sua moto')).toBeVisible();

  await entrar(page, CONTAS.leads);
  await page.goto('/admin/leads');
  const linha = page.getByRole('row').filter({ hasText: 'Vendedor da Suzuki' });
  await expect(linha).toContainText('Quer vender a moto');
  await expect(linha).toContainText('Suzuki Intruder 125 2016');

  await linha.getByRole('button', { name: 'Vendedor da Suzuki' }).click();
  const detalhe = page.getByRole('dialog');
  await expect(detalhe.getByText('Moto do cliente')).toBeVisible();
  await expect(detalhe.getByText('41.000 km')).toBeVisible();
  await expect(detalhe.getByText('R$ 7.500,00')).toBeVisible();
  await expect(detalhe.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
    'href',
    /wa\.me\/5549977665544/,
  );
});
