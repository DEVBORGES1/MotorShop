import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    env: {
      NODE_ENV: 'test',
      // Credenciais FICTÍCIAS: assinar e verificar upload são cálculos locais
      // (SHA-1 com o segredo), então os testes exercitam o provedor real sem
      // rede. A exclusão no provedor é observada com espião nos testes.
      STORAGE_PROVIDER: 'cloudinary',
      CLOUDINARY_CLOUD_NAME: 'motorshop-teste',
      CLOUDINARY_API_KEY: '000000000000000',
      CLOUDINARY_API_SECRET: 'segredo-apenas-para-testes',
      STORAGE_FOLDER: 'teste',
    },
    globalSetup: ['./tests/globalSetup.js'],
    // Os testes de integração compartilham uma instância do Mongo; rodar
    // arquivos em paralelo causaria interferência entre eles.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      // Pontos de entrada de processo (subir o servidor, scripts de linha de
      // comando): exercitados pelo E2E e pelo uso, não por teste unitário.
      exclude: ['src/server.js', 'src/scripts/**'],
      reporter: ['text-summary', 'json-summary', 'html'],
      thresholds: {
        lines: 70,
        statements: 70,
        functions: 70,
        branches: 70,
        // Serviços: é onde mora a regra de negócio (ARCHITECTURE §4).
        'src/**/*.service.js': { lines: 90, statements: 90, functions: 90, branches: 80 },
      },
    },
  },
});
