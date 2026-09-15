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
      <label htmlFor={id} className="block text-sm font-medium text-ink-200">
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

export const inputClass =
  'w-full rounded-lg border border-ink-800 bg-ink-900 px-3 py-2 text-sm text-ink-50 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50';
