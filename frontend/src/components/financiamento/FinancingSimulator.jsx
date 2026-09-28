import { zodResolver } from '@hookform/resolvers/zod';
import { LEAD_TYPE, minimumDownPayment } from '@motorshop/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';

import {
  CamposDeContato,
  Consentimento,
  Honeypot,
  mensagemDeErro,
} from '@/components/leads/CamposDoLead.jsx';
import { esquemaInteresse } from '@/components/leads/esquemas.js';
import { LeadEnviado } from '@/components/leads/LeadEnviado.jsx';
import { Alert } from '@/components/ui/Alert.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Field, rangeClass } from '@/components/ui/Field.jsx';
import { InputReais } from '@/components/ui/InputReais.jsx';
import { Switch } from '@/components/ui/Switch.jsx';
import { useEnvioLead } from '@/hooks/useEnvioLead.js';
import { useStore } from '@/hooks/useStore.js';
import { formatarPercentual, formatarPreco } from '@/utils/format.js';
import { montarLead } from '@/utils/lead.js';
import { origemDoLead } from '@/utils/origem.js';
import {
  entradaInicial,
  entradaTotal,
  minimoEmDinheiro,
  parcelasIniciais,
  passoDaEntrada,
  percentualDaEntrada,
  resultadoDaSimulacao,
  tabelaDePrazos,
} from '@/utils/simulador.js';

import { AvisoSimulacao } from './AvisoSimulacao.jsx';

/**
 * Simulador de financiamento (tabela Price).
 *
 * Recalcula a cada mudança, no próprio navegador — é conta determinística,
 * sem dado sensível, e ir ao servidor só adicionaria espera. Taxa, prazos e
 * entrada mínima vêm da configuração da loja. Só é montado quando a loja
 * configurou o financiamento (`isFinancingConfigured`).
 *
 * Com o "Venda sua moto" ligado, o visitante pode dar a moto dele na troca: o
 * valor estimado soma na entrada, e o mínimo da loja vale para o total.
 *
 * @param {{ valorFixo?: number, moto?: { id: string, nome: string } }} props
 *   `valorFixo` trava o valor (moto escolhida); sem ele, o visitante digita.
 */
