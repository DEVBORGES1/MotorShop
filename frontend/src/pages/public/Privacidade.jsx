import { CONSENT_TEXT_VERSION } from '@motorshop/shared';
import { Link } from 'react-router-dom';

import { usePaginaSeo } from '@/hooks/useSeo.js';
import { useStore } from '@/hooks/useStore.js';
import { textoDoConsentimento } from '@/utils/lead.js';

/**
 * Política de privacidade dos formulários (LGPD).
 *
 * Gerada da configuração da loja — o controlador dos dados é a loja, não o
 * produto. Descreve só o que o sistema realmente faz (docs/SECURITY.md §10).
 */
export function Privacidade() {
  const { store } = useStore();
  usePaginaSeo('privacidade');
  const controlador = store.legalName || store.name;
  const canal = store.contact?.email || store.contact?.phone;

  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Política de privacidade</h1>
      <p className="mt-3 text-sm text-ink-400">
        Como a {store.name} trata os dados enviados pelos formulários deste site.
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-ink-200">
        <Secao titulo="Quem é o responsável">
          <p>{controlador} é a responsável (controladora) pelos dados informados neste site.</p>
        </Secao>

        <Secao titulo="Quais dados coletamos">
          <p>
            Só o que você escreve nos formulários: nome, telefone, e-mail (opcional) e mensagem; no
            formulário de venda, os dados da sua moto. Registramos também a página em que o
            formulário foi enviado e de onde você chegou ao site (por exemplo, uma busca ou um
            anúncio), para entendermos quais canais funcionam.
          </p>
        </Secao>

        <Secao titulo="Para que usamos">
          <p>
            Para responder ao seu contato: tirar dúvidas, falar sobre a moto que você viu, avaliar a
            sua ou avisar quando chegar uma parecida. Não vendemos nem cedemos seus dados, e não os
            usamos para outras finalidades.
          </p>
        </Secao>

        <Secao titulo="Base legal">
          <p>
            Seu consentimento, dado ao marcar a caixa de autorização antes de enviar. Guardamos a
            data e a versão do texto que você aceitou:
          </p>
          <blockquote className="mt-3 border-l-2 border-ink-700 pl-4 text-ink-400">
            “{textoDoConsentimento(store.name)}”
            <footer className="mt-1 text-xs text-ink-500">Versão {CONSENT_TEXT_VERSION}</footer>
          </blockquote>
        </Secao>

        <Secao titulo="Quem tem acesso">
          <p>
            Somente a equipe da loja, com login no painel administrativo. Os dados ficam em
            servidores de provedores de hospedagem contratados pela loja.
          </p>
        </Secao>

        <Secao titulo="Por quanto tempo guardamos">
          <p>
            Enquanto forem úteis para o atendimento. A loja revisa os contatos recebidos e exclui os
            que não precisa mais; e você pode pedir a exclusão a qualquer momento, como explicado
            abaixo.
          </p>
        </Secao>

        <Secao titulo="Seus direitos">
          <p>
            Você pode pedir a qualquer momento acesso, correção ou exclusão dos seus dados, ou
            retirar o consentimento.{' '}
            {canal ? (
              <>
                Basta falar com a loja pelo <strong className="text-ink-50">{canal}</strong> ou pela
                página de{' '}
                <Link to="/contato" className="text-brand-500 hover:underline">
                  contato
                </Link>
                .
              </>
            ) : (
              <>
                Basta falar com a loja pela página de{' '}
                <Link to="/contato" className="text-brand-500 hover:underline">
                  contato
                </Link>
                .
              </>
            )}{' '}
            A exclusão apaga o registro de forma definitiva.
          </p>
        </Secao>
      </div>
    </article>
  );
}

function Secao({ titulo, children }) {
  return (
    <section>
      <h2 className="label-caps text-[11px] text-ink-400">{titulo}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
