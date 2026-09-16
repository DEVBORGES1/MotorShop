import { useState } from 'react';

import { celulaClass, DataTable } from '@/components/admin/DataTable.jsx';
import { PageHeader } from '@/components/admin/PageHeader.jsx';
import { Alert } from '@/components/ui/Alert.jsx';
import { Badge } from '@/components/ui/Badge.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Card, CardTitle } from '@/components/ui/Card.jsx';
import { inputClass } from '@/components/ui/Field.jsx';
import { Skeleton } from '@/components/ui/Skeleton.jsx';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { marcasAdmin } from '@/services/adminService.js';

const COLUNAS = [{ titulo: 'Marca' }, { titulo: 'Situação' }, { titulo: '', alinhar: 'direita' }];

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
    <div className="max-w-4xl">
      <PageHeader titulo="Marcas" descricao="As marcas disponíveis no cadastro de motos" />

      <Alert tone={mensagem?.tone ?? 'error'}>{mensagem?.texto ?? error?.message}</Alert>

      <Card className="mt-5">
        <CardTitle>Nova marca</CardTitle>
        <form onSubmit={criar} className="mt-4 flex flex-wrap gap-3">
          <input
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            placeholder="Nome da marca"
            aria-label="Nome da nova marca"
            className={`${inputClass} max-w-xs`}
          />
          <Button type="submit" disabled={salvando || !nome.trim()}>
            Adicionar
          </Button>
        </form>
      </Card>

      {isLoading ? (
        <Skeleton className="mt-5 h-48" />
      ) : (
        <div className="mt-5">
          <DataTable colunas={COLUNAS} vazio="Nenhuma marca cadastrada.">
            {(marcas ?? []).map((marca) => (
              <tr key={marca.id} className="transition hover:bg-surface-2">
                <td className={celulaClass}>
                  <span className="font-semibold text-ink-50">{marca.name}</span>
                  <span className="block text-xs text-ink-500">/{marca.slug}</span>
                </td>
                <td className={celulaClass}>
                  {marca.active ? (
                    <Badge tone="ok">Ativa</Badge>
                  ) : (
                    <Badge tone="outline">Inativa</Badge>
                  )}
                </td>
                <td className={`${celulaClass} text-right`}>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => alternarAtiva(marca)}
                      disabled={salvando}
                    >
                      {marca.active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => excluir(marca)}
                      disabled={salvando}
                    >
                      Excluir
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        </div>
      )}

      <p className="mt-4 text-xs text-ink-500">
        Marca com motos vinculadas não pode ser excluída — desative para tirá-la do site.
      </p>
    </div>
  );
}
