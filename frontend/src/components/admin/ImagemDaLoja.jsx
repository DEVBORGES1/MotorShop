import { useRef, useState } from 'react';

import { Button } from '@/components/ui/Button.jsx';
import { storeAdmin } from '@/services/adminService.js';
import { enviarAoProvedor, metadadosDoEnvio } from '@/services/uploadService.js';
import { problemaNoArquivo } from '@/utils/fotos.js';

/**
 * Logo ou imagem de compartilhamento da loja, nas Configurações.
 *
 * Salva na hora, separado do botão "Salvar configurações": o arquivo vai ao
 * provedor e o servidor confere e grava — o mesmo fluxo das fotos das motos.
 *
 * @param {{ tipo: 'logo'|'ogImage', titulo: string, descricao: string,
 *   imagem: object|null, podeEditar: boolean, onAlterada: (loja) => void }} props
 */
export function ImagemDaLoja({ tipo, titulo, descricao, imagem, podeEditar, onAlterada }) {
  const entrada = useRef(null);
  const [estado, setEstado] = useState({ ocupado: false, progresso: 0, erro: null });

  const enviar = async (arquivo) => {
    const problema = problemaNoArquivo(arquivo);
    if (problema) {
      setEstado({ ocupado: false, progresso: 0, erro: problema });
      return;
    }
    setEstado({ ocupado: true, progresso: 0, erro: null });
    try {
      const assinatura = await storeAdmin.assinaturaDeImagem();
      const resposta = await enviarAoProvedor(assinatura, arquivo, (progresso) =>
        setEstado((atual) => ({ ...atual, progresso })),
      );
      onAlterada(await storeAdmin.definirImagem(tipo, metadadosDoEnvio(resposta)));
      setEstado({ ocupado: false, progresso: 0, erro: null });
    } catch (causa) {
      setEstado({ ocupado: false, progresso: 0, erro: causa.message });
    }
  };

  const remover = async () => {
    if (!window.confirm(`Remover ${titulo.toLowerCase()}?`)) return;
    setEstado({ ocupado: true, progresso: 0, erro: null });
    try {
      onAlterada(await storeAdmin.removerImagem(tipo));
      setEstado({ ocupado: false, progresso: 0, erro: null });
    } catch (causa) {
      setEstado({ ocupado: false, progresso: 0, erro: causa.message });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex h-20 w-36 shrink-0 items-center justify-center overflow-hidden rounded-md border border-ink-800 bg-ink-900">
        {imagem?.url ? (
          <img
            src={imagem.url}
            alt={`${titulo} atual`}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-xs text-ink-500">Sem imagem</span>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-semibold text-ink-100">{titulo}</p>
        <p className="text-xs text-ink-400">{descricao}</p>
        {estado.ocupado && estado.progresso > 0 && (
          <progress
            value={estado.progresso}
            max={1}
            aria-label={`Envio de ${titulo.toLowerCase()}`}
            className="h-1.5 w-full accent-brand-500"
          />
        )}
        {estado.erro && (
          <p role="alert" className="text-xs text-danger">
            {estado.erro}
          </p>
        )}
        {podeEditar && (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={estado.ocupado}
              onClick={() => entrada.current?.click()}
            >
              {imagem?.url ? 'Trocar' : 'Enviar'}
            </Button>
            {imagem?.url && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={estado.ocupado}
                onClick={remover}
              >
                Remover
              </Button>
            )}
            <input
              ref={entrada}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label={`Arquivo de ${titulo.toLowerCase()}`}
              onChange={(evento) => {
                const [arquivo] = evento.target.files;
                if (arquivo) enviar(arquivo);
                evento.target.value = '';
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