export function FinancingSimulator({ valorFixo, moto, idPrefixo = 'sim' }) {
  const { store } = useStore();
  const financing = store.financing;
  const aceitaTroca = Boolean(store.features?.sellMotoEnabled);

  const [valorDigitado, setValorDigitado] = useState('');
  const valorNumero = valorFixo ?? (Number(valorDigitado) || 0);
  const [dinheiro, setDinheiro] = useState(() => entradaInicial(valorFixo ?? 0, financing));
  const [temTroca, setTemTroca] = useState(false);
  const [valorDaTroca, setValorDaTroca] = useState('');
  const [parcelasEscolhidas, setParcelas] = useState(() => parcelasIniciais(financing));
  const [enviarAberto, setEnviarAberto] = useState(false);

  // Se a loja mudar os prazos, o escolhido pode deixar de existir.
  const parcelas = financing.installmentOptions.includes(parcelasEscolhidas)
    ? parcelasEscolhidas
    : parcelasIniciais(financing);

  const percentualMinimo = financing.minDownPaymentPercent ?? 0;
  const minimoDoValor = (v) => minimumDownPayment(v, percentualMinimo);
  const troca = temTroca ? Number(valorDaTroca) || 0 : 0;

  // Outra moto escolhida: a entrada recomeça no mínimo dela; troca e prazo
  // ficam como a pessoa deixou. A simulação aberta para envio era da outra moto.
  const [valorFixoAtual, setValorFixoAtual] = useState(valorFixo);
  if (valorFixo !== valorFixoAtual) {
    setValorFixoAtual(valorFixo);
    setDinheiro(minimoEmDinheiro(minimoDoValor(valorNumero), troca));
    setEnviarAberto(false);
  }

  const minimo = minimoDoValor(valorNumero);
  const minimoDinheiro = minimoEmDinheiro(minimo, troca);
  const entrada = entradaTotal(dinheiro, troca);
  const passo = passoDaEntrada(valorNumero);
  const maximo = Math.max(minimoDinheiro, valorNumero - troca - passo);

  const simulacao = { valor: valorNumero, entrada, parcelas };
  const resultado = resultadoDaSimulacao(simulacao, financing);
  const tabela = tabelaDePrazos(simulacao, financing);

  // Mudou o que define o mínimo? O dinheiro sobe junto, se ficou abaixo dele.
  const acompanharMinimo = (novoValor, novaTroca) =>
    setDinheiro((atual) => Math.max(atual, minimoEmDinheiro(minimoDoValor(novoValor), novaTroca)));

  const mudarValor = (novo) => {
    setValorDigitado(novo);
    acompanharMinimo(Number(novo) || 0, troca);
  };

  const mudarTroca = (nova) => {
    setValorDaTroca(nova);
    acompanharMinimo(valorNumero, Number(nova) || 0);
  };

  const alternarTroca = (ligada) => {
    setTemTroca(ligada);
    if (!ligada) acompanharMinimo(valorNumero, 0);
  };

  const percentual = percentualDaEntrada(entrada, valorNumero);
  const dicaDaEntrada =
    valorNumero > 0
      ? [
          `${formatarPercentual(percentual)} do valor${troca > 0 ? ', com a troca' : ''}`,
          percentualMinimo > 0 &&
            `mínimo ${formatarPreco(minimo)} (${formatarPercentual(percentualMinimo)})`,
        ]
          .filter(Boolean)
          .join(' · ')
      : undefined;

  const id = (campo) => `${idPrefixo}-${campo}`;

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        {valorFixo == null ? (
          <Field id={id('valor')} label="Valor da moto (R$)">
            {(props) => (
              <InputReais
                {...props}
                value={valorDigitado}
                onChange={mudarValor}
                placeholder="25.000"
              />
            )}
          </Field>
        ) : (
          <div>
            <p className="label-caps text-[11px] text-ink-400">Valor da moto</p>
            <p className="mt-2 font-display text-xl font-extrabold text-ink-50">
              {formatarPreco(valorFixo)}
            </p>
          </div>
        )}

        <Field
          id={id('entrada')}
          label={temTroca ? 'Entrada em dinheiro (R$)' : 'Entrada (R$)'}
          hint={dicaDaEntrada}
        >
          {(props) => (
            <InputReais
              {...props}
              value={dinheiro}
              onChange={(novo) => setDinheiro(Number(novo) || 0)}
            />
          )}
        </Field>
      </div>

      {valorNumero > 0 && (
        <input
          type="range"
          aria-label="Ajustar entrada"
          min={minimoDinheiro}
          max={maximo}
          step={passo}
          value={Math.min(Math.max(dinheiro, minimoDinheiro), maximo)}
          onChange={(evento) => setDinheiro(Number(evento.target.value))}
          className={rangeClass}
        />
      )}

      {aceitaTroca && (
        <div className="space-y-4 rounded-lg border border-ink-800 p-4">
          <Switch
            id={id('tem-troca')}
            checked={temTroca}
            onChange={alternarTroca}
            label="Tenho uma moto para dar na troca"
            description="O valor dela entra na entrada e diminui as parcelas."
          />
          {temTroca && (
            <Field
              id={id('troca')}
              label="Valor estimado da sua moto (R$)"
              hint="É uma estimativa sua: a loja avalia a moto antes de fechar o negócio."
            >
              {(props) => (
                <InputReais
                  {...props}
                  value={valorDaTroca}
                  onChange={mudarTroca}
                  placeholder="12.000"
                />
              )}
            </Field>
          )}
        </div>
      )}

      <fieldset>
        <legend className="label-caps text-[11px] text-ink-400">Parcelas</legend>
        <div className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {tabela.map((linha) => {
            const ativa = linha.parcelas === parcelas;
            return (
              <button
                key={linha.parcelas}
                type="button"
                aria-pressed={ativa}
                onClick={() => setParcelas(linha.parcelas)}
                className={`rounded-md border px-3 py-2.5 text-left transition ${
                  ativa ? 'border-brand-500 bg-brand-500/10' : 'border-ink-700 hover:border-ink-600'
                }`}
              >
                <span className="block text-sm font-bold text-ink-50">{linha.parcelas}x</span>
                <span className="block text-xs text-ink-400">
                  {linha.valor == null ? '—' : formatarPreco(linha.valor)}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div aria-live="polite" className="rounded-lg border border-ink-800 bg-surface-2 p-5">
        {'erro' in resultado ? (
          <p className="text-sm text-warn">{resultado.erro}</p>
        ) : (
          <>
            <p className="text-sm text-ink-400">{parcelas} parcelas de</p>
            <p className="font-display text-3xl font-extrabold text-brand-500">
              {formatarPreco(resultado.installmentValue)}
            </p>
            {troca > 0 && (
              <p className="mt-2 text-sm text-ink-200">
                Entrada de {formatarPreco(entrada)}: {formatarPreco(dinheiro)} em dinheiro +{' '}
                {formatarPreco(troca)} da sua moto
              </p>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              <Item rotulo="Valor financiado" valor={formatarPreco(resultado.financed)} />
              <Item rotulo="Total das parcelas" valor={formatarPreco(resultado.total)} />
              <Item rotulo="Juros" valor={formatarPreco(resultado.interest)} />
              <Item rotulo="Taxa" valor={`${formatarPercentual(financing.monthlyRate)} a.m.`} />
            </dl>
          </>
        )}
      </div>

      <AvisoSimulacao />

      {!('erro' in resultado) &&
        (enviarAberto ? (
          <EnviarSimulacao
            simulacao={{
              vehiclePrice: valorNumero,
              downPayment: entrada,
              installments: parcelas,
              tradeInValue: troca,
            }}
            moto={moto}
            idPrefixo={idPrefixo}
          />
        ) : (
          <Button variant="secondary" onClick={() => setEnviarAberto(true)}>
            Enviar esta simulação para a loja
          </Button>
        ))}
    </div>
  );
}

function Item({ rotulo, valor }) {
  return (
    <div>
      <dt className="text-xs text-ink-500">{rotulo}</dt>
      <dd className="font-semibold text-ink-100">{valor}</dd>
    </div>
  );
}

/**
 * Envio opcional da simulação como lead `FINANCING`. Só contato — nada de
 * CPF, renda ou qualquer dado de análise de crédito (R-07): isso é da
 * financeira, no momento da proposta.
 */
function EnviarSimulacao({ simulacao, moto, idPrefixo }) {
  const { store } = useStore();
  const { pathname } = useLocation();
  const envio = useEnvioLead();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(esquemaInteresse), defaultValues: { consent: false } });

  const enviar = (valores) =>
    envio.enviar(
      montarLead(
        LEAD_TYPE.FINANCING,
        { ...valores, ...simulacao },
        { motoId: moto?.id, source: origemDoLead(pathname) },
      ),
    );

  if (envio.estado === 'sucesso') {
    return (
      <LeadEnviado titulo="Simulação enviada">
        A {store.name} vai conferir as condições com a financeira e entrar em contato pelo telefone
        informado.
      </LeadEnviado>
    );
  }

  const prefixo = `${idPrefixo}-lead`;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(enviar)}
      className="relative space-y-4 rounded-lg border border-ink-800 p-5"
    >
      <p className="text-sm text-ink-200">
        Envie a simulação e a loja retorna com as condições reais
        {moto ? ` para a ${moto.nome}` : ''}. Só pedimos seu contato.
      </p>
      <Honeypot register={register} prefixo={prefixo} />
      <div className="grid gap-4 sm:grid-cols-3">
        <CamposDeContato register={register} errors={errors} prefixo={prefixo} />
      </div>
      <Consentimento
        register={register}
        errors={errors}
        prefixo={prefixo}
        nomeDaLoja={store.name}
      />
      <Alert tone="error">{mensagemDeErro(envio.erro)}</Alert>
      <Button type="submit" disabled={envio.enviando}>
        {envio.enviando ? 'Enviando…' : 'Enviar simulação'}
      </Button>
    </form>
  );
}
