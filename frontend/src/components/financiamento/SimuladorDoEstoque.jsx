import { MOTO_SORT, PAGINATION } from '@motorshop/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Field, selectClass } from '@/components/ui/Field.jsx';
import { Skeleton } from '@/components/ui/Skeleton.jsx';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import * as publicService from '@/services/publicService.js';
import { formatarPreco } from '@/utils/format.js';
import { atributosDeImagem, imagemPrincipal, nomeDaMoto } from '@/utils/imagem.js';
import { caminhoDaMoto } from '@/utils/moto.js';
import { motosParaSimular } from '@/utils/simulador.js';

import { FinancingSimulator } from './FinancingSimulator.jsx';

const OUTRO_VALOR = 'outro';

/**
 * Simulador da página de financiamento, a partir do estoque: o visitante
 * escolhe uma moto da loja e já vê as parcelas — sem precisar saber o preço de
 * cor. A simulação enviada chega à loja ligada à moto. "Outro valor" deixa
 * digitar, para quem ainda não escolheu.
 *
 * Sem estoque (ou se a lista não carregar), o simulador funciona como antes,
 * só com o valor digitado.
 */
export function SimuladorDoEstoque() {
  const estoque = useAsyncData(
    () => publicService.motos.list({ limit: PAGINATION.MAX_LIMIT, sort: MOTO_SORT.RECENTES }),
    [],
  );
  const [escolha, setEscolha] = useState(null);

  if (estoque.isLoading) {
    return (
      <div aria-busy="true" className="space-y-5">
        <span className="sr-only" role="status">
          Carregando as motos do estoque…
        </span>
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const { opcoes, padrao } = motosParaSimular(estoque.data?.data);
  const selecionada =
    escolha === OUTRO_VALOR ? null : (opcoes.find((moto) => moto.id === escolha) ?? padrao);
  const nome = (moto) => [nomeDaMoto(moto), moto.year].filter(Boolean).join(' ');

  return (
    <div className="space-y-6">
      {opcoes.length > 0 && (
        <div className="space-y-4">
          <Field id="financiamento-moto" label="Moto para simular">
            {(props) => (
              <select
                {...props}
                value={selecionada?.id ?? OUTRO_VALOR}
                onChange={(evento) => setEscolha(evento.target.value)}
                className={selectClass}
              >
                {opcoes.map((moto) => (
                  <option key={moto.id} value={moto.id}>
                    {nome(moto)} · {formatarPreco(moto.price)}
                  </option>
                ))}
                <option value={OUTRO_VALOR}>Outro valor (digitar)</option>
              </select>
            )}
          </Field>

          {selecionada && <MotoEscolhida moto={selecionada} nome={nome(selecionada)} />}
        </div>
      )}

      <FinancingSimulator
        valorFixo={selecionada?.price}
        moto={selecionada ? { id: selecionada.id, nome: nome(selecionada) } : undefined}
        idPrefixo="financiamento"
      />
    </div>
  );
}

/** A moto escolhida, com foto e caminho para a página dela. */
function MotoEscolhida({ moto, nome }) {
  const foto = imagemPrincipal(moto);

  return (
    <div className="flex items-center gap-4 rounded-lg border border-ink-800 bg-surface-2 p-3">
      {foto && (
        <img
          {...atributosDeImagem(foto, 'miniatura')}
          alt=""
          decoding="async"
          className="aspect-4/3 w-24 shrink-0 rounded-md object-cover"
        />
      )}
      <div className="min-w-0">
        <p className="truncate font-bold text-ink-50">{nome}</p>
        <Link
          to={caminhoDaMoto(moto.slug)}
          className="mt-1 inline-block text-sm text-brand-500 hover:underline"
        >
          Ver fotos e ficha da moto →
        </Link>
      </div>
    </div>
  );
}
