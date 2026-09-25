import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as authService from '@/services/authService.js';
import { setSessionLostHandler } from '@/services/api.js';

export const AuthContext = createContext(null);

/**
 * Estado da sessão administrativa.
 *
 * A sessão é restaurada pelo cookie de refresh (o token de acesso fica só em
 * memória) — mas **só quando o painel pede** (`verificarSessao`, chamado pelas
 * rotas protegidas e pelo login). Antes, a restauração rodava ao montar o app,
 * em toda página do site público: um visitante que nunca entrou no painel
 * disparava uma renovação por visita, recebia 401 e ficava com erro no console.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [verificada, setVerificada] = useState(false);
  const iniciada = useRef(false);

  const verificarSessao = useCallback(() => {
    if (iniciada.current) return;
    iniciada.current = true;

    authService
      .restoreSession()
      .then(setUser)
      // Sem sessão válida é o caso normal de quem ainda não entrou.
      .catch(() => setUser(null))
      .finally(() => setVerificada(true));
  }, []);

  // Quando a renovação falha no interceptor, a sessão morreu: reflete na UI.
  useEffect(() => {
    setSessionLostHandler(() => setUser(null));
    return () => setSessionLostHandler(null);
  }, []);

  const signIn = useCallback(async (credenciais) => {
    const autenticado = await authService.login(credenciais);
    iniciada.current = true;
    setUser(autenticado);
    setVerificada(true);
    return autenticado;
  }, []);

  const signOut = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isRestoring: !verificada,
      isAuthenticated: Boolean(user),
      verificarSessao,
      signIn,
      signOut,
    }),
    [user, verificada, verificarSessao, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
