/**
 * Erro operacional da aplicação — previsto, com resposta HTTP definida.
 *
 * Distingue-se de um erro inesperado: o `errorHandler` expõe a mensagem de um
 * ApiError ao cliente, mas nunca a de um erro desconhecido (que pode conter
 * detalhe interno).
 */
export class ApiError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message  Mensagem segura para exibir ao cliente.
   * @param {Array<{ field?: string, code?: string, message: string }>} [errors]
   */
  constructor(statusCode, message, errors = []) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace?.(this, ApiError);
  }

  static notFound(message = 'Recurso não encontrado') {
    return new ApiError(404, message);
  }

  static badRequest(message = 'Requisição inválida', errors = []) {
    return new ApiError(400, message, errors);
  }

  static forbidden(message = 'Acesso negado') {
    return new ApiError(403, message);
  }
}
