import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/**
 * Configuração única para o monorepo (ESLint flat config).
 * Regras comuns na base, e o que é específico de cada workspace por escopo.
 */
export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-ssr/**',
      '**/build/**',
      '**/coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },

  js.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Backend — Node
  {
    files: ['backend/**/*.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Frontend — navegador + React
  {
    files: ['frontend/**/*.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Scripts de linha de comando existem para imprimir na saída padrão.
  {
    files: ['backend/src/scripts/**/*.js'],
    rules: { 'no-console': 'off' },
  },

  // Testes — globais do Vitest
  {
    files: ['**/*.test.js', '**/tests/**/*.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // E2E: as especificações rodam em Node e passam funções ao navegador.
  {
    files: ['e2e/**/*.{js,mjs}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },

  // O servidor do E2E informa no terminal o que está fazendo.
  {
    files: ['e2e/servidor.mjs'],
    rules: { 'no-console': 'off' },
  },

  // Arquivos de configuração rodam em Node.
  {
    files: ['*.config.js', '**/*.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Desliga regras de formatação que conflitam com o Prettier. Sempre por último.
  prettier,
];
