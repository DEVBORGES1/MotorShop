import { MOTO_STATUS_LABEL } from '@motorshop/shared';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { celulaClass, DataTable } from '@/components/admin/DataTable.jsx';
import { PageHeader } from '@/components/admin/PageHeader.jsx';
import { Alert } from '@/components/ui/Alert.jsx';
import { buttonClass } from '@/components/ui/Button.jsx';
import { inputClass, selectClass } from '@/components/ui/Field.jsx';
import { Pagination } from '@/components/ui/Pagination.jsx';
import { Skeleton } from '@/components/ui/Skeleton.jsx';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { motosAdmin } from '@/services/adminService.js';
import { formatarKm, formatarPreco } from '@/utils/format.js';

const CORES_STATUS = {
  AVAILABLE: 'text-ok',
  RESERVED: 'text-warn',
  SOLD: 'text-ink-400',
  INACTIVE: 'text-danger',
};

const ABAS = [['', 'Todas'], ...Object.entries(MOTO_STATUS_LABEL)];

const COLUNAS = [
  { titulo: 'Moto' },
  { titulo: 'Ano' },
  { titulo: 'Km' },
  { titulo: 'Preço' },
  { titulo: 'Status' },
  { titulo: '', alinhar: 'direita' },
];

export function MotosList() {
  // Filtros na URL, como no catálogo público: o atalho do painel pode apontar
  // para /admin/motos?status=RESERVED, e recarregar não perde o filtro.
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? '';
  const busca = searchParams.get('q') ?? '';
  const pagina = Number.parseInt(searchParams.get('page') ?? '1', 10) || 1;

  const [erroAcao, setErroAcao] = useState(null);

  const aplicar = (mudancas) => {
    const proximo = new URLSearchParams(searchParams);

    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor) proximo.set(chave, String(valor));
      else proximo.delete(chave);
    }

    // Qualquer filtro novo recomeça na primeira página.
    if (!('page' in mudancas)) proximo.delete('page');

    setSearchParams(proximo, { replace: true });
  };

  const { data, error, isLoading, refetch } = useAsyncData(
    () =>
      motosAdmin.list({
        page: pagina,
        limit: 20,
        ...(status && { status }),
        ...(busca.length >= 2 && { q: busca }),
      }),
    [status, busca, pagina],
  );

  const alterarStatus = async (id, novoStatus) => {
    setErroAcao(null);
    try {
      await motosAdmin.changeStatus(id, novoStatus);
      refetch();
    } catch (causa) {
      setErroAcao(causa.message);
    }
  };

  const motos = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div>
      <PageHeader
        titulo="Motos"
        descricao={meta ? `${meta.total} cadastrada${meta.total === 1 ? '' : 's'}` : undefined}
      >
        <Link to="/admin/motos/nova" className={buttonClass()}>
          + Nova moto
        </Link>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2 border-b border-ink-800 pb-4">
        {ABAS.map(([valor, rotulo]) => (
          <button
            key={valor || 'todas'}
            type="button"
            onClick={() => aplicar({ status: valor })}
            aria-pressed={status === valor}
            className={`label-caps rounded-sm px-3 py-2 text-[10px] transition ${
              status === valor
                ? 'bg-brand-500 text-on-brand'
                : 'border border-ink-800 text-ink-400 hover:border-ink-600 hover:text-ink-100'
            }`}
          >
            {rotulo}
          </button>
        ))}

        <BuscaAdmin valor={busca} onChange={(q) => aplicar({ q })} />
      </div>

      <div className="mt-5">
        <Alert tone="error">{error?.message ?? erroAcao}</Alert>
      </div>

      {isLoading ? (
        <Skeleton className="mt-5 h-64" />
      ) : (
        <div className="mt-5">
          <DataTable colunas={COLUNAS} vazio="Nenhuma moto encontrada.">
            {motos.map((moto) => (
              <tr key={moto.id} className="transition hover:bg-surface-2">
                <td className={celulaClass}>
                  <span className="font-semibold text-ink-50">
                    {moto.brand?.name} {moto.model}
                  </span>
                  {moto.version && <span className="text-ink-400"> {moto.version}</span>}
                  <span className="block text-xs text-ink-500">/{moto.slug}</span>
                </td>
                <td className={`${celulaClass} text-ink-200`}>{moto.year}</td>
                <td className={`${celulaClass} text-ink-200`}>{formatarKm(moto.mileage)}</td>
                <td className={`${celulaClass} font-semibold text-ink-50`}>
                  {formatarPreco(moto.price)}
                </td>
                <td className={celulaClass}>
                  <select
                    value={moto.status}
                    onChange={(evento) => alterarStatus(moto.id, evento.target.value)}
                    aria-label={`Status de ${moto.model}`}
                    className={`${selectClass} w-auto py-1.5 pl-2.5 text-xs font-semibold ${CORES_STATUS[moto.status]}`}
                  >
                    {Object.entries(MOTO_STATUS_LABEL).map(([valor, rotulo]) => (
                      <option key={valor} value={valor} className="bg-ink-900 text-ink-50">
                        {rotulo}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={`${celulaClass} text-right`}>
                  <Link
                    to={`/admin/motos/${moto.id}/editar`}
                    className="label-caps text-[10px] text-brand-500 hover:underline"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </DataTable>
        </div>
      )}

      {meta?.totalPages > 1 && (
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          onChange={(page) => aplicar({ page })}
          className="mt-8"
        />
      )}
    </div>
  );
}

/** Busca do painel, com espera para não disparar uma consulta por tecla. */
function BuscaAdmin({ valor, onChange }) {
  const [rascunho, setRascunho] = useState(valor);

  useEffect(() => setRascunho(valor), [valor]);

  useEffect(() => {
    if (rascunho === valor) return undefined;

    const id = setTimeout(() => onChange(rascunho), 400);
    return () => clearTimeout(id);
  }, [rascunho, valor, onChange]);

  return (
    <input
      type="search"
      value={rascunho}
      onChange={(evento) => setRascunho(evento.target.value)}
      placeholder="Buscar por modelo…"
      aria-label="Buscar motos"
      className={`${inputClass} ml-auto max-w-xs py-2`}
    />
  );
}
