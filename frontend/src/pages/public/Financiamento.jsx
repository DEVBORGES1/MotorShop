import { isFinancingConfigured } from '@motorshop/shared';
import { Link } from 'react-router-dom';

import { AvisoSimulacao } from '@/components/financiamento/AvisoSimulacao.jsx';
import { SimuladorDoEstoque } from '@/components/financiamento/SimuladorDoEstoque.jsx';
import { buttonClass } from '@/components/ui/Button.jsx';
import { Card } from '@/components/ui/Card.jsx';
import { usePaginaSeo } from '@/hooks/useSeo.js';
import { useStore } from '@/hooks/useStore.js';
import { NotFound } from '@/pages/NotFound.jsx';
import { formatarPercentual } from '@/utils/format.js';
import { linkWhatsApp } from '@/utils/whatsapp.js';

const PASSOS = [
  ['Simule', 'Escolha a entrada e o prazo que cabem no seu bolso.'],
  ['Envie para a loja', 'A loja leva a simulação à financeira e volta com as condições reais.'],
  ['Análise e retirada', 'Com o crédito aprovado, é assinar e sair com a moto.'],
];

const DOCUMENTOS = [
  'Documento de identidade com foto (RG ou CNH)',
  'CPF',
  'Comprovante de residência recente',
  'Comprovante de renda',
];

/**
 * Financiamento: abertura, simulador a partir do estoque, como funciona,
 * documentos e perguntas frequentes.
 *
 * Some se a loja desligou o módulo. Se o módulo está ligado mas a taxa não foi
 * configurada, a página explica o processo e oferece o contato — sem simular
 * com uma taxa inventada.
 */
