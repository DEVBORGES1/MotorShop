/**
 * Exibe o resultado do health check. Componente puramente de apresentação:
 * recebe estado pronto e não conhece a API.
 */
export function ApiStatusCard({ data, error, isLoading, onRetry }) {
  return (
    <section className="rounded-xl border border-ink-800 bg-ink-800/40 p-6">
      <h2 className="text-sm font-semibold tracking-wide text-ink-400 uppercase">
        Comunicação com a API
      </h2>

      {isLoading && <p className="mt-3 text-ink-200">Consultando a API…</p>}

      {!isLoading && error && (
        <div className="mt-3">
          <p className="font-medium text-danger">{error.message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-ink-900 transition hover:bg-brand-600"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!isLoading && !error && data && (
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-ink-400">Status:</dt>
            <dd className="font-semibold text-ok">{data.status}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-400">Banco de dados:</dt>
            <dd className="text-ink-200">{data.database?.status}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-400">Uptime:</dt>
            <dd className="text-ink-200">{data.uptime}s</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
