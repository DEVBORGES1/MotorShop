import { USER_ROLE } from '@motorshop/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authorize } from '../../src/middlewares/authorize.js';

describe('authorize', () => {
  let next;

  beforeEach(() => {
    next = vi.fn();
  });

  it('libera quando o papel está na lista', () => {
    authorize(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN)({ user: { role: 'ADMIN' } }, {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('responde 403 quando o papel não basta', () => {
    authorize(USER_ROLE.SUPER_ADMIN)({ user: { role: 'ADMIN' } }, {}, next);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  it('responde 401 quando não há usuário — autorizar sem autenticar não existe', () => {
    authorize(USER_ROLE.ADMIN)({}, {}, next);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });
});
