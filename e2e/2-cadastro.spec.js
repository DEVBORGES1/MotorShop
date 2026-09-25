import { expect, test } from '@playwright/test';

import { entrar, fotoFalsa, simularProvedorDeImagens } from './apoio.js';
import { CLOUDINARY, CONTAS } from './dados.mjs';

test('admin entra, cadastra moto com fotos e ela aparece no site', async ({ page }) => {
  const provedor = await simularProvedorDeImagens(page);
  await entrar(page, CONTAS.cadastro);

  await page.goto('/admin/motos/nova');
  await page.getByLabel(/Marca/).selectOption({ label: 'Honda' });
  await page.getByLabel(/Modelo/).fill('CG 160 Titan');
  await page.getByLabel(/^Ano/).fill('2023');
  await page.getByLabel(/Cor/).fill('Preta');
  await page.getByLabel(/Quilometragem/).fill('12000');
  await page.getByLabel(/Cilindrada/).fill('162');
  await page.getByLabel(/Combustível/).selectOption({ label: 'Flex' });
  await page.getByLabel(/Câmbio/).selectOption({ label: 'Manual' });
  await page.getByLabel(/^Preço \(R\$\)/).fill('17900');
  await page.getByRole('button', { name: 'Salvar' }).click();

  // Cadastrada, segue para a edição, onde as fotos entram.
  await expect(page).toHaveURL(/\/admin\/motos\/[a-f0-9]{24}\/editar/);
  await expect(page.getByText('Moto cadastrada. Agora adicione as fotos.')).toBeVisible();

  await page
    .locator('input[type="file"]')
    .setInputFiles([fotoFalsa('frente.jpg'), fotoFalsa('lateral.jpg')]);
  await expect(page.getByText(/2 de 20 fotos/)).toBeVisible();
  await expect(page.getByText('Principal', { exact: true })).toBeVisible();

  const motoId = page.url().match(/motos\/([a-f0-9]{24})/)[1];
  expect(provedor.envios()).toHaveLength(2);
  for (const envio of provedor.envios()) {
    expect(envio).toEqual({ pasta: `${CLOUDINARY.pasta}/motos/${motoId}`, assinaturaValida: true });
  }

  // No site, na hora: sem esperar o cache.
  await page.goto('/estoque');
  const card = page.getByRole('article').filter({ hasText: 'Honda CG 160 Titan' });
  await expect(card).toBeVisible();
  await expect(card.getByRole('img')).toHaveAttribute('src', /res\.cloudinary\.com/);

  await card.getByRole('link', { name: 'Honda CG 160 Titan', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Honda CG 160 Titan');
  await expect(page.getByText('R$ 17.900,00').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver foto 2 de 2' })).toBeVisible();
});
