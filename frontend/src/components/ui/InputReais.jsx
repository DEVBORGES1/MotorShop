import { useState } from 'react';

import { inputClass } from '@/components/ui/Field.jsx';
import { formatarValor, lerValorEmReais } from '@/utils/format.js';

/**
 * Campo de valor em reais: "R$" fixo à esquerda, milhar separado e teclado
 * numérico no celular.
 *
 * Enquanto a pessoa digita, o texto fica como ela escreveu — reformatar a cada
 * tecla faria o cursor pular de lugar. Ao sair do campo, ele aparece formatado.
 * Recebe os props de acessibilidade do `Field` (id, aria-*).
 *
 * @param {{ value: number | '', onChange: (valor: number | '') => void }} props
 */
export function InputReais({ value, onChange, className = '', ...props }) {
  const [digitado, setDigitado] = useState(null);

  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-400"
      >
        R$
      </span>
      <input
        {...props}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={digitado ?? formatarValor(value)}
        onFocus={() => setDigitado(formatarValor(value))}
        onChange={(evento) => {
          setDigitado(evento.target.value);
          onChange(lerValorEmReais(evento.target.value));
        }}
        onBlur={() => setDigitado(null)}
        className={`${inputClass} pl-9 ${className}`}
      />
    </div>
  );
}
