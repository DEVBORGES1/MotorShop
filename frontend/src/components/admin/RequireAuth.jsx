import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth.js';

/**
 * Proteção de rota no cliente.
 *
 * Isto é **experiência de uso, não segurança**: a autorização real acontece no
 * servidor, que verifica cada requisição independentemente do que a interface
 * mostre. Esconder um botão nunca protegeu um endpoint.
 */
export function RequireAuth({ roles }) {
  const { isAuthenticated, isRestoring, user } = useAuth();
  const location = useLocation();

  if (isRestoring) {
    return <div className="p-8 text-ink-400">Verificando sessão…</div>;
  }

  if (!isAuthenticated) {
    // `state` permite voltar à página pretendida depois do login.
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="rounded-xl border border-danger/40 bg-danger/10 p-6">
        <h2 className="font-semibold text-danger">Acesso negado</h2>
        <p className="mt-1 text-sm text-ink-200">Esta área é restrita a super administradores.</p>
      </div>
    );
  }

  return <Outlet />;
}
