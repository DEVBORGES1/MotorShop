/**
 * Etiqueta curta: tag da moto ("Oferta", "Reservada"), status no painel,
 * chip de filtro ativo.
 */

const TONES = {
  neutral: 'bg-ink-800 text-ink-200',
  brand: 'bg-brand-500 text-on-brand',
  warn: 'bg-warn text-ink-900',
  ok: 'bg-ok/15 text-ok',
  danger: 'bg-danger/15 text-danger',
  outline: 'border border-ink-700 text-ink-400',
};

export function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span
      className={`label-caps inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[10px] ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
