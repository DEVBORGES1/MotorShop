import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

describe('cabeçalhos de segurança', () => {
  it('Permissions-Policy, X-Frame-Options e CSP sem script inline nem eval', async () => {
    const { createApp } = await import('../../src/app.js');
    const res = await request(createApp()).get('/api');

    expect(res.headers['permissions-policy']).toMatch(/camera=\(\)/);
    expect(res.headers['permissions-policy']).toMatch(/geolocation=\(\)/);
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['x-powered-by']).toBeUndefined();

    const csp = res.headers['content-security-policy'];
    const scriptSrc = csp.split(';').find((d) => d.startsWith('script-src '));
    expect(scriptSrc).toBe("script-src 'self'");
    expect(csp).toContain("script-src-attr 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('sem HSTS fora de produção (localhost em http)', async () => {
    const { createApp } = await import('../../src/app.js');
    const res = await request(createApp()).get('/api');
    expect(res.headers['strict-transport-security']).toBeUndefined();
  });

  it('HSTS de 2 anos com subdomínios em produção', async () => {
    vi.resetModules();
    vi.doMock('../../src/config/env.js', async (original) => {
      const real = await original();
      return { ...real, env: { ...real.env, isProduction: true } };
    });
    const { helmetOptions } = await import('../../src/config/security.js');
    expect(helmetOptions().strictTransportSecurity).toEqual({
      maxAge: 63_072_000,
      includeSubDomains: true,
    });
    vi.doUnmock('../../src/config/env.js');
  });
});
