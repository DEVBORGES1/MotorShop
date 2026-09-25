import { defineConfig } from 'vitest/config';

/**
 * Testes do pacote compartilhado: o cálculo do financiamento, os schemas de
 * validação e os metadados de SEO — código que roda no navegador e no
 * servidor, testado uma vez, aqui.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      reporter: ['text-summary', 'json-summary', 'html'],
      thresholds: {
        lines: 70,
        statements: 70,
        functions: 70,
        branches: 70,
        // O cálculo da parcela vai para a tela e para o lead: erro aqui é
        // promessa de preço errada ao cliente.
        'src/financing.js': { lines: 90, statements: 90, functions: 90, branches: 90 },
      },
    },
  },
});
