import { expect, test } from '@playwright/test';

import { abrir, leadsNoPainel } from './apoio.js';
import { CONTAS } from './dados.mjs';

test('visitante filtra o catálogo, abre a moto e envia interesse', async ({ page, request }) => {
  await abrir(page, '/estoque');
  await expect(page.getByRole('heading', { name: 'Estoque' })).toBeVisible();

  // O filtro vive na URL: a caixa fica marcada quando o endereço muda, um
  // instante depois do clique — `check()` conferiria cedo demais.
  const yamaha = page.getByRole('checkbox', { name: /Yamaha/ });
  await yamaha.click();
  await expect(yamaha).toBeChecked();
  await expect(page).toHaveURL(/marca=yamaha/);
  await expect(page.getByRole('link', { name: 'Yamaha Fazer 250', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Honda CB 500F', exact: true })).toHaveCount(0);

  await page.getByRole('link', { name: 'Yamaha Fazer 250', exact: true }).click();
  await expect(page).toHaveURL('/motos/yamaha-fazer-250-2019');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Yamaha Fazer 250');

  await page.getByRole('button', { name: 'Tenho interesse' }).first().click();
  const formulario = page.getByRole('dialog');
  await formulario.getByLabel(/Seu nome/).fill('Visitante Interessado');
  await formulario.getByLabel(/WhatsApp ou telefone/).fill('49 99123-4567');
  await formulario.getByRole('checkbox', { name: /Autorizo/ }).check();
  await formulario.getByRole('button', { name: 'Enviar interesse' }).click();
  await expect(
    formulario.getByText(/vai entrar em contato sobre a Yamaha Fazer 250/),
  ).toBeVisible();

  // Chegou ao painel inteiro: vinculado à moto, com a página de origem.
  const lead = (await leadsNoPainel(request, CONTAS.conferencia)).find(
    (l) => l.name === 'Visitante Interessado',
  );
  expect(lead).toMatchObject({
    type: 'MOTO_INTEREST',
    phone: '+5549991234567',
    moto: { model: 'Fazer 250' },
    source: { page: '/motos/yamaha-fazer-250-2019' },
    consent: { accepted: true },
  });
});
