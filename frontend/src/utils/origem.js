/**
 * De onde veio o visitante que virou lead (`source` do lead).
 *
 * O que interessa é a **chegada** ao site, não a página anterior: quem entra
 * por um anúncio do Instagram, navega por cinco motos e só então preenche o
 * formulário veio do Instagram, não da página de estoque. Por isso referrer e
 * UTM são guardados uma vez, na primeira página da visita, e reaproveitados em
 * qualquer formulário enviado depois.
 */

const CHAVE = 'motorshop:chegada';
const CAMPOS_UTM = ['source', 'medium', 'campaign', 'term', 'content'];
const MAX = 100;

/** `?utm_source=instagram&utm_campaign=verao` → `{ source, campaign }`, ou `undefined`. */
export function extrairUtm(search) {
  const params = new URLSearchParams(search ?? '');
  const utm = {};

  for (const campo of CAMPOS_UTM) {
    const valor = params.get(`utm_${campo}`)?.trim();
    if (valor) utm[campo] = valor.slice(0, MAX);
  }

  return Object.keys(utm).length ? utm : undefined;
}

/**
 * Origem da chegada. Referrer do próprio site não é origem (é navegação
 * interna) e é descartado.
 */
export function origemDaChegada({ referrer, search, host }) {
  let externo;
  try {
    externo = referrer && new URL(referrer).host !== host ? referrer.slice(0, 500) : undefined;
  } catch {
    externo = undefined;
  }

  return { referrer: externo, utm: extrairUtm(search) };
}

/** Registra a chegada, só na primeira página da visita. Chamado uma vez, no boot. */
export function registrarChegada() {
  try {
    if (sessionStorage.getItem(CHAVE)) return;
    const origem = origemDaChegada({
      referrer: document.referrer,
      search: window.location.search,
      host: window.location.host,
    });
    sessionStorage.setItem(CHAVE, JSON.stringify(origem));
  } catch {
    // Navegação privada ou armazenamento bloqueado: segue sem origem. Nunca
    // pode impedir o envio do formulário.
  }
}

function chegadaRegistrada() {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE) ?? '{}');
  } catch {
    return {};
  }
}

/** `source` do lead: a página do formulário mais a origem da chegada. */
export function origemDoLead(pagina, chegada = chegadaRegistrada()) {
  const origem = { page: pagina };
  if (chegada.referrer) origem.referrer = chegada.referrer;
  if (chegada.utm) origem.utm = chegada.utm;
  return origem;
}
