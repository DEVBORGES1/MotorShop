import { useEffect, useState } from 'react';

import { statusDeAbertura } from '@/utils/loja.js';

/**
 * "Aberto agora" / "Fechado agora · abre amanhã às 08:00", sempre atualizado.
 *
 * Depende da hora de quem visita, então só é calculado depois da montagem: o
 * HTML gerado no servidor não pode afirmar que a loja está aberta numa hora
 * que já passou. Antes disso (e sem horários configurados) devolve `null`.
 * Reavalia a cada minuto, para quem deixa a aba aberta ver a virada do horário.
 *
 * @returns {{ aberto: boolean, texto: string } | null}
 */
export function useSituacaoDaLoja(businessHours) {
  const [situacao, setSituacao] = useState(null);

  useEffect(() => {
    setSituacao(statusDeAbertura(businessHours));
    const relogio = setInterval(() => setSituacao(statusDeAbertura(businessHours)), 60_000);
    return () => clearInterval(relogio);
  }, [businessHours]);

  return situacao;
}
