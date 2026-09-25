import { useCallback, useState } from 'react';

import * as publicService from '@/services/publicService.js';
import { criarTrava } from '@/utils/trava.js';

/**
 * Envio de um formulário de lead: estados `ocioso` → `enviando` → `sucesso`
 * ou `erro`.
 *
 * A trava não é o estado: dois cliques no mesmo quadro de animação chegam
 * aqui antes de o React re-renderizar com o botão desabilitado — com estado,
 * os dois veriam `ocioso` e enviariam. A trava (`criarTrava`) muda na hora.
 * (O servidor também descarta reenvio igual em instantes; são duas redes.)
 */
export function useEnvioLead() {
  const [estado, setEstado] = useState('ocioso');
  const [erro, setErro] = useState(null);
  // Criada uma vez por formulário (inicialização preguiçosa do useState).
  const [trava] = useState(criarTrava);

  const enviar = useCallback(
    (lead) =>
      trava(async () => {
        setEstado('enviando');
        setErro(null);
        try {
          await publicService.leads.create(lead);
          setEstado('sucesso');
        } catch (causa) {
          setErro(causa);
          setEstado('erro');
        }
      }),
    [trava],
  );

  const reiniciar = useCallback(() => {
    setEstado('ocioso');
    setErro(null);
  }, []);

  return { estado, erro, enviar, reiniciar, enviando: estado === 'enviando' };
}
