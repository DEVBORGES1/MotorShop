import {
  LEAD_STATUS_LABEL,
  LEAD_TYPE,
  LEAD_TYPE_LABEL,
  MOTO_CONDITION_LABEL,
  MOTO_STATUS_LABEL,
} from '@motorshop/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert.jsx';
import { Button, buttonClass } from '@/components/ui/Button.jsx';
import { inputClass, selectClass } from '@/components/ui/Field.jsx';
import { useAuth } from '@/hooks/useAuth.js';
import { useStore } from '@/hooks/useStore.js';
import { leadsAdmin } from '@/services/adminService.js';
import { formatarDataHora, formatarKm, formatarPreco, formatarTelefone } from '@/utils/format.js';
import { caminhoDaMoto } from '@/utils/moto.js';
import { linkWhatsApp } from '@/utils/whatsapp.js';

/**
 * Detalhe de um lead: contato, o que a pessoa quer, de onde veio, status,
 * anotações da equipe e — para SUPER_ADMIN — a exclusão a pedido (LGPD).
 *
 * @param {{ lead: object, onAtualizado: (lead) => void, onExcluido: (id) => void }} props
 */
export function LeadDetalhe({ lead, onAtualizado, onExcluido }) {
  const { store } = useStore();
  const { user } = useAuth();
  const [nota, setNota] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  const nomeMoto = lead.moto?.model
    ? [lead.moto.brand?.name, lead.moto.model, lead.moto.year].filter(Boolean).join(' ')
    : null;
  const primeiroNome = lead.name.split(/\s+/)[0];

  const whatsapp = linkWhatsApp(
    lead.phone,
    `Olá, ${primeiroNome}! Aqui é da ${store.name}. Recebemos seu contato pelo site${
      nomeMoto ? ` sobre a ${nomeMoto}` : ''
    }.`,
  );

  const salvar = async (mudancas) => {
    setErro(null);
    setSalvando(true);
    try {
      onAtualizado(await leadsAdmin.update(lead.id, mudancas));
      return true;
    } catch (causa) {
      setErro(causa.message);
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const adicionarNota = async (evento) => {
    evento.preventDefault();
    if (!nota.trim()) return;
    if (await salvar({ note: nota.trim() })) setNota('');
  };

  const excluir = async () => {
    const confirmado = window.confirm(
      `Excluir definitivamente os dados de ${lead.name}?\n\n` +
        'Use quando a pessoa pedir a exclusão (LGPD). Não dá para desfazer.',
    );
    if (!confirmado) return;

    setErro(null);
    try {
      await leadsAdmin.remove(lead.id);
      onExcluido(lead.id);
    } catch (causa) {
      setErro(causa.message);
    }
  };

  return (
    <div className="space-y-6 p-5 text-sm">
      <div>
        <p className="label-caps text-[10px] text-ink-500">{LEAD_TYPE_LABEL[lead.type]}</p>
        <h2 className="mt-1 font-display text-xl font-extrabold text-ink-50">{lead.name}</h2>
        <p className="mt-1 text-xs text-ink-500">Recebido em {formatarDataHora(lead.createdAt)}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer noopener"
            className={buttonClass({ size: 'sm' })}
          >
            WhatsApp
          </a>
        )}
        <a href={`tel:${lead.phone}`} className={buttonClass({ size: 'sm', variant: 'secondary' })}>
          Ligar · {formatarTelefone(lead.phone)}
        </a>
        {lead.email && (
          <a
            href={`mailto:${lead.email}`}
            className={buttonClass({ size: 'sm', variant: 'secondary' })}
          >
            {lead.email}
          </a>
        )}
      </div>

      <Alert tone="error">{erro}</Alert>

      <label className="block">
        <span className="label-caps text-[10px] text-ink-500">Status</span>
        <select
          value={lead.status}
          disabled={salvando}
          onChange={(evento) => salvar({ status: evento.target.value })}
          className={`${selectClass} mt-1.5`}
        >
          {Object.entries(LEAD_STATUS_LABEL).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </label>

      {lead.moto && (
        <Bloco titulo="Moto">
          {nomeMoto ? (
            <Link
              to={caminhoDaMoto(lead.moto.slug)}
              target="_blank"
              className="text-brand-500 hover:underline"
            >
              {nomeMoto}
            </Link>
          ) : (
            <span className="text-ink-400">Moto removida do cadastro</span>
          )}
          {lead.moto.status && (
            <span className="ml-2 text-xs text-ink-500">
              · {MOTO_STATUS_LABEL[lead.moto.status]}
            </span>
          )}
        </Bloco>
      )}

      <DadosDoTipo lead={lead} />

      {lead.message && (
        <Bloco titulo="Mensagem">
          <p className="whitespace-pre-line text-ink-200">{lead.message}</p>
        </Bloco>
      )}

      <Bloco titulo="Anotações da equipe">
        {lead.notes?.length > 0 && (
          <ol className="mb-4 space-y-3">
            {lead.notes.map((n, indice) => (
              <li key={`${n.createdAt}-${indice}`} className="rounded-md bg-surface-2 p-3">
                <p className="whitespace-pre-line text-ink-200">{n.text}</p>
                <p className="mt-1.5 text-xs text-ink-500">
                  {n.authorName} · {formatarDataHora(n.createdAt)}
                </p>
              </li>
            ))}
          </ol>
        )}
        <form onSubmit={adicionarNota} className="space-y-2">
          <label htmlFor={`nota-${lead.id}`} className="sr-only">
            Nova anotação
          </label>
          <textarea
            id={`nota-${lead.id}`}
            value={nota}
            onChange={(evento) => setNota(evento.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Ex.: liguei, retorna amanhã às 10h"
            className={inputClass}
          />
          <Button type="submit" size="sm" variant="secondary" disabled={salvando || !nota.trim()}>
            Adicionar anotação
          </Button>
        </form>
      </Bloco>

      <Origem lead={lead} />

      {user?.role === 'SUPER_ADMIN' && (
        <div className="border-t border-ink-800 pt-5">
          <Button variant="danger" size="sm" onClick={excluir}>
            Excluir dados (pedido do titular)
          </Button>
          <p className="mt-2 text-xs text-ink-500">
            Remove o lead de forma definitiva, como exige a LGPD quando a pessoa pede.
          </p>
        </div>
      )}
    </div>
  );
}

function DadosDoTipo({ lead }) {
  const d = lead.data ?? {};

  if (lead.type === LEAD_TYPE.SELL_MOTO) {
    return (
      <Bloco titulo="Moto do cliente">
        <Lista
          itens={[
            ['Marca', d.brand],
            ['Modelo', d.model],
            ['Ano', d.year],
            ['Quilometragem', d.mileage != null ? formatarKm(d.mileage) : null],
            ['Valor pretendido', d.expectedPrice != null ? formatarPreco(d.expectedPrice) : null],
            ['Estado', MOTO_CONDITION_LABEL[d.condition]],
          ]}
        />
      </Bloco>
    );
  }

  if (lead.type === LEAD_TYPE.FINANCING) {
    return (
      <Bloco titulo="Simulação">
        <Lista
          itens={[
            ['Valor da moto', formatarPreco(d.vehiclePrice)],
            ['Entrada', formatarPreco(d.downPayment)],
            ['Parcelas', d.installments ? `${d.installments}x` : null],
          ]}
        />
      </Bloco>
    );
  }

  return null;
}

function Origem({ lead }) {
  const { source = {}, consent } = lead;
  const utm = source.utm ?? {};
  const campanha = [utm.source, utm.medium, utm.campaign].filter(Boolean).join(' / ');

  return (
    <Bloco titulo="Origem e consentimento">
      <Lista
        itens={[
          ['Página', source.page],
          ['Veio de', source.referrer],
          ['Campanha', campanha || null],
          [
            'Consentimento',
            consent?.accepted
              ? `Aceito em ${formatarDataHora(consent.at)} · texto ${consent.textVersion}`
              : null,
          ],
        ]}
      />
    </Bloco>
  );
}

function Bloco({ titulo, children }) {
  return (
    <section>
      <h3 className="label-caps mb-2 text-[10px] text-ink-500">{titulo}</h3>
      {children}
    </section>
  );
}

function Lista({ itens }) {
  const preenchidos = itens.filter(([, valor]) => valor != null && valor !== '');
  if (!preenchidos.length) return <p className="text-ink-500">—</p>;

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
      {preenchidos.map(([rotulo, valor]) => (
        <div key={rotulo} className="contents">
          <dt className="text-ink-500">{rotulo}</dt>
          <dd className="text-ink-200 [overflow-wrap:anywhere]">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}
