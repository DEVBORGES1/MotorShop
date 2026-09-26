import { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as admin from './adminService.js';
import { api, getAccessToken, setAccessToken, setSessionLostHandler } from './api.js';
import * as authService from './authService.js';
import * as publicService from './publicService.js';
import { enviarAoProvedor, metadadosDoEnvio } from './uploadService.js';

/**
 * Servidor de mentira no lugar da rede: o Axios real (interceptadores,
 * renovação de sessão, conversão de erros) roda inteiro; só a ida à rede é
 * trocada. `rotas` responde por "MÉTODO /caminho".
 */
let rotas;
let chamadas;
const adapterOriginal = api.defaults.adapter;

beforeEach(() => {
  rotas = {};
  chamadas = [];
  setAccessToken(null);
  api.defaults.adapter = async (config) => {
    const chave = `${config.method.toUpperCase()} ${config.url}`;
    chamadas.push({ chave, config });
    const responder = rotas[chave] ?? (() => ({ status: 200, data: { success: true, data: {} } }));
    const { status, data } = await responder(config);
    const response = { status, data, headers: {}, config, statusText: '' };
    if (status >= 400)
      throw new AxiosError(`Erro ${status}`, 'ERR_BAD_RESPONSE', config, {}, response);
    return response;
  };
});

afterEach(() => {
  api.defaults.adapter = adapterOriginal;
  setSessionLostHandler(null);
});

const ok = (data) => () => ({ status: 200, data: { success: true, data } });

describe('api.js — sessão e erros', () => {
  it('manda o token de acesso guardado em memória', async () => {
    setAccessToken('token-1');
    await api.get('/admin/motos');

    expect(chamadas[0].config.headers.Authorization).toBe('Bearer token-1');
  });

  it('401: renova a sessão uma vez e repete a requisição com o token novo', async () => {
    setAccessToken('vencido');
    rotas['GET /admin/motos'] = (config) =>
      config.headers.Authorization === 'Bearer novo'
        ? { status: 200, data: { success: true, data: ['moto'] } }
        : { status: 401, data: { message: 'Token expirado' } };
    rotas['POST /auth/refresh'] = ok({ accessToken: 'novo', user: { id: 'u1' } });

    const envelope = await api.get('/admin/motos');

    expect(envelope.data).toEqual(['moto']);
    expect(getAccessToken()).toBe('novo');
    expect(chamadas.map((c) => c.chave)).toEqual([
      'GET /admin/motos',
      'POST /auth/refresh',
      'GET /admin/motos',
    ]);
  });

  it('vários 401 ao mesmo tempo: uma renovação só (senão o servidor acusaria reuso)', async () => {
    setAccessToken('vencido');
    const protegida = (config) =>
      config.headers.Authorization === 'Bearer novo'
        ? { status: 200, data: { success: true, data: 1 } }
        : { status: 401, data: {} };
    rotas['GET /admin/motos'] = protegida;
    rotas['GET /admin/leads'] = protegida;
    rotas['GET /admin/marcas'] = protegida;
    rotas['POST /auth/refresh'] = async () => {
      await new Promise((r) => setTimeout(r, 10));
      return { status: 200, data: { success: true, data: { accessToken: 'novo' } } };
    };

    await Promise.all([api.get('/admin/motos'), api.get('/admin/leads'), api.get('/admin/marcas')]);

    expect(chamadas.filter((c) => c.chave === 'POST /auth/refresh')).toHaveLength(1);
  });

  it('renovação recusada: a sessão cai, o token some e a tela é avisada', async () => {
    setAccessToken('vencido');
    const sessaoPerdida = vi.fn();
    setSessionLostHandler(sessaoPerdida);
    rotas['GET /admin/motos'] = () => ({ status: 401, data: { message: 'Sessão inválida' } });
    rotas['POST /auth/refresh'] = () => ({ status: 401, data: { message: 'Sessão expirada' } });

    await expect(api.get('/admin/motos')).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 401,
      message: 'Sessão inválida',
    });
    expect(sessaoPerdida).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
  });

  it('401 no próprio login não tenta renovar (senha errada é só senha errada)', async () => {
    rotas['POST /auth/login'] = () => ({
      status: 401,
      data: { message: 'E-mail ou senha inválidos' },
    });

    await expect(authService.login({ email: 'a@b.c', password: 'x' })).rejects.toMatchObject({
      message: 'E-mail ou senha inválidos',
    });
    expect(chamadas.map((c) => c.chave)).toEqual(['POST /auth/login']);
  });

  it('erro de validação chega com a lista de campos', async () => {
    rotas['POST /leads'] = () => ({
      status: 422,
      data: {
        message: 'Dados inválidos',
        errors: [{ field: 'phone', message: 'Telefone inválido' }],
      },
    });

    await expect(publicService.leads.create({})).rejects.toMatchObject({
      status: 422,
      errors: [{ field: 'phone', message: 'Telefone inválido' }],
    });
  });
});

