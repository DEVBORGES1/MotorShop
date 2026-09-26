import { MOTO_STATUS } from '@motorshop/shared';
import { Link } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert.jsx';
import { Badge } from '@/components/ui/Badge.jsx';
import { buttonClass } from '@/components/ui/Button.jsx';
import { formatarCilindrada, formatarKm, formatarPreco } from '@/utils/format.js';
import { atributosDeImagem, imagemPrincipal, nomeDaMoto } from '@/utils/imagem.js';
import { caminhoDaMoto } from '@/utils/moto.js';

/**
 * Destaques da loja em cartões grandes, com a foto ocupando o cartão todo.
 * Duas colunas; com número ímpar, o último atravessa a linha inteira, para não
 * sobrar um buraco ao lado.
 *
 * Não desliza: as motos ficam todas à vista, uma ao lado da outra.
 */
export function DestaquesGrandes({ motos, isLoading, error }) {
  if (error) return <Alert tone="error">{error.message}</Alert>;

  if (isLoading) {
    return (
      <div role="status" aria-busy="true" aria-label="Carregando destaques" className={GRADE}>
        {[0, 1].map((i) => (
          <div key={i} className="aspect-16/10 animate-pulse rounded-lg bg-surface-2" />
        ))}
      </div>
    );
  }

  if (!motos?.length) return null;

  return (
    <div className={GRADE}>
      {motos.map((moto, indice) => (
        <DestaqueGrande
          key={moto.id}
          moto={moto}
          largo={motos.length % 2 === 1 && indice === motos.length - 1 && motos.length > 1}
        />
      ))}
    </div>
  );
}

const GRADE = 'grid gap-5 md:grid-cols-2';

function DestaqueGrande({ moto, largo }) {
  const foto = imagemPrincipal(moto);
  const atributos = foto ? atributosDeImagem(foto, 'galeria') : null;
  const reservada = moto.status === MOTO_STATUS.RESERVED;
  const emOferta = moto.onSale && moto.previousPrice > moto.price;
  const nome = nomeDaMoto(moto);
  const detalhes = [
    moto.year,
    moto.mileage == null ? null : formatarKm(moto.mileage),
    moto.engineCapacity == null ? null : formatarCilindrada(moto.engineCapacity),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <article
      className={`group relative isolate overflow-hidden rounded-lg border border-ink-800 bg-surface-2 ${
        largo ? 'md:col-span-2 md:aspect-21/9' : ''
      } aspect-4/3 sm:aspect-16/10`}
    >
      {atributos && (
        <img
          {...atributos}
          sizes={
            atributos.srcSet ? (largo ? '100vw' : '(min-width: 768px) 50vw, 100vw') : undefined
          }
          alt=""
          loading="lazy"
          decoding="async"
          className="zoom-foto absolute inset-0 -z-10 h-full w-full object-cover"
        />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-t from-ink-900/95 via-ink-900/25 to-transparent"
      />

      {(reservada || emOferta) && (
        <div className="absolute top-4 left-4 flex gap-1.5">
          {reservada && <Badge tone="warn">Reservada</Badge>}
          {emOferta && <Badge tone="brand">Oferta</Badge>}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-5 sm:p-6">
        <div>
          <h3 className="text-xl font-extrabold text-ink-50 sm:text-2xl">
            {/* O link mora no título; o ::after o estica sobre o cartão todo. */}
            <Link
              to={caminhoDaMoto(moto.slug)}
              className="after:absolute after:inset-0 after:content-[''] hover:text-brand-500"
            >
              {nome}
            </Link>
          </h3>
          {detalhes && <p className="mt-1 text-sm text-ink-200">{detalhes}</p>}
          <p className="mt-2 flex flex-wrap items-baseline gap-2">
            {emOferta && (
              <span className="text-sm text-ink-400 line-through">
                {formatarPreco(moto.previousPrice)}
              </span>
            )}
            <span className="font-display text-3xl font-extrabold text-brand-500">
              {formatarPreco(moto.price)}
            </span>
          </p>
        </div>
        <span
          aria-hidden="true"
          className={buttonClass({
            variant: 'secondary',
            className: 'bg-ink-900/70 backdrop-blur',
          })}
        >
          Ver moto
        </span>
      </div>
    </article>
  );
}
