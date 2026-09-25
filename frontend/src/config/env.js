/**
 * Configuração do frontend, centralizada.
 *
 * Nenhum componente ou serviço lê `import.meta.env` diretamente, e nenhuma URL
 * de API é escrita literalmente fora daqui.
 *
 * ATENÇÃO: tudo com prefixo VITE_ é embutido no bundle e é público.
 * Nunca coloque segredo nestas variáveis.
 */

/**
 * Em produção o site e a API são servidos pelo mesmo processo (ARCHITECTURE
 * §13.2): caminho relativo, mesma origem, sem CORS. Em desenvolvimento, o Vite
 * roda em outra porta e a API fica na 3000.
 */
const DEFAULT_API_URL = import.meta.env.DEV ? 'http://localhost:3000/api' : '/api';

/** Base da API, sem barra final. */
export const apiBaseUrl = (import.meta.env.VITE_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, '');

export const isDev = import.meta.env.DEV;
