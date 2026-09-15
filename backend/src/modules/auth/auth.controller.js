import { ok } from '../../utils/apiResponse.js';
import * as service from './auth.service.js';
import { REFRESH_COOKIE, refreshCookieOptions } from './tokens.js';

function setRefreshCookie(res, value) {
  res.cookie(REFRESH_COOKIE, value, refreshCookieOptions());
}

export async function login(req, res) {
  const { user, accessToken, refreshCookie } = await service.login({
    ...req.validated.body,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });

  setRefreshCookie(res, refreshCookie);
  res.json(ok({ user, accessToken }, { message: 'Autenticado' }));
}

export async function refresh(req, res) {
  const { user, accessToken, refreshCookie } = await service.refresh({
    cookieValue: req.cookies?.[REFRESH_COOKIE],
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });

  setRefreshCookie(res, refreshCookie);
  res.json(ok({ user, accessToken }));
}

export async function logout(req, res) {
  await service.logout(req.cookies?.[REFRESH_COOKIE]);

  // `clearCookie` precisa das MESMAS opções de path/sameSite usadas ao criar,
  // senão o navegador mantém o cookie original.
  const { maxAge: _maxAge, ...options } = refreshCookieOptions();
  res.clearCookie(REFRESH_COOKIE, options);

  res.json(ok(null, { message: 'Sessão encerrada' }));
}

export async function me(req, res) {
  res.json(ok(await service.getMe(req.user.id)));
}
