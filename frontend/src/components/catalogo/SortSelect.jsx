import { MOTO_SORT } from '@motorshop/shared';

import { selectClass } from '@/components/ui/Field.jsx';

const OPCOES = [
  [MOTO_SORT.RECENTES, 'Mais recentes'],
  [MOTO_SORT.PRECO_ASC, 'Menor preço'],
  [MOTO_SORT.PRECO_DESC, 'Maior preço'],
  [MOTO_SORT.KM_ASC, 'Menor quilometragem'],
  [MOTO_SORT.ANO_DESC, 'Ano mais novo'],
  [MOTO_SORT.ANO_ASC, 'Ano mais antigo'],
];

export function SortSelect({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="ordenar" className="label-caps text-[11px] whitespace-nowrap text-ink-500">
        Ordenar
      </label>
      <select
        id="ordenar"
        value={value}
        onChange={(evento) => onChange(evento.target.value)}
        className={`${selectClass} w-auto py-2`}
      >
        {OPCOES.map(([valor, rotulo]) => (
          <option key={valor} value={valor}>
            {rotulo}
          </option>
        ))}
      </select>
    </div>
  );
}
