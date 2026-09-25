import { Link } from 'react-router-dom';
import { buttonClass } from '@/components/ui/Button.jsx';
import { usePaginaSeo } from '@/hooks/useSeo.js';

export function NotFound() {
  usePaginaSeo('not-found');
  return (
    <div className="py-16 text-center">
      <p className="text-6xl font-bold text-brand-500">404</p>
      <h1 className="mt-4 text-2xl font-semibold">Página não encontrada</h1>
      <p className="mt-2 text-ink-400">O endereço acessado não existe ou foi movido.</p>
      <Link to="/" className={buttonClass({ size: 'lg', className: 'mt-8' })}>
        Voltar para a home
      </Link>
    </div>
  );
}
