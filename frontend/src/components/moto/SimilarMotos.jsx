import { MotoGrid } from '@/components/catalogo/MotoGrid.jsx';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import * as publicService from '@/services/publicService.js';

/**
 * Motos parecidas (mesma marca ou preço próximo). A API já exclui a própria
 * moto e as que não estão à venda.
 *
 * O bloco some se não houver similares ou se a busca falhar: é complemento da
 * página, e um erro aqui não pode competir com a moto que o visitante abriu.
 */
export function SimilarMotos({ slug }) {
  const { data, error, isLoading } = useAsyncData(
    () => publicService.motos.similares(slug),
    [slug],
  );

  if (error || (!isLoading && !data?.length)) return null;

  return (
    <section aria-labelledby="similares-titulo" className="mt-16">
      <h2 id="similares-titulo" className="text-xl font-extrabold tracking-tight">
        Motos similares
      </h2>
      <div className="mt-6">
        <MotoGrid motos={data} isLoading={isLoading} quantidadeEsqueleto={4} colunas={4} />
      </div>
    </section>
  );
}
