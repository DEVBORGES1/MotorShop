/**
 * Cabeçalho de tela do painel: título à esquerda, ações à direita.
 *
 * As seis telas do admin repetiam a mesma linha de flexbox com uma variação
 * de classe cada — e o título de cada uma tinha um tamanho ligeiramente
 * diferente do das outras.
 */
export function PageHeader({ titulo, descricao, children }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 pb-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{titulo}</h1>
        {descricao && <p className="mt-1.5 text-sm text-ink-400">{descricao}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
