import { useEffect, useState } from 'react';

import { FormSection } from '@/components/admin/FormSection.jsx';
import { PageHeader } from '@/components/admin/PageHeader.jsx';
import { Alert } from '@/components/ui/Alert.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Skeleton } from '@/components/ui/Skeleton.jsx';
import { Switch } from '@/components/ui/Switch.jsx';
import { colorClass, Field, inputClass } from '@/components/ui/Field.jsx';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { useAuth } from '@/hooks/useAuth.js';
import { storeAdmin } from '@/services/adminService.js';
import {
  abrirDia,
  horariosParaEnvio,
  horariosParaFormulario,
  validarHorarios,
} from '@/utils/horarios.js';

/**
 * Configurações da loja.
 *
 * É a tela que torna o produto revendável: nome, contato, endereço, horários,
 * módulos e cores vivem aqui, não no código. Trocar de cliente é preencher este
 * formulário — sem editar o banco na mão.
 *
 * Cada seção enviada substitui a anterior por inteiro na API, então o
 * formulário precisa carregar **todos** os campos de cada seção que salva: um
 * campo esquecido aqui seria apagado a cada "Salvar".
 */

const VAZIO = {
  name: '',
  slogan: '',
  legalName: '',
  contact: { whatsapp: '', phone: '', email: '' },
  address: {
    street: '',
    number: '',
    complement: '',
    district: '',
    city: '',
    state: '',
    zipCode: '',
    mapsUrl: '',
  },
  social: { instagram: '', facebook: '', youtube: '' },
  theme: { primary: '#4CD62B', secondary: '#0A0B0A', accent: '#38C172' },
  features: { financingEnabled: true, sellMotoEnabled: true },
  horarios: horariosParaFormulario([]),
};

const MODULOS = [
  {
    chave: 'sellMotoEnabled',
    rotulo: 'Sua moto na entrada',
    descricao: 'Mostra na página inicial a chamada para avaliar a moto do cliente.',
  },
  {
    chave: 'financingEnabled',
    rotulo: 'Financiamento',
    descricao: 'Mostra na página inicial a chamada de simulação de financiamento.',
  },
];

/** Mescla o que veio da API sobre a estrutura vazia, sem perder seções ausentes. */
function comDefaults(dados) {
  if (!dados) return VAZIO;
  return {
    ...VAZIO,
    ...dados,
    contact: { ...VAZIO.contact, ...(dados.contact ?? {}) },
    address: { ...VAZIO.address, ...(dados.address ?? {}) },
    social: { ...VAZIO.social, ...(dados.social ?? {}) },
    theme: { ...VAZIO.theme, ...(dados.theme ?? {}) },
    features: { ...VAZIO.features, ...(dados.features ?? {}) },
    horarios: horariosParaFormulario(dados.businessHours),
  };
}

/** A API recusa string vazia onde espera nulo; converte antes de enviar. */
function paraEnvio(secao) {
  return Object.fromEntries(
    Object.entries(secao).map(([chave, valor]) => [chave, valor === '' ? null : valor]),
  );
}

