import { Link } from 'react-router-dom';

/**
 * Trilha de navegação. O último item é a página atual: vai como texto, com
 * `aria-current`, e não como link para a própria página.
 *
 * @param {{ itens: Array<{ label: string, to?: string }> }} props
 */
export function Breadcrumbs({ itens }) {
  return (
    <nav aria-label="Você está em">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
        {itens.map((item, indice) => {
          const atual = indice === itens.length - 1;

          return (
            <li key={item.label} className="flex items-center gap-2">
              {atual ? (
                <span aria-current="page" className="text-ink-200">
                  {item.label}
                </span>
              ) : (
                <>
                  <Link to={item.to} className="hover:text-brand-500">
                    {item.label}
                  </Link>
                  <span aria-hidden="true">›</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
