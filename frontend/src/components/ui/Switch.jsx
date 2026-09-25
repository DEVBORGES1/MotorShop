/**
 * Interruptor liga/desliga.
 *
 * Por baixo é um checkbox de verdade com `role="switch"`: teclado (espaço),
 * leitor de tela ("ligado"/"desligado") e envio de formulário funcionam sem
 * código extra. O checkbox fica visualmente oculto e a trilha desenhada ao lado
 * reage a ele pelas variantes `peer-*`, inclusive ao foco do teclado.
 */
export function Switch({ id, checked, onChange, disabled, label, description }) {
  const descricaoId = description ? `${id}-descricao` : undefined;

  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-3 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(evento) => onChange(evento.target.checked)}
        disabled={disabled}
        aria-describedby={descricaoId}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative mt-0.5 h-5 w-9 shrink-0 rounded-full bg-ink-700 transition-colors peer-checked:bg-brand-500 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-500 peer-disabled:opacity-50 after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-ink-50 after:transition-transform peer-checked:after:translate-x-4"
      />
      <span className="min-w-0">
        <span className="block text-sm text-ink-100">{label}</span>
        {description && (
          <span id={descricaoId} className="mt-0.5 block text-xs text-ink-500">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}