describe('sessão (authService)', () => {
  it('login guarda o token e devolve o usuário; logout o apaga mesmo se a API falhar', async () => {
    rotas['POST /auth/login'] = ok({ accessToken: 't1', user: { name: 'Ana' } });
    rotas['POST /auth/logout'] = () => ({ status: 500, data: {} });

    expect(await authService.login({ email: 'a@b.c', password: 'x' })).toEqual({ name: 'Ana' });
    expect(getAccessToken()).toBe('t1');

    await expect(authService.logout()).rejects.toBeTruthy();
    expect(getAccessToken()).toBeNull();
  });

  it('restaurar a sessão usa o cookie (refresh) e guarda o token novo', async () => {
    rotas['POST /auth/refresh'] = ok({ accessToken: 't2', user: { name: 'Ana' } });
    rotas['GET /auth/me'] = ok({ name: 'Ana' });

    expect(await authService.restoreSession()).toEqual({ name: 'Ana' });
    expect(getAccessToken()).toBe('t2');
    expect(await authService.fetchMe()).toEqual({ name: 'Ana' });
  });
});

/**
 * Contrato com a API: cada função chama o método e o caminho que o backend
 * expõe. Mudar uma rota de um lado sem o outro quebra aqui, não em produção.
 */
describe('contrato dos serviços com as rotas da API', () => {
  const casos = [
    [() => publicService.motos.list({ page: 2 }), 'GET /motos'],
    [() => publicService.motos.getBySlug('cb-500f'), 'GET /motos/slug/cb-500f'],
    [() => publicService.motos.similares('cb-500f'), 'GET /motos/slug/cb-500f/similares'],
    [() => publicService.marcas.list(), 'GET /marcas'],
    [() => publicService.store.get(), 'GET /store'],
    [() => publicService.filtros.get(), 'GET /filtros'],
    [() => publicService.leads.create({}), 'POST /leads'],
    [() => admin.motosAdmin.list(), 'GET /admin/motos'],
    [() => admin.motosAdmin.get('m1'), 'GET /admin/motos/m1'],
    [() => admin.motosAdmin.create({}), 'POST /admin/motos'],
    [() => admin.motosAdmin.update('m1', {}), 'PATCH /admin/motos/m1'],
    [() => admin.motosAdmin.changeStatus('m1', 'SOLD'), 'PATCH /admin/motos/m1/status'],
    [() => admin.motosAdmin.deactivate('m1'), 'DELETE /admin/motos/m1'],
    [() => admin.marcasAdmin.list(), 'GET /admin/marcas'],
    [() => admin.marcasAdmin.create({}), 'POST /admin/marcas'],
    [() => admin.marcasAdmin.update('b1', {}), 'PATCH /admin/marcas/b1'],
    [() => admin.marcasAdmin.remove('b1'), 'DELETE /admin/marcas/b1'],
    [() => admin.usuariosAdmin.list(), 'GET /admin/usuarios'],
    [() => admin.usuariosAdmin.create({}), 'POST /admin/usuarios'],
    [() => admin.usuariosAdmin.update('u1', {}), 'PATCH /admin/usuarios/u1'],
    [() => admin.usuariosAdmin.deactivate('u1'), 'DELETE /admin/usuarios/u1'],
    [() => admin.storeAdmin.get(), 'GET /admin/store'],
    [() => admin.storeAdmin.update({}), 'PATCH /admin/store'],
    [() => admin.storeAdmin.assinaturaDeImagem(), 'POST /admin/store/imagens/assinatura'],
    [() => admin.storeAdmin.definirImagem('logo', {}), 'PUT /admin/store/imagens/logo'],
    [() => admin.storeAdmin.removerImagem('ogImage'), 'DELETE /admin/store/imagens/ogImage'],
    [() => admin.leadsAdmin.list(), 'GET /admin/leads'],
    [() => admin.leadsAdmin.get('l1'), 'GET /admin/leads/l1'],
    [() => admin.leadsAdmin.update('l1', {}), 'PATCH /admin/leads/l1'],
    [() => admin.leadsAdmin.remove('l1'), 'DELETE /admin/leads/l1'],
    [() => admin.leadsAdmin.removeMany(['l1']), 'POST /admin/leads/exclusao'],
    [() => admin.fotosAdmin.assinatura('m1'), 'POST /admin/uploads/assinatura'],
    [() => admin.fotosAdmin.vincular('m1', {}), 'POST /admin/motos/m1/imagens'],
    [() => admin.fotosAdmin.ordenar('m1', {}), 'PATCH /admin/motos/m1/imagens/ordem'],
    [() => admin.fotosAdmin.alterar('m1', 'f1', {}), 'PATCH /admin/motos/m1/imagens/f1'],
    [() => admin.fotosAdmin.remover('m1', 'f1'), 'DELETE /admin/motos/m1/imagens/f1'],
  ];

  it.each(casos)('%# → %s', async (chamar, esperado) => {
    await chamar();
    expect(chamadas.at(-1).chave).toBe(esperado);
  });
});

