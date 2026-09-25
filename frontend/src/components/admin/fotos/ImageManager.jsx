import { MOTO_IMAGE_RULES, MOTO_LIMITS } from '@motorshop/shared';
import { useRef, useState } from 'react';

import { Alert } from '@/components/ui/Alert.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { fotosAdmin } from '@/services/adminService.js';
import { enviarAoProvedor, metadadosDoEnvio } from '@/services/uploadService.js';
import { emParalelo, moverFoto, ordenarFotos, triarArquivos } from '@/utils/fotos.js';
import { atributosDeImagem } from '@/utils/imagem.js';

import { FotoItem } from './FotoItem.jsx';

const ACCEPT = MOTO_IMAGE_RULES.FORMATS.map((formato) => `.${formato}`).join(',');

/**
 * Fotos da moto no painel.
 *
 * Estado próprio, separado do formulário da moto: o formulário reseta os
 * campos quando os dados da moto mudam, e cada foto enviada mudaria esses
 * dados — apagando o que o lojista estivesse digitando.
 *
 * @param {{ motoId: string, imagensIniciais: object[], principalInicial: string|null }} props
 */
export function ImageManager({ motoId, imagensIniciais, principalInicial }) {
  const [fotos, setFotos] = useState(() => ordenarFotos(imagensIniciais));
  const [principal, setPrincipal] = useState(principalInicial);
  const [fila, setFila] = useState([]);
  const [avisos, setAvisos] = useState([]);
  const [erro, setErro] = useState(null);
  const [anuncio, setAnuncio] = useState('');
  const [sobreZona, setSobreZona] = useState(false);
  const arrastando = useRef(null);
  const entrada = useRef(null);

  const emEnvio = fila.filter((item) => item.estado === 'enviando').length;
  const cheia = fotos.length + emEnvio >= MOTO_LIMITS.MAX_IMAGES;

  const aplicar = (moto) => {
    setFotos(ordenarFotos(moto.images));
    setPrincipal(moto.mainImageId);
  };

  // Respostas de envios paralelos chegam fora de ordem; a mais antiga não
  // pode sobrescrever a lista com menos fotos do que já se sabe que existem.
  const aplicarSeMaisNova = (moto) => {
    setFotos((atuais) => (moto.images.length < atuais.length ? atuais : ordenarFotos(moto.images)));
    // Envio só acrescenta foto: a principal só muda quando não havia nenhuma.
    setPrincipal((atual) => atual ?? moto.mainImageId);
  };

  const atualizarItem = (chave, mudancas) =>
    setFila((atual) =>
      atual.map((item) => (item.chave === chave ? { ...item, ...mudancas } : item)),
    );

  const tirarDaFila = (chave) =>
    setFila((atual) => {
      const item = atual.find((i) => i.chave === chave);
      if (item) URL.revokeObjectURL(item.preview);
      return atual.filter((i) => i.chave !== chave);
    });

  async function enviar(arquivos) {
    setErro(null);
    const { aceitos, recusados } = triarArquivos(arquivos, fotos.length + emEnvio);
    setAvisos(recusados.map(({ arquivo, motivo }) => `${arquivo.name}: ${motivo}`));
    if (!aceitos.length) return;

    let assinatura;
    try {
      assinatura = await fotosAdmin.assinatura(motoId);
    } catch (causa) {
      setErro(causa.message);
      return;
    }

    const itens = aceitos.map((arquivo) => ({
      chave: crypto.randomUUID(),
      arquivo,
      nome: arquivo.name,
      preview: URL.createObjectURL(arquivo),
      progresso: 0,
      estado: 'enviando',
    }));
    setFila((atual) => [...atual, ...itens]);

    await emParalelo(itens, 3, async (item) => {
      try {
        const resposta = await enviarAoProvedor(assinatura, item.arquivo, (progresso) =>
          atualizarItem(item.chave, { progresso }),
        );
        aplicarSeMaisNova(await fotosAdmin.vincular(motoId, metadadosDoEnvio(resposta)));
        tirarDaFila(item.chave);
      } catch (causa) {
        atualizarItem(item.chave, { estado: 'erro', erro: causa.message });
      }
    });

    setAnuncio(`${itens.length === 1 ? 'Envio concluído' : 'Envios concluídos'}`);
  }

  /** Grava ordem e principal; em falha, volta ao que era e explica. */
  async function persistir(novaOrdem, novaPrincipal, mensagem) {
    const anteriores = { fotos, principal };
    setFotos(novaOrdem);
    setPrincipal(novaPrincipal);
    setErro(null);
    try {
      aplicar(
        await fotosAdmin.ordenar(motoId, {
          order: novaOrdem.map((foto) => foto.id),
          mainImageId: novaPrincipal,
        }),
      );
      setAnuncio(mensagem);
    } catch (causa) {
      setFotos(anteriores.fotos);
      setPrincipal(anteriores.principal);
      setErro(causa.message);
    }
  }

  const mover = (de, para) => {
    if (para < 0 || para >= fotos.length) return;
    persistir(moverFoto(fotos, de, para), principal, `Foto movida para a posição ${para + 1}`);
  };

  async function salvarAlt(foto, alt) {
    if (alt === (foto.alt ?? '')) return;
    try {
      aplicar(await fotosAdmin.alterar(motoId, foto.id, { alt }));
      setAnuncio('Descrição da foto salva');
    } catch (causa) {
      setErro(causa.message);
    }
  }

  async function excluir(foto, indice) {
    if (
      !window.confirm(`Excluir a foto ${indice + 1}? O arquivo também é apagado do armazenamento.`)
    ) {
      return;
    }
    setErro(null);
    try {
      aplicar(await fotosAdmin.remover(motoId, foto.id));
      setAnuncio('Foto excluída');
    } catch (causa) {
      setErro(causa.message);
    }
  }

  const aoSoltarNaZona = (evento) => {
    evento.preventDefault();
    setSobreZona(false);
    if (evento.dataTransfer.files?.length) enviar([...evento.dataTransfer.files]);
  };

  return (
    <div className="space-y-5">
      <p className="text-xs text-ink-400">
        {fotos.length} de {MOTO_LIMITS.MAX_IMAGES} fotos. Arraste para reordenar; a principal é a
        capa no catálogo e na página da moto.
      </p>

      <Alert tone="error">{erro}</Alert>
      {avisos.length > 0 && (
        <Alert tone="info">
          <p>Alguns arquivos não foram enviados:</p>
          <ul className="mt-1 list-disc pl-5">
            {avisos.map((aviso) => (
              <li key={aviso}>{aviso}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Anúncio para leitor de tela: reordenar e excluir mudam a lista sem
          mudar o foco, e sem isto a ação passaria em silêncio. */}
      <p aria-live="polite" className="sr-only">
        {anuncio}
      </p>

      {!cheia && (
        <label
          onDragOver={(evento) => {
            if (evento.dataTransfer.types.includes('Files')) {
              evento.preventDefault();
              setSobreZona(true);
            }
          }}
          onDragLeave={() => setSobreZona(false)}
          onDrop={aoSoltarNaZona}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition ${
            sobreZona ? 'border-brand-500 bg-brand-500/5' : 'border-ink-700 hover:border-ink-600'
          }`}
        >
          <span className="text-sm font-semibold text-ink-100">
            Arraste as fotos aqui ou clique para escolher
          </span>
          <span className="mt-1 text-xs text-ink-500">
            JPG, PNG, WebP, AVIF ou HEIC · até 10 MB cada · várias de uma vez
          </span>
          <input
            ref={entrada}
            type="file"
            multiple
            accept={`${ACCEPT},image/*`}
            className="sr-only"
            onChange={(evento) => {
              enviar([...evento.target.files]);
              evento.target.value = '';
            }}
          />
        </label>
      )}

      {fila.length > 0 && (
        <ul className="space-y-2" aria-label="Envios em andamento">
          {fila.map((item) => (
            <li
              key={item.chave}
              className="flex items-center gap-3 rounded-md border border-ink-800 bg-surface-2 p-2"
            >
              <img
                src={item.preview}
                alt=""
                className="h-12 w-16 shrink-0 rounded-sm object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-ink-200">{item.nome}</p>
                {item.estado === 'erro' ? (
                  <p className="text-xs text-danger">{item.erro}</p>
                ) : (
                  <progress
                    value={item.progresso}
                    max={1}
                    aria-label={`Envio de ${item.nome}`}
                    className="mt-1.5 h-1.5 w-full accent-brand-500"
                  />
                )}
              </div>
              {item.estado === 'erro' && (
                <Button size="sm" variant="ghost" onClick={() => tirarDaFila(item.chave)}>
                  Remover
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {fotos.length > 0 && (
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {fotos.map((foto, indice) => (
            <FotoItem
              key={foto.id}
              foto={foto}
              indice={indice}
              total={fotos.length}
              principal={foto.id === principal}
              imagem={atributosDeImagem(foto, 'card')}
              onArrastarInicio={() => {
                arrastando.current = indice;
              }}
              onSoltar={() => {
                if (arrastando.current != null) mover(arrastando.current, indice);
                arrastando.current = null;
              }}
              onMover={(para) => mover(indice, para)}
              onPrincipal={() => persistir(fotos, foto.id, 'Foto definida como principal')}
              onSalvarAlt={(alt) => salvarAlt(foto, alt)}
              onExcluir={() => excluir(foto, indice)}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
