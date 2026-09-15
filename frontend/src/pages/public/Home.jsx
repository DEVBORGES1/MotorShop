import { Link, useNavigate } from 'react-router-dom';

import { MotoGrid } from '@/components/catalogo/MotoGrid.jsx';
import { buttonClass } from '@/components/ui/Button.jsx';
import { selectClass } from '@/components/ui/Field.jsx';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { useStore } from '@/hooks/useStore.js';
import * as publicService from '@/services/publicService.js';
import { formatarPreco } from '@/utils/format.js';
import { linkWhatsApp } from '@/utils/whatsapp.js';

const FAIXAS_DE_PRECO = [10000, 20000, 30000, 50000];

/** Seção com título e link opcional para o estoque filtrado. */
function Secao({ titulo, descricao, verMais, children }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">{titulo}</h2>
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

  const destaques = useAsyncData(
    () => publicService.motos.list({ destaque: true, limit: 3, sort: 'recentes' }),
    [],
  );
  const ofertas = useAsyncData(
    () => publicService.motos.list({ oferta: true, limit: 3, sort: 'recentes' }),
    [],
  );
  const recentes = useAsyncData(() => publicService.motos.list({ limit: 6, sort: 'recentes' }), []);

  const total = recentes.data?.meta?.total;
  const whatsapp = (mensagem) => linkWhatsApp(store.contact?.whatsapp, mensagem);

  const linkVenda = whatsapp(
    `Olá! Quero vender ou trocar minha moto. Podem avaliar? (via site da ${store.name})`,
  );
  const linkFinanciamento = whatsapp(
    `Olá! Gostaria de simular um financiamento. (via site da ${store.name})`,
  );

  return (
    <>
      <Hero store={store} total={total} whatsapp={whatsapp} />
      <BuscaRapida />

      {(destaques.isLoading || destaques.data?.data?.length > 0) && (
        <Secao
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

      {(ofertas.isLoading || ofertas.data?.data?.length > 0) && (
        <Secao
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

      <Beneficios />

      {/* As páginas de venda e de financiamento são as FASES 6 e 7. Até lá a
          chamada leva ao WhatsApp, que já funciona — e some por completo se a
          loja desligou o módulo nas configurações. */}
      <div className="mx-auto grid max-w-7xl gap-5 px-4 pb-4 sm:px-6 md:grid-cols-2">
        {store.features?.sellMotoEnabled && linkVenda && (
          <Chamada
            titulo="Sua moto na entrada"
            texto="Avaliamos a sua e abatemos no valor da próxima. Mande marca, modelo, ano e quilometragem."
            acao={{ href: linkVenda, label: 'Quero avaliar' }}
          />
        )}
        {store.features?.financingEnabled && linkFinanciamento && (
          <Chamada
            titulo="Financiamento"
            texto="Trabalhamos com as principais financeiras. Simulação sem compromisso."
            acao={{ href: linkFinanciamento, label: 'Simular agora' }}
          />
        )}
      </div>

      <SobreResumo store={store} />
    </>
  );
}

function Hero({ store, total, whatsapp }) {
  const contato = whatsapp(`Olá! Vim pelo site da ${store.name}.`);

  return (
    <section className="border-b border-ink-800 bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <p className="label-caps text-[11px] text-brand-500">
          {[store.address?.city, store.address?.state].filter(Boolean).join(' · ') || 'Motos'}
        </p>

        <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
          {store.slogan || 'Sua próxima moto está aqui.'}
        </h1>

        <p className="mt-4 max-w-xl text-ink-400">
          Motos usadas e seminovas revisadas, prontas para sair da loja.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <Link to="/estoque" className={buttonClass({ size: 'lg' })}>
            Ver estoque{total ? ` · ${total} motos` : ''}
          </Link>
          {contato && (
            <a
              href={contato}
              target="_blank"
              rel="noreferrer noopener"
              className={buttonClass({ variant: 'secondary', size: 'lg' })}
            >
              Falar no WhatsApp
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

/** Busca rápida: leva para o estoque já filtrado, sem duplicar a lógica dele. */
function BuscaRapida() {
  const navigate = useNavigate();
  const { data: faixas } = useAsyncData(() => publicService.filtros.get().catch(() => null), []);

  const enviar = (evento) => {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    const params = new URLSearchParams();

    for (const [chave, valor] of form.entries()) {
      if (valor) params.set(chave, valor);
    }

    navigate({ pathname: '/estoque', search: params.toString() });
  };

  return (
    <form
      onSubmit={enviar}
      className="mx-auto -mt-8 flex max-w-7xl flex-wrap gap-3 px-4 sm:px-6"
      aria-label="Busca rápida"
    >
      <div className="flex-1 basis-48">
        <label htmlFor="busca-marca" className="label-caps text-[10px] text-ink-500">
          Marca
        </label>
        <select id="busca-marca" name="marca" className={`${selectClass} mt-1.5`}>
          <option value="">Todas</option>
          {(faixas?.brands ?? []).map((marca) => (
            <option key={marca.slug} value={marca.slug}>
              {marca.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 basis-48">
        <label htmlFor="busca-preco" className="label-caps text-[10px] text-ink-500">
          Preço até
        </label>
        <select id="busca-preco" name="precoMax" className={`${selectClass} mt-1.5`}>
          <option value="">Qualquer</option>
          {FAIXAS_DE_PRECO.map((valor) => (
            <option key={valor} value={valor}>
              {formatarPreco(valor)}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" className={buttonClass({ size: 'lg', className: 'mt-auto' })}>
        Buscar
      </button>
    </form>
  );
}

const BENEFICIOS = [
  ['Revisadas antes da vitrine', 'Cada moto passa pela bancada antes de ser anunciada.'],
  ['Documentação em dia', 'Transferência e pendências resolvidas com você.'],
  ['Troca aceita', 'Sua moto atual pode entrar como parte do pagamento.'],
];

function Beneficios() {
  return (
    <section className="border-y border-ink-800 bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-3">
        {BENEFICIOS.map(([titulo, texto]) => (
          <div key={titulo}>
            <h2 className="label-caps text-[12px] text-brand-500">{titulo}</h2>
            <p className="mt-2.5 text-sm text-ink-400">{texto}</p>
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
      <a
        href={acao.href}
        target="_blank"
        rel="noreferrer noopener"
        className={buttonClass({ className: 'mt-6' })}
      >
        {acao.label}
      </a>
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
