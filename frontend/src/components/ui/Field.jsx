/**
 * Campo de formulário com rótulo, erro e associação acessível entre eles.
 * Centralizar isto evita repetir `aria-describedby` em cada formulário — e
 * esquecer em alguns.
 */
export function Field({ id, label, error, hint, children, required }) {
  const errorId = error ? `${id}-erro` : undefined;
  const hintId = hint ? `${id}-dica` : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="label-caps block text-[11px] text-ink-400">
        {label}
        {required && <span className="ml-1 text-danger">*</span>}
      </label>

      {children({
        id,
        'aria-describedby': [errorId, hintId].filter(Boolean).join(' ') || undefined,
        'aria-invalid': error ? true : undefined,
      })}

      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const controlBase =
  'w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2.5 text-sm text-ink-50 outline-none transition placeholder:text-ink-600 disabled:opacity-50';

export const inputClass = controlBase;

/**
 * A seta nativa do `<select>` vem clara demais no tema escuro em alguns
 * navegadores; `appearance-none` a remove e a seta volta como fundo SVG,
 * desenhada com o tom de texto de apoio.
 */
export const selectClass = `${controlBase} appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8' fill='none' stroke='%239AA39A' stroke-width='1.5'%3E%3Cpath d='M1 1.5 6 6.5 11 1.5'/%3E%3C/svg%3E")] bg-[length:12px_8px] bg-[position:right_12px_center] bg-no-repeat pr-9`;

/** Slider de faixa (preço, entrada, parcelas). */
export const rangeClass =
  'h-1 w-full cursor-pointer appearance-none rounded-sm bg-ink-700 accent-brand-500';
