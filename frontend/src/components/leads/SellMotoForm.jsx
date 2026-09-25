import { zodResolver } from '@hookform/resolvers/zod';
import { LEAD_TYPE, MOTO_CONDITION_LABEL } from '@motorshop/shared';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';

import { FormSection } from '@/components/admin/FormSection.jsx';
import { Alert } from '@/components/ui/Alert.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Field, inputClass, selectClass } from '@/components/ui/Field.jsx';
import { useEnvioLead } from '@/hooks/useEnvioLead.js';
import { useStore } from '@/hooks/useStore.js';
import { montarLead } from '@/utils/lead.js';
import { origemDoLead } from '@/utils/origem.js';

import { CamposDeContato, Consentimento, Honeypot, mensagemDeErro } from './CamposDoLead.jsx';
import { comoNumero, comoOpcional, esquemaVenda } from './esquemas.js';
import { LeadEnviado } from './LeadEnviado.jsx';

/** "Venda sua moto" (lead `SELL_MOTO`): dados da moto do cliente + contato. */
export function SellMotoForm() {
  const { store } = useStore();
  const { pathname } = useLocation();
  const envio = useEnvioLead();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(esquemaVenda), defaultValues: { consent: false } });

  const enviar = (valores) =>
    envio.enviar(montarLead(LEAD_TYPE.SELL_MOTO, valores, { source: origemDoLead(pathname) }));

  if (envio.estado === 'sucesso') {
    return (
      <LeadEnviado titulo="Recebemos os dados da sua moto">
        A {store.name} vai analisar e responder com uma proposta pelo telefone informado.
      </LeadEnviado>
    );
  }

  const campo = (nome, rotulo, extras = {}) => (
    <Field
      id={`venda-${nome}`}
      label={rotulo}
      required={extras.required}
      hint={extras.hint}
      error={errors[nome]?.message}
    >
      {(props) => (
        <input
          {...props}
          {...register(nome, extras.numero ? { setValueAs: comoNumero } : undefined)}
          inputMode={extras.numero ? 'numeric' : undefined}
          placeholder={extras.placeholder}
          className={inputClass}
        />
      )}
    </Field>
  );

  return (
    <form noValidate onSubmit={handleSubmit(enviar)} className="relative space-y-6">
      <Honeypot register={register} prefixo="venda" />

      <FormSection titulo="Sua moto" colunas={2}>
        {campo('brand', 'Marca', { required: true, placeholder: 'Honda' })}
        {campo('model', 'Modelo', { required: true, placeholder: 'CG 160 Titan' })}
        {campo('year', 'Ano', { required: true, numero: true, placeholder: '2020' })}
        {campo('mileage', 'Quilometragem', { required: true, numero: true, placeholder: '30000' })}
        {campo('expectedPrice', 'Valor pretendido (R$)', {
          numero: true,
          hint: 'Opcional',
        })}
        <Field
          id="venda-condition"
          label="Estado geral"
          hint="Opcional"
          error={errors.condition?.message}
        >
          {(props) => (
            <select
              {...props}
              {...register('condition', { setValueAs: comoOpcional })}
              className={selectClass}
            >
              <option value="">Selecione…</option>
              {Object.entries(MOTO_CONDITION_LABEL).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          )}
        </Field>
      </FormSection>

      <FormSection titulo="Seu contato" colunas={3}>
        <CamposDeContato register={register} errors={errors} prefixo="venda" />
      </FormSection>

      <Field
        id="venda-message"
        label="Algo mais?"
        hint="Opcional — revisões, detalhes, se quer trocar por outra moto…"
        error={errors.message?.message}
      >
        {(props) => (
          <textarea {...props} {...register('message')} rows={3} className={inputClass} />
        )}
      </Field>

      <Consentimento register={register} errors={errors} prefixo="venda" nomeDaLoja={store.name} />

      <Alert tone="error">{mensagemDeErro(envio.erro)}</Alert>

      <Button type="submit" size="lg" disabled={envio.enviando}>
        {envio.enviando ? 'Enviando…' : 'Pedir avaliação'}
      </Button>
    </form>
  );
}
