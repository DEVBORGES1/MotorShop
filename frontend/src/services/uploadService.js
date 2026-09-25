/**
 * Envio do arquivo DIRETO ao provedor de imagens (ARCHITECTURE §10.4).
 *
 * Fica fora do cliente Axios da API de propósito: o destino é outro servidor,
 * e mandar o token de sessão da API para ele seria vazá-lo. O endereço e os
 * campos vêm da assinatura emitida pelo backend — nenhuma URL fixa aqui.
 *
 * XMLHttpRequest, e não fetch, porque só ele informa o progresso do envio.
 *
 * @param {{ uploadUrl: string, fields: Record<string, string|number> }} assinatura
 * @param {File} arquivo
 * @param {(fracao: number) => void} [onProgresso] de 0 a 1
 * @returns {Promise<object>} resposta do provedor
 */
export function enviarAoProvedor({ uploadUrl, fields }, arquivo, onProgresso) {
  return new Promise((resolve, reject) => {
    const corpo = new FormData();
    for (const [chave, valor] of Object.entries(fields)) corpo.append(chave, String(valor));
    corpo.append('file', arquivo);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);
    xhr.responseType = 'json';

    xhr.upload.onprogress = (evento) => {
      if (evento.lengthComputable) onProgresso?.(evento.loaded / evento.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300 && xhr.response) {
        resolve(xhr.response);
      } else {
        reject(new Error(xhr.response?.error?.message ?? `Envio recusado (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Falha de rede ao enviar a foto'));

    xhr.send(corpo);
  });
}

/** Da resposta do provedor, só o que a API precisa para verificar e vincular. */
export const metadadosDoEnvio = (resposta) => ({
  publicId: resposta.public_id,
  version: resposta.version,
  signature: resposta.signature,
  format: resposta.format,
  bytes: resposta.bytes,
  width: resposta.width,
  height: resposta.height,
});
