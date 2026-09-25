import { MOTO_IMAGE_RULES } from '@motorshop/shared';
import { useState } from 'react';

import { Badge } from '@/components/ui/Badge.jsx';
import { inputClass } from '@/components/ui/Field.jsx';

/**
 * Uma foto na grade do painel. Arrastável, mas com botões para tudo que o
 * arrastar faz: arrastar-e-soltar não funciona por teclado nem, de forma
 * confiável, em telas de toque.
 */
export function FotoItem({
  foto,
  indice,
  total,
  principal,
  imagem,
  onArrastarInicio,
  onSoltar,
  onMover,
  onPrincipal,
  onSalvarAlt,
  onExcluir,
}) {
  const [alt, setAlt] = useState(foto.alt ?? '');
  const [alvo, setAlvo] = useState(false);
  const posicao = `foto ${indice + 1} de ${total}`;

  return (
    <li
      draggable
      onDragStart={(evento) => {
        evento.dataTransfer.effectAllowed = 'move';
        onArrastarInicio();
      }}
      onDragOver={(evento) => {
        if (evento.dataTransfer.types.includes('Files')) return;
        evento.preventDefault();
        setAlvo(true);
      }}
      onDragLeave={() => setAlvo(false)}
      onDrop={(evento) => {
        evento.preventDefault();
        setAlvo(false);
        onSoltar();
      }}
      className={`overflow-hidden rounded-lg border bg-surface-2 transition ${
        alvo ? 'border-brand-500' : principal ? 'border-brand-500/60' : 'border-ink-800'
      }`}
    >
      <div className="relative aspect-4/3 cursor-grab bg-ink-900 active:cursor-grabbing">
        <img
          {...imagem}
          alt={foto.alt || `Foto ${indice + 1}`}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="h-full w-full object-cover"
        />
        <span className="label-caps absolute top-2 left-2 rounded-sm bg-ink-900/80 px-1.5 py-0.5 text-[10px] text-ink-100">
          {indice + 1}
        </span>
        {principal && (
          <span className="absolute top-2 right-2">
            <Badge tone="brand">Principal</Badge>
          </span>
        )}
      </div>

      <div className="space-y-2 p-2.5">
        <label className="block">
          <span className="sr-only">Descrição da {posicao}</span>
          <input
            value={alt}
            maxLength={MOTO_IMAGE_RULES.MAX_ALT}
            onChange={(evento) => setAlt(evento.target.value)}
            onBlur={() => onSalvarAlt(alt.trim())}
            placeholder="Descrição (ex.: lateral esquerda)"
            className={`${inputClass} px-2 py-1.5 text-xs`}
          />
        </label>

        <div className="flex flex-wrap items-center gap-1">
          <Acao
            rotulo={`Mover ${posicao} para trás`}
            onClick={() => onMover(indice - 1)}
            disabled={indice === 0}
          >
            ←
          </Acao>
          <Acao
            rotulo={`Mover ${posicao} para frente`}
            onClick={() => onMover(indice + 1)}
            disabled={indice === total - 1}
          >
            →
          </Acao>
          {!principal && (
            <button
              type="button"
              onClick={onPrincipal}
              className="label-caps rounded-md px-2 py-1.5 text-[10px] text-ink-200 hover:bg-ink-800 hover:text-brand-500"
            >
              Tornar principal
            </button>
          )}
          <button
            type="button"
            onClick={onExcluir}
            aria-label={`Excluir ${posicao}`}
            className="label-caps ml-auto rounded-md px-2 py-1.5 text-[10px] text-danger hover:bg-danger/10"
          >
            Excluir
          </button>
        </div>
      </div>
    </li>
  );
}

function Acao({ rotulo, onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={rotulo}
      className="flex h-8 w-8 items-center justify-center rounded-md text-ink-200 hover:bg-ink-800 hover:text-ink-50 disabled:opacity-30"
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}
