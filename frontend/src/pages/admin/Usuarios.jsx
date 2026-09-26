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
  // Usuário em edição e os valores do formulário de edição.
  const [editando, setEditando] = useState(null);
  const [edicao, setEdicao] = useState(null);

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

  const abrirEdicao = (usuario) => {
    setMensagem(null);
    setEditando(usuario);
    setEdicao({
      name: usuario.name,
      email: usuario.email,
      role: usuario.role,
      password: '',
      active: usuario.active,
    });
  };

  /**
   * Envia só o que mudou: senha em branco mantém a atual, e o papel da própria
   * conta nem é enviado (o servidor recusaria de qualquer forma).
   */
  const salvarEdicao = (evento) => {
    evento.preventDefault();
    const mudancas = {};
    if (edicao.name.trim() !== editando.name) mudancas.name = edicao.name;
    if (edicao.email.trim().toLowerCase() !== editando.email) mudancas.email = edicao.email;
    if (edicao.role !== editando.role && editando.id !== atual?.id) mudancas.role = edicao.role;
    if (edicao.password) mudancas.password = edicao.password;
    if (edicao.active !== editando.active) mudancas.active = edicao.active;

    if (Object.keys(mudancas).length === 0) {
      setEditando(null);
      return;
    }

    executar(async () => {
      await usuariosAdmin.update(editando.id, mudancas);
      setEditando(null);
      setMensagem({ tone: 'success', texto: 'Usuário atualizado.' });
    });
  };

  const reativar = (usuario) =>
    executar(async () => {
      await usuariosAdmin.update(usuario.id, { active: true });
      setMensagem({ tone: 'success', texto: `${usuario.name} reativado.` });
    });

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
        descricao="Quem tem acesso ao painel. Contas são desativadas, nunca excluídas — e podem ser editadas e reativadas."
      />

      <Alert tone={mensagem?.tone ?? 'error'}>{mensagem?.texto ?? error?.message}</Alert>

      {editando && (
        <Card as="form" onSubmit={salvarEdicao} className="mt-5">
          <CardTitle>Editar {editando.name}</CardTitle>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field id="editar-name" label="Nome" required>
              {(props) => (
                <input
                  {...props}
                  value={edicao.name}
                  onChange={(e) => setEdicao({ ...edicao, name: e.target.value })}
                  autoFocus
                  className={inputClass}
                />
              )}
            </Field>
            <Field id="editar-email" label="E-mail" required>
              {(props) => (
                <input
                  {...props}
                  type="email"
                  value={edicao.email}
                  onChange={(e) => setEdicao({ ...edicao, email: e.target.value })}
                  autoComplete="off"
                  className={inputClass}
                />
              )}
            </Field>
            <Field
              id="editar-password"
              label="Nova senha"
              hint={`Em branco, mantém a atual. Mínimo de ${PASSWORD_MIN_LENGTH} caracteres; trocar encerra as sessões abertas.`}
            >
              {(props) => (
                <input
                  {...props}
                  type="password"
                  value={edicao.password}
                  onChange={(e) => setEdicao({ ...edicao, password: e.target.value })}
                  autoComplete="new-password"
                  className={inputClass}
                />
              )}
            </Field>
            <Field
              id="editar-role"
              label="Papel"
              hint={
                editando.id === atual?.id ? 'Você não pode alterar o seu próprio papel.' : undefined
              }
            >
              {(props) => (
                <select
                  {...props}
                  value={edicao.role}
                  onChange={(e) => setEdicao({ ...edicao, role: e.target.value })}
                  disabled={editando.id === atual?.id}
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

          {editando.id !== atual?.id && (
            <label className="mt-4 flex items-center gap-2 text-sm text-ink-200">
              <input
                type="checkbox"
                checked={edicao.active}
                onChange={(e) => setEdicao({ ...edicao, active: e.target.checked })}
                className="h-4 w-4 accent-brand-500"
              />
              Conta ativa (pode entrar no painel)
            </label>
          )}

          <div className="mt-5 flex gap-3">
            <Button type="submit" disabled={salvando}>
              Salvar alterações
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

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
                  <div className="flex items-center justify-end gap-2">
                    {!usuario.active && <Badge tone="outline">Inativo</Badge>}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => abrirEdicao(usuario)}
                      disabled={salvando}
                    >
                      Editar
                    </Button>
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
                    {!usuario.active && (
                      <Button size="sm" onClick={() => reativar(usuario)} disabled={salvando}>
                        Reativar
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        </div>
      )}
    </div>
  );
}
