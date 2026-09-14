import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="py-16 text-center">
      <p className="text-6xl font-bold text-brand-500">404</p>
      <h1 className="mt-4 text-2xl font-semibold">Página não encontrada</h1>
      <p className="mt-2 text-ink-400">O endereço acessado não existe ou foi movido.</p>
      <Link
        to="/"
        className="mt-8 inline-block rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-ink-900 transition hover:bg-brand-600"
      >
        Voltar para a home
      </Link>
    </div>
  );
}
