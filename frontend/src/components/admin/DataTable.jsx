/**
 * Tabela do painel.
 *
 * Fornece a moldura — borda, rolagem horizontal, cabeçalho em caixa alta,
 * linhas divididas, estado vazio — e deixa as células com a tela, que sabe o
 * que cada coluna significa. Tentar abstrair também as células transformaria
 * cada tabela numa configuração ilegível.
 *
 * O `overflow-x-auto` é o que mantém a tabela utilizável no celular sem que a
 * página inteira role para o lado.
 */

/** Classe das células do corpo, para as telas não reinventarem o espaçamento. */
export const celulaClass = 'px-4 py-3.5 align-middle';

export function DataTable({ colunas, vazio, children }) {
  const semLinhas = !children || (Array.isArray(children) && children.length === 0);

  if (semLinhas && vazio) {
    return (
      <div className="rounded-lg border border-dashed border-ink-700 px-6 py-12 text-center text-sm text-ink-400">
        {vazio}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-ink-800">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-ink-800 bg-surface-2">
            {colunas.map((coluna, i) => (
              <th
                key={
                  coluna.chave ?? (typeof coluna.titulo === 'string' ? coluna.titulo : `col-${i}`)
                }
                scope="col"
                className={`label-caps px-4 py-3 text-[10px] text-ink-500 ${coluna.className ?? ''} ${
                  coluna.alinhar === 'direita' ? 'text-right' : 'text-left'
                }`}
              >
                {coluna.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-800 bg-surface">{children}</tbody>
      </table>
    </div>
  );
}
