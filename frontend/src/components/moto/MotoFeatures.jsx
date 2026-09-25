/** Lista de opcionais ("ABS", "Manual e chave reserva"…). */
export function MotoFeatures({ features }) {
  const itens = (features ?? []).filter((item) => item?.trim());
  if (!itens.length) return null;

  return (
    <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
      {itens.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-sm text-ink-200">
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 fill-none stroke-brand-500 stroke-2"
          >
            <path d="m3 8.5 3 3 7-7" />
          </svg>
          {item}
        </li>
      ))}
    </ul>
  );
}
