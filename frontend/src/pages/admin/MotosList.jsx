import { MOTO_STATUS_LABEL } from '@motorshop/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert.jsx';
import { Button, buttonClass } from '@/components/ui/Button.jsx';
import { inputClass } from '@/components/ui/Field.jsx';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { motosAdmin } from '@/services/adminService.js';
import { formatarKm, formatarPreco } from '@/utils/format.js';

const CORES_STATUS = {
  AVAILABLE: 'text-ok',
  RESERVED: 'text-warn',
  SOLD: 'text-ink-400',
  INACTIVE: 'text-danger',
};

export function MotosList() {
  const [status, setStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [erroAcao, setErroAcao] = useState(null);

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Motos</h1>
        <Link to="/admin/motos/nova" className={buttonClass()}>
          Cadastrar moto
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setPagina(1);
          }}
          placeholder="Buscar por modelo…"
          aria-label="Buscar motos"
          className={`${inputClass} max-w-xs`}
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPagina(1);
          }}
          aria-label="Filtrar por status"
          className={`${inputClass} max-w-[12rem]`}
        >
          <option value="">Todos os status</option>
          {Object.entries(MOTO_STATUS_LABEL).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </div>

      <Alert tone="error">{error?.message ?? erroAcao}</Alert>

      {isLoading ? (
        <p className="text-ink-400">Carregando…</p>
      ) : motos.length === 0 ? (
        <p className="rounded-xl border border-ink-800 p-8 text-center text-ink-400">
          Nenhuma moto encontrada.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink-800">
          <table className="w-full text-sm">
            <thead className="bg-ink-800/50 text-left text-xs tracking-wide text-ink-400 uppercase">
              <tr>
                <th className="px-4 py-3">Moto</th>
                <th className="px-4 py-3">Ano</th>
                <th className="px-4 py-3">Km</th>
                <th className="px-4 py-3">Preço</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {motos.map((moto) => (
                <tr key={moto.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium">
                      {moto.brand?.name} {moto.model}
                    </span>
                    {moto.version && <span className="text-ink-400"> {moto.version}</span>}
                  </td>
                  <td className="px-4 py-3 text-ink-200">{moto.year}</td>
                  <td className="px-4 py-3 text-ink-200">{formatarKm(moto.mileage)}</td>
                  <td className="px-4 py-3 font-medium">{formatarPreco(moto.price)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={moto.status}
                      onChange={(e) => alterarStatus(moto.id, e.target.value)}
                      aria-label={`Status de ${moto.model}`}
                      className={`bg-transparent text-sm font-medium outline-none ${CORES_STATUS[moto.status]}`}
                    >
                      {Object.entries(MOTO_STATUS_LABEL).map(([valor, rotulo]) => (
                        <option key={valor} value={valor} className="bg-ink-900 text-ink-50">
                          {rotulo}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/motos/${moto.id}/editar`}
                      className="text-brand-500 hover:underline"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-400">
            Página {meta.page} de {meta.totalPages} · {meta.total} moto(s)
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={meta.page <= 1}
              onClick={() => setPagina((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setPagina((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
