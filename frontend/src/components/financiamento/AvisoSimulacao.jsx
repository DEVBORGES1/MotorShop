import { FINANCING_DISCLAIMER } from '@motorshop/shared';

/**
 * Aviso legal de toda superfície de simulação (risco R-07). O texto vem do
 * pacote compartilhado — é o mesmo em qualquer tela, e mudar a redação é
 * decisão consciente, num lugar só.
 */
export function AvisoSimulacao({ className = '' }) {
  return (
    <p role="note" className={`flex gap-2 text-xs leading-relaxed text-ink-400 ${className}`}>
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-none stroke-warn stroke-[1.5]"
      >
        <circle cx="8" cy="8" r="6.5" />
        <path d="M8 4.5v4.2M8 11h.01" />
      </svg>
      {FINANCING_DISCLAIMER}
    </p>
  );
}
