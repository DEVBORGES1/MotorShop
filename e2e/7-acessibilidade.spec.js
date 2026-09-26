import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { abrir, entrar } from './apoio.js';
import { CONTAS } from './dados.mjs';

/**
 * Acessibilidade automática (axe-core, WCAG 2.1 A/AA + boas práticas) em todas
 * as páginas, no celular e no computador. O axe não substitui o teste com
 * leitor de tela, mas pega o que regride sem ninguém ver: contraste, campo sem
 * nome, título fora de ordem, conteúdo fora de região.
 */

const REGRAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

const PUBLICAS = [
  '/',
  '/estoque',
  '/motos/honda-cb-500f-2024',
  '/financiamento',
  '/venda-sua-moto',
  '/sobre',
  '/contato',
  '/privacidade',
  '/pagina-que-nao-existe',
];

const PAINEL = [
  '/admin',
  '/admin/leads',
  '/admin/motos',
  '/admin/motos/nova',
  '/admin/marcas',
  '/admin/usuarios',
  '/admin/configuracoes',
];

/** Violações em texto legível: a falha diz o que corrigir e onde. */
async function violacoes(page, caminho) {
  const { violations } = await new AxeBuilder({ page }).withTags(REGRAS).analyze();
  return violations.flatMap((v) =>
    v.nodes.map(
      (n) =>
        `${caminho} · ${v.id} (${v.impact}): ${n.target.join(' ')} → ${n.failureSummary?.split('\n')[1]?.trim()}`,
    ),
  );
}

for (const { nome, largura } of [
  { nome: 'celular', largura: 390 },
  { nome: 'computador', largura: 1280 },
]) {
  test.describe(`acessibilidade no ${nome}`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    test('site público sem violações', async ({ page }) => {
      const achados = [];
      for (const caminho of PUBLICAS) {
        await abrir(page, caminho);
        achados.push(...(await violacoes(page, caminho)));
      }
      expect(achados).toEqual([]);
    });

    test('login e painel sem violações', async ({ page }) => {
      await page.goto('/admin/login');
      await page.getByRole('button', { name: 'Entrar' }).waitFor();
      const achados = await violacoes(page, '/admin/login');

      await entrar(page, CONTAS.conferencia);
      for (const caminho of PAINEL) {
        await page.goto(caminho);
        await page.getByRole('heading', { level: 1 }).first().waitFor();
        // Tabelas e formulários chegam depois do título: espera a rede assentar.
        await page.waitForLoadState('networkidle');
        achados.push(...(await violacoes(page, caminho)));
      }
      expect(achados).toEqual([]);
    });
  });
}

test('teclado: o primeiro Tab oferece pular o cabeçalho, e o foco segue para o conteúdo', async ({
  page,
}) => {
  await abrir(page, '/estoque');

  await page.keyboard.press('Tab');
  const pular = page.getByRole('link', { name: 'Pular para o conteúdo' });
  await expect(pular).toBeFocused();
  await expect(pular).toBeVisible();

  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  // O próximo foco já está dentro do <main>, não no menu do cabeçalho.
  expect(await page.evaluate(() => document.activeElement?.closest('main')?.id)).toBe('conteudo');
});
