import { PASSWORD_MIN_LENGTH, USER_ROLE, USER_ROLE_LABEL } from '@motorshop/shared';
import { useState } from 'react';

import { celulaClass, DataTable } from '@/components/admin/DataTable.jsx';
import { PageHeader } from '@/components/admin/PageHeader.jsx';
import { Alert } from '@/components/ui/Alert.jsx';
import { Badge } from '@/components/ui/Badge.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Card, CardTitle } from '@/components/ui/Card.jsx';
import { Field, inputClass, selectClass } from '@/components/ui/Field.jsx';
import { Skeleton } from '@/components/ui/Skeleton.jsx';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { useAuth } from '@/hooks/useAuth.js';
import { usuariosAdmin } from '@/services/adminService.js';
import { formatarData } from '@/utils/format.js';

const VAZIO = { name: '', email: '', password: '', role: USER_ROLE.ADMIN };

const COLUNAS = [
  { titulo: 'Usuário' },
  { titulo: 'Papel' },
  { titulo: 'Último acesso' },
  { titulo: '', alinhar: 'direita' },
];

export function Usuarios() {
  const { user: atual } = useAuth();
  const {
    data: usuarios,
    error,
    isLoading,
    refetch,
  } = useAsyncData(() => usuariosAdmin.list(), []);
  const [form, setForm] = useState(VAZIO);
  const [mensagem, setMensagem] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const executar = async (acao) => {
    setMensagem(null);
    setSalvando(true);
    try {
      await acao();
      refetch();
    } catch (causa) {
      const detalhes = causa.errors?.map((e) => e.message).join(' · ');
      setMensagem({
        tone: 'error',
        texto: detalhes ? `${causa.message}: ${detalhes}` : causa.message,
      });
    } finally {
      setSalvando(false);
    }
  };

  const criar = (evento) => {
    evento.preventDefault();
    executar(async () => {
      await usuariosAdmin.create(form);
      setForm(VAZIO);
      setMensagem({ tone: 'success', texto: 'Usuário criado.' });
    });
  };

  const desativar = (usuario) => {
    if (!window.confirm(`Desativar ${usuario.name}? As sessões abertas serão encerradas.`)) return;
    executar(() => usuariosAdmin.deactivate(usuario.id));
  };

  const campo = (nome, rotulo, tipo = 'text', extras = {}) => (
    <Field id={nome} label={rotulo} required={extras.required} hint={extras.hint}>
      {(props) => (
        <input
          {...props}
          type={tipo}
          value={form[nome]}
          onChange={(e) => setForm({ ...form, [nome]: e.target.value })}
          autoComplete={extras.autoComplete}
          className={inputClass}
        />
      )}
    </Field>
  );

  return (
    <div className="max-w-4xl">
      <PageHeader
        titulo="Usuários"
        descricao="Quem tem acesso ao painel. Contas são desativadas, nunca excluídas."
      />

      <Alert tone={mensagem?.tone ?? 'error'}>{mensagem?.texto ?? error?.message}</Alert>

      <Card as="form" onSubmit={criar} className="mt-5">
        <CardTitle>Novo usuário</CardTitle>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {campo('name', 'Nome', 'text', { required: true })}
          {campo('email', 'E-mail', 'email', { required: true, autoComplete: 'off' })}
          {campo('password', 'Senha', 'password', {
            required: true,
            autoComplete: 'new-password',
            hint: `Mínimo de ${PASSWORD_MIN_LENGTH} caracteres`,
          })}

          <Field id="role" label="Papel">
            {(props) => (
              <select
                {...props}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className={selectClass}
              >
                {Object.entries(USER_ROLE_LABEL).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>

        <Button type="submit" disabled={salvando} className="mt-5">
          Criar usuário
        </Button>
      </Card>

      {isLoading ? (
        <Skeleton className="mt-5 h-48" />
      ) : (
        <div className="mt-5">
          <DataTable colunas={COLUNAS} vazio="Nenhum usuário cadastrado.">
            {(usuarios ?? []).map((usuario) => (
              <tr key={usuario.id} className={usuario.active ? '' : 'opacity-50'}>
                <td className={celulaClass}>
                  <span className="font-semibold text-ink-50">{usuario.name}</span>
                  {usuario.id === atual?.id && (
                    <span className="ml-2 text-xs text-ink-500">(você)</span>
                  )}
                  <span className="block text-xs text-ink-500">{usuario.email}</span>
                </td>
                <td className={celulaClass}>
                  <Badge tone={usuario.role === USER_ROLE.SUPER_ADMIN ? 'brand' : 'neutral'}>
                    {USER_ROLE_LABEL[usuario.role]}
                  </Badge>
                </td>
                <td className={`${celulaClass} text-ink-400`}>
                  {formatarData(usuario.lastLoginAt)}
                </td>
                <td className={`${celulaClass} text-right`}>
                  {usuario.active && usuario.id !== atual?.id && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => desativar(usuario)}
                      disabled={salvando}
                    >
                      Desativar
                    </Button>
                  )}
                  {!usuario.active && <Badge tone="outline">Inativo</Badge>}
                </td>
              </tr>
            ))}
          </DataTable>
        </div>
      )}
    </div>
  );
}
