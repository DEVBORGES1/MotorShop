import { MOTO_STATUS } from '@motorshop/shared';

/**
 * Monta o link de conversa do WhatsApp.
 *
 * O número vem da configuração da loja e cada lojista digita de um jeito
 * ("(49) 99811-2215", "49998112215", "+55 49 9 9811-2215"). Normalizar aqui
 * evita que a diferença vire um link quebrado no site inteiro.
 */

const DDI_BRASIL = '55';

/** Só os dígitos, já com DDI. Devolve `null` quando não dá para montar. */
export function normalizarNumero(numero) {
  const digitos = String(numero ?? '').replace(/\D/g, '');
  if (!digitos) return null;

  // 10 dígitos (DDD + fixo) ou 11 (DDD + celular) são números nacionais sem
  // DDI: o 55 entra na frente. Acima disso o DDI já veio junto.
  if (digitos.length === 10 || digitos.length === 11) return DDI_BRASIL + digitos;
  if (digitos.length < 10) return null;

  return digitos;
}

/**
 * @param {string|null|undefined} numero número da loja, em qualquer formato
 * @param {string} [mensagem] texto que já vai digitado na conversa
 * @returns {string|null} URL do WhatsApp, ou `null` se a loja não tem número
 */
export function linkWhatsApp(numero, mensagem) {
  const destino = normalizarNumero(numero);
  if (!destino) return null;

  const texto = mensagem?.trim();
  return `https://wa.me/${destino}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
}

/**
 * Mensagem de interesse em uma moto, com o link da página.
 *
 * Muda com o status: perguntar "ainda está disponível?" sobre uma moto que o
 * site mostra como vendida faz o visitante parecer desatento e obriga a loja a
 * explicar o óbvio. Na vendida, o pedido vira "me avise de uma parecida" — é o
 * lead que a decisão A quer capturar.
 */
export function mensagemInteresse(moto, url) {
  const nome = [moto?.brand?.name, moto?.model, moto?.year].filter(Boolean).join(' ');
  if (!nome) return 'Olá! Vi o site e gostaria de mais informações.';

  const link = url ? ` (${url})` : '';

  if (moto.status === MOTO_STATUS.SOLD) {
    return `Olá! Vi no site que a ${nome}${link} já foi vendida. Quando chegar uma parecida, pode me avisar?`;
  }
  if (moto.status === MOTO_STATUS.RESERVED) {
    return `Olá! Tenho interesse na ${nome}${link}, que aparece como reservada. Se ela voltar a ficar disponível, pode me avisar?`;
  }

  return `Olá! Tenho interesse na ${nome}${link}. Ela ainda está disponível?`;
}
