import { LEAD_STATUS, LEAD_STATUS_LABEL, LEAD_TYPE, LEAD_TYPE_LABEL } from '@motorshop/shared';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { celulaClass, DataTable } from '@/components/admin/DataTable.jsx';
import { LeadDetalhe } from '@/components/admin/LeadDetalhe.jsx';
import { PageHeader } from '@/components/admin/PageHeader.jsx';
import { Alert } from '@/components/ui/Alert.jsx';
import { Badge } from '@/components/ui/Badge.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { inputClass, selectClass } from '@/components/ui/Field.jsx';
import { Modal } from '@/components/ui/Modal.jsx';
import { Pagination } from '@/components/ui/Pagination.jsx';
import { Skeleton } from '@/components/ui/Skeleton.jsx';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { leadsAdmin } from '@/services/adminService.js';
import { formatarDataHora } from '@/utils/format.js';
import { periodoParaApi } from '@/utils/periodo.js';

const TOM_STATUS = {
  [LEAD_STATUS.NEW]: 'brand',
  [LEAD_STATUS.IN_PROGRESS]: 'warn',
  [LEAD_STATUS.WON]: 'ok',
  [LEAD_STATUS.LOST]: 'outline',
};

const COLUNAS = [
  { titulo: 'Recebido' },
  { titulo: 'Nome' },
  { titulo: 'Tipo' },
  { titulo: 'Sobre' },
  { titulo: 'Status' },
];

/** Linha curta que diz do que se trata o lead, sem abrir o detalhe. */
function assunto(lead) {
  if (lead.moto?.model) {
    return [lead.moto.brand?.name, lead.moto.model, lead.moto.year].filter(Boolean).join(' ');
  }
  if (lead.type === LEAD_TYPE.SELL_MOTO && lead.data) {
    return [lead.data.brand, lead.data.model, lead.data.year].filter(Boolean).join(' ');
  }
  if (lead.message)
    return lead.message.length > 60 ? `${lead.message.slice(0, 60)}…` : lead.message;
  return '—';
}

/**
 * Leads — onde o contato recebido pelo site não se perde.
 *
 * Filtros na URL, como na lista de motos: o atalho do painel pode apontar para
 * /admin/leads?status=NEW, e recarregar não perde o filtro.
 */
