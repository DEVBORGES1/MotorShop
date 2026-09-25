import { SellMotoForm } from '@/components/leads/SellMotoForm.jsx';
import { usePaginaSeo } from '@/hooks/useSeo.js';
import { useStore } from '@/hooks/useStore.js';
import { NotFound } from '@/pages/NotFound.jsx';

/**
 * "Venda sua moto": a loja avalia a moto do cliente para compra ou troca.
 *
 * Some por completo se a loja desligou o módulo nas Configurações — página
 * que existe mas não deveria é pior que 404.
 */
export function VendaSuaMoto() {
  const { store } = useStore();
  usePaginaSeo(store.features?.sellMotoEnabled ? 'venda-sua-moto' : 'not-found');
  if (!store.features?.sellMotoEnabled) return <NotFound />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Venda sua moto</h1>
      <p className="mt-3 max-w-2xl text-ink-400">
        Conte sobre a sua moto e a {store.name} responde com uma proposta — para comprar ou para
        abater na próxima. Sem compromisso.
      </p>

      <div className="mt-10">
        <SellMotoForm />
      </div>
    </div>
  );
}
