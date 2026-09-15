import { zodResolver } from '@hookform/resolvers/zod';
import { FUEL_LABEL, MOTO_LIMITS, MOTO_STATUS_LABEL, TRANSMISSION_LABEL } from '@motorshop/shared';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

import { Alert } from '@/components/ui/Alert.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Field, inputClass } from '@/components/ui/Field.jsx';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { marcasAdmin, motosAdmin } from '@/services/adminService.js';

const ANO_MAX = new Date().getFullYear() + 1;

/**
 * Mesmas regras do servidor, reaplicadas aqui só para dar retorno imediato.
 * A validação que vale é a do backend — esta apenas evita uma ida à rede.
 */
const schema = z
  .object({
    brand: z.string().min(1, 'Selecione a marca'),
    model: z.string().trim().min(1, 'Informe o modelo').max(80),
    version: z.string().trim().max(80).optional(),
    year: z.coerce.number().int().min(MOTO_LIMITS.MIN_YEAR).max(ANO_MAX),
    mileage: z.coerce.number().int().min(0, 'Não pode ser negativa'),
    price: z.coerce.number().positive('Informe um preço maior que zero'),
    previousPrice: z.union([z.coerce.number().positive(), z.literal('')]).optional(),
    engineCapacity: z.coerce
      .number()
      .int()
      .min(MOTO_LIMITS.MIN_ENGINE_CAPACITY)
      .max(MOTO_LIMITS.MAX_ENGINE_CAPACITY),
    fuel: z.string().min(1, 'Selecione o combustível'),
    transmission: z.string().min(1, 'Selecione o câmbio'),
    color: z.string().trim().min(1, 'Informe a cor').max(40),
    licensePlate: z.string().trim().max(10).optional(),
    description: z.string().trim().max(MOTO_LIMITS.MAX_DESCRIPTION).optional(),
    featured: z.boolean().optional(),
    onSale: z.boolean().optional(),
    status: z.string().optional(),
  })
  .refine((d) => !d.onSale || Number(d.previousPrice) > 0, {
    path: ['previousPrice'],
    message: 'Obrigatório quando a moto está em oferta',
  })
  .refine((d) => !d.previousPrice || Number(d.previousPrice) > Number(d.price), {
    path: ['previousPrice'],
    message: 'Deve ser maior que o preço atual',
  });

/** Remove campos vazios: a API rejeita string vazia onde espera número ou nulo. */
function limpar(valores) {
  const saida = {};
  for (const [chave, valor] of Object.entries(valores)) {
    if (valor === '' || valor === undefined) continue;
    saida[chave] = valor;
  }
  return saida;
}

export function MotoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = Boolean(id);
  const [erro, setErro] = useState(null);

  const { data: marcas } = useAsyncData(() => marcasAdmin.list(), []);
  const { data: moto, isLoading } = useAsyncData(
    () => (editando ? motosAdmin.get(id) : Promise.resolve(null)),
    [id],
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { featured: false, onSale: false, status: 'AVAILABLE' },
  });

  useEffect(() => {
    if (!moto) return;
    reset({
      ...moto,
      brand: moto.brand?.id ?? '',
      version: moto.version ?? '',
      previousPrice: moto.previousPrice ?? '',
      licensePlate: moto.licensePlate ?? '',
      description: moto.description ?? '',
    });
  }, [moto, reset]);

  const emOferta = watch('onSale');

  const onSubmit = async (valores) => {
    setErro(null);
    try {
      const payload = limpar(valores);
      if (editando) {
        await motosAdmin.update(id, payload);
      } else {
        await motosAdmin.create(payload);
      }
      navigate('/admin/motos');
    } catch (causa) {
      // Erros por campo vindos do servidor: mostra todos, não só o primeiro.
      const detalhes = causa.errors?.map((e) => `${e.field ?? ''} ${e.message}`.trim()).join(' · ');
      setErro(detalhes ? `${causa.message}: ${detalhes}` : causa.message);
    }
  };

  if (editando && isLoading) return <p className="text-ink-400">Carregando…</p>;

  const campoTexto = (nome, rotulo, opcoes = {}) => (
    <Field
      id={nome}
      label={rotulo}
      error={errors[nome]?.message}
      required={opcoes.required}
      hint={opcoes.hint}
    >
      {(props) => (
        <input {...props} {...register(nome)} type={opcoes.type ?? 'text'} className={inputClass} />
      )}
    </Field>
  );

  const campoSelect = (nome, rotulo, opcoes, required) => (
    <Field id={nome} label={rotulo} error={errors[nome]?.message} required={required}>
      {(props) => (
        <select {...props} {...register(nome)} className={inputClass}>
          <option value="">Selecione…</option>
          {opcoes.map(([valor, texto]) => (
            <option key={valor} value={valor}>
              {texto}
            </option>
          ))}
        </select>
      )}
    </Field>
  );

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">
        {editando ? 'Editar moto' : 'Cadastrar moto'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <Alert tone="error">{erro}</Alert>

        <fieldset className="space-y-4 rounded-xl border border-ink-800 p-5">
          <legend className="px-2 text-sm font-semibold text-ink-400">Identificação</legend>

          <div className="grid gap-4 sm:grid-cols-2">
            {campoSelect(
              'brand',
              'Marca',
              (marcas ?? []).map((m) => [m.id, m.name]),
              true,
            )}
            {campoTexto('model', 'Modelo', { required: true })}
            {campoTexto('version', 'Versão')}
            {campoTexto('year', 'Ano', { type: 'number', required: true })}
            {campoTexto('color', 'Cor', { required: true })}
            {campoTexto('licensePlate', 'Placa', { hint: 'Nunca exibida no site público' })}
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-ink-800 p-5">
          <legend className="px-2 text-sm font-semibold text-ink-400">Ficha técnica</legend>

          <div className="grid gap-4 sm:grid-cols-2">
            {campoTexto('mileage', 'Quilometragem', { type: 'number', required: true })}
            {campoTexto('engineCapacity', 'Cilindrada (cc)', { type: 'number', required: true })}
            {campoSelect('fuel', 'Combustível', Object.entries(FUEL_LABEL), true)}
            {campoSelect('transmission', 'Câmbio', Object.entries(TRANSMISSION_LABEL), true)}
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-ink-800 p-5">
          <legend className="px-2 text-sm font-semibold text-ink-400">Preço e exibição</legend>

          <div className="grid gap-4 sm:grid-cols-2">
            {campoTexto('price', 'Preço (R$)', { type: 'number', required: true })}
            {emOferta &&
              campoTexto('previousPrice', 'Preço anterior (R$)', {
                type: 'number',
                required: true,
              })}
            {campoSelect('status', 'Status', Object.entries(MOTO_STATUS_LABEL))}
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <label className="flex items-center gap-2 text-sm text-ink-200">
              <input type="checkbox" {...register('featured')} className="accent-brand-500" />
              Destaque na home
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-200">
              <input type="checkbox" {...register('onSale')} className="accent-brand-500" />
              Em oferta
            </label>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-ink-800 p-5">
          <legend className="px-2 text-sm font-semibold text-ink-400">Descrição</legend>
          <Field id="description" label="Texto do anúncio" error={errors.description?.message}>
            {(props) => (
              <textarea {...props} {...register('description')} rows={5} className={inputClass} />
            )}
          </Field>
        </fieldset>

        <p className="text-xs text-ink-400">
          O envio de fotos entra na FASE 8. Por enquanto as motos são cadastradas sem imagens.
        </p>

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando…' : 'Salvar'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/admin/motos')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
