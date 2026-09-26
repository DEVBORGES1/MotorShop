/**
 * Teste de fumaça de um ambiente publicado: o site responde como deveria?
 *
 *   npm run smoke -- https://loja.com.br
 *   npm run smoke -- https://staging.onrender.com --robots=disallow
 *
 * Só leitura: não cria lead, não faz login. Confere saúde e banco, página
 * renderizada no servidor, cabeçalhos de segurança, robots/sitemap, uma moto
 * de verdade, 404 e rota do painel protegida. Sai com código 1 se algo falhar
 * — serve para a CI depois do deploy e para conferir à mão.
 */

const args = process.argv.slice(2);
const base = args.find((a) => !a.startsWith('--'))?.replace(/\/+$/, '');
const robotsEsperado = args.find((a) => a.startsWith('--robots='))?.split('=')[1] ?? 'allow';

if (!base || !/^https?:\/\//.test(base)) {
  console.error('Uso: npm run smoke -- https://endereco-do-site [--robots=allow|disallow]');
  process.exit(2);
}

const resultados = [];
async function conferir(nome, teste) {
  const inicio = performance.now();
  try {
    const detalhe = await teste();
    resultados.push({ ok: true, nome, detalhe, ms: performance.now() - inicio });
  } catch (erro) {
    resultados.push({ ok: false, nome, detalhe: erro.message, ms: performance.now() - inicio });
  }
}

function exigir(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

async function pedir(caminho, opcoes) {
  const resposta = await fetch(`${base}${caminho}`, { redirect: 'manual', ...opcoes });
  return { resposta, texto: await resposta.text() };
}

/** A página veio renderizada no servidor (conteúdo dentro de #root)? */
const renderizada = (html) => /<div id="root"><[a-z]/.test(html);

let urlDeMoto;

await conferir('saúde e banco (/api/health)', async () => {
  const { resposta, texto } = await pedir('/api/health');
  exigir(resposta.status === 200, `status ${resposta.status}`);
  const { data } = JSON.parse(texto);
  exigir(data.database?.status === 'connected', `banco: ${data.database?.status}`);
  return `ok, no ar há ${data.uptime}s`;
});

await conferir('home renderizada no servidor', async () => {
  const { resposta, texto } = await pedir('/');
  exigir(resposta.status === 200, `status ${resposta.status}`);
  exigir(renderizada(texto), 'HTML sem a página dentro de #root');
  exigir(/<title data-seo>[^<]+<\/title>/.test(texto), 'sem <title> injetado');
  // Script inline seria bloqueado pela CSP; só valem os com `src` e os
  // blocos de dados (JSON-LD e dados iniciais), que não executam.
  const inline = [...texto.matchAll(/<script\b([^>]*)>/g)].filter(
    ([, atributos]) =>
      !/\bsrc=/.test(atributos) && !/type="application\/(ld\+)?json"/.test(atributos),
  );
  exigir(!inline.length, `${inline.length} script(s) inline no HTML`);
  return texto.match(/<title data-seo>([^<]+)</)[1];
});

await conferir('cabeçalhos de segurança', async () => {
  const { resposta } = await pedir('/');
  const h = (nome) => resposta.headers.get(nome) ?? '';
  exigir(h('content-security-policy').includes("script-src 'self'"), 'CSP sem script-src self');
  exigir(h('x-content-type-options') === 'nosniff', 'sem nosniff');
  exigir(h('x-frame-options') === 'DENY', 'sem X-Frame-Options DENY');
  if (base.startsWith('https://')) exigir(h('strict-transport-security'), 'sem HSTS');
  exigir(!h('x-powered-by'), 'X-Powered-By exposto');
  return 'CSP, HSTS, nosniff, frame';
});

await conferir(`robots.txt (${robotsEsperado})`, async () => {
  const { resposta, texto } = await pedir('/robots.txt');
  exigir(resposta.status === 200, `status ${resposta.status}`);
  const bloqueia = /Disallow: \/\s*$/m.test(texto);
  exigir(
    robotsEsperado === 'disallow' ? bloqueia : !bloqueia && texto.includes('Sitemap:'),
    robotsEsperado === 'disallow'
      ? 'deveria bloquear tudo (staging)'
      : 'bloqueando o site em produção',
  );
  return bloqueia ? 'Disallow: /' : 'permite, com sitemap';
});

await conferir('sitemap.xml', async () => {
  const { resposta, texto } = await pedir('/sitemap.xml');
  exigir(resposta.status === 200, `status ${resposta.status}`);
  const urls = [...texto.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  exigir(urls.length > 0, 'sitemap vazio');
  urlDeMoto = urls.find((u) => u.includes('/motos/'));
  return `${urls.length} URLs`;
});

await conferir('página de uma moto', async () => {
  exigir(urlDeMoto, 'nenhuma moto no sitemap (estoque vazio?)');
  const { resposta, texto } = await pedir(new URL(urlDeMoto).pathname);
  exigir(resposta.status === 200, `status ${resposta.status}`);
  exigir(renderizada(texto), 'HTML sem a página dentro de #root');
  exigir(texto.includes('"@type":["Product","Motorcycle"]'), 'sem JSON-LD da moto');
  return texto.match(/<h1[^>]*>([^<]+)</)?.[1] ?? 'sem h1';
});

await conferir('estoque pela API', async () => {
  const { resposta, texto } = await pedir('/api/motos?limit=1');
  exigir(resposta.status === 200, `status ${resposta.status}`);
  const { meta } = JSON.parse(texto);
  return `${meta.total} motos publicadas`;
});

await conferir('página inexistente → 404', async () => {
  const { resposta } = await pedir('/pagina-que-nao-existe-fumaca');
  exigir(resposta.status === 404, `status ${resposta.status}`);
  return '404';
});

await conferir('painel protegido', async () => {
  const login = await pedir('/admin/login');
  exigir(login.resposta.status === 200, `login: status ${login.resposta.status}`);
  const api = await pedir('/api/admin/leads');
  exigir(api.resposta.status === 401, `API do painel sem token: status ${api.resposta.status}`);
  return 'login no ar; API exige token';
});

for (const { ok, nome, detalhe, ms } of resultados) {
  console.log(
    `${ok ? '✓' : '✗'} ${nome.padEnd(34)} ${String(Math.round(ms)).padStart(5)} ms  ${detalhe}`,
  );
}
const falhas = resultados.filter((r) => !r.ok).length;
console.log(
  falhas ? `\n${falhas} verificação(ões) falharam em ${base}` : `\nTudo certo em ${base}`,
);
process.exit(falhas ? 1 : 0);
