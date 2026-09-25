import { especificacoes } from '@/utils/moto.js';

/** Ficha técnica. Campos que o cadastro não tem simplesmente não aparecem. */
export function MotoSpecs({ moto }) {
  const ficha = especificacoes(moto);
  if (!ficha.length) return null;

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-800 bg-ink-800 sm:grid-cols-3">
      {ficha.map(({ rotulo, valor }) => (
        <div key={rotulo} className="bg-surface px-4 py-3">
          <dt className="label-caps text-[10px] text-ink-500">{rotulo}</dt>
          <dd className="mt-1 text-sm font-semibold text-ink-50">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}
