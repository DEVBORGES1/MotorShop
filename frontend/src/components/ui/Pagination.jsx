import { pageItems } from '@/utils/pagination.js';

/**
 * Paginação de servidor. Não conhece a API: recebe a página atual e o total,
 * e devolve a página escolhida por `onChange`.
 */
export function Pagination({ page, totalPages, onChange, className = '' }) {
  const items = pageItems(page, totalPages);
  if (items.length < 2) return null;

  const ir = (n) => () => onChange(n);
  const base = 'label-caps min-w-9 rounded-sm px-2.5 py-2 text-[11px] transition';
  const passo = `${base} border border-ink-700 text-ink-200 hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`;

  return (
    <nav aria-label="Paginação" className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <button type="button" onClick={ir(page - 1)} disabled={page <= 1} className={passo}>
        Anterior
      </button>

      {items.map((item, i) =>
        item === 'gap' ? (
          // O índice serve de chave aqui porque reticências não têm
          // identidade própria — não há o que preservar entre renderizações.
          <span key={`gap-${i}`} aria-hidden="true" className={`${base} text-ink-600`}>
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={ir(item)}
            aria-current={item === page ? 'page' : undefined}
            aria-label={`Página ${item}`}
            className={
              item === page
                ? `${base} bg-brand-500 text-on-brand`
                : `${base} border border-ink-800 text-ink-400 hover:border-ink-600 hover:text-ink-100`
            }
          >
            {item}
          </button>
        ),
      )}

      <button type="button" onClick={ir(page + 1)} disabled={page >= totalPages} className={passo}>
        Próxima
      </button>
    </nav>
  );
}
