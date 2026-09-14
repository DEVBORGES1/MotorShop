import { ApiError } from '../utils/ApiError.js';

/**
 * Valida `body`, `query` e `params` com Zod antes do controller.
 *
 * O resultado validado (e coagido — `"2024"` vira `2024`) fica em
 * `req.validated`. O controller **não** deve ler `req.body` nem `req.query`
 * diretamente: usar o dado bruto anularia a validação.
 *
 * @param {{ body?: import('zod').ZodType, query?: import('zod').ZodType, params?: import('zod').ZodType }} schemas
 */
export function validate(schemas) {
  return (req, res, next) => {
    req.validated = {};

    for (const source of ['body', 'query', 'params']) {
      const schema = schemas[source];
      if (!schema) continue;

      const result = schema.safeParse(req[source]);

      if (!result.success) {
        return next(new ApiError(422, 'Dados inválidos', result.error.issues.map(toFieldError)));
      }

      req.validated[source] = result.data;
    }

    return next();
  };
}

/** Converte a issue do Zod no formato de erro por campo do envelope (§6.3). */
function toFieldError(issue) {
  return {
    field: issue.path.join('.') || null,
    code: issue.code,
    message: issue.message,
  };
}