export function Configuracoes() {
  const { user } = useAuth();
  const podeEditar = user?.role === 'SUPER_ADMIN';

  const { data, error, isLoading } = useAsyncData(
    () => storeAdmin.get().catch(() => null), // 404 = ainda não configurada
    [],
  );

  const [form, setForm] = useState(VAZIO);
  const [mensagem, setMensagem] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [errosHorario, setErrosHorario] = useState({});

  useEffect(() => {
    setForm(comDefaults(data));
  }, [data]);

  const alterar = (secao, chave) => (evento) =>
    setForm((atual) =>
      secao
        ? { ...atual, [secao]: { ...atual[secao], [chave]: evento.target.value } }
        : { ...atual, [chave]: evento.target.value },
    );

  const alterarModulo = (chave) => (ligado) =>
    setForm((atual) => ({ ...atual, features: { ...atual.features, [chave]: ligado } }));

  const alternarDia = (weekday) => (aberto) =>
    setForm((atual) => ({
      ...atual,
      horarios: aberto
        ? abrirDia(atual.horarios, weekday)
        : atual.horarios.map((dia) => (dia.weekday === weekday ? { ...dia, aberto: false } : dia)),
    }));

  const alterarHorario = (weekday, chave) => (evento) =>
    setForm((atual) => ({
      ...atual,
      horarios: atual.horarios.map((dia) =>
        dia.weekday === weekday ? { ...dia, [chave]: evento.target.value } : dia,
      ),
    }));

  const salvar = async (evento) => {
    evento.preventDefault();
    setMensagem(null);

    const erros = validarHorarios(form.horarios);
    setErrosHorario(erros);
    if (Object.keys(erros).length > 0) {
      setMensagem({ tone: 'error', texto: 'Revise os horários destacados.' });
      return;
    }

    setSalvando(true);

    try {
      await storeAdmin.update({
        name: form.name,
        slogan: form.slogan || null,
        legalName: form.legalName || null,
        contact: paraEnvio(form.contact),
        address: paraEnvio(form.address),
        social: paraEnvio(form.social),
        businessHours: horariosParaEnvio(form.horarios),
        features: form.features,
        theme: form.theme,
      });
      setMensagem({ tone: 'success', texto: 'Configurações salvas.' });
    } catch (causa) {
      const detalhes = causa.errors?.map((e) => `${e.field ?? ''} ${e.message}`.trim()).join(' · ');
      setMensagem({
        tone: 'error',
        texto: detalhes ? `${causa.message}: ${detalhes}` : causa.message,
      });
    } finally {
      setSalvando(false);
    }
  };

  if (isLoading) return <Skeleton className="h-96 max-w-3xl" />;

  const campo = (secao, chave, rotulo, extras = {}) => (
    <Field id={`${secao ?? 'root'}-${chave}`} label={rotulo} hint={extras.hint}>
      {(props) => (
        <input
          {...props}
          type={extras.type ?? 'text'}
          value={(secao ? form[secao][chave] : form[chave]) ?? ''}
          onChange={alterar(secao, chave)}
          disabled={!podeEditar}
          className={extras.type === 'color' ? colorClass : inputClass}
        />
      )}
    </Field>
  );

  return (
    <div className="max-w-3xl">
      <PageHeader
        titulo="Configurações da loja"
        descricao="Identidade, contato, horários, módulos e cores aplicados ao site público"
      />

      {!podeEditar && (
        <Alert tone="info">
          Somente super administradores podem alterar a identidade da loja. Você pode visualizar.
        </Alert>
      )}

      <Alert tone={mensagem?.tone ?? 'error'}>{mensagem?.texto ?? error?.message}</Alert>

      <form onSubmit={salvar} className="space-y-6">
        <FormSection titulo="Identidade" colunas={2}>
          {campo(null, 'name', 'Nome da loja')}
          {campo(null, 'slogan', 'Slogan')}
          {campo(null, 'legalName', 'Razão social', { hint: 'Nome registrado da empresa' })}
        </FormSection>

        <FormSection titulo="Contato" colunas={3}>
          {campo('contact', 'whatsapp', 'WhatsApp', { hint: 'Com DDD' })}
          {campo('contact', 'phone', 'Telefone')}
          {campo('contact', 'email', 'E-mail', { type: 'email' })}
        </FormSection>

        <FormSection titulo="Endereço" colunas={2}>
          {campo('address', 'street', 'Rua')}
          {campo('address', 'number', 'Número')}
          {campo('address', 'complement', 'Complemento', { hint: 'Sala, bloco, loja…' })}
          {campo('address', 'district', 'Bairro')}
          {campo('address', 'city', 'Cidade')}
          {campo('address', 'state', 'UF', { hint: 'Duas letras' })}
          {campo('address', 'zipCode', 'CEP')}
          {campo('address', 'mapsUrl', 'Link do mapa', {
            type: 'url',
            hint: 'Google Maps → Compartilhar → Copiar link',
          })}
        </FormSection>

        <FormSection
          titulo="Horários de funcionamento"
          colunas={1}
          descricao="Aparecem no rodapé e nas páginas Sobre e Contato, com dias seguidos de mesmo horário agrupados. Com todos os dias fechados, o site não exibe horários."
        >
          <div className="divide-y divide-ink-800">
            {form.horarios.map(({ weekday, nome, aberto, opensAt, closesAt }) => {
              const erro = errosHorario[weekday];
              const erroId = erro ? `dia-${weekday}-erro` : undefined;
              const hora = (chave, valor, rotulo) => (
                <input
                  type="time"
                  value={valor}
                  onChange={alterarHorario(weekday, chave)}
                  disabled={!podeEditar}
                  aria-label={`${rotulo} — ${nome}`}
                  aria-invalid={erro ? true : undefined}
                  aria-describedby={erroId}
                  className={`${inputClass} w-32 [color-scheme:dark]`}
                />
              );

              return (
                <div
                  key={weekday}
                  className="flex min-h-14 flex-wrap items-center gap-x-6 gap-y-2 py-2"
                >
                  <div className="w-28">
                    <Switch
                      id={`dia-${weekday}`}
                      label={nome}
                      checked={aberto}
                      onChange={alternarDia(weekday)}
                      disabled={!podeEditar}
                    />
                  </div>

                  {aberto ? (
                    <div className="flex items-center gap-2">
                      {hora('opensAt', opensAt, 'Abertura')}
                      <span className="text-sm text-ink-500">às</span>
                      {hora('closesAt', closesAt, 'Fechamento')}
                    </div>
                  ) : (
                    <span className="text-sm text-ink-500">Fechado</span>
                  )}

                  {erro && (
                    <p id={erroId} role="alert" className="w-full text-xs text-danger">
                      {erro}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </FormSection>

        <FormSection titulo="Redes sociais" colunas={3}>
          {campo('social', 'instagram', 'Instagram', { type: 'url', hint: 'Link completo' })}
          {campo('social', 'facebook', 'Facebook', { type: 'url', hint: 'Link completo' })}
          {campo('social', 'youtube', 'YouTube', { type: 'url', hint: 'Link completo' })}
        </FormSection>

        <FormSection
          titulo="Módulos"
          colunas={2}
          descricao="Liga ou desliga seções do site para esta loja, sem mexer no código."
        >
          {MODULOS.map(({ chave, rotulo, descricao }) => (
            <Switch
              key={chave}
              id={`modulo-${chave}`}
              label={rotulo}
              description={descricao}
              checked={form.features[chave]}
              onChange={alterarModulo(chave)}
              disabled={!podeEditar}
            />
          ))}
        </FormSection>

        <FormSection
          titulo="Cores"
          colunas={3}
          descricao="A primária é aplicada ao site público assim que salva, sem nova compilação. Os tons de hover e o texto sobre ela são derivados automaticamente, com contraste garantido."
        >
          {campo('theme', 'primary', 'Primária', { type: 'color' })}
          {campo('theme', 'secondary', 'Secundária', { type: 'color' })}
          {campo('theme', 'accent', 'Destaque', { type: 'color' })}
        </FormSection>

        {podeEditar && (
          <Button type="submit" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar configurações'}
          </Button>
        )}
      </form>
    </div>
  );
}
