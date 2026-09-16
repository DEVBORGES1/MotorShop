/**
 * Bloco de campos de um formulário do painel.
 *
 * Usa `<fieldset>` e `<legend>` de verdade em vez de uma `<div>` com título:
 * é o que faz o leitor de tela anunciar "Endereço" ao entrar em cada campo do
 * grupo, em vez de ler "Número" solto.
 */
export function FormSection({ titulo, descricao, colunas = 2, children }) {
  const grade = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' }[colunas] ?? 'sm:grid-cols-2';

  return (
    <fieldset className="rounded-lg border border-ink-800 bg-surface p-5">
      <legend className="label-caps px-2 text-[11px] text-ink-400">{titulo}</legend>
      {descricao && <p className="mt-1 text-xs text-ink-500">{descricao}</p>}
      <div className={`mt-4 grid gap-4 ${grade}`}>{children}</div>
    </fieldset>
  );
}
