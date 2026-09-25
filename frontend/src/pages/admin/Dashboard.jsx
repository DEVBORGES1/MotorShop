import { Link } from 'react-router-dom';

import { PageHeader } from '@/components/admin/PageHeader.jsx';
import { StatCard } from '@/components/admin/StatCard.jsx';
import { Alert } from '@/components/ui/Alert.jsx';
import { buttonClass } from '@/components/ui/Button.jsx';
import { Card, CardTitle } from '@/components/ui/Card.jsx';
import { Skeleton } from '@/components/ui/Skeleton.jsx';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { leadsAdmin, marcasAdmin, motosAdmin } from '@/services/adminService.js';

const STATUS_EXIBIDOS = [
  ['AVAILABLE', 'Disponíveis', 'bg-ok'],
  ['RESERVED', 'Reservadas', 'bg-warn'],
  ['SOLD', 'Vendidas', 'bg-ink-400'],
  ['INACTIVE', 'Inativas', 'bg-ink-600'],
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

    const [marcas, leadsNovos] = await Promise.all([
      marcasAdmin.list(),
      leadsAdmin.list({ status: 'NEW', limit: 1 }).then((envelope) => envelope.meta.total),
    ]);

    return {
      porStatus: Object.fromEntries(STATUS_EXIBIDOS.map(([status], i) => [status, contagens[i]])),
      marcas: marcas.length,
      leadsNovos,
    };
  });

  const total = data ? Object.values(data.porStatus).reduce((soma, n) => soma + n, 0) : 0;

  return (
    <div>
      <PageHeader titulo="Painel" descricao="Visão geral do estoque">
        <Link to="/admin/motos/nova" className={buttonClass()}>
          + Nova moto
        </Link>
      </PageHeader>

      <Alert tone="error">{error?.message}</Alert>

      {isLoading ? (
        <div role="status" aria-busy="true" aria-label="Carregando painel" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STATUS_EXIBIDOS.map(([status]) => (
              <Skeleton key={status} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-52" />
        </div>
      ) : (
        data && (
          <div className="space-y-4">
            {/* Lead parado é venda perdida: quando há novos, é a primeira coisa
                que o painel mostra. */}
            {data.leadsNovos > 0 && (
              <Link
                to="/admin/leads?status=NEW"
                className="flex items-center justify-between gap-4 rounded-lg border border-brand-500/40 bg-brand-500/10 px-5 py-4 transition hover:border-brand-500"
              >
                <span className="text-sm text-ink-50">
                  <strong className="font-display text-lg">{data.leadsNovos}</strong>{' '}
                  {data.leadsNovos === 1 ? 'lead novo aguardando' : 'leads novos aguardando'}{' '}
                  resposta
                </span>
                <span className="label-caps text-[11px] text-brand-500">Ver leads →</span>
              </Link>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STATUS_EXIBIDOS.map(([status, rotulo]) => (
                <StatCard
                  key={status}
                  rotulo={rotulo}
                  valor={data.porStatus[status]}
                  to={`/admin/motos?status=${status}`}
                />
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardTitle>Estoque por status</CardTitle>

                {total === 0 ? (
                  <p className="mt-4 text-sm text-ink-400">Nenhuma moto cadastrada ainda.</p>
                ) : (
                  <div className="mt-5 space-y-4">
                    {STATUS_EXIBIDOS.map(([status, rotulo, cor]) => (
                      <div key={status}>
                        <div className="flex justify-between text-sm">
                          <span className="text-ink-400">{rotulo}</span>
                          <span className="font-semibold text-ink-50">
                            {data.porStatus[status]}
                          </span>
                        </div>
                        {/* A barra é decorativa: o número ao lado já informa,
                            e repeti-lo em aria seria ruído no leitor de tela. */}
                        <div
                          aria-hidden="true"
                          className="mt-2 h-1.5 overflow-hidden rounded-sm bg-ink-800"
                        >
                          <div
                            className={`h-full ${cor}`}
                            style={{ width: `${(data.porStatus[status] / total) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <CardTitle>Atalhos</CardTitle>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link to="/admin/motos" className={buttonClass({ variant: 'secondary' })}>
                    {total} moto{total === 1 ? '' : 's'} no total
                  </Link>
                  <Link to="/admin/marcas" className={buttonClass({ variant: 'secondary' })}>
                    {data.marcas} marca{data.marcas === 1 ? '' : 's'}
                  </Link>
                  <Link to="/admin/configuracoes" className={buttonClass({ variant: 'secondary' })}>
                    Configurações da loja
                  </Link>
                  <Link to="/" className={buttonClass({ variant: 'secondary' })}>
                    Ver o site
                  </Link>
                </div>

                <p className="mt-5 text-xs text-ink-500">
                  O envio de fotos e o acompanhamento de leads entram nas próximas fases.
                </p>
              </Card>
            </div>
          </div>
        )
      )}
    </div>
  );
}
