import { MOTO_STATUS } from '@motorshop/shared';
import { Link, useParams } from 'react-router-dom';

import { Breadcrumbs } from '@/components/layout/Breadcrumbs.jsx';
import { MotoFeatures } from '@/components/moto/MotoFeatures.jsx';
import { MotoGallery } from '@/components/moto/MotoGallery.jsx';
import { MotoSpecs } from '@/components/moto/MotoSpecs.jsx';
import { SimilarMotos } from '@/components/moto/SimilarMotos.jsx';
import { StatusBadge } from '@/components/moto/StatusBadge.jsx';
import { Alert } from '@/components/ui/Alert.jsx';
import { Badge } from '@/components/ui/Badge.jsx';
import { Button, buttonClass } from '@/components/ui/Button.jsx';
import { Skeleton } from '@/components/ui/Skeleton.jsx';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { useStore } from '@/hooks/useStore.js';
import * as publicService from '@/services/publicService.js';
import { formatarCilindrada, formatarKm, formatarPreco } from '@/utils/format.js';
import { imagensDaGaleria, nomeDaMoto } from '@/utils/imagem.js';
import { urlDaMoto } from '@/utils/moto.js';
import { linkWhatsApp, mensagemInteresse } from '@/utils/whatsapp.js';

/**
 * Página da moto — a que efetivamente vende.
 *
 * Moto vendida continua acessível (decisão A): selo "Vendida", sem preço (a
 * API já não o envia) e o convite muda para "me avise de uma parecida".
 */
export function MotoDetalhe() {
  const { slug } = useParams();
  const {
    data: moto,
    error,
    isLoading,
    refetch,
  } = useAsyncData(() => publicService.motos.getBySlug(slug), [slug]);

  if (isLoading) return <DetalheCarregando />;
  if (error?.status === 404) return <MotoNaoEncontrada />;
  if (error) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-16 sm:px-6">
        <Alert tone="error">{error.message}</Alert>
        <Button variant="secondary" onClick={refetch}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  // `key` zera o estado da galeria (foto atual, modal) ao trocar de moto por
  // um card de similares — sem isso, a foto 4 da anterior viraria índice inválido.
  return <Detalhe key={moto.id} moto={moto} />;
}

