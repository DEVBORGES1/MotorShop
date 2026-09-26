import { formatarPreco } from '@/utils/format.js';

/**
 * Números do estoque, todos calculados a partir das faixas reais da API —
 * nenhum é escrito à mão. Item sem dado some; sem estoque, a faixa some.
 */
function itensDasFaixas(faixas) {
  const itens = [];

  if (faixas.total > 0) itens.push({ valor: faixas.total, rotulo: 'Motos em estoque' });
  if (faixas.brands?.length) itens.push({ valor: faixas.brands.length, rotulo: 'Marcas' });

  if (faixas.year) {
    const { min, max } = faixas.year;
    itens.push({ valor: min === max ? String(min) : `${min}–${max}`, rotulo: 'Anos dos modelos' });
  }

  if (faixas.price) itens.push({ valor: formatarPreco(faixas.price.min), rotulo: 'A partir de' });

  return itens;
}

export function FaixaNumeros({ faixas }) {
  if (!faixas || !(faixas.total > 0)) return null;

  const itens = itensDasFaixas(faixas);
  if (itens.length < 2) return null;

  return (
    <section aria-label="O estoque em números" className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
      <dl className="grid grid-cols-2 gap-0.5 overflow-hidden rounded-lg bg-ink-800 md:grid-cols-4">
        {itens.map(({ valor, rotulo }) => (
          // `dt` vem antes de `dd` no HTML (é a ordem que o leitor de tela lê);
          // o `flex-col-reverse` só inverte o desenho, com o número em cima.
          <div
            key={rotulo}
            className="flex min-w-0 flex-col-reverse gap-1.5 bg-surface px-4 py-5 sm:px-5 sm:py-6"
          >
            <dt className="label-caps text-[11px] text-ink-400">{rotulo}</dt>
            <dd className="font-display text-2xl font-extrabold tracking-tight break-words text-brand-500 sm:text-3xl lg:text-4xl">
              {valor}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
