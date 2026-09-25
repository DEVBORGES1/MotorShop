import { zodResolver } from '@hookform/resolvers/zod';
import { LEAD_TYPE } from '@motorshop/shared';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Field, inputClass } from '@/components/ui/Field.jsx';
import { useEnvioLead } from '@/hooks/useEnvioLead.js';
import { useStore } from '@/hooks/useStore.js';
import { montarLead } from '@/utils/lead.js';
import { origemDoLead } from '@/utils/origem.js';
import { linkWhatsApp } from '@/utils/whatsapp.js';

import { CamposDeContato, Consentimento, Honeypot, mensagemDeErro } from './CamposDoLead.jsx';
import { esquemaContato } from './esquemas.js';
import { LeadEnviado } from './LeadEnviado.jsx';

/** Formulário da página de contato (lead `CONTACT`). */
export function ContactForm() {
  const { store } = useStore();
  const { pathname } = useLocation();
  const envio = useEnvioLead();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(esquemaContato), defaultValues: { consent: false } });

  const enviar = (valores) =>
    envio.enviar(montarLead(LEAD_TYPE.CONTACT, valores, { source: origemDoLead(pathname) }));

  if (envio.estado === 'sucesso') {
    return (
      <LeadEnviado
        whatsapp={linkWhatsApp(store.contact?.whatsapp, `Olá! Vim pelo site da ${store.name}.`)}
        onNovo={() => {
          reset();
          envio.reiniciar();
        }}
      />
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit(enviar)} className="relative space-y-4">
      <Honeypot register={register} prefixo="contato" />

      <div className="grid gap-4 sm:grid-cols-3">
        <CamposDeContato register={register} errors={errors} prefixo="contato" />
      </div>

      <Field id="contato-message" label="Mensagem" required error={errors.message?.message}>
        {(props) => (
          <textarea {...props} {...register('message')} rows={4} className={inputClass} />
        )}
      </Field>

      <Consentimento
        register={register}
        errors={errors}
        prefixo="contato"
        nomeDaLoja={store.name}
      />

      <Alert tone="error">{mensagemDeErro(envio.erro)}</Alert>

      <Button type="submit" size="lg" disabled={envio.enviando}>
        {envio.enviando ? 'Enviando…' : 'Enviar mensagem'}
      </Button>
    </form>
  );
}
