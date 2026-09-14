import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    env: { NODE_ENV: 'test' },
    globalSetup: ['./tests/globalSetup.js'],
    // Os testes de integração compartilham uma instância do Mongo; rodar
    // arquivos em paralelo causaria interferência entre eles.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
