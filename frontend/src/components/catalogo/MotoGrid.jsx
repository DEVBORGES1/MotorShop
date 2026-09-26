import { Alert } from '@/components/ui/Alert.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { EmptyState } from '@/components/ui/EmptyState.jsx';
import { MotoCardSkeleton } from '@/components/ui/Skeleton.jsx';
import { MotoCard } from '@/components/catalogo/MotoCard.jsx';
import { AvisoSimulacao } from '@/components/financiamento/AvisoSimulacao.jsx';
import { useStore } from '@/hooks/useStore.js';
import { parcelaEstimada } from '@/utils/simulador.js';

/**
 * Grade do catálogo com os três estados que a lista pode ter: carregando,
 * erro e vazio. Concentrá-los aqui evita que a home e o estoque tratem cada
 * um do seu jeito.
 */
const GRADE = {
  3: 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid gap-5 sm:grid-cols-2 lg:grid-cols-4',
};

export function MotoGrid({
  motos,
  isLoading,
  error,
  onLimparFiltros,
  quantidadeEsqueleto = 6,
  colunas = 3,
}) {
  const { store } = useStore();
  const grade = GRADE[colunas] ?? GRADE[3];

  if (isLoading) {
    return (
      <div role="status" aria-busy="true" aria-label="Carregando motos" className={grade}>
        {Array.from({ length: quantidadeEsqueleto }, (_, i) => (
          <MotoCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) return <Alert tone="error">{error.message}</Alert>;

  if (!motos?.length) {
    return (
      <EmptyState
        title="Nenhuma moto encontrada"
        description={
          onLimparFiltros
            ? 'Nenhuma moto do estoque atende a essa combinação de filtros.'
            : 'Ainda não há motos publicadas no estoque.'
        }
        action={
          onLimparFiltros && (
            <Button variant="secondary" onClick={onLimparFiltros}>
              Limpar filtros
            </Button>
          )
        }
      />
    );
  }

  // Os cards mostram parcela estimada; toda superfície de simulação leva o
  // aviso legal (R-07), então ele aparece uma vez, sob a grade.
  const comParcela = motos.some((moto) =>
    parcelaEstimada(moto.price, store.features, store.financing),
  );

  return (
    <>
      <div className={grade}>
        {motos.map((moto) => (
          <MotoCard key={moto.id} moto={moto} />
        ))}
      </div>
      {comParcela && (
        <AvisoSimulacao
          marcador="*"
          className="mt-5"
          detalhe="Parcela com a entrada mínima da loja."
        />
      )}
    </>
  );
}