describe('envio direto ao provedor de imagens', () => {
  /** XMLHttpRequest de mentira, controlado pelo teste. */
  class XhrFalso {
    static ultimo;
    upload = {};
    open(metodo, url) {
      Object.assign(this, { metodo, url });
    }
    send(corpo) {
      this.corpo = corpo;
      XhrFalso.ultimo = this;
    }
  }
  const xhrOriginal = globalThis.XMLHttpRequest;
  beforeEach(() => {
    globalThis.XMLHttpRequest = XhrFalso;
  });
  afterEach(() => {
    globalThis.XMLHttpRequest = xhrOriginal;
  });

  const assinatura = {
    uploadUrl: 'https://upload.test/v1',
    fields: { timestamp: 1, signature: 'abc' },
  };
  const arquivo = new Blob(['x'], { type: 'image/jpeg' });

  it('envia os campos assinados e o arquivo, e informa o progresso', async () => {
    const progresso = vi.fn();
    const envio = enviarAoProvedor(assinatura, arquivo, progresso);
    const xhr = XhrFalso.ultimo;

    expect(xhr.metodo).toBe('POST');
    expect(xhr.url).toBe('https://upload.test/v1');
    expect(xhr.corpo.get('signature')).toBe('abc');
    expect(xhr.corpo.get('file')).toBeTruthy();

    xhr.upload.onprogress({ lengthComputable: true, loaded: 50, total: 100 });
    Object.assign(xhr, { status: 200, response: { public_id: 'p1', version: 2 } });
    xhr.onload();

    expect(progresso).toHaveBeenCalledWith(0.5);
    const resposta = await envio;
    expect(metadadosDoEnvio(resposta)).toMatchObject({ publicId: 'p1', version: 2 });
  });

  it('recusa do provedor vira erro com a mensagem dele', async () => {
    const envio = enviarAoProvedor(assinatura, arquivo);
    Object.assign(XhrFalso.ultimo, {
      status: 400,
      response: { error: { message: 'Assinatura expirada' } },
    });
    XhrFalso.ultimo.onload();

    await expect(envio).rejects.toThrow('Assinatura expirada');
  });

  it('queda de rede vira erro legível', async () => {
    const envio = enviarAoProvedor(assinatura, arquivo);
    XhrFalso.ultimo.onerror();

    await expect(envio).rejects.toThrow('Falha de rede ao enviar a foto');
  });
});
