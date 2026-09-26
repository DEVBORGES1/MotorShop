import { useNavigate } from 'react-router-dom';

import { buttonClass } from '@/components/ui/Button.jsx';
import { selectClass } from '@/components/ui/Field.jsx';
import { formatarPreco } from '@/utils/format.js';

const FAIXAS_DE_PRECO = [10000, 20000, 30000, 50000];

/** Faixas de cilindrada (cc). `min`/`max` viram `ccMin`/`ccMax` na URL do estoque. */
const FAIXAS_DE_CILINDRADA = [
  { id: 'ate-160', rotulo: 'Até 160 cc', max: 160 },
  { id: '161-300', rotulo: '161 a 300 cc', min: 161, max: 300 },
  { id: '301-600', rotulo: '301 a 600 cc', min: 301, max: 600 },
  { id: 'acima-600', rotulo: 'Acima de 600 cc', min: 601 },
];

/** Só oferece a faixa que tem, ao menos, uma moto possível no estoque. */
function faixasComEstoque(intervalo) {
  if (!intervalo) return FAIXAS_DE_CILINDRADA;
  return FAIXAS_DE_CILINDRADA.filter(
    ({ min = 0, max = Infinity }) => intervalo.max >= min && intervalo.min <= max,
  );
}

/**
 * Busca rápida: leva para o estoque já filtrado, sem duplicar a lógica dele.
 * Cartão sobreposto à base do hero — é o primeiro passo natural de quem chega.
 */
export function BuscaRapida({ faixas }) {
  const navigate = useNavigate();
  const cilindradas = faixasComEstoque(faixas?.engineCapacity);

  const enviar = (evento) => {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    const params = new URLSearchParams();

    const marca = form.get('marca');
    const precoMax = form.get('precoMax');
    const faixa = FAIXAS_DE_CILINDRADA.find(({ id }) => id === form.get('cilindrada'));

    if (marca) params.set('marca', marca);
    if (faixa?.min) params.set('ccMin', faixa.min);
    if (faixa?.max) params.set('ccMax', faixa.max);
    if (precoMax) params.set('precoMax', precoMax);

    navigate({ pathname: '/estoque', search: params.toString() });
  };

  return (
    <div className="relative z-10 mx-auto -mt-12 max-w-7xl px-4 sm:px-6">
      <form
        onSubmit={enviar}
        aria-label="Busca rápida"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-ink-700 border-t-brand-500 bg-surface-2 p-4 shadow-2xl shadow-black/50 sm:p-5"
      >
        <div className="flex-1 basis-44">
          <label htmlFor="busca-marca" className="label-caps text-[10px] text-ink-500">
            Marca
          </label>
          <select id="busca-marca" name="marca" className={`${selectClass} mt-1.5`}>
            <option value="">Todas</option>
            {(faixas?.brands ?? []).map((marca) => (
              <option key={marca.slug} value={marca.slug}>
                {marca.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 basis-44">
          <label htmlFor="busca-cilindrada" className="label-caps text-[10px] text-ink-500">
            Cilindrada
          </label>
          <select id="busca-cilindrada" name="cilindrada" className={`${selectClass} mt-1.5`}>
            <option value="">Qualquer</option>
            {cilindradas.map(({ id, rotulo }) => (
              <option key={id} value={id}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 basis-44">
          <label htmlFor="busca-preco" className="label-caps text-[10px] text-ink-500">
            Preço até
          </label>
          <select id="busca-preco" name="precoMax" className={`${selectClass} mt-1.5`}>
            <option value="">Qualquer</option>
            {FAIXAS_DE_PRECO.map((valor) => (
              <option key={valor} value={valor}>
                {formatarPreco(valor)}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className={buttonClass({ size: 'lg', className: 'w-full sm:w-auto' })}
        >
          Buscar
        </button>
      </form>
    </div>
  );
}
