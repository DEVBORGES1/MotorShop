import { PASSWORD_MIN_LENGTH, USER_ROLE, USER_ROLE_LABEL } from '@motorshop/shared';
import { useState } from 'react';

import { Alert } from '@/components/ui/Alert.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Field, inputClass } from '@/components/ui/Field.jsx';
import { useAsyncData } from '@/hooks/useAsyncData.js';
import { useAuth } from '@/hooks/useAuth.js';
import { usuariosAdmin } from '@/services/adminService.js';
import { formatarData } from '@/utils/format.js';

const VAZIO = { name: '', email: '', password: '', role: USER_ROLE.ADMIN };

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
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>

      <Alert tone={mensagem?.tone ?? 'error'}>{mensagem?.texto ?? error?.message}</Alert>

      <form onSubmit={criar} className="max-w-2xl space-y-4 rounded-xl border border-ink-800 p-5">
        <h2 className="text-sm font-semibold text-ink-400">Novo usuário</h2>

        <div className="grid gap-4 sm:grid-cols-2">
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
                className={inputClass}
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

        <Button type="submit" disabled={salvando}>
          Criar usuário
        </Button>
      </form>

      {isLoading ? (
        <p className="text-ink-400">Carregando…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink-800">
          <table className="w-full text-sm">
            <thead className="bg-ink-800/50 text-left text-xs tracking-wide text-ink-400 uppercase">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3">Último acesso</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {usuarios?.map((usuario) => (
                <tr key={usuario.id} className={usuario.active ? '' : 'opacity-50'}>
                  <td className="px-4 py-3 font-medium">
                    {usuario.name}
                    {usuario.id === atual?.id && (
                      <span className="ml-2 text-xs text-ink-400">(você)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-200">{usuario.email}</td>
                  <td className="px-4 py-3 text-ink-200">{USER_ROLE_LABEL[usuario.role]}</td>
                  <td className="px-4 py-3 text-ink-400">{formatarData(usuario.lastLoginAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {usuario.active && usuario.id !== atual?.id && (
                      <Button
                        variant="danger"
                        onClick={() => desativar(usuario)}
                        disabled={salvando}
                      >
                        Desativar
                      </Button>
                    )}
                    {!usuario.active && <span className="text-xs text-ink-400">inativo</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
