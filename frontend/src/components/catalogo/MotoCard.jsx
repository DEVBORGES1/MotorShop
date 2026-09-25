import { MOTO_STATUS } from '@motorshop/shared';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge.jsx';
import { buttonClass } from '@/components/ui/Button.jsx';
import { useStore } from '@/hooks/useStore.js';
import { formatarCilindrada, formatarKm, formatarPreco } from '@/utils/format.js';
import { atributosDeImagem, imagemPrincipal, nomeDaMoto } from '@/utils/imagem.js';
import { caminhoDaMoto, urlDaMoto } from '@/utils/moto.js';
import { carregarMotoDetalhe } from '@/routes/carregadores.js';
import { linkWhatsApp, mensagemInteresse } from '@/utils/whatsapp.js';

/**
 * Card da moto no catálogo.
 *
 * O card inteiro leva à página da moto: o link fica no título (é o que o leitor
 * de tela anuncia) e um `::after` o estica sobre o card. O botão de WhatsApp
 * fica acima dessa camada (`relative z-10`) e continua clicável — sem aninhar
 * um link dentro do outro, que é HTML inválido.
 */
export function MotoCard({ moto }) {
  const { store } = useStore();
  const foto = imagemPrincipal(moto);
  const nome = nomeDaMoto(moto);
  const reservada = moto.status === MOTO_STATUS.RESERVED;
  const emOferta = moto.onSale && moto.previousPrice > moto.price;

  const url = urlDaMoto(moto.slug, store.seo?.siteUrl || window.location.origin);
  const whatsapp = linkWhatsApp(store.contact?.whatsapp, mensagemInteresse(moto, url));

  return (
    <article className="relative flex flex-col overflow-hidden rounded-lg border border-ink-800 bg-surface transition hover:border-ink-600">
      <div className="relative aspect-4/3 overflow-hidden bg-surface-2">
        {foto ? (
          <img
            {...atributosDeImagem(foto, 'card')}
            alt={foto.alt}
            loading="lazy"
            decoding="async"
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
        <h3 className="text-base font-bold text-ink-50">
          <Link
            to={caminhoDaMoto(moto.slug)}
            // Intenção de clique (mouse em cima, foco, toque): baixa o código da
            // página da moto antes do clique, que então abre sem espera.
            onMouseEnter={carregarMotoDetalhe}
            onFocus={carregarMotoDetalhe}
            onTouchStart={carregarMotoDetalhe}
            className="after:absolute after:inset-0 after:content-[''] hover:text-brand-500"
          >
            {nome}
          </Link>
        </h3>
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
            className={buttonClass({ size: 'sm', className: 'relative z-10 mt-4 w-full' })}
          >
            <span className="sr-only">{nome} — </span>Tenho interesse
          </a>
        )}
      </div>
    </article>
  );
}
