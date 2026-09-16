/**
 * Número grande do painel: rótulo em caixa alta, valor e um detalhe opcional.
 * `to` transforma o cartão inteiro em link — alvo de clique maior que um
 * "ver mais" de 11px no rodapé.
 */
import { Link } from 'react-router-dom';

export function StatCard({ rotulo, valor, detalhe, to }) {
  const Caixa = to ? Link : 'div';

  return (
    <Caixa
      {...(to ? { to } : {})}
      className={`block rounded-lg border border-ink-800 bg-surface p-5 ${
        to ? 'transition hover:border-ink-600' : ''
      }`}
    >
      <p className="label-caps text-[10px] text-ink-500">{rotulo}</p>
      <p className="font-display mt-3 text-3xl font-extrabold text-ink-50">{valor}</p>
      {detalhe && <p className="mt-1.5 text-xs text-ink-400">{detalhe}</p>}
    </Caixa>
  );
}
