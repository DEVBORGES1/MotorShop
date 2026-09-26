import { TRANSMISSION_LABEL } from '@motorshop/shared';

import { formatarCilindrada, formatarKm } from '@/utils/format.js';

/** Traços de ícone (viewBox 24, sem preenchimento), um por atributo. */
const ICONES = {
  ano: 'M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  km: 'M4 17a8 8 0 1 1 16 0M12 17l4-5',
  cilindrada:
    'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
  cambio: 'M4 7h11l-3-3M20 17H9l3 3',
};

/** Só o que o cadastro tem: atributo ausente some, sem traço nem "undefined". */
function itensDaMoto(moto) {
  return [
    moto.year != null && { id: 'ano', texto: String(moto.year) },
    moto.mileage != null && { id: 'km', texto: formatarKm(moto.mileage) },
    moto.engineCapacity != null && {
      id: 'cilindrada',
      texto: formatarCilindrada(moto.engineCapacity),
    },
    moto.transmission && {
      id: 'cambio',
      texto: TRANSMISSION_LABEL[moto.transmission] ?? moto.transmission,
    },
  ].filter(Boolean);
}

/** Ficha resumida do card: ano, quilometragem, cilindrada e câmbio, com ícone. */
export function AtributosDaMoto({ moto, className = '' }) {
  const itens = itensDaMoto(moto);
  if (!itens.length) return null;

  return (
    <ul className={`grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-ink-200 ${className}`}>
      {itens.map(({ id, texto }) => (
        <li key={id} className="flex min-w-0 items-center gap-2">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0 fill-none stroke-brand-500"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={ICONES[id]} />
          </svg>
          <span className="truncate">{texto}</span>
        </li>
      ))}
    </ul>
  );
}
