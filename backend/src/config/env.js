import { randomBytes } from 'node:crypto';

import { z } from 'zod';

/**
 * Configuração centralizada e validada do ambiente.
 *
 * Todo acesso a `process.env` no backend passa por aqui. Nenhum outro módulo
 * deve ler `process.env` diretamente — isso mantém um único ponto de verdade
 * e um único ponto de validação.
 */

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'];

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),

    // Aceita uma ou mais origens separadas por vírgula.
    FRONTEND_URL: z.string().trim().min(1).default('http://localhost:5173'),

    // Opcionais em desenvolvimento, obrigatórios em produção (ver superRefine).
    MONGODB_URI: z.string().trim().min(1).optional(),
    JWT_SECRET: z.string().trim().min(1).optional(),

    // Amarram o token a esta aplicação: um JWT emitido para outro sistema com
    // o mesmo segredo não é aceito aqui.
    JWT_ISSUER: z.string().trim().min(1).default('motorshop'),
    JWT_AUDIENCE: z.string().trim().min(1).default('motorshop-admin'),

    LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
    BODY_LIMIT: z.string().trim().default('100kb'),
  })
  .superRefine((value, ctx) => {
    if (value.MONGODB_URI && !/^mongodb(\+srv)?:\/\/.+/.test(value.MONGODB_URI)) {
      ctx.addIssue({
        code: 'custom',
        path: ['MONGODB_URI'],
        message: 'deve começar com "mongodb://" ou "mongodb+srv://"',
      });
    }

    // Segredo fraco é pior do que segredo ausente: ausente falha alto, fraco
    // passa despercebido até virar incidente.
    if (value.JWT_SECRET && value.JWT_SECRET.length < 32) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message: 'deve ter no mínimo 32 caracteres',
      });
    }

    if (value.NODE_ENV === 'production') {
      if (!value.MONGODB_URI) {
        ctx.addIssue({
          code: 'custom',
          path: ['MONGODB_URI'],
          message: 'é obrigatória em produção',
        });
      }
      if (!value.JWT_SECRET) {
        ctx.addIssue({
          code: 'custom',
          path: ['JWT_SECRET'],
          message: 'é obrigatório em produção',
        });
      }
    }
  });

/**
 * Valida uma fonte de variáveis de ambiente sem efeitos colaterais.
 * Exportada para permitir testar as regras sem derrubar o processo.
 *
 * @param {Record<string, string | undefined>} source
 * @returns {{ success: true, data: object } | { success: false, issues: string[] }}
 */
export function parseEnv(source) {
  // Uma variável declarada e vazia (`MONGODB_URI=` no .env) equivale a ausente.
  // Sem isso, copiar o .env.example para .env deixaria a API sem iniciar.
  const normalized = Object.fromEntries(
    Object.entries(source).filter(([, value]) => String(value ?? '').trim() !== ''),
  );

  const result = envSchema.safeParse(normalized);

  if (!result.success) {
    // Apenas o NOME da variável e o motivo. Nunca o valor — o log de um erro de
    // ambiente não pode virar o vazamento do segredo que ele está validando.
    const issues = result.error.issues.map((issue) => {
      const name = issue.path.join('.') || '(desconhecida)';
      return `${name}: ${issue.message}`;
    });
    return { success: false, issues };
  }

  const data = result.data;

  const isProduction = data.NODE_ENV === 'production';

  // Fora de produção, um segredo ausente é gerado na hora: `npm run dev`
  // funciona sem configuração, ao preço de as sessões não sobreviverem a um
  // reinício. Em produção a variável é obrigatória (validada acima), então
  // este caminho nunca é atingido lá.
  const jwtSecret = data.JWT_SECRET ?? randomBytes(48).toString('base64url');

  return {
    success: true,
    data: Object.freeze({
      ...data,
      JWT_SECRET: jwtSecret,
      hasPersistentJwtSecret: Boolean(data.JWT_SECRET),
      isProduction,
      isTest: data.NODE_ENV === 'test',
      corsOrigins: Object.freeze(
        data.FRONTEND_URL.split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),
    }),
  };
}

function loadEnv() {
  const result = parseEnv(process.env);

  if (!result.success) {
    // Falha antes de qualquer logger existir: console é o canal disponível.
    console.error('\n✖ Configuração de ambiente inválida:\n');
    for (const issue of result.issues) {
      console.error(`  • ${issue}`);
    }
    console.error('\nVerifique o arquivo .env na raiz do projeto (base: .env.example).\n');
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();
