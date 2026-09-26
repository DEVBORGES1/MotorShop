import { useSituacaoDaLoja } from '@/hooks/useSituacaoDaLoja.js';
import { useStore } from '@/hooks/useStore.js';
import { formatarTelefone } from '@/utils/format.js';

/**
 * Faixa fina acima do cabeçalho: o slogan da loja à esquerda; à direita, se
 * ela está aberta agora e o telefone. Tudo vem das Configurações — o que a
 * loja não preencheu não aparece, e sem nada para mostrar a faixa some.
 *
 * Altura fixa: "aberto agora" só chega depois da montagem, e a faixa não pode
 * crescer nesse instante empurrando a página (salto de layout).
 */
export function BarraDeTopo() {
  const { store } = useStore();
  const situacao = useSituacaoDaLoja(store.businessHours);
  const telefone = store.contact?.phone;

  if (!store.slogan && !telefone && !store.businessHours?.length) return null;

  return (
    // Região própria: sem landmark, o leitor de tela trata a faixa como conteúdo solto.
    <aside
      aria-label="Informações da loja"
      className="border-b border-ink-800 bg-surface-2 text-xs text-ink-200"
    >
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <p className="hidden truncate sm:block">{store.slogan}</p>

        <div className="flex min-w-0 flex-1 items-center justify-between gap-4 sm:flex-none sm:justify-end sm:gap-6">
          {situacao && (
            <p
              className={`flex min-w-0 items-center gap-2 font-bold ${
                situacao.aberto ? 'text-ok' : 'text-ink-200'
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${situacao.aberto ? 'bg-ok' : 'bg-ink-500'}`}
              />
              <span className="truncate">{situacao.texto}</span>
            </p>
          )}
          {telefone && (
            <a
              href={`tel:${telefone.replace(/\D/g, '')}`}
              className="shrink-0 font-bold text-ink-50 hover:text-brand-500"
            >
              {formatarTelefone(telefone)}
            </a>
          )}
        </div>
      </div>
    </aside>
  );
}
