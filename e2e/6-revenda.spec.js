import { expect, test } from '@playwright/test';

import { corLegivel } from '../frontend/src/utils/cor.js';

import { abrir, entrar, fotoFalsa, simularProvedorDeImagens } from './apoio.js';
import { CONTAS, LOJA } from './dados.mjs';

/**
 * Teste de revenda (ROADMAP, FASE 13; risco R-15): uma segunda loja,
 * completamente diferente, configurada SÓ pelo painel — sem tocar em código.
 * É o que prova que a plataforma é um produto base, não um site único.
 */
const NOVA = {
  nome: 'Garagem Duas Rodas',
  razaoSocial: 'Garagem Duas Rodas Comércio de Motos Ltda',
  slogan: 'Motos de procedência em Curitiba',
  whatsapp: '41988887777',
  cidade: 'Curitiba',
  uf: 'PR',
  cor: '#1e6fff',
};

test('segunda loja configurada só pelo painel: o site inteiro muda', async ({ page, browser }) => {
  await simularProvedorDeImagens(page);
  await entrar(page, CONTAS.revenda);
  await page.goto('/admin/configuracoes');

  const nome = page.getByLabel('Nome da loja');
  await expect(nome).toHaveValue(LOJA.name);
  await nome.fill(NOVA.nome);
  await page.getByLabel('Razão social').fill(NOVA.razaoSocial);
  await page.getByLabel('Slogan').fill(NOVA.slogan);
  await page.getByLabel('WhatsApp').fill(NOVA.whatsapp);
  await page.getByLabel('Cidade').fill(NOVA.cidade);
  await page.getByLabel('UF').fill(NOVA.uf);
  await page.getByLabel('Cor da marca').fill(NOVA.cor);
  // Promessa desta loja, não do código: só aparece porque foi configurada.
  await page.getByLabel('Diferencial 1', { exact: true }).fill('Garantia de 90 dias');
  // Esta loja não compra moto usada: o módulo sai do site.
  // Pelo teclado, como qualquer pessoa pode: o interruptor é acessível.
  const modulo = page.getByRole('switch', { name: /^Sua moto na entrada/ });
  await modulo.focus();
  await page.keyboard.press('Space');
  await expect(modulo).not.toBeChecked();
  await page.getByRole('button', { name: 'Salvar configurações' }).click();
  await expect(page.getByText('Configurações salvas.')).toBeVisible();

  // Logo: vai ao provedor e é gravado na hora.
  await page.getByLabel('Arquivo de logo').setInputFiles(fotoFalsa('logo.png'));
  await expect(page.getByRole('img', { name: 'Logo atual' })).toHaveAttribute(
    'src',
    /res\.cloudinary\.com\/.+\/e2e\/loja\//,
  );

  // Visitante novo, sem nada em cache: o que o servidor manda já é a loja nova.
  const visitante = await (await browser.newContext()).newPage();
  await simularProvedorDeImagens(visitante);
  const resposta = await abrir(visitante, '/');
  const html = await resposta.text();

  expect(html).not.toContain(LOJA.name);
  // O azul escolhido é escuro para o fundo do site: sai clareado, no mesmo matiz.
  expect(html).toContain(`<style id="tema">:root{--color-brand-500:${corLegivel(NOVA.cor)}`);
  await expect(visitante).toHaveTitle(new RegExp(NOVA.nome));
  await expect(visitante.getByRole('heading', { level: 1 })).toHaveText(NOVA.slogan);
  await expect(visitante.getByRole('link', { name: NOVA.nome }).getByRole('img')).toHaveAttribute(
    'src',
    /h_88/,
  );
  await expect(visitante.locator('link[rel="icon"]')).toHaveAttribute('href', /c_pad,w_64,h_64/);
  await expect(visitante.getByRole('contentinfo')).toContainText(NOVA.cidade);
  await expect(visitante.getByText('Garantia de 90 dias')).toBeVisible();
  // Nenhuma promessa de outra loja escrita no código.
  expect(html).not.toContain('Troca aceita');
  await expect(visitante.locator(`a[href*="wa.me/55${NOVA.whatsapp}"]`).first()).toBeVisible();
  await expect(visitante.getByRole('link', { name: 'Venda sua moto' })).toHaveCount(0);

  // Módulo desligado: a página some de verdade (404), inclusive para o Google.
  const venda = await visitante.goto('/venda-sua-moto');
  expect(venda.status()).toBe(404);

  // A política de privacidade nomeia a nova empresa como controladora (LGPD).
  await abrir(visitante, '/privacidade');
  await expect(visitante.getByText(`${NOVA.razaoSocial} é a responsável`)).toBeVisible();
});
