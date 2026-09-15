import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import * as authService from '@/services/authService.js';
import { setSessionLostHandler } from '@/services/api.js';

export const AuthContext = createContext(null);

/**
 * Estado da sessão administrativa.
 *
 * Ao montar, tenta restaurar a sessão pelo cookie de refresh — é o que permite
 * recarregar a página sem perder o login, mesmo com o token só em memória.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    let ativo = true;

    authService
      .restoreSession()
      .then((restaurado) => {
        if (ativo) setUser(restaurado);
      })
      .catch(() => {
        // Sem sessão válida é o caso normal de quem nunca entrou.
        if (ativo) setUser(null);
      })
      .finally(() => {
        if (ativo) setIsRestoring(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  // Quando a renovação falha no interceptor, a sessão morreu: reflete na UI.
  useEffect(() => {
    setSessionLostHandler(() => setUser(null));
    return () => setSessionLostHandler(null);
  }, []);

  const signIn = useCallback(async (credenciais) => {
    const autenticado = await authService.login(credenciais);
    setUser(autenticado);
    return autenticado;
  }, []);

  const signOut = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isRestoring, isAuthenticated: Boolean(user), signIn, signOut }),
    [user, isRestoring, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
