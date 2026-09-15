/**
 * Espaço reservado durante o carregamento.
 *
 * `aria-hidden` de propósito: quem usa leitor de tela não deve ouvir uma
 * lista de caixas vazias. O anúncio do carregamento é responsabilidade da
 * região que contém o skeleton (`aria-busy` / `role="status"`).
 */
export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-sm bg-ink-800 ${className}`} />;
}

/** Skeleton no formato de um card de moto — foto, título, duas linhas. */
export function MotoCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-ink-800 bg-surface">
      <Skeleton className="aspect-4/3 rounded-none" />
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-2.5 w-1/2" />
        <Skeleton className="h-5 w-1/3" />
      </div>
    </div>
  );
}
