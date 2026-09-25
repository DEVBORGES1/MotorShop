import { expect, test } from '@playwright/test';

import { abrir, leadsNoPainel } from './apoio.js';
import { CONTAS } from './dados.mjs';

test('visitante simula o financiamento e envia a simulação', async ({ page, request }) => {
  await abrir(page, '/financiamento');

  await page.getByLabel('Valor da moto (R$)').fill('30000');
  // Entrada começa no mínimo da loja (20%).
  await expect(page.getByLabel(/^Entrada/)).toHaveValue('6000');
  await page.getByRole('button', { name: /^24x/ }).click();
  await expect(page.getByText('24 parcelas de')).toBeVisible();
  const parcelaNaTela = await page
    .getByText('24 parcelas de')
    .locator('xpath=following-sibling::p[1]')
    .textContent();

  await page.getByRole('button', { name: 'Enviar esta simulação para a loja' }).click();
  await page.getByLabel(/Seu nome/).fill('Cliente do Financiamento');
  await page.getByLabel(/WhatsApp ou telefone/).fill('49 98877-6655');
  await page.getByRole('checkbox', { name: /Autorizo/ }).check();
  await page.getByRole('button', { name: 'Enviar simulação' }).click();
  await expect(page.getByText('Simulação enviada')).toBeVisible();

  const lead = (await leadsNoPainel(request, CONTAS.conferencia)).find(
    (l) => l.name === 'Cliente do Financiamento',
  );
  expect(lead).toMatchObject({
    type: 'FINANCING',
    data: { vehiclePrice: 30000, downPayment: 6000, installments: 24, monthlyRate: 1.79 },
  });
  // A parcela é recalculada pelo servidor com a taxa DELE — e bate com a tela.
  expect(parcelaNaTela.replace(/\s/g, ' ')).toContain(
    lead.data.installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
  );
});
