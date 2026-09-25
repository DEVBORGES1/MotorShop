import { createHash } from 'node:crypto';

import { expect } from '@playwright/test';

import { CLOUDINARY, ORIGEM } from './dados.mjs';

/**
 * Abre uma página pública e espera ela ficar interativa. O HTML chega pronto
 * do servidor, mas filtros e botões só respondem depois que o React hidrata —
 * `<html data-pronto>` marca esse momento. Sem esperar, o teste clicaria numa
 * página que ainda só se lê.
 */
export async function abrir(page, caminho) {
  const resposta = await page.goto(caminho);
  await page.locator('html[data-pronto]').waitFor({ state: 'attached' });
  return resposta;
}

/** Entra no painel pela tela de login, como a pessoa faz. */
export async function entrar(page, conta) {
  await page.goto('/admin/login');
  await page.getByLabel(/E-mail/).fill(conta.email);
  await page.getByLabel(/Senha/).fill(conta.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/admin(?!\/login)/);
}

/**
 * Leads como o painel os vê, pela API (login próprio). Serve para conferir
 * que o que o visitante enviou chegou inteiro.
 */
export async function leadsNoPainel(request, conta) {
  const login = await request.post(`${ORIGEM}/api/auth/login`, {
    data: { email: conta.email, password: conta.password },
  });
  expect(login.ok()).toBe(true);
  const { data } = await login.json();
  // 48 é a página máxima da API; o E2E cria poucos leads.
  const resposta = await request.get(`${ORIGEM}/api/admin/leads?limit=48`, {
    headers: { Authorization: `Bearer ${data.accessToken}` },
  });
  expect(resposta.ok()).toBe(true);
  return (await resposta.json()).data;
}

const sha1 = (texto) => createHash('sha1').update(texto).digest('hex');

/**
 * Provedor de imagens falso, no navegador. O envio do painel vai direto ao
 * Cloudinary (a API nunca recebe o arquivo); aqui, a requisição é atendida
 * pelo teste, que:
 *  - confere a assinatura que o servidor emitiu (pasta, formatos, prazo);
 *  - responde assinado com o mesmo segredo — o servidor verifica a resposta
 *    antes de vincular a foto, como faz com o provedor real.
 * As fotos servidas depois são SVGs coloridos.
 *
 * @returns {{ envios: () => Array<{ pasta: string, assinaturaValida: boolean }> }}
 */
export async function simularProvedorDeImagens(page) {
  const envios = [];

  await page.route('https://api.cloudinary.com/**', async (route) => {
    const corpo = route.request().postDataBuffer().toString('latin1');
    const campo = (nome) => corpo.match(new RegExp(`name="${nome}"\\r\\n\\r\\n([^\\r]*)`))?.[1];
    const assinados = ['allowed_formats', 'folder', 'timestamp', 'transformation'];
    const esperada = sha1(
      assinados.map((n) => `${n}=${campo(n)}`).join('&') + CLOUDINARY.apiSecret,
    );
    envios.push({ pasta: campo('folder'), assinaturaValida: esperada === campo('signature') });

    const publicId = `${campo('folder')}/foto-${envios.length}`;
    const version = 1_700_000_000 + envios.length;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        public_id: publicId,
        version,
        signature: sha1(`public_id=${publicId}&version=${version}${CLOUDINARY.apiSecret}`),
        width: 1600,
        height: 1200,
        format: 'jpg',
        bytes: 2048,
      }),
    });
  });

  await page.route('https://res.cloudinary.com/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200"><rect width="100%" height="100%" fill="#355"/></svg>',
    }),
  );

  return { envios: () => envios };
}

/** Arquivo de imagem para o seletor de arquivos (o conteúdo não importa). */
export const fotoFalsa = (nome) => ({
  name: nome,
  mimeType: 'image/jpeg',
  buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]),
});
