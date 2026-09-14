/**
 * Configuração do frontend, centralizada.
 *
 * Nenhum componente ou serviço lê `import.meta.env` diretamente, e nenhuma URL
 * de API é escrita literalmente fora daqui.
 *
 * ATENÇÃO: tudo com prefixo VITE_ é embutido no bundle e é público.
 * Nunca coloque segredo nestas variáveis.
 */

const DEFAULT_API_URL = 'http://localhost:3000/api';

/** Base da API, sem barra final. */
export const apiBaseUrl = (import.meta.env.VITE_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, '');

export const isDev = import.meta.env.DEV;
