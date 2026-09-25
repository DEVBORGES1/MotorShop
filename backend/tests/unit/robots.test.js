import { describe, expect, it, vi } from 'vitest';

// Ambiente de staging.
vi.mock('../../src/config/env.js', async (original) => {
  const real = await original();
  return { ...real, env: { ...real.env, ROBOTS_POLICY: 'disallow' } };
});

const { robots } = await import('../../src/seo/seo.controller.js');

describe('robots.txt em staging', () => {
  it('bloqueia tudo', async () => {
    const res = { set: vi.fn(), type: vi.fn().mockReturnThis(), send: vi.fn() };
    await robots({ protocol: 'https', get: () => 'staging.test' }, res);
    expect(res.send).toHaveBeenCalledWith('User-agent: *\nDisallow: /\n');
  });
});
