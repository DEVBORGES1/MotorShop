import { FINANCING_INSTALLMENT_CHOICES, STORE_HIGHLIGHTS } from '@motorshop/shared';
import { useEffect, useState } from 'react';

import { FormSection } from '@/components/admin/FormSection.jsx';
import { ImagemDaLoja } from '@/components/admin/ImagemDaLoja.jsx';
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
  financing: { monthlyRate: '', installmentOptions: [], minDownPaymentPercent: '' },
  seo: { siteUrl: '', defaultTitle: '', defaultDescription: '' },
  // Sempre três espaços na tela; os vazios não vão para a API.
  highlights: Array.from({ length: STORE_HIGHLIGHTS.MAX }, () => ({ title: '', text: '' })),
  horarios: horariosParaFormulario([]),
};

const MODULOS = [
  {
    chave: 'sellMotoEnabled',
    rotulo: 'Sua moto na entrada',
    descricao:
      'Página “Venda sua moto” (formulário de avaliação), item no menu e chamada na página inicial.',
  },
  {
    chave: 'financingEnabled',
    rotulo: 'Financiamento',
    descricao:
      'Página “Financiamento”, simulador na página da moto, item no menu e chamada na página inicial.',
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
    seo: { ...VAZIO.seo, ...(dados.seo ?? {}) },
    highlights: VAZIO.highlights.map((vazio, i) => ({
      title: dados.highlights?.[i]?.title ?? '',
      text: dados.highlights?.[i]?.text ?? '',
    })),
    theme: { ...VAZIO.theme, ...(dados.theme ?? {}) },
    features: { ...VAZIO.features, ...(dados.features ?? {}) },
    financing: {
      monthlyRate: dados.financing?.monthlyRate ?? '',
      installmentOptions: dados.financing?.installmentOptions ?? [],
      minDownPaymentPercent: dados.financing?.minDownPaymentPercent ?? '',
    },
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

  // Logo e imagem de compartilhamento salvam na hora (ImagemDaLoja), fora do
  // formulário: guardadas à parte para o "Salvar" não as sobrescrever.
  const [imagens, setImagens] = useState({ logo: null, ogImage: null });
  const aoAlterarImagem = (loja) => setImagens({ logo: loja.logo, ogImage: loja.ogImage });

  useEffect(() => {
    setImagens({ logo: data?.logo ?? null, ogImage: data?.ogImage ?? null });
    setForm(comDefaults(data));
  }, [data]);

  const alterar = (secao, chave) => (evento) =>
    setForm((atual) =>
      secao
        ? { ...atual, [secao]: { ...atual[secao], [chave]: evento.target.value } }
        : { ...atual, [chave]: evento.target.value },
    );

  const alterarDiferencial = (indice, chave) => (evento) =>
    setForm((atual) => ({
      ...atual,
      highlights: atual.highlights.map((item, i) =>
        i === indice ? { ...item, [chave]: evento.target.value } : item,
      ),
    }));

  const alternarPrazo = (prazo) => (evento) =>
    setForm((atual) => {
      const atuais = atual.financing.installmentOptions;
      const proximos = evento.target.checked
        ? [...atuais, prazo].sort((a, b) => a - b)
        : atuais.filter((p) => p !== prazo);
      return { ...atual, financing: { ...atual.financing, installmentOptions: proximos } };
    });

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
        seo: paraEnvio(form.seo),
        highlights: form.highlights
          .filter((item) => item.title.trim())
          .map((item) => ({ title: item.title.trim(), text: item.text.trim() || null })),
        businessHours: horariosParaEnvio(form.horarios),
        features: form.features,
        financing: {
          monthlyRate:
            form.financing.monthlyRate === '' ? null : Number(form.financing.monthlyRate),
          installmentOptions: form.financing.installmentOptions,
          minDownPaymentPercent: Number(form.financing.minDownPaymentPercent) || 0,
        },
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
          step={extras.step}
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

        <FormSection
          titulo="Logo e imagem de compartilhamento"
          colunas={1}
          descricao="Salvas assim que enviadas. JPG, PNG, WebP ou AVIF, até 10 MB."
        >
          <ImagemDaLoja
            tipo="logo"
            titulo="Logo"
            descricao="Aparece no cabeçalho do site (44 px de altura) e vira o ícone da aba. Prefira fundo transparente (PNG)."
            imagem={imagens.logo}
            podeEditar={podeEditar}
            onAlterada={aoAlterarImagem}
          />
          <ImagemDaLoja
            tipo="ogImage"
            titulo="Imagem de compartilhamento"
            descricao="Preview quando alguém envia o link do site no WhatsApp ou nas redes. Ideal: 1200 × 630 px. Sem ela, vale o logo."
            imagem={imagens.ogImage}
            podeEditar={podeEditar}
            onAlterada={aoAlterarImagem}
          />
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
          titulo="Financiamento"
          colunas={2}
          descricao="Parâmetros do simulador (tabela Price), conforme o acordo da loja com a financeira. Sem taxa ou sem nenhum prazo marcado, o site não simula: a página de financiamento mostra só o contato."
        >
          {campo('financing', 'monthlyRate', 'Taxa de juros (% ao mês)', {
            type: 'number',
            step: '0.01',
            hint: 'Ex.: 1,79',
          })}
          {campo('financing', 'minDownPaymentPercent', 'Entrada mínima (% do valor)', {
            type: 'number',
            step: '1',
            hint: '0 para aceitar sem entrada',
          })}
          <fieldset className="sm:col-span-2">
            <legend className="label-caps text-[11px] text-ink-400">Prazos oferecidos</legend>
            <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-2.5">
              {FINANCING_INSTALLMENT_CHOICES.map((prazo) => (
                <label key={prazo} className="flex items-center gap-2 text-sm text-ink-200">
                  <input
                    type="checkbox"
                    checked={form.financing.installmentOptions.includes(prazo)}
                    onChange={alternarPrazo(prazo)}
                    disabled={!podeEditar}
                    className="h-4 w-4 accent-brand-500"
                  />
                  {prazo}x
                </label>
              ))}
            </div>
          </fieldset>
        </FormSection>

        <FormSection
          titulo="Diferenciais (página inicial)"
          colunas={2}
          descricao="O que a loja promete ao cliente — ex.: “Troca aceita”, “Revisadas antes da vitrine”. Aparecem numa faixa da página inicial; sem nenhum, a faixa não aparece. Escreva só o que a loja cumpre."
        >
          {form.highlights.map((item, indice) => (
            <div key={indice} className="contents">
              <Field id={`destaque-${indice}-titulo`} label={`Diferencial ${indice + 1}`}>
                {(props) => (
                  <input
                    {...props}
                    value={item.title}
                    maxLength={STORE_HIGHLIGHTS.MAX_TITLE}
                    onChange={alterarDiferencial(indice, 'title')}
                    disabled={!podeEditar}
                    className={inputClass}
                  />
                )}
              </Field>
              <Field
                id={`destaque-${indice}-texto`}
                label={`Explicação do diferencial ${indice + 1}`}
              >
                {(props) => (
                  <input
                    {...props}
                    value={item.text}
                    maxLength={STORE_HIGHLIGHTS.MAX_TEXT}
                    onChange={alterarDiferencial(indice, 'text')}
                    disabled={!podeEditar}
                    className={inputClass}
                  />
                )}
              </Field>
            </div>
          ))}
        </FormSection>

        <FormSection
          titulo="Endereço e busca (SEO)"
          colunas={1}
          descricao="O endereço é a base de todos os links que o site gera: Google, sitemap, preview no WhatsApp e mensagens de interesse. Título e descrição valem para a página inicial nos resultados de busca."
        >
          {campo('seo', 'siteUrl', 'Endereço do site', {
            type: 'url',
            hint: 'Com https://, sem barra no fim — ex.: https://www.sualoja.com.br',
          })}
          {campo('seo', 'defaultTitle', 'Título da página inicial', {
            hint: 'Até 70 caracteres. Vazio: nome da loja + slogan',
          })}
          {campo('seo', 'defaultDescription', 'Descrição para o Google', {
            hint: 'Até 180 caracteres. Vazio: o slogan',
          })}
        </FormSection>

        <FormSection
          titulo="Cores"
          colunas={3}
          descricao="Aplicada ao site público assim que salva, sem nova compilação: botões, links e destaques. Os tons de hover e a cor do texto sobre ela são derivados automaticamente, com contraste garantido."
        >
          {campo('theme', 'primary', 'Cor da marca', {
            type: 'color',
            hint: 'Cores escuras são clareadas automaticamente no site, para o texto continuar legível sobre o fundo escuro.',
          })}
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