function Detalhe({ moto }) {
  const { store } = useStore();

  const nome = nomeDaMoto(moto);
  const vendida = moto.status === MOTO_STATUS.SOLD;
  const emOferta = !vendida && moto.onSale && moto.previousPrice > moto.price;

  const url = urlDaMoto(moto.slug, store.seo?.siteUrl || window.location.origin);
  const whatsapp = linkWhatsApp(store.contact?.whatsapp, mensagemInteresse(moto, url));
  const rotuloCta = vendida ? 'Avise-me de uma similar' : 'Tenho interesse';

  const resumo = [moto.year, formatarKm(moto.mileage), formatarCilindrada(moto.engineCapacity)]
    .filter((parte) => parte != null && parte !== '—')
    .join(' · ');

  const cta = (className = '') =>
    whatsapp ? (
      <a
        href={whatsapp}
        target="_blank"
        rel="noreferrer noopener"
        className={buttonClass({ size: 'lg', className })}
      >
        {rotuloCta}
        <span className="sr-only"> — {nome} pelo WhatsApp</span>
      </a>
    ) : (
      // Loja sem WhatsApp configurado: o caminho é a página de contato, nunca
      // um botão morto.
      <Link to="/contato" className={buttonClass({ size: 'lg', className })}>
        Fale com a loja
      </Link>
    );

  return (
    // Folga embaixo no celular: a barra fixa de preço cobriria o fim da página.
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-28 sm:px-6 lg:pb-10">
      <Breadcrumbs
        itens={[
          { label: 'Home', to: '/' },
          { label: 'Estoque', to: '/estoque' },
          { label: [nome, moto.year].filter(Boolean).join(' ') },
        ]}
      />

      {/* Celular: galeria → preço → ficha. Desktop: galeria e ficha à esquerda,
          preço num painel à direita que acompanha a rolagem. */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-x-10 lg:gap-y-12">
        <div className="lg:col-start-1 lg:row-start-1">
          <MotoGallery imagens={imagensDaGaleria(moto)} nome={nome} />
        </div>

        <aside className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge status={moto.status} />
            {emOferta && <Badge tone="brand">Oferta</Badge>}
          </div>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">{nome}</h1>
          {moto.version && <p className="mt-1 text-ink-400">{moto.version}</p>}
          {resumo && <p className="mt-3 text-sm text-ink-400">{resumo}</p>}

          <div className="mt-6 rounded-lg border border-ink-800 bg-surface p-5">
            {vendida ? (
              <>
                <p className="font-display text-xl font-extrabold text-ink-50">
                  Esta moto já foi vendida
                </p>
                <p className="mt-2 text-sm text-ink-400">
                  Chegam motos parecidas com frequência. Deixe seu contato e a loja avisa quando
                  surgir uma.
                </p>
              </>
            ) : (
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                {emOferta && (
                  <span className="text-sm text-ink-500 line-through">
                    <span className="sr-only">De </span>
                    {formatarPreco(moto.previousPrice)}
                  </span>
                )}
                <span className="font-display text-3xl font-extrabold text-brand-500">
                  {emOferta && <span className="sr-only">por </span>}
                  {formatarPreco(moto.price)}
                </span>
              </p>
            )}

            {cta('mt-5 w-full')}

            {vendida && (
              <Link
                to="/estoque"
                className={buttonClass({ variant: 'secondary', className: 'mt-3 w-full' })}
              >
                Ver motos disponíveis
              </Link>
            )}
          </div>
        </aside>

        <div className="mt-4 grid gap-12 lg:col-start-1 lg:row-start-2 lg:mt-0">
          <Secao titulo="Ficha técnica">
            <MotoSpecs moto={moto} />
          </Secao>

          {moto.description?.trim() && (
            <Secao titulo="Descrição">
              <p className="text-sm leading-relaxed whitespace-pre-line text-ink-200">
                {moto.description}
              </p>
            </Secao>
          )}

          {moto.features?.length > 0 && (
            <Secao titulo="Opcionais">
              <MotoFeatures features={moto.features} />
            </Secao>
          )}
        </div>
      </div>

      <SimilarMotos slug={moto.slug} />

      {/* Barra fixa no celular: preço e contato sempre ao alcance do polegar,
          em qualquer ponto da rolagem. No desktop o painel lateral já é fixo. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-800 bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-xs text-ink-400">{nome}</p>
            <p className="font-display text-lg font-extrabold text-brand-500">
              {vendida ? 'Vendida' : formatarPreco(moto.price)}
            </p>
          </div>
          {cta('shrink-0')}
        </div>
      </div>
    </div>
  );
}

function Secao({ titulo, children }) {
  return (
    <section>
      <h2 className="label-caps text-[11px] text-ink-400">{titulo}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Mesma geometria da página pronta: nada pula quando os dados chegam. */
function DetalheCarregando() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Carregando moto"
      className="mx-auto min-h-dvh max-w-7xl px-4 pt-6 pb-10 sm:px-6"
    >
      <Skeleton className="h-3 w-48" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
        <Skeleton className="aspect-4/3 rounded-lg" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="mt-6 h-40 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * 404 da moto. Mais útil que o 404 genérico: quem chega por um link antigo do
 * WhatsApp quer ver motos, não voltar à home.
 */
function MotoNaoEncontrada() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <p className="font-display text-6xl font-extrabold text-brand-500">404</p>
      <h1 className="mt-4 text-2xl font-extrabold">Moto não encontrada</h1>
      <p className="mt-3 text-ink-400">
        Este anúncio não existe mais ou o endereço está incorreto. O estoque atual está a um clique.
      </p>
      <Link to="/estoque" className={buttonClass({ size: 'lg', className: 'mt-8' })}>
        Ver estoque
      </Link>
    </div>
  );
}
