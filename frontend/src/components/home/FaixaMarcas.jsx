import { Link } from 'react-router-dom';

/** Marcas do estoque, em faixa rolável: cada uma leva ao estoque já filtrado. */
export function FaixaMarcas({ marcas }) {
  if (!marcas?.length) return null;

  return (
    <section aria-labelledby="titulo-marcas" className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
      <h2 id="titulo-marcas" className="label-caps text-[11px] text-ink-400">
        Navegue por marca
      </h2>

      <ul className="mt-4 flex snap-x gap-2 overflow-x-auto pb-3 [scrollbar-width:thin]">
        {marcas.map((marca) => (
          <li key={marca.slug} className="snap-start">
            <Link
              to={`/estoque?marca=${encodeURIComponent(marca.slug)}`}
              className="label-caps flex items-center gap-3 rounded-md border border-ink-700 bg-surface px-4 py-3 text-[13px] whitespace-nowrap text-ink-100 transition hover:border-brand-500 hover:text-brand-500"
            >
              {marca.name}
              {marca.count > 0 && (
                <span className="rounded-sm bg-ink-800 px-1.5 py-0.5 text-[11px] text-ink-200">
                  {marca.count}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
