import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Pré-anúncio do código da página pedida (`<link rel="modulepreload">`).
 *
 * As páginas do site são carregadas sob demanda. Sem isto, o navegador baixa
 * o JS principal, executa, descobre a rota e só então pede o chunk da página:
 * duas viagens em série antes de a manchete aparecer. Anunciando o chunk no
 * HTML, ele desce em paralelo com o principal.
 *
 * O mapa página → arquivo-fonte espelha `frontend/src/routes/index.jsx`; o
 * arquivo gerado (com hash) vem do manifesto do build do Vite.
 */
const PAGE_SOURCES = {
  moto: 'src/pages/public/MotoDetalhe.jsx',
  estoque: 'src/pages/public/Estoque.jsx',
  financiamento: 'src/pages/public/Financiamento.jsx',
  'venda-sua-moto': 'src/pages/public/VendaSuaMoto.jsx',
  sobre: 'src/pages/public/Sobre.jsx',
  contato: 'src/pages/public/Contato.jsx',
  privacidade: 'src/pages/public/Privacidade.jsx',
};

/**
 * @returns {(page: string) => string[]} caminhos a pré-carregar para a página
 *   (vazio sem manifesto — o site funciona igual, só sem a otimização)
 */
export function createPreloader(frontendDir) {
  const manifestPath = join(frontendDir, '.vite', 'manifest.json');
  if (!existsSync(manifestPath)) return () => [];

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  // O que o index.html já carrega (entrada e suas dependências) não se repete.
  const entry = Object.values(manifest).find((chunk) => chunk.isEntry);
  const alreadyLoaded = new Set(collect(manifest, entry, new Set()));

  const cache = new Map();
  return (page) => {
    if (!cache.has(page)) {
      const chunk = manifest[PAGE_SOURCES[page]];
      const files = chunk ? collect(manifest, chunk, new Set()) : [];
      cache.set(
        page,
        files.filter((file) => !alreadyLoaded.has(file)).map((file) => `/${file}`),
      );
    }
    return cache.get(page);
  };
}

/** O arquivo do chunk e, recursivamente, os que ele importa estaticamente. */
function collect(manifest, chunk, seen) {
  if (!chunk || seen.has(chunk.file)) return [...seen];
  seen.add(chunk.file);
  for (const key of chunk.imports ?? []) collect(manifest, manifest[key], seen);
  return [...seen];
}
