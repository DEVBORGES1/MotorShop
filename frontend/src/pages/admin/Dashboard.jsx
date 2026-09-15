import { Link } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert.jsx';
import { buttonClass } from '@/components/ui/Button.jsx';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { marcasAdmin, motosAdmin } from '@/services/adminService.js';

const STATUS_EXIBIDOS = [
  ['AVAILABLE', 'Disponíveis'],
  ['RESERVED', 'Reservadas'],
  ['SOLD', 'Vendidas'],
  ['INACTIVE', 'Inativas'],
];

export function Dashboard() {
  const { data, error, isLoading } = useAsyncData(async () => {
    // Uma chamada por status, com limite 1: o servidor devolve o total em
    // `meta`, então não é preciso baixar as motos para contá-las.
    const contagens = await Promise.all(
      STATUS_EXIBIDOS.map(([status]) =>
        motosAdmin.list({ status, limit: 1 }).then((envelope) => envelope.meta.total),
      ),
    );

    return {
      porStatus: Object.fromEntries(STATUS_EXIBIDOS.map(([status], i) => [status, contagens[i]])),
      marcas: (await marcasAdmin.list()).length,
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Painel</h1>

      <Alert tone="error">{error?.message}</Alert>

      {isLoading ? (
        <p className="text-ink-400">Carregando…</p>
      ) : (
        data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STATUS_EXIBIDOS.map(([status, rotulo]) => (
                <div key={status} className="rounded-xl border border-ink-800 bg-ink-800/30 p-5">
                  <p className="text-xs tracking-wide text-ink-400 uppercase">{rotulo}</p>
                  <p className="mt-2 text-3xl font-bold">{data.porStatus[status]}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link to="/admin/motos/nova" className={buttonClass()}>
                Cadastrar moto
              </Link>
              <Link to="/admin/marcas" className={buttonClass({ variant: 'secondary' })}>
                {data.marcas} marca(s) cadastrada(s)
              </Link>
            </div>
          </>
        )
      )}
    </div>
  );
}
