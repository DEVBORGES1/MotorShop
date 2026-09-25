import { Button } from '@/components/ui/Button.jsx';

/**
 * Confirmação de envio. Diz o que acontece agora — "recebemos" sozinho deixa
 * a pessoa sem saber se deve esperar ligação, mensagem ou nada.
 */
export function LeadEnviado({ titulo = 'Recebemos seu contato', children, onNovo, whatsapp }) {
  return (
    <div role="status" className="rounded-lg border border-ok/40 bg-ok/10 p-5">
      <p className="font-display text-lg font-extrabold text-ink-50">{titulo}</p>
      <p className="mt-2 text-sm text-ink-200">
        {children ?? 'A loja vai responder pelo telefone informado, em horário comercial.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer noopener"
            className="text-sm text-brand-500 hover:underline"
          >
            Com pressa? Chame no WhatsApp
          </a>
        )}
        {onNovo && (
          <Button variant="ghost" size="sm" onClick={onNovo}>
            Enviar outra mensagem
          </Button>
        )}
      </div>
    </div>
  );
}
