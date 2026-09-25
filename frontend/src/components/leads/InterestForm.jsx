import { zodResolver } from '@hookform/resolvers/zod';
import { LEAD_TYPE, MOTO_STATUS } from '@motorshop/shared';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Field, inputClass } from '@/components/ui/Field.jsx';
import { useEnvioLead } from '@/hooks/useEnvioLead.js';
import { useStore } from '@/hooks/useStore.js';
import { montarLead } from '@/utils/lead.js';
import { origemDoLead } from '@/utils/origem.js';

import { CamposDeContato, Consentimento, Honeypot, mensagemDeErro } from './CamposDoLead.jsx';
import { esquemaInteresse } from './esquemas.js';
import { LeadEnviado } from './LeadEnviado.jsx';

/**
 * "Tenho interesse" da página da moto (lead `MOTO_INTEREST`, vinculado a ela).
 *
 * Na moto vendida o mesmo formulário vira "avise-me de uma similar" (decisão
 * A): o vínculo com a moto diz à loja exatamente o que a pessoa procura.
 */
export function InterestForm({ moto, nome, whatsapp }) {
  const { store } = useStore();
  const { pathname } = useLocation();
  const envio = useEnvioLead();
  const vendida = moto.status === MOTO_STATUS.SOLD;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(esquemaInteresse),
    defaultValues: {
      consent: false,
      message: vendida ? 'Quero ser avisado(a) quando chegar uma moto parecida.' : '',
    },
  });

  const enviar = (valores) =>
    envio.enviar(
      montarLead(LEAD_TYPE.MOTO_INTEREST, valores, {
        motoId: moto.id,
        source: origemDoLead(pathname),
      }),
    );

  if (envio.estado === 'sucesso') {
    return (
      <LeadEnviado whatsapp={whatsapp} titulo={vendida ? 'Pedido registrado' : undefined}>
        {vendida
          ? `A ${store.name} vai avisar quando chegar uma moto parecida com a ${nome}.`
          : `A ${store.name} vai entrar em contato sobre a ${nome} pelo telefone informado.`}
      </LeadEnviado>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit(enviar)} className="relative space-y-4">
      <Honeypot register={register} prefixo="interesse" />
      <CamposDeContato register={register} errors={errors} prefixo="interesse" />

      <Field
        id="interesse-message"
        label="Mensagem"
        hint="Opcional — troca, financiamento, horário para visita…"
        error={errors.message?.message}
      >
        {(props) => (
          <textarea {...props} {...register('message')} rows={3} className={inputClass} />
        )}
      </Field>

      <Consentimento
        register={register}
        errors={errors}
        prefixo="interesse"
        nomeDaLoja={store.name}
      />

      <Alert tone="error">{mensagemDeErro(envio.erro)}</Alert>

      <Button type="submit" size="lg" className="w-full" disabled={envio.enviando}>
        {envio.enviando ? 'Enviando…' : vendida ? 'Quero ser avisado' : 'Enviar interesse'}
      </Button>
    </form>
  );
}
