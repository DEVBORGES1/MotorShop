import { dealerJsonLd, shareImageUrl } from '@motorshop/shared';
import { Link } from 'react-router-dom';

import { MotoGrid } from '@/components/catalogo/MotoGrid.jsx';
import { BuscaRapida } from '@/components/home/BuscaRapida.jsx';
import { FaixaMarcas } from '@/components/home/FaixaMarcas.jsx';
import { FaixaNumeros } from '@/components/home/FaixaNumeros.jsx';
import { motosParaCarrossel } from '@/components/home/CarrosselDestaques.jsx';
import { Hero } from '@/components/home/Hero.jsx';
import { buttonClass } from '@/components/ui/Button.jsx';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { useBaseDoSite } from '@/contexts/DadosIniciaisContext.jsx';
import { usePaginaSeo } from '@/hooks/useSeo.js';
import { useStore } from '@/hooks/useStore.js';
import * as publicService from '@/services/publicService.js';
import { linkWhatsApp } from '@/utils/whatsapp.js';

/** Seção com título e link opcional para o estoque filtrado. */
function Secao({ numero, titulo, descricao, verMais, children }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {numero && (
            <p aria-hidden="true" className="label-caps mb-2 text-[11px] text-brand-500">
              {numero}
            </p>
          )}
          <h2 className="titulo-traco text-2xl font-extrabold tracking-tight sm:text-3xl">
            {titulo}
          </h2>
          {descricao && <p className="mt-1.5 text-sm text-ink-400">{descricao}</p>}
        </div>
        {verMais && (
          <Link to={verMais.to} className="label-caps text-[11px] text-brand-500 hover:underline">
            {verMais.label}
          </Link>
        )}
      </div>
      <div className="mt-7">{children}</div>
    </section>
  );
}

export function Home() {
  const { store } = useStore();
  const base = useBaseDoSite(store);
  usePaginaSeo('home', {
    canonicalPath: '/',
    image: shareImageUrl(store.ogImage?.url || store.logo?.url),
    jsonLd: [dealerJsonLd(store, `${base}/`)],
  });

  const destaques = useAsyncData(
    () => publicService.motos.list({ destaque: true, limit: 3, sort: 'recentes' }),
    [],
  );
  const ofertas = useAsyncData(
    () => publicService.motos.list({ oferta: true, limit: 3, sort: 'recentes' }),
    [],
  );
  const recentes = useAsyncData(() => publicService.motos.list({ limit: 6, sort: 'recentes' }), []);

  // Faixas reais do estoque: alimentam a busca, os números e as marcas.
  const faixas = useAsyncData(() => publicService.filtros.get().catch(() => null), []).data;
  const total = faixas?.total || recentes.data?.meta?.total;
  const carrossel = motosParaCarrossel(
    destaques.data?.data,
    ofertas.data?.data,
    recentes.data?.data,
  );
  const whatsapp = (mensagem) => linkWhatsApp(store.contact?.whatsapp, mensagem);

  const mostraDestaques = destaques.isLoading || destaques.data?.data?.length > 0;
  const mostraOfertas = ofertas.isLoading || ofertas.data?.data?.length > 0;
  // Numeração só das seções que aparecem: "03" sozinho na página seria estranho.
  const numeroDaSecao = (posicao) => {
    const anteriores = [mostraDestaques, mostraOfertas].slice(0, posicao).filter(Boolean).length;
    return String(anteriores + 1).padStart(2, '0');
  };

  return (
    <>
      <Hero store={store} total={total} whatsapp={whatsapp} motos={carrossel} />
      <BuscaRapida faixas={faixas} />
      <FaixaNumeros faixas={faixas} />
      <FaixaMarcas marcas={faixas?.brands} />

      {mostraDestaques && (
        <Secao
          numero={numeroDaSecao(0)}
          titulo="Destaques"
          descricao="Selecionadas pela loja"
          verMais={{ to: '/estoque', label: 'Ver estoque completo' }}
        >
          <MotoGrid
            motos={destaques.data?.data}
            isLoading={destaques.isLoading}
            error={destaques.error}
            quantidadeEsqueleto={3}
          />
        </Secao>
      )}

      {mostraOfertas && (
        <Secao
          numero={numeroDaSecao(1)}
          titulo="Ofertas"
          descricao="Preço abaixo do praticado até agora"
          verMais={{ to: '/estoque?oferta=true', label: 'Ver todas as ofertas' }}
        >
          <MotoGrid
            motos={ofertas.data?.data}
            isLoading={ofertas.isLoading}
            error={ofertas.error}
            quantidadeEsqueleto={3}
          />
        </Secao>
      )}

      <Secao
        numero={numeroDaSecao(2)}
        titulo="Últimas cadastradas"
        descricao="O que entrou mais recentemente no estoque"
        verMais={{ to: '/estoque', label: 'Ver estoque completo' }}
      >
        <MotoGrid
          motos={recentes.data?.data}
          isLoading={recentes.isLoading}
          error={recentes.error}
        />
      </Secao>

      <Beneficios itens={store.highlights} />

      {/* Cada chamada leva à página do módulo e some se a loja o desligou. */}
      <div className="mx-auto grid max-w-7xl gap-5 px-4 pb-4 sm:px-6 md:grid-cols-2">
        {store.features?.sellMotoEnabled && (
          <Chamada
            titulo="Sua moto na entrada"
            texto="Avaliamos a sua e abatemos no valor da próxima. Conte marca, modelo, ano e quilometragem."
            acao={{ to: '/venda-sua-moto', label: 'Quero avaliar' }}
          />
        )}
        {store.features?.financingEnabled && (
          <Chamada
            titulo="Financiamento"
            texto="Simule as parcelas agora e envie para a loja. Sem compromisso."
            acao={{ to: '/financiamento', label: 'Simular agora' }}
          />
        )}
      </div>

      <SobreResumo store={store} />
    </>
  );
}

/**
 * Diferenciais da loja, das Configurações. São promessas ("troca aceita",
 * "revisadas") que cada loja faz ou não — nunca texto fixo. Sem nenhum
 * configurado, a seção não aparece.
 */
function Beneficios({ itens }) {
  if (!itens?.length) return null;
  return (
    <section className="border-y border-ink-800 bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-3">
        {itens.map(({ title, text }) => (
          <div key={title}>
            <h2 className="label-caps text-[12px] text-brand-500">{title}</h2>
            {text && <p className="mt-2.5 text-sm text-ink-400">{text}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function Chamada({ titulo, texto, acao }) {
  return (
    <section className="rounded-lg border border-ink-800 bg-surface p-8">
      <h2 className="text-xl font-extrabold tracking-tight">{titulo}</h2>
      <p className="mt-2 text-sm text-ink-400">{texto}</p>
      {acao.to ? (
        <Link to={acao.to} className={buttonClass({ className: 'mt-6' })}>
          {acao.label}
        </Link>
      ) : (
        <a
          href={acao.href}
          target="_blank"
          rel="noreferrer noopener"
          className={buttonClass({ className: 'mt-6' })}
        >
          {acao.label}
        </a>
      )}
    </section>
  );
}

function SobreResumo({ store }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <h2 className="text-2xl font-extrabold tracking-tight">Sobre a {store.name}</h2>
      {store.slogan && <p className="mt-3 max-w-2xl text-ink-400">{store.slogan}</p>}
      <Link to="/sobre" className={buttonClass({ variant: 'secondary', className: 'mt-6' })}>
        Conhecer a loja
      </Link>
    </section>
  );
}
