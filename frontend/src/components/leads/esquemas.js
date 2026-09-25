import { LEAD_LIMITS, leadContactFields, sellMotoDataSchema } from '@motorshop/shared';
import { z } from 'zod';

/**
 * Schemas dos formulários, montados com as mesmas peças que o servidor usa
 * (`@motorshop/shared`). O que muda é só o que existe no formulário e não na
 * API: a caixa de consentimento (booleano aqui, objeto com versão lá) e os
 * campos planos que `montarLead` reorganiza.
 */

const base = {
  ...leadContactFields,
  consent: z.literal(true, { error: 'Marque a autorização para podermos responder' }),
  website: z.string().optional(),
};

export const esquemaInteresse = z.object(base);

export const esquemaContato = z.object({
  ...base,
  message: z
    .string()
    .trim()
    .min(5, 'Escreva sua mensagem')
    .max(LEAD_LIMITS.MAX_MESSAGE, 'Mensagem longa demais'),
});

export const esquemaVenda = z.object({ ...base, ...sellMotoDataSchema.shape });

/** Número opcional vindo de `<input>`: vazio vira ausente, não zero. */
export const comoNumero = (valor) => (valor === '' || valor == null ? undefined : Number(valor));

/** Select opcional: "Selecione…" vira ausente. */
export const comoOpcional = (valor) => (valor === '' ? undefined : valor);
