/**
 * Resultado vazio. Sempre com uma saída: uma busca sem resultado que não
 * oferece "limpar filtros" deixa o visitante sem caminho a não ser voltar.
 */
export function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-lg border border-dashed border-ink-700 px-6 py-14 text-center">
      <p className="label-caps text-sm text-ink-100">{title}</p>
      {description && <p className="mx-auto mt-2 max-w-md text-sm text-ink-400">{description}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
