import { zodResolver } from '@hookform/resolvers/zod';
import { FUEL_LABEL, MOTO_LIMITS, MOTO_STATUS_LABEL, TRANSMISSION_LABEL } from '@motorshop/shared';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

import { FormSection } from '@/components/admin/FormSection.jsx';
import { ImageManager } from '@/components/admin/fotos/ImageManager.jsx';
import { PageHeader } from '@/components/admin/PageHeader.jsx';
import { Alert } from '@/components/ui/Alert.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Field, inputClass, selectClass } from '@/components/ui/Field.jsx';
import { Skeleton } from '@/components/ui/Skeleton.jsx';
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
  const { state } = useLocation();
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
        navigate('/admin/motos');
      } else {
        // Recém-cadastrada: segue para a edição, onde as fotos são enviadas —
        // o envio precisa do id da moto para escopar a pasta no provedor.
        const criada = await motosAdmin.create(payload);
        navigate(`/admin/motos/${criada.id}/editar`, {
          state: { aviso: 'Moto cadastrada. Agora adicione as fotos.' },
        });
      }
    } catch (causa) {
      // Erros por campo vindos do servidor: mostra todos, não só o primeiro.
      const detalhes = causa.errors?.map((e) => `${e.field ?? ''} ${e.message}`.trim()).join(' · ');
      setErro(detalhes ? `${causa.message}: ${detalhes}` : causa.message);
    }
  };

  if (editando && isLoading) return <Skeleton className="h-96 max-w-3xl" />;

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
        <select {...props} {...register(nome)} className={selectClass}>
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
    <div className="max-w-3xl">
      <PageHeader
        titulo={editando ? 'Editar moto' : 'Nova moto'}
        descricao={editando ? 'As alterações valem no site assim que salvas.' : undefined}
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <Alert tone="success">{state?.aviso}</Alert>
        <Alert tone="error">{erro}</Alert>

        <FormSection titulo="Identificação">
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
        </FormSection>

        <FormSection titulo="Ficha técnica">
          {campoTexto('mileage', 'Quilometragem', { type: 'number', required: true })}
          {campoTexto('engineCapacity', 'Cilindrada (cc)', { type: 'number', required: true })}
          {campoSelect('fuel', 'Combustível', Object.entries(FUEL_LABEL), true)}
          {campoSelect('transmission', 'Câmbio', Object.entries(TRANSMISSION_LABEL), true)}
        </FormSection>

        <FormSection titulo="Preço e exibição">
          {campoTexto('price', 'Preço (R$)', { type: 'number', required: true })}
          {emOferta &&
            campoTexto('previousPrice', 'Preço anterior (R$)', {
              type: 'number',
              required: true,
            })}
          {campoSelect('status', 'Status', Object.entries(MOTO_STATUS_LABEL))}

          <div className="flex flex-wrap gap-6 pt-1 sm:col-span-2">
            <label className="flex items-center gap-2.5 text-sm text-ink-200">
              <input
                type="checkbox"
                {...register('featured')}
                className="h-4 w-4 accent-brand-500"
              />
              Destaque na home
            </label>
            <label className="flex items-center gap-2.5 text-sm text-ink-200">
              <input type="checkbox" {...register('onSale')} className="h-4 w-4 accent-brand-500" />
              Em oferta
            </label>
          </div>
        </FormSection>

        <FormSection titulo="Descrição" colunas={1}>
          <Field id="description" label="Texto do anúncio" error={errors.description?.message}>
            {(props) => (
              <textarea {...props} {...register('description')} rows={5} className={inputClass} />
            )}
          </Field>
        </FormSection>

        {!editando && (
          <p className="text-xs text-ink-400">
            As fotos são adicionadas logo depois de salvar o cadastro.
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando…' : 'Salvar'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/admin/motos')}>
            Cancelar
          </Button>
        </div>
      </form>

      {/* Fora do <form>: o gestor tem botões e envios próprios, e formulário
          dentro de formulário não é HTML válido. */}
      {editando && moto && (
        <section aria-labelledby="fotos-titulo" className="mt-10">
          <h2 id="fotos-titulo" className="label-caps mb-3 text-[11px] text-ink-400">
            Fotos
          </h2>
          <div className="rounded-lg border border-ink-800 bg-surface p-5">
            <ImageManager
              key={moto.id}
              motoId={moto.id}
              imagensIniciais={moto.images ?? []}
              principalInicial={moto.mainImageId}
            />
          </div>
        </section>
      )}
    </div>
  );
}
