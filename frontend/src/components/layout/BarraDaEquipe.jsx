import { Link } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth.js';

/**
 * Faixa no topo do site para quem da equipe está logado: lembra que a sessão
 * está aberta e dá o caminho de volta ao painel.
 *
 * Só aparece no navegador, depois de a sessão ser confirmada — o HTML que o
 * servidor manda (e guarda em cache) é o mesmo para todo visitante.
 */
export function BarraDaEquipe() {
  const { membroDaEquipe, signOut } = useAuth();
  if (!membroDaEquipe) return null;

  return (
    <nav aria-label="Acesso da equipe" className="border-b border-ink-800 bg-surface-2">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2 text-xs sm:px-6">
        <p className="min-w-0 truncate text-ink-200">
          Conectado como <strong className="text-ink-50">{membroDaEquipe.name}</strong>
        </p>
        <Link
          to="/admin"
          className="label-caps ml-auto shrink-0 text-[11px] text-brand-500 underline underline-offset-2"
        >
          Painel
        </Link>
        <button
          type="button"
          onClick={signOut}
          className="label-caps shrink-0 text-[11px] text-ink-200 hover:text-ink-50"
        >
          Sair
        </button>
      </div>
    </nav>
  );
}
