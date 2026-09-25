import { isFinancingConfigured } from '@motorshop/shared';
import { Link } from 'react-router-dom';

import { AvisoSimulacao } from '@/components/financiamento/AvisoSimulacao.jsx';
import { FinancingSimulator } from '@/components/financiamento/FinancingSimulator.jsx';
import { buttonClass } from '@/components/ui/Button.jsx';
import { Card } from '@/components/ui/Card.jsx';
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
 * Financiamento: simulador, como funciona, documentos e perguntas frequentes.
 *
 * Some se a loja desligou o módulo. Se o módulo está ligado mas a taxa não foi
 * configurada, a página explica o processo e oferece o contato — sem simular
 * com uma taxa inventada.
 */
export function Financiamento() {
  const { store } = useStore();
  if (!store.features?.financingEnabled) return <NotFound />;

  const configurado = isFinancingConfigured(store.financing);
  const whatsapp = linkWhatsApp(
    store.contact?.whatsapp,
    `Olá! Gostaria de simular um financiamento. (via site da ${store.name})`,
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Financiamento</h1>
      <p className="mt-3 max-w-2xl text-ink-400">
        Simule as parcelas antes de vir à loja. A {store.name} cuida da conversa com a financeira.
      </p>

      <Card as="section" className="mt-10" aria-labelledby="simulador-titulo">
        <h2 id="simulador-titulo" className="label-caps text-[11px] text-ink-400">
          Simulador
        </h2>
        <div className="mt-5">
          {configurado ? (
            <FinancingSimulator idPrefixo="financiamento" />
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-ink-200">
                A simulação online ainda não está disponível. Fale com a loja e receba uma simulação
                com as condições do dia.
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
              {formatarPercentual(store.financing.monthlyRate)} ao mês. A taxa da proposta pode ser
              diferente, conforme a análise.
            </Pergunta>
          )}
          <Pergunta titulo="Preciso informar CPF ou renda para simular?">
            Não. Para simular e enviar a simulação, só pedimos nome e telefone. Os documentos entram
            depois, com a financeira.
          </Pergunta>
          {store.features?.sellMotoEnabled && (
            <Pergunta titulo="Posso dar minha moto como entrada?">
              Pode.{' '}
              <Link to="/venda-sua-moto" className="text-brand-500 hover:underline">
                Peça a avaliação da sua moto
              </Link>{' '}
              e use o valor na entrada.
            </Pergunta>
          )}
        </div>
      </section>
    </div>
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
