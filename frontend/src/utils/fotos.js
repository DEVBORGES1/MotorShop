import { MOTO_IMAGE_RULES, MOTO_LIMITS } from '@motorshop/shared';

/**
 * Regras da tela de fotos do painel, sem React: ordem, reposicionamento e a
 * triagem dos arquivos antes de gastar banda enviando o que seria recusado.
 */

/** Fotos na ordem de exibição. */
export const ordenarFotos = (imagens = []) =>
  [...imagens].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

/** Move o item da posição `de` para `para`, devolvendo uma nova lista. */
export function moverFoto(lista, de, para) {
  if (de === para || de < 0 || para < 0 || de >= lista.length || para >= lista.length) return lista;
  const copia = [...lista];
  const [item] = copia.splice(de, 1);
  copia.splice(para, 0, item);
  return copia;
}

const extensao = (nome) =>
  String(nome ?? '')
    .split('.')
    .pop()
    .toLowerCase();

/**
 * Motivo para recusar o arquivo, ou `null` se pode ser enviado. Olha a
 * extensão além do tipo: alguns navegadores entregam HEIC com `type` vazio.
 */
export function problemaNoArquivo(arquivo) {
  const formato = extensao(arquivo.name);
  const ehImagem = arquivo.type?.startsWith('image/') || MOTO_IMAGE_RULES.FORMATS.includes(formato);

  if (!ehImagem || !MOTO_IMAGE_RULES.FORMATS.includes(formato)) {
    return 'Formato não aceito (use JPG, PNG, WebP, AVIF ou HEIC)';
  }
  if (arquivo.size > MOTO_IMAGE_RULES.MAX_BYTES) return 'Arquivo acima de 10 MB';
  return null;
}

/**
 * Separa os arquivos escolhidos em aceitos e recusados (com motivo),
 * respeitando as vagas que restam até o limite de fotos da moto.
 */
export function triarArquivos(arquivos, fotosAtuais) {
  let vagas = MOTO_LIMITS.MAX_IMAGES - fotosAtuais;
  const aceitos = [];
  const recusados = [];

  for (const arquivo of arquivos) {
    const problema = problemaNoArquivo(arquivo);
    if (problema) {
      recusados.push({ arquivo, motivo: problema });
    } else if (vagas <= 0) {
      recusados.push({ arquivo, motivo: `Limite de ${MOTO_LIMITS.MAX_IMAGES} fotos por moto` });
    } else {
      aceitos.push(arquivo);
      vagas -= 1;
    }
  }

  return { aceitos, recusados };
}

/**
 * Executa `tarefa` para cada item, no máximo `limite` ao mesmo tempo. Enviar
 * 20 fotos de uma vez congestiona o 4G e faz todas demorarem; três em
 * paralelo mantêm o progresso visível e a conexão ocupada.
 */
export async function emParalelo(itens, limite, tarefa) {
  const fila = [...itens];
  const trabalhadores = Array.from({ length: Math.min(limite, fila.length) }, async () => {
    while (fila.length) await tarefa(fila.shift());
  });
  await Promise.all(trabalhadores);
}
