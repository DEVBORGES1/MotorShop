import { ApiStatusCard } from '@/components/ApiStatusCard.jsx';
import { useHealth } from '@/hooks/useHealth.js';

export function Home() {
  const { data, error, isLoading, refetch } = useHealth();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Fundação do projeto no ar</h1>
        <p className="mt-3 max-w-2xl text-ink-200">
          Frontend e backend estão configurados e se comunicando. O catálogo, a página da moto e o
          painel administrativo entram nas próximas fases.
        </p>
      </div>

      <ApiStatusCard data={data} error={error} isLoading={isLoading} onRetry={refetch} />
    </div>
  );
}
