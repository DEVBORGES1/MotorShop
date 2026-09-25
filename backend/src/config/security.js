import { getStorage } from '../infra/storage/index.js';
import { env } from './env.js';

/**
 * Cabeçalhos de segurança do processo que serve site e API (ARCHITECTURE §8.1).
 * Revisados na FASE 10 — ver docs/SECURITY.md.
 */

/**
 * Content Security Policy.
 *
 * `script-src 'self'`, sem `unsafe-inline` e sem `unsafe-eval`: um XSS que
 * conseguisse injetar `<script>` ou `onclick=` não executaria. O padrão do
 * helmet bloquearia o que o site legitimamente usa — fotos do provedor e o
 * envio direto de fotos a ele —, então cada origem externa é liberada só no
 * tipo de recurso que precisa.
 */
export function contentSecurityPolicy() {
  const uploadOrigin = getStorage()?.uploadOrigin;

  return {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      // 'unsafe-inline' só em ESTILO: o React aplica `style` em alguns
      // elementos (barras do painel, cor do tema). Estilo não executa código.
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'"],
      // Fotos vêm do CDN do provedor; `blob:` são as prévias locais no painel.
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", ...(uploadOrigin ? [uploadOrigin] : [])],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  };
}

/** Opções do helmet: CSP acima, HSTS só em produção, sem enquadramento. */
export function helmetOptions() {
  return {
    contentSecurityPolicy: contentSecurityPolicy(),
    // HSTS só em produção: em desenvolvimento o site roda em http://localhost,
    // e um HSTS aprendido ali atrapalharia outros projetos na mesma máquina.
    // Dois anos, com subdomínios. Sem `preload`: a inclusão na lista dos
    // navegadores é difícil de desfazer e depende do domínio definitivo.
    strictTransportSecurity: env.isProduction
      ? { maxAge: 63_072_000, includeSubDomains: true }
      : false,
    // Coerente com `frame-ancestors 'none'` da CSP (navegadores antigos).
    xFrameOptions: { action: 'deny' },
    // Links para WhatsApp, Instagram etc. não carregam a URL de origem.
    referrerPolicy: { policy: 'no-referrer' },
  };
}

/**
 * Permissions-Policy: recursos do navegador que o site não usa ficam
 * desligados — inclusive para qualquer conteúdo de terceiros que um dia
 * venha a ser incorporado. Câmera, microfone e localização nunca são pedidos.
 */
const PERMISSIONS_POLICY = [
  'camera=()',
  'microphone=()',
  'geolocation=()',
  'payment=()',
  'usb=()',
  'serial=()',
  'bluetooth=()',
  'magnetometer=()',
  'gyroscope=()',
  'accelerometer=()',
  'browsing-topics=()',
].join(', ');

export function permissionsPolicy(req, res, next) {
  res.set('Permissions-Policy', PERMISSIONS_POLICY);
  next();
}
