import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';
import { fail } from '../utils/apiResponse.js';

const GENERIC_MESSAGE = 'Erro interno do servidor';

/**
 * Traduz um erro para o envelope de resposta da API.
 * Erros não operacionais nunca têm sua mensagem repassada ao cliente.
 */
function normalize(error) {
  if (error instanceof ApiError) {
    return { statusCode: error.statusCode, message: error.message, errors: error.errors };
  }

  // Payload acima do limite configurado (express.json).
  if (error?.type === 'entity.too.large') {
    return { statusCode: 413, message: 'Payload excede o tamanho máximo permitido', errors: [] };
  }

  // JSON malformado no corpo da requisição.
  if (error instanceof SyntaxError && 'body' in error) {
    return { statusCode: 400, message: 'JSON inválido no corpo da requisição', errors: [] };
  }

  return { statusCode: 500, message: GENERIC_MESSAGE, errors: [] };
}

// eslint-disable-next-line no-unused-vars -- o Express exige aridade 4 para reconhecer o handler de erro
export function errorHandler(error, req, res, next) {
  const { statusCode, message, errors } = normalize(error);

  // Falha do servidor é sempre logada com stack; falha do cliente (4xx) não polui o log.
  const log = { err: error, requestId: req.id };
  if (statusCode >= 500) {
    logger.error(log, 'Erro não tratado');
  } else {
    logger.warn({ requestId: req.id, statusCode, message }, 'Requisição rejeitada');
  }

  const body = fail(message, { errors, requestId: req.id });

  // Stack apenas fora de produção. Em produção nada de caminho interno,
  // nome de dependência ou detalhe do banco chega ao cliente.
  if (!env.isProduction && error instanceof Error) {
    body.stack = error.stack;
  }

  res.status(statusCode).json(body);
}
