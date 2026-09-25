import { Link } from 'react-router-dom';

import { Field, inputClass } from '@/components/ui/Field.jsx';
import { textoDoConsentimento } from '@/utils/lead.js';

/**
 * Peças comuns aos formulários de lead. Recebem `register` e `errors` do
 * react-hook-form do formulário que as usa.
 */

/** Nome, telefone e e-mail — os mesmos em todo formulário. */
export function CamposDeContato({ register, errors, prefixo }) {
  const id = (campo) => `${prefixo}-${campo}`;

  return (
    <>
      <Field id={id('name')} label="Seu nome" required error={errors.name?.message}>
        {(props) => (
          <input {...props} {...register('name')} autoComplete="name" className={inputClass} />
        )}
      </Field>
      <Field
        id={id('phone')}
        label="WhatsApp ou telefone"
        required
        hint="Com DDD"
        error={errors.phone?.message}
      >
        {(props) => (
          <input
            {...props}
            {...register('phone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(49) 99999-8888"
            className={inputClass}
          />
        )}
      </Field>
      <Field id={id('email')} label="E-mail" hint="Opcional" error={errors.email?.message}>
        {(props) => (
          <input
            {...props}
            {...register('email')}
            type="email"
            autoComplete="email"
            className={inputClass}
          />
        )}
      </Field>
    </>
  );
}

/**
 * Consentimento (LGPD). Desmarcado por padrão: consentimento pré-marcado não
 * vale como consentimento.
 */
export function Consentimento({ register, errors, prefixo, nomeDaLoja }) {
  const id = `${prefixo}-consent`;
  const erroId = errors.consent ? `${id}-erro` : undefined;
  const [antes] = textoDoConsentimento(nomeDaLoja).split('Política de Privacidade');

  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-2.5 text-xs text-ink-400">
        <input
          id={id}
          type="checkbox"
          {...register('consent')}
          aria-invalid={errors.consent ? true : undefined}
          aria-describedby={erroId}
          className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
        />
        <span>
          {antes}
          <Link
            to="/privacidade"
            target="_blank"
            className="text-ink-200 underline hover:text-brand-500"
          >
            Política de Privacidade
          </Link>
          .
        </span>
      </label>
      {errors.consent && (
        <p id={erroId} role="alert" className="mt-1.5 text-xs text-danger">
          {errors.consent.message}
        </p>
      )}
    </div>
  );
}

/**
 * Honeypot: campo que pessoa nenhuma vê nem alcança pelo teclado, mas robô de
 * formulário preenche. Fora da tela (não `display: none`, que alguns robôs
 * detectam) e fora da ordem de tabulação e da árvore de acessibilidade.
 */
export function Honeypot({ register, prefixo }) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label htmlFor={`${prefixo}-website`}>Não preencha este campo</label>
      <input
        id={`${prefixo}-website`}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        {...register('website')}
      />
    </div>
  );
}

/** Erro do envio, com a lista de campos que o servidor recusou. */
export function mensagemDeErro(erro) {
  if (!erro) return null;
  if (erro.status === 429) return erro.message;
  const campos = erro.errors?.map((e) => e.message).filter(Boolean);
  return campos?.length ? `${erro.message}: ${campos.join(' · ')}` : erro.message;
}
