import { Link } from 'react-router-dom';

import { buttonClass } from '@/components/ui/Button.jsx';
import { Revelar } from '@/components/ui/Revelar.jsx';

/**
 * Passos da troca — os mesmos que o formulário de "Venda sua moto" segue.
 * Nenhuma promessa de prazo ou de valor: isso é da loja, não do produto.
 */
const PASSOS = [
  {
    titulo: 'Conte sobre a sua moto',
    texto: 'Informe marca, modelo, ano e quilometragem, e envie algumas fotos.',
  },
  {
    titulo: 'Receba a avaliação',
    texto: 'A loja analisa os dados e retorna com uma proposta pelo contato que você deixou.',
  },
  {
    titulo: 'Use na próxima moto',
    texto: 'Aceita a proposta, o valor entra como entrada na moto que você escolher no estoque.',
  },
];

/** Chamada para "Venda sua moto", em três passos. Só existe com o módulo ligado. */
export function ComoFunciona() {
  return (
    <section aria-labelledby="como-funciona" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <Revelar>
        <p aria-hidden="true" className="label-caps mb-2 text-[11px] text-brand-500">
          Troca
        </p>
        <h2
          id="como-funciona"
          className="titulo-traco text-2xl font-extrabold tracking-tight sm:text-3xl"
        >
          Sua moto na entrada
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-ink-400">
          Avaliamos a sua e abatemos no valor da próxima, em três passos.
        </p>
      </Revelar>

      <ol className="mt-8 grid gap-0.5 overflow-hidden rounded-lg bg-ink-800 md:grid-cols-3">
        {PASSOS.map(({ titulo, texto }, indice) => (
          <Revelar as="li" key={titulo} atraso={indice * 120} className="bg-surface p-6 sm:p-7">
            <span
              aria-hidden="true"
              className="font-display text-5xl font-extrabold text-brand-500"
            >
              {String(indice + 1).padStart(2, '0')}
            </span>
            <h3 className="mt-3 text-lg font-extrabold text-ink-50">
              <span className="sr-only">Passo {indice + 1}: </span>
              {titulo}
            </h3>
            <p className="mt-2 text-sm text-ink-400">{texto}</p>
          </Revelar>
        ))}
      </ol>

      <Link to="/venda-sua-moto" className={buttonClass({ size: 'lg', className: 'mt-8' })}>
        Quero avaliar minha moto
      </Link>
    </section>
  );
}
