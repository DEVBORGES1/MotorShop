import { getStorage } from '../infra/storage/index.js';

/**
 * Content Security Policy do site servido por este processo.
 *
 * O padrão do helmet bloquearia o que o site legitimamente usa: fotos do
 * provedor de imagens e o envio direto de fotos ao provedor. Aqui
 * cada origem externa é liberada só no tipo de recurso que precisa.
 * (Revisão completa de cabeçalhos: FASE 10.)
 */
export function contentSecurityPolicy() {
  const uploadOrigin = getStorage()?.uploadOrigin;

  return {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      // 'unsafe-inline' em estilo: o React aplica `style` em alguns elementos
      // (barras do painel, cor do tema). Estilo não executa código.
      styleSrc: ["'self'", "'unsafe-inline'"],
      // Fontes servidas pelo próprio site (@fontsource): nenhum domínio externo.
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
