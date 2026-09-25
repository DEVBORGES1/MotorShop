import { ContactForm } from '@/components/leads/ContactForm.jsx';
import { buttonClass } from '@/components/ui/Button.jsx';
import { Card, CardTitle } from '@/components/ui/Card.jsx';
import { useStore } from '@/hooks/useStore.js';
import { cidadeLinha, enderecoLinha, horariosAgrupados } from '@/utils/loja.js';
import { linkWhatsApp } from '@/utils/whatsapp.js';

/**
 * Contato: formulário (vira lead na tela de Leads do painel) e os canais
 * diretos da loja, para quem prefere ligar ou chamar no WhatsApp.
 */
export function Contato() {
  const { store } = useStore();
  const horarios = horariosAgrupados(store.businessHours);
  const endereco = enderecoLinha(store.address);
  const cidade = cidadeLinha(store.address);
  const whatsapp = linkWhatsApp(store.contact?.whatsapp, `Olá! Vim pelo site da ${store.name}.`);
  const telefone = store.contact?.phone;
  const email = store.contact?.email;

  const semCanais = !whatsapp && !telefone && !email && !endereco;

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Contato</h1>
      <p className="mt-2 text-sm text-ink-400">Fale com a {store.name} pelo canal que preferir.</p>

      <Card as="section" className="mt-10" aria-labelledby="contato-form-titulo">
        <h2 id="contato-form-titulo" className="label-caps text-[11px] text-ink-400">
          Envie uma mensagem
        </h2>
        <div className="mt-5">
          <ContactForm />
        </div>
      </Card>

      {!semCanais && (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {whatsapp && (
            <Card>
              <CardTitle>WhatsApp</CardTitle>
              <p className="mt-2 text-sm text-ink-400">
                O caminho mais rápido — respondemos em horário comercial.
              </p>
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer noopener"
                className={buttonClass({ className: 'mt-5' })}
              >
                Abrir conversa
              </a>
            </Card>
          )}

          {(telefone || email) && (
            <Card>
              <CardTitle>Outros canais</CardTitle>
              <ul className="mt-3 space-y-2 text-sm">
                {telefone && (
                  <li>
                    <a
                      href={`tel:${telefone.replace(/\D/g, '')}`}
                      className="text-ink-200 hover:text-brand-500"
                    >
                      {telefone}
                    </a>
                  </li>
                )}
                {email && (
                  <li>
                    <a href={`mailto:${email}`} className="text-ink-200 hover:text-brand-500">
                      {email}
                    </a>
                  </li>
                )}
              </ul>
            </Card>
          )}

          {(endereco || cidade) && (
            <Card>
              <CardTitle>Endereço</CardTitle>
              <address className="mt-3 text-sm text-ink-200 not-italic">
                {endereco && <div>{endereco}</div>}
                {cidade && <div className="text-ink-400">{cidade}</div>}
              </address>
              {store.address?.mapsUrl && (
                <a
                  href={store.address.mapsUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-3 inline-block text-sm text-brand-500 hover:underline"
                >
                  Abrir no mapa
                </a>
              )}
            </Card>
          )}

          {horarios.length > 0 && (
            <Card>
              <CardTitle>Horários</CardTitle>
              <dl className="mt-3 space-y-2 text-sm">
                {horarios.map(({ dias, horario }) => (
                  <div key={dias} className="flex justify-between gap-6">
                    <dt className="text-ink-400">{dias}</dt>
                    <dd className={horario ? 'text-ink-200' : 'text-ink-500'}>
                      {horario ?? 'Fechado'}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
