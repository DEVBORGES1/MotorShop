import { MOTO_STATUS } from '@motorshop/shared';

import { Badge } from '@/components/ui/Badge.jsx';
import { buttonClass } from '@/components/ui/Button.jsx';
import { useStore } from '@/hooks/useStore.js';
import { formatarCilindrada, formatarKm, formatarPreco } from '@/utils/format.js';
import { imagemPrincipal, nomeDaMoto } from '@/utils/imagem.js';
import { linkWhatsApp, mensagemInteresse } from '@/utils/whatsapp.js';

/**
 * Card da moto no catálogo.
 *
 * Sem link para a página da moto: ela é a FASE 5 e a rota ainda não existe —
 * card que leva a 404 é pior que card sem link. O contato por WhatsApp já
 * funciona hoje, então é ele que fecha o card; o "ver detalhes" entra junto
 * com a página.
 */
export function MotoCard({ moto }) {
  const { store } = useStore();
  const foto = imagemPrincipal(moto);
  const nome = nomeDaMoto(moto);
  const reservada = moto.status === MOTO_STATUS.RESERVED;
  const emOferta = moto.onSale && moto.previousPrice > moto.price;

  const whatsapp = linkWhatsApp(store.contact?.whatsapp, mensagemInteresse(moto));

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-ink-800 bg-surface transition hover:border-ink-600">
      <div className="relative aspect-4/3 overflow-hidden bg-surface-2">
        {foto ? (
          <img
            src={foto.url}
            alt={foto.alt}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-ink-600">
            sem foto
          </div>
        )}

        {(reservada || emOferta || moto.featured) && (
          <div className="absolute top-2.5 left-2.5 flex gap-1.5">
            {reservada && <Badge tone="warn">Reservada</Badge>}
            {emOferta && <Badge tone="brand">Oferta</Badge>}
            {!emOferta && moto.featured && <Badge tone="neutral">Destaque</Badge>}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base font-bold text-ink-50">{nome}</h3>
        {moto.version && <p className="mt-0.5 text-sm text-ink-400">{moto.version}</p>}

        <p className="mt-3 text-xs text-ink-400">
          {[moto.year, formatarKm(moto.mileage), formatarCilindrada(moto.engineCapacity)]
            .filter(Boolean)
            .join(' · ')}
        </p>

        <p className="mt-4 flex flex-wrap items-baseline gap-2">
          {emOferta && (
            <span className="text-sm text-ink-500 line-through">
              {formatarPreco(moto.previousPrice)}
            </span>
          )}
          <span className="font-display text-xl font-extrabold text-brand-500">
            {formatarPreco(moto.price)}
          </span>
        </p>

        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer noopener"
            className={buttonClass({ size: 'sm', className: 'mt-4 w-full' })}
          >
            <span className="sr-only">{nome} — </span>Tenho interesse
          </a>
        )}
      </div>
    </article>
  );
}