export function Leads() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tipo = searchParams.get('tipo') ?? '';
  const status = searchParams.get('status') ?? '';
  const de = searchParams.get('de') ?? '';
  const ate = searchParams.get('ate') ?? '';
  const pagina = Number.parseInt(searchParams.get('page') ?? '1', 10) || 1;

  const [abertoId, setAbertoId] = useState(null);

  const aplicar = (mudancas) => {
    const proximo = new URLSearchParams(searchParams);
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor) proximo.set(chave, String(valor));
      else proximo.delete(chave);
    }
    if (!('page' in mudancas)) proximo.delete('page');
    setSearchParams(proximo, { replace: true });
  };

  const { data, error, isLoading, setData } = useAsyncData(
    () =>
      leadsAdmin.list({
        page: pagina,
        limit: 20,
        ...(tipo && { tipo }),
        ...(status && { status }),
        ...periodoParaApi(de, ate),
      }),
    [tipo, status, de, ate, pagina],
  );

  const leads = data?.data ?? [];
  const meta = data?.meta;
  const aberto = leads.find((lead) => lead.id === abertoId);
  const filtrando = Boolean(tipo || status || de || ate);

  // Atualiza a linha na lista sem recarregar: mudar o status de um lead não
  // pode jogar a pessoa de volta ao topo nem fechar o detalhe.
  const substituir = (atualizado) =>
    setData((atual) => ({
      ...atual,
      data: atual.data.map((lead) => (lead.id === atualizado.id ? atualizado : lead)),
    }));

  const remover = (id) => {
    setAbertoId(null);
    setData((atual) => ({
      ...atual,
      data: atual.data.filter((lead) => lead.id !== id),
      meta: { ...atual.meta, total: atual.meta.total - 1 },
    }));
  };

  return (
    <div>
      <PageHeader
        titulo="Leads"
        descricao={
          meta ? `${meta.total} ${meta.total === 1 ? 'contato' : 'contatos'}` : 'Contatos do site'
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
        <Filtro rotulo="Tipo">
          <select
            value={tipo}
            onChange={(evento) => aplicar({ tipo: evento.target.value })}
            className={selectClass}
          >
            <option value="">Todos os tipos</option>
            {Object.entries(LEAD_TYPE_LABEL).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </Filtro>
        <Filtro rotulo="Status">
          <select
            value={status}
            onChange={(evento) => aplicar({ status: evento.target.value })}
            className={selectClass}
          >
            <option value="">Todos os status</option>
            {Object.entries(LEAD_STATUS_LABEL).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </Filtro>
        <Filtro rotulo="De">
          <input
            type="date"
            value={de}
            max={ate || undefined}
            onChange={(evento) => aplicar({ de: evento.target.value })}
            className={`${inputClass} [color-scheme:dark]`}
          />
        </Filtro>
        <Filtro rotulo="Até">
          <input
            type="date"
            value={ate}
            min={de || undefined}
            onChange={(evento) => aplicar({ ate: evento.target.value })}
            className={`${inputClass} [color-scheme:dark]`}
          />
        </Filtro>
        {filtrando && (
          <Button
            variant="ghost"
            className="self-end"
            onClick={() => aplicar({ tipo: '', status: '', de: '', ate: '' })}
          >
            Limpar
          </Button>
        )}
      </div>

      <Alert tone="error">{error?.message}</Alert>

      {isLoading ? (
        <Skeleton className="h-80" />
      ) : (
        <DataTable
          colunas={COLUNAS}
          vazio={
            filtrando
              ? 'Nenhum lead com esses filtros.'
              : 'Nenhum lead ainda. Os contatos enviados pelo site aparecem aqui.'
          }
        >
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-surface-2">
              <td className={`${celulaClass} whitespace-nowrap text-ink-400`}>
                {formatarDataHora(lead.createdAt)}
              </td>
              <td className={celulaClass}>
                <button
                  type="button"
                  onClick={() => setAbertoId(lead.id)}
                  className="text-left font-semibold text-ink-50 hover:text-brand-500"
                >
                  {lead.name}
                </button>
              </td>
              <td className={`${celulaClass} text-ink-400`}>{LEAD_TYPE_LABEL[lead.type]}</td>
              <td className={`${celulaClass} text-ink-200`}>{assunto(lead)}</td>
              <td className={celulaClass}>
                <Badge tone={TOM_STATUS[lead.status]}>{LEAD_STATUS_LABEL[lead.status]}</Badge>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      {meta && (
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          onChange={(page) => aplicar({ page })}
          className="mt-6"
        />
      )}

      <Modal
        aberto={Boolean(aberto)}
        onClose={() => setAbertoId(null)}
        rotulo={aberto ? `Lead de ${aberto.name}` : 'Lead'}
        className="my-0 mr-0 ml-auto h-dvh max-h-none w-[min(30rem,100vw)] overflow-y-auto border-l border-ink-800 bg-surface p-0 text-ink-200"
      >
        {aberto && (
          <>
            <div className="sticky top-0 z-10 flex justify-end border-b border-ink-800 bg-surface px-3 py-2">
              <button
                type="button"
                onClick={() => setAbertoId(null)}
                className="label-caps rounded-md px-3 py-2 text-[11px] text-ink-400 hover:text-ink-50"
              >
                Fechar
              </button>
            </div>
            <LeadDetalhe lead={aberto} onAtualizado={substituir} onExcluido={remover} />
          </>
        )}
      </Modal>
    </div>
  );
}

function Filtro({ rotulo, children }) {
  return (
    <label className="block">
      <span className="label-caps mb-1.5 block text-[10px] text-ink-500">{rotulo}</span>
      {children}
    </label>
  );
}
