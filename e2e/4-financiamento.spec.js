import { expect, test } from '@playwright/test';

import { abrir, leadsNoPainel } from './apoio.js';
import { CONTAS } from './dados.mjs';

test('visitante escolhe a moto do estoque, dá a dele na troca e envia a simulação', async ({
  page,
  request,
}) => {
  await abrir(page, '/financiamento');

  // A moto vem do estoque: nada de digitar o preço.
  const escolha = page.getByLabel('Moto para simular');
  const cb = await escolha.locator('option', { hasText: 'CB 500F' }).getAttribute('value');
  await escolha.selectOption(cb);
  // Entrada começa no mínimo da loja (20% de R$ 38.900).
  await expect(page.getByLabel(/^Entrada/)).toHaveValue('7.780');

  // Pelo teclado, como nos outros interruptores: o checkbox real é visualmente oculto.
  const troca = page.getByRole('switch', { name: /moto para dar na troca/ });
  await troca.focus();
  await page.keyboard.press('Space');
  await expect(troca).toBeChecked();
  await page.getByLabel('Valor estimado da sua moto (R$)').fill('5000');
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
    moto: { slug: 'honda-cb-500f-2024' },
    data: {
      vehiclePrice: 38900,
      downPayment: 12780,
      tradeInValue: 5000,
      installments: 24,
      monthlyRate: 1.79,
    },
  });
  // A parcela é recalculada pelo servidor com a taxa DELE — e bate com a tela.
  expect(parcelaNaTela.replace(/\s/g, ' ')).toContain(
    lead.data.installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
  );
});
