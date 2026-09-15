import { useState } from 'react';

import { Alert } from '@/components/ui/Alert.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { inputClass } from '@/components/ui/Field.jsx';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { marcasAdmin } from '@/services/adminService.js';

export function Marcas() {
  const { data: marcas, error, isLoading, refetch } = useAsyncData(() => marcasAdmin.list(), []);
  const [nome, setNome] = useState('');
  const [mensagem, setMensagem] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const executar = async (acao) => {
    setMensagem(null);
    setSalvando(true);
    try {
      await acao();
      refetch();
    } catch (causa) {
      setMensagem({ tone: 'error', texto: causa.message });
    } finally {
      setSalvando(false);
    }
  };

  const criar = (evento) => {
    evento.preventDefault();
    if (!nome.trim()) return;
    executar(async () => {
      await marcasAdmin.create({ name: nome.trim() });
      setNome('');
    });
  };

  const alternarAtiva = (marca) =>
    executar(() => marcasAdmin.update(marca.id, { active: !marca.active }));

  const excluir = (marca) => {
    // A API recusa excluir marca com motos vinculadas (409) e explica o porquê.
    if (!window.confirm(`Excluir a marca "${marca.name}"?`)) return;
    executar(() => marcasAdmin.remove(marca.id));
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Marcas</h1>

      <form onSubmit={criar} className="flex gap-3">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome da marca"
          aria-label="Nome da nova marca"
          className={inputClass}
        />
        <Button type="submit" disabled={salvando || !nome.trim()}>
          Adicionar
        </Button>
      </form>

      <Alert tone={mensagem?.tone ?? 'error'}>{mensagem?.texto ?? error?.message}</Alert>

      {isLoading ? (
        <p className="text-ink-400">Carregando…</p>
      ) : marcas?.length === 0 ? (
        <p className="rounded-xl border border-ink-800 p-8 text-center text-ink-400">
          Nenhuma marca cadastrada.
        </p>
      ) : (
        <ul className="divide-y divide-ink-800 rounded-xl border border-ink-800">
          {marcas?.map((marca) => (
            <li
              key={marca.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <span className="font-medium">{marca.name}</span>
                <span className="ml-2 text-xs text-ink-400">/{marca.slug}</span>
                {!marca.active && <span className="ml-2 text-xs text-warn">inativa</span>}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => alternarAtiva(marca)}
                  disabled={salvando}
                >
                  {marca.active ? 'Desativar' : 'Ativar'}
                </Button>
                <Button variant="danger" onClick={() => excluir(marca)} disabled={salvando}>
                  Excluir
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
