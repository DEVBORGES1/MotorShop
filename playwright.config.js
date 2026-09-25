import { defineConfig, devices } from '@playwright/test';

import { ORIGEM } from './e2e/dados.mjs';

/**
 * E2E dos fluxos que sustentam o negócio (ROADMAP, FASE 11).
 *
 * Roda contra o build de produção (`npm run build` antes), servido pelo
 * próprio backend num banco só do E2E (e2e/servidor.mjs). Os fluxos mexem no
 * mesmo banco — um por vez, na ordem dos arquivos.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  // Teste instável se corrige, não se repete até passar.
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: ORIGEM,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node e2e/servidor.mjs',
    url: `${ORIGEM}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
