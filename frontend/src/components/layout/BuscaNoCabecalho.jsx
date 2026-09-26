import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Busca por marca ou modelo, aberta pelo ícone de lupa do cabeçalho.
 *
 * Leva ao estoque já filtrado (`/estoque?q=…`): a busca em si é a do catálogo,
 * que já existe — aqui só há a porta de entrada. A API pede ao menos 2
 * caracteres, e o campo exige o mesmo para nem enviar o que ela recusaria.
 */
export function BuscaNoCabecalho() {
  const [aberta, setAberta] = useState(false);
  const campo = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Trocar de página fecha a busca.
  useEffect(() => setAberta(false), [pathname]);
  useEffect(() => {
    if (aberta) campo.current?.focus();
  }, [aberta]);

  const enviar = (evento) => {
    evento.preventDefault();
    const termo = new FormData(evento.currentTarget).get('q')?.toString().trim();
    if (!termo || termo.length < 2) return;

    setAberta(false);
    navigate({ pathname: '/estoque', search: new URLSearchParams({ q: termo }).toString() });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
        aria-controls="busca-cabecalho"
        className="flex h-10 w-10 items-center justify-center rounded-md text-ink-200 transition hover:text-brand-500"
      >
        <span className="sr-only">{aberta ? 'Fechar busca' : 'Buscar moto'}</span>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-5 w-5 fill-none stroke-current"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4.5 4.5" />
        </svg>
      </button>

      {aberta && (
        <form
          id="busca-cabecalho"
          role="search"
          onSubmit={enviar}
          onKeyDown={(evento) => evento.key === 'Escape' && setAberta(false)}
          className="absolute inset-x-0 top-full border-t border-b border-ink-800 bg-ink-900 shadow-2xl shadow-black/50"
        >
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
            <label htmlFor="busca-cabecalho-campo" className="sr-only">
              Buscar moto por marca ou modelo
            </label>
            <input
              ref={campo}
              id="busca-cabecalho-campo"
              name="q"
              type="search"
              required
              minLength={2}
              maxLength={80}
              autoComplete="off"
              placeholder="Buscar por marca ou modelo — ex.: CB 500"
              className="min-w-0 flex-1 rounded-md border border-ink-700 bg-ink-900 px-4 py-3 text-sm text-ink-50 placeholder:text-ink-500"
            />
            <button
              type="submit"
              className="label-caps rounded-md bg-brand-500 px-5 py-3 text-[13px] text-on-brand transition hover:bg-brand-400"
            >
              Buscar
            </button>
          </div>
        </form>
      )}
    </>
  );
}
