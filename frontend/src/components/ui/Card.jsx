/**
 * Superfície elevada sobre o fundo da página. `as` permite usar a mesma caixa
 * como `<article>` num card de moto e como `<section>` num painel, sem perder
 * a semântica.
 */
export function Card({ as: Tag = 'div', padded = true, className = '', children, ...props }) {
  return (
    <Tag
      className={`rounded-lg border border-ink-800 bg-surface ${padded ? 'p-5' : ''} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

/** Rótulo em caixa alta usado como título de painel. */
export function CardTitle({ className = '', children }) {
  return <h2 className={`label-caps text-[11px] text-ink-400 ${className}`}>{children}</h2>;
}
