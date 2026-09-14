import { describe, expect, it } from 'vitest';

import { parseEnv } from '../../src/config/env.js';

describe('parseEnv', () => {
  it('aplica os padrões quando nada é informado', () => {
    const result = parseEnv({});

    expect(result.success).toBe(true);
    expect(result.data.PORT).toBe(3000);
    expect(result.data.NODE_ENV).toBe('development');
    expect(result.data.corsOrigins).toEqual(['http://localhost:5173']);
  });

  it('aceita múltiplas origens separadas por vírgula', () => {
    const result = parseEnv({ FRONTEND_URL: 'http://a.test, http://b.test' });

    expect(result.data.corsOrigins).toEqual(['http://a.test', 'http://b.test']);
  });

  it('rejeita MONGODB_URI com formato inválido', () => {
    const result = parseEnv({ MONGODB_URI: 'postgres://localhost/db' });

    expect(result.success).toBe(false);
    expect(result.issues.join()).toContain('MONGODB_URI');
  });

  it('rejeita JWT_SECRET curto', () => {
    const result = parseEnv({ JWT_SECRET: 'curto-demais' });

    expect(result.success).toBe(false);
    expect(result.issues.join()).toContain('JWT_SECRET');
  });

  it('exige MONGODB_URI e JWT_SECRET em produção', () => {
    const result = parseEnv({ NODE_ENV: 'production' });

    expect(result.success).toBe(false);
    expect(result.issues.join()).toContain('MONGODB_URI');
    expect(result.issues.join()).toContain('JWT_SECRET');
  });

  it('nunca inclui o valor da variável na mensagem de erro', () => {
    const secret = 'curto-demais-para-ser-aceito';
    const result = parseEnv({ JWT_SECRET: secret });

    expect(result.success).toBe(false);
    expect(result.issues.join()).not.toContain(secret);
  });

  it('rejeita PORT fora da faixa válida', () => {
    expect(parseEnv({ PORT: '70000' }).success).toBe(false);
    expect(parseEnv({ PORT: 'abc' }).success).toBe(false);
  });
});

describe('parseEnv — variáveis declaradas porém vazias', () => {
  it('trata string vazia como ausente (cópia direta do .env.example)', () => {
    const result = parseEnv({ MONGODB_URI: '', JWT_SECRET: '   ' });

    expect(result.success).toBe(true);
    expect(result.data.MONGODB_URI).toBeUndefined();
    expect(result.data.JWT_SECRET).toBeUndefined();
  });

  it('ainda exige as obrigatórias em produção quando vêm vazias', () => {
    const result = parseEnv({ NODE_ENV: 'production', MONGODB_URI: '', JWT_SECRET: '' });

    expect(result.success).toBe(false);
  });
});