export function Financiamento() {
  const { store } = useStore();
  usePaginaSeo(store.features?.financingEnabled ? 'financiamento' : 'not-found');
  if (!store.features?.financingEnabled) return <NotFound />;

  const configurado = isFinancingConfigured(store.financing);
  const whatsapp = linkWhatsApp(
    store.contact?.whatsapp,
    `Olá! Gostaria de simular um financiamento. (via site da ${store.name})`,
  );

  return (
    <>
      <Abertura store={store} configurado={configurado} />

      <div className="mx-auto max-w-4xl px-4 pb-14 sm:px-6">
        <Card
          as="section"
          className="relative -mt-12 shadow-2xl shadow-black/40 sm:p-7"
          aria-labelledby="simulador-titulo"
        >
          <h2 id="simulador-titulo" className="label-caps text-[11px] text-ink-400">
            Simulador
          </h2>
          <div className="mt-5">
            {configurado ? (
              <SimuladorDoEstoque />
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-ink-200">
                  A simulação online ainda não está disponível. Fale com a loja e receba uma
                  simulação com as condições do dia.
                </p>
                {whatsapp ? (
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={buttonClass()}
                  >
                    Simular pelo WhatsApp
                  </a>
                ) : (
                  <Link to="/contato" className={buttonClass()}>
                    Fale com a loja
                  </Link>
                )}
                <AvisoSimulacao />
              </div>
            )}
          </div>
        </Card>

        <section className="mt-14" aria-labelledby="como-titulo">
          <h2 id="como-titulo" className="text-xl font-extrabold tracking-tight">
            Como funciona
          </h2>
          <ol className="mt-6 grid gap-5 sm:grid-cols-3">
            {PASSOS.map(([titulo, texto], indice) => (
              <li key={titulo} className="rounded-lg border border-ink-800 bg-surface p-5">
                <span className="font-display text-2xl font-extrabold text-brand-500">
                  {indice + 1}
                </span>
                <p className="mt-2 font-semibold text-ink-50">{titulo}</p>
                <p className="mt-1 text-sm text-ink-400">{texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14" aria-labelledby="docs-titulo">
          <h2 id="docs-titulo" className="text-xl font-extrabold tracking-tight">
            Documentos para a análise
          </h2>
          <p className="mt-2 text-sm text-ink-400">
            Pedidos pela financeira na hora da proposta — não pelo site.
          </p>
          <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {DOCUMENTOS.map((documento) => (
              <li key={documento} className="flex items-start gap-2.5 text-sm text-ink-200">
                <span aria-hidden="true" className="text-brand-500">
                  ✓
                </span>
                {documento}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14" aria-labelledby="faq-titulo">
          <h2 id="faq-titulo" className="text-xl font-extrabold tracking-tight">
            Perguntas frequentes
          </h2>
          <div className="mt-5 divide-y divide-ink-800 rounded-lg border border-ink-800">
            <Pergunta titulo="A simulação já é uma aprovação de crédito?">
              Não. É uma estimativa para você planejar. As condições finais dependem da análise da
              financeira.
            </Pergunta>
            {configurado && (
              <Pergunta titulo="Qual taxa a simulação usa?">
                A taxa de referência informada pela loja, de{' '}
                {formatarPercentual(store.financing.monthlyRate)} ao mês. A taxa da proposta pode
                ser diferente, conforme a análise.
              </Pergunta>
            )}
            <Pergunta titulo="Preciso informar CPF ou renda para simular?">
              Não. Para simular e enviar a simulação, só pedimos nome e telefone. Os documentos
              entram depois, com a financeira.
            </Pergunta>
            {store.features?.sellMotoEnabled && (
              <Pergunta titulo="Posso dar minha moto como entrada?">
                Pode. No simulador, marque &quot;Tenho uma moto para dar na troca&quot; e informe
                quanto acha que ela vale. Para saber o valor que a loja paga,{' '}
                <Link to="/venda-sua-moto" className="text-brand-500 underline underline-offset-2">
                  peça a avaliação da sua moto
                </Link>
                .
              </Pergunta>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

/**
 * Abertura da página, no mesmo padrão da Sobre. Os destaques saem da
 * configuração da loja — prazo máximo e troca só aparecem se valem para ela.
 */
function Abertura({ store, configurado }) {
  const prazoMaximo = configurado ? Math.max(...store.financing.installmentOptions) : null;
  const destaques = [
    prazoMaximo && `Em até ${prazoMaximo}x`,
    'Sem CPF para simular',
    store.features?.sellMotoEnabled && 'Sua moto na troca',
  ].filter(Boolean);

  return (
    <section className="relative isolate overflow-hidden border-b border-ink-800 bg-surface">
      <div aria-hidden="true" className="fundo-brilho pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="fundo-grade pointer-events-none absolute inset-0" />

      <div className="relative mx-auto max-w-4xl px-4 pt-14 pb-24 sm:px-6 sm:pt-16">
        <p className="label-caps flex items-center gap-3 text-[11px] text-brand-500">
          <span aria-hidden="true" className="h-0.5 w-8 bg-brand-500" />
          Financiamento
        </p>

        <h1 className="mt-5 max-w-3xl text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-5xl">
          Simule as parcelas da sua próxima moto
        </h1>

        <p className="mt-5 max-w-2xl text-lg text-ink-100">
          Escolha uma moto do estoque, ajuste a entrada e o prazo e veja as parcelas na hora. A{' '}
          {store.name} cuida da conversa com a financeira.
        </p>

        <ul className="mt-7 flex flex-wrap gap-2">
          {destaques.map((destaque) => (
            <li
              key={destaque}
              className="label-caps flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900/60 px-3 py-1.5 text-[11px] text-ink-100"
            >
              <span aria-hidden="true" className="text-brand-500">
                ✓
              </span>
              {destaque}
            </li>
          ))}
        </ul>
      </div>

      <div aria-hidden="true" className="faixa-listra absolute inset-x-0 top-0 h-1.5" />
    </section>
  );
}

function Pergunta({ titulo, children }) {
  return (
    <details className="group px-5 py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink-100">
        {titulo}
        <span aria-hidden="true" className="text-ink-500 transition group-open:rotate-45">
          +
        </span>
      </summary>
      <p className="mt-3 text-sm text-ink-400">{children}</p>
    </details>
  );
}
