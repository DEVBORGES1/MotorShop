import { getDatabaseStatus } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Recusa cedo as requisições que dependem do banco quando ele não está pronto.
 *
 * Sem isto, o Mongoose enfileira o comando e só falha após o timeout de buffer
 * (10 s), devolvendo um 500 genérico: dez segundos de conexão presa por
 * requisição — superfície barata de negação de serviço — e nenhuma informação
 * útil para quem opera. Aqui a resposta é imediata e diz o que está errado.
 */
export function requireDatabase(req, res, next) {
  const { status, configured } = getDatabaseStatus();

  if (status === 'connected') return next();

  return next(
    new ApiError(
      503,
      configured
        ? 'Banco de dados indisponível no momento. Tente novamente em instantes.'
        : 'Banco de dados não configurado. Defina MONGODB_URI no arquivo .env.',
    ),
  );
}
