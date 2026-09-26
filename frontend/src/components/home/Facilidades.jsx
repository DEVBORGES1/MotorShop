import { Link } from 'react-router-dom';

import { buttonClass } from '@/components/ui/Button.jsx';
import { Revelar } from '@/components/ui/Revelar.jsx';
import { atributosDeImagem, imagemPrincipal } from '@/utils/imagem.js';

/**
 * Blocos de serviço da loja — financiamento e troca — como cartões grandes com
 * foto ao fundo. A foto é a de uma moto do estoque, passada por quem monta a
 * página: assim o bloco acompanha o estoque real e nenhuma imagem da loja
 * precisa estar escrita no código. Sem foto, o cartão usa a grade do tema.
 *
 * Cada bloco só existe com o módulo ligado; com um só, ele ocupa a linha toda.
 *
 * @param {{ store: object, motoDeFundo?: (indice: number) => object | null }} props
 */
export function Facilidades({ store, motoDeFundo = () => null }) {
  const blocos = [
    store.features?.financingEnabled && {
      id: 'financiamento',
      rotulo: 'Financiamento',
      titulo: 'Simule a parcela',
      texto:
        'Escolha o valor, a entrada e o prazo e veja quanto fica. Envie para a loja, sem compromisso.',
      acao: { to: '/financiamento', label: 'Simular agora' },
    },
    store.features?.sellMotoEnabled && {
      id: 'troca',
      rotulo: 'Troca',
      titulo: 'Sua moto na entrada',
      texto:
        'Avaliamos a sua e abatemos no valor da próxima. É só contar marca, modelo, ano e quilometragem.',
      acao: { to: '/venda-sua-moto', label: 'Quero avaliar' },
    },
  ].filter(Boolean);

  if (!blocos.length) return null;

  return (
    <section
      aria-label="Facilidades da loja"
      className={`mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 ${
        blocos.length > 1 ? 'md:grid-cols-2' : ''
      }`}
    >
      {blocos.map((bloco, indice) => (
        <Revelar key={bloco.id} atraso={indice * 120}>
          <Bloco {...bloco} moto={motoDeFundo(indice)} />
        </Revelar>
      ))}
    </section>
  );
}

function Bloco({ rotulo, titulo, texto, acao, moto }) {
  const foto = moto ? imagemPrincipal(moto) : null;
  const atributos = foto ? atributosDeImagem(foto, 'galeria') : null;

  return (
    <div className="relative isolate flex min-h-80 flex-col justify-end overflow-hidden rounded-lg border border-ink-800 bg-surface p-6 sm:p-8">
      {atributos ? (
        <img
          {...atributos}
          sizes={atributos.srcSet ? '(min-width: 768px) 50vw, 100vw' : undefined}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="fundo-grade pointer-events-none absolute inset-0 -z-10"
        />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-t from-ink-900 via-ink-900/80 to-ink-900/40"
      />

      <p className="label-caps text-[11px] text-brand-500">{rotulo}</p>
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{titulo}</h2>
      <p className="mt-2 max-w-md text-sm text-ink-100">{texto}</p>
      <Link to={acao.to} className={buttonClass({ size: 'lg', className: 'mt-6 w-fit' })}>
        {acao.label}
      </Link>
    </div>
  );
}
