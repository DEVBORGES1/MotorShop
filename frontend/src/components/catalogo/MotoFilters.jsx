import { FUEL_LABEL, TRANSMISSION_LABEL } from '@motorshop/shared';
import { useEffect, useState } from 'react';

import { inputClass } from '@/components/ui/Field.jsx';

/**
 * Painel de filtros do estoque.
 *
 * As contagens por marca, combustível e câmbio vêm de `GET /api/filtros`, que
 * as calcula sobre o estoque real — assim o visitante não escolhe um filtro
 * que devolve zero resultados.
 */

function Grupo({ titulo, children }) {
  return (
    <fieldset className="border-t border-ink-800 pt-5">
      <legend className="label-caps pr-3 text-[11px] text-ink-500">{titulo}</legend>
      <div className="mt-3">{children}</div>
    </fieldset>
  );
}

function Opcao({ marcada, onChange, children, contagem }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-ink-200">
      <input
        type="checkbox"
        checked={marcada}
        onChange={onChange}
        className="h-4 w-4 accent-brand-500"
      />
      <span className="flex-1">{children}</span>
      {contagem != null && <span className="text-xs text-ink-500">{contagem}</span>}
    </label>
  );
}

/** Campo numérico que só avisa o pai quando o visitante para de digitar. */
function CampoNumero({ id, rotulo, valor, onChange, placeholder }) {
  const [rascunho, setRascunho] = useState(valor);

  // A URL muda por fora (chip removido, "limpar filtros", botão voltar): o
  // campo precisa acompanhar em vez de manter o que estava digitado.
  useEffect(() => setRascunho(valor), [valor]);

  useEffect(() => {
    if (rascunho === valor) return undefined;

    const id = setTimeout(() => onChange(rascunho), 400);
    return () => clearTimeout(id);
  }, [rascunho, valor, onChange]);

  return (
    <div className="flex-1">
      <label htmlFor={id} className="sr-only">
        {rotulo}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min="0"
        value={rascunho}
        placeholder={placeholder}
        onChange={(evento) => setRascunho(evento.target.value)}
        className={`${inputClass} py-2`}
      />
    </div>
  );
}

export function MotoFilters({ filtros, faixas, aplicar, alternarNaLista }) {
  const marcas = faixas?.brands ?? [];
  const combustiveis = faixas?.fuel ?? [];
  const cambios = faixas?.transmission ?? [];

  return (
    <div className="space-y-5">
      {marcas.length > 0 && (
        <Grupo titulo="Marca">
          {marcas.map((marca) => (
            <Opcao
              key={marca.slug}
              marcada={filtros.marca.includes(marca.slug)}
              onChange={() => alternarNaLista('marca', marca.slug)}
              contagem={marca.count}
            >
              {marca.name}
            </Opcao>
          ))}
        </Grupo>
      )}

      <Grupo titulo="Preço">
        <div className="flex items-center gap-2">
          <CampoNumero
            id="preco-min"
            rotulo="Preço mínimo"
            placeholder="de R$"
            valor={filtros.precoMin}
            onChange={(precoMin) => aplicar({ precoMin })}
          />
          <span aria-hidden="true" className="text-ink-600">
            –
          </span>
          <CampoNumero
            id="preco-max"
            rotulo="Preço máximo"
            placeholder="até R$"
            valor={filtros.precoMax}
            onChange={(precoMax) => aplicar({ precoMax })}
          />
        </div>
      </Grupo>

      <Grupo titulo="Ano">
        <div className="flex items-center gap-2">
          <CampoNumero
            id="ano-min"
            rotulo="Ano mínimo"
            placeholder={faixas?.year?.min ? String(faixas.year.min) : 'de'}
            valor={filtros.anoMin}
            onChange={(anoMin) => aplicar({ anoMin })}
          />
          <span aria-hidden="true" className="text-ink-600">
            –
          </span>
          <CampoNumero
            id="ano-max"
            rotulo="Ano máximo"
            placeholder={faixas?.year?.max ? String(faixas.year.max) : 'até'}
            valor={filtros.anoMax}
            onChange={(anoMax) => aplicar({ anoMax })}
          />
        </div>
      </Grupo>

      <Grupo titulo="Quilometragem">
        <CampoNumero
          id="km-max"
          rotulo="Quilometragem máxima"
          placeholder="até quantos km"
          valor={filtros.kmMax}
          onChange={(kmMax) => aplicar({ kmMax })}
        />
      </Grupo>

      <Grupo titulo="Cilindrada">
        <div className="flex items-center gap-2">
          <CampoNumero
            id="cc-min"
            rotulo="Cilindrada mínima"
            placeholder="de cc"
            valor={filtros.ccMin}
            onChange={(ccMin) => aplicar({ ccMin })}
          />
          <span aria-hidden="true" className="text-ink-600">
            –
          </span>
          <CampoNumero
            id="cc-max"
            rotulo="Cilindrada máxima"
            placeholder="até cc"
            valor={filtros.ccMax}
            onChange={(ccMax) => aplicar({ ccMax })}
          />
        </div>
      </Grupo>

      {cambios.length > 0 && (
        <Grupo titulo="Câmbio">
          {cambios.map(({ value, count }) => (
            <Opcao
              key={value}
              marcada={filtros.cambio.includes(value)}
              onChange={() => alternarNaLista('cambio', value)}
              contagem={count}
            >
              {TRANSMISSION_LABEL[value] ?? value}
            </Opcao>
          ))}
        </Grupo>
      )}

      {combustiveis.length > 1 && (
        <Grupo titulo="Combustível">
          {combustiveis.map(({ value, count }) => (
            <Opcao
              key={value}
              marcada={filtros.combustivel.includes(value)}
              onChange={() => alternarNaLista('combustivel', value)}
              contagem={count}
            >
              {FUEL_LABEL[value] ?? value}
            </Opcao>
          ))}
        </Grupo>
      )}
    </div>
  );
}
