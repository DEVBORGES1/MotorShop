import { useEffect, useState } from 'react';

import { Alert } from '@/components/ui/Alert.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Field, inputClass } from '@/components/ui/Field.jsx';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { useAuth } from '@/hooks/useAuth.js';
import { storeAdmin } from '@/services/adminService.js';

/**
 * Configurações da loja.
 *
 * É a tela que torna o produto revendável: nome, contato, endereço e cores
 * vivem aqui, não no código. Trocar de cliente é preencher este formulário.
 */

const VAZIO = {
  name: '',
  slogan: '',
  contact: { whatsapp: '', phone: '', email: '' },
  address: { street: '', number: '', district: '', city: '', state: '', zipCode: '' },
  social: { instagram: '', facebook: '' },
  theme: { primary: '#f97316', secondary: '#0f172a', accent: '#16a34a' },
};

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

  useEffect(() => {
    setForm(comDefaults(data));
  }, [data]);

  const alterar = (secao, chave) => (evento) =>
    setForm((atual) =>
      secao
        ? { ...atual, [secao]: { ...atual[secao], [chave]: evento.target.value } }
        : { ...atual, [chave]: evento.target.value },
    );

  const salvar = async (evento) => {
    evento.preventDefault();
    setMensagem(null);
    setSalvando(true);

    try {
      await storeAdmin.update({
        name: form.name,
        slogan: form.slogan || null,
        contact: paraEnvio(form.contact),
        address: paraEnvio(form.address),
        social: paraEnvio(form.social),
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

  if (isLoading) return <p className="text-ink-400">Carregando…</p>;

  const campo = (secao, chave, rotulo, extras = {}) => (
    <Field id={`${secao ?? 'root'}-${chave}`} label={rotulo} hint={extras.hint}>
      {(props) => (
        <input
          {...props}
          type={extras.type ?? 'text'}
          value={(secao ? form[secao][chave] : form[chave]) ?? ''}
          onChange={alterar(secao, chave)}
          disabled={!podeEditar}
          className={inputClass}
        />
      )}
    </Field>
  );

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Configurações da loja</h1>

      {!podeEditar && (
        <Alert tone="info">
          Somente super administradores podem alterar a identidade da loja. Você pode visualizar.
        </Alert>
      )}

      <Alert tone={mensagem?.tone ?? 'error'}>{mensagem?.texto ?? error?.message}</Alert>

      <form onSubmit={salvar} className="space-y-6">
        <fieldset className="space-y-4 rounded-xl border border-ink-800 p-5">
          <legend className="px-2 text-sm font-semibold text-ink-400">Identidade</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {campo(null, 'name', 'Nome da loja')}
            {campo(null, 'slogan', 'Slogan')}
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-ink-800 p-5">
          <legend className="px-2 text-sm font-semibold text-ink-400">Contato</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            {campo('contact', 'whatsapp', 'WhatsApp', { hint: 'Com DDD' })}
            {campo('contact', 'phone', 'Telefone')}
            {campo('contact', 'email', 'E-mail', { type: 'email' })}
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-ink-800 p-5">
          <legend className="px-2 text-sm font-semibold text-ink-400">Endereço</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {campo('address', 'street', 'Rua')}
            {campo('address', 'number', 'Número')}
            {campo('address', 'district', 'Bairro')}
            {campo('address', 'city', 'Cidade')}
            {campo('address', 'state', 'UF', { hint: 'Duas letras' })}
            {campo('address', 'zipCode', 'CEP')}
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-ink-800 p-5">
          <legend className="px-2 text-sm font-semibold text-ink-400">Redes sociais</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {campo('social', 'instagram', 'Instagram')}
            {campo('social', 'facebook', 'Facebook')}
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-ink-800 p-5">
          <legend className="px-2 text-sm font-semibold text-ink-400">Cores</legend>
          <p className="text-xs text-ink-400">
            Aplicadas ao site público a partir da FASE 4, sem necessidade de nova compilação.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {campo('theme', 'primary', 'Primária', { type: 'color' })}
            {campo('theme', 'secondary', 'Secundária', { type: 'color' })}
            {campo('theme', 'accent', 'Destaque', { type: 'color' })}
          </div>
        </fieldset>

        {podeEditar && (
          <Button type="submit" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar configurações'}
          </Button>
        )}
      </form>
    </div>
  );
}
