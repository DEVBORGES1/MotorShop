import { breadcrumbJsonLd, FUEL_LABEL, TRANSMISSION_LABEL } from '@motorshop/shared';
import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { MotoFilters } from '@/components/catalogo/MotoFilters.jsx';
import { MotoGrid } from '@/components/catalogo/MotoGrid.jsx';
import { SortSelect } from '@/components/catalogo/SortSelect.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { inputClass } from '@/components/ui/Field.jsx';
import { Pagination } from '@/components/ui/Pagination.jsx';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { useBaseDoSite } from '@/contexts/DadosIniciaisContext.jsx';
import { usePaginaSeo } from '@/hooks/useSeo.js';
import { useStore } from '@/hooks/useStore.js';
import { useFiltrosCatalogo } from '@/hooks/useFiltrosCatalogo.js';
import * as publicService from '@/services/publicService.js';
import { contarFiltrosAtivos, descreverFiltros, paramsDaApi } from '@/utils/catalogo.js';
import { formatarKm, formatarPreco } from '@/utils/format.js';

const ROTULOS = {
  preco: (valor) => formatarPreco(Number(valor)),
  km: (valor) => formatarKm(Number(valor)),
  enumerado: (grupo, valor) =>
    (grupo === 'cambio' ? TRANSMISSION_LABEL[valor] : FUEL_LABEL[valor]) ?? valor,
};

export function Estoque() {
  const { filtros, aplicar, alternarNaLista, limpar } = useFiltrosCatalogo();
  const { store } = useStore();
  const { search } = useLocation();
  const base = useBaseDoSite(store);
  // Catálogo filtrado: fora do índice, canonical na lista sem filtro — como o
  // servidor já responde no HTML inicial.
  usePaginaSeo('estoque', {
    robots: search ? 'noindex, follow' : undefined,
    canonicalPath: '/estoque',
    jsonLd: [
      breadcrumbJsonLd([
        { name: 'Home', url: `${base}/` },
        { name: 'Estoque', url: `${base}/estoque` },
      ]),
    ],
  });
  const [painelAberto, setPainelAberto] = useState(false);

  const params = paramsDaApi(filtros);
  const chaveDaBusca = new URLSearchParams(params).toString();

  const { data, error, isLoading } = useAsyncData(
    () => publicService.motos.list(params),
    [chaveDaBusca],
  );

  // As faixas descrevem o estoque inteiro, não o resultado filtrado: se
  // dependessem do filtro, marcar "Honda" apagaria as outras marcas da lista.
  const { data: faixas } = useAsyncData(() => publicService.filtros.get().catch(() => null), []);

  const motos = data?.data ?? [];
  const meta = data?.meta;
  const chips = descreverFiltros(filtros, faixas, ROTULOS);
  const ativos = contarFiltrosAtivos(filtros);

  const irParaPagina = useCallback(
    (page) => {
      aplicar({ page });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [aplicar],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Estoque</h1>
        <p className="mt-2 text-sm text-ink-400">
          {isLoading
            ? 'Buscando motos…'
            : `${meta?.total ?? 0} ${meta?.total === 1 ? 'moto encontrada' : 'motos encontradas'}`}
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div>
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <Button variant="secondary" onClick={() => setPainelAberto((v) => !v)}>
              Filtros{ativos > 0 && ` · ${ativos}`}
            </Button>
          </div>

          <aside
            className={`mt-4 lg:mt-0 lg:block ${painelAberto ? 'block' : 'hidden'}`}
            aria-label="Filtros do estoque"
          >
            <BuscaTextual valor={filtros.q} onChange={(q) => aplicar({ q })} />

            <div className="mt-5">
              <MotoFilters
                filtros={filtros}
                faixas={faixas}
                aplicar={aplicar}
                alternarNaLista={alternarNaLista}
              />
            </div>
          </aside>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            {chips.length > 0 ? (
              <ul className="flex flex-wrap items-center gap-2">
                {chips.map((chip) => (
                  <li key={chip.id}>
                    <button
                      type="button"
                      onClick={() => aplicar(chip.limpar)}
                      className="label-caps flex items-center gap-2 rounded-sm border border-brand-500 px-2.5 py-1.5 text-[10px] text-brand-500 transition hover:bg-brand-500 hover:text-on-brand"
                    >
                      {chip.rotulo}
                      <span aria-hidden="true">×</span>
                      <span className="sr-only">remover filtro</span>
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={limpar}
                    className="label-caps px-2 py-1.5 text-[10px] text-ink-500 underline hover:text-ink-200"
                  >
                    limpar tudo
                  </button>
                </li>
              </ul>
            ) : (
              <span />
            )}

            <SortSelect value={filtros.sort} onChange={(sort) => aplicar({ sort })} />
          </div>

          <div className="mt-6">
            <MotoGrid
              motos={motos}
              isLoading={isLoading}
              error={error}
              onLimparFiltros={ativos > 0 ? limpar : undefined}
            />
          </div>

          {meta?.totalPages > 1 && (
            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              onChange={irParaPagina}
              className="mt-10 justify-center"
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** Busca por texto, com espera para não disparar uma requisição por tecla. */
function BuscaTextual({ valor, onChange }) {
  const [rascunho, setRascunho] = useState(valor);

  useEffect(() => setRascunho(valor), [valor]);

  useEffect(() => {
    if (rascunho === valor) return undefined;

    const id = setTimeout(() => onChange(rascunho), 400);
    return () => clearTimeout(id);
  }, [rascunho, valor, onChange]);

  return (
    <div>
      <label htmlFor="busca" className="label-caps text-[11px] text-ink-500">
        Buscar
      </label>
      <input
        id="busca"
        type="search"
        value={rascunho}
        onChange={(evento) => setRascunho(evento.target.value)}
        placeholder="marca, modelo…"
        className={`${inputClass} mt-2`}
      />
    </div>
  );
}
