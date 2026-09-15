import { describe, expect, it } from 'vitest';

import {
  generateRefreshToken,
  hashRefreshToken,
  packRefreshToken,
  signAccessToken,
  unpackRefreshToken,
  verifyAccessToken,
} from '../../src/modules/auth/tokens.js';

const usuario = { id: '507f1f77bcf86cd799439011', role: 'ADMIN' };

describe('access token', () => {
  it('assina e verifica', () => {
    const payload = verifyAccessToken(signAccessToken(usuario));

    expect(payload.sub).toBe(usuario.id);
    expect(payload.role).toBe('ADMIN');
  });

  it('não carrega dado sensível — o JWT é assinado, não criptografado', () => {
    const token = signAccessToken(usuario);
    const corpo = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());

    expect(Object.keys(corpo).sort()).toEqual(['aud', 'exp', 'iat', 'iss', 'role', 'sub']);
    expect(JSON.stringify(corpo)).not.toMatch(/@|senha|password|hash/i);
  });

  it('rejeita token adulterado', () => {
    const token = signAccessToken(usuario);
    const [cabecalho, corpo, assinatura] = token.split('.');

    // Troca o papel para SUPER_ADMIN e mantém a assinatura original.
    const forjado = Buffer.from(JSON.stringify({ sub: usuario.id, role: 'SUPER_ADMIN' })).toString(
      'base64url',
    );

    expect(verifyAccessToken(`${cabecalho}.${forjado}.${assinatura}`)).toBeNull();
    expect(verifyAccessToken(`${cabecalho}.${corpo}.assinatura-falsa`)).toBeNull();
  });

  it('rejeita lixo e valor vazio', () => {
    expect(verifyAccessToken('nao-e-jwt')).toBeNull();
    expect(verifyAccessToken('')).toBeNull();
  });
});

describe('refresh token', () => {
  it('gera jti e segredo distintos a cada chamada', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();

    expect(a.jti).not.toBe(b.jti);
    expect(a.secret).not.toBe(b.secret);
    expect(a.secret.length).toBeGreaterThanOrEqual(40);
  });

  it('faz o empacotamento de ida e volta', () => {
    const token = generateRefreshToken();
    expect(unpackRefreshToken(packRefreshToken(token))).toEqual(token);
  });

  it('rejeita cookie malformado', () => {
    for (const valor of ['', 'sem-ponto', undefined, null]) {
      expect(unpackRefreshToken(valor)).toBeNull();
    }
  });

  it('o hash armazenado não permite reconstruir o token', () => {
    const { secret } = generateRefreshToken();
    const hash = hashRefreshToken(secret);

    expect(hash).not.toContain(secret);
    expect(hash).toHaveLength(64); // sha256 em hex
    expect(hashRefreshToken(secret)).toBe(hash); // determinístico
  });
});
