import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Alert } from '@/components/ui/Alert.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Field, inputClass } from '@/components/ui/Field.jsx';
import { useAuth } from '@/hooks/useAuth.js';
import { usePaginaSeo } from '@/hooks/useSeo.js';
import { useStore } from '@/hooks/useStore.js';

/**
 * A validação do cliente só checa que os campos existem — a mesma regra do
 * servidor. Reaplicar aqui a política de senha forte revelaria a regra a quem
 * tenta adivinhar e recusaria senhas antigas ainda válidas.
 */
const schema = z.object({
  email: z.string().min(1, 'Informe o e-mail').email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
});

export function Login() {
  const { store } = useStore();
  // Painel nunca indexado (o servidor já manda noindex no HTML inicial).
  usePaginaSeo('admin');
  const { signIn, isAuthenticated, isRestoring, verificarSessao } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [erro, setErro] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  // Quem já tem sessão e abre o login vai direto para o painel.
  useEffect(verificarSessao, [verificarSessao]);

  if (isRestoring) return <div className="p-8 text-ink-400">Verificando sessão…</div>;
  if (isAuthenticated) return <Navigate to={location.state?.from ?? '/admin'} replace />;

  const onSubmit = async (valores) => {
    setErro(null);
    try {
      await signIn(valores);
      navigate(location.state?.from ?? '/admin', { replace: true });
    } catch (causa) {
      setErro(causa.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-display text-2xl font-extrabold tracking-tight text-ink-50">
            {store.name}
          </span>
          <p className="label-caps mt-2 text-[10px] text-ink-500">Painel administrativo</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4 rounded-lg border border-ink-800 bg-surface p-6"
        >
          <Alert tone="error">{erro}</Alert>

          <Field id="email" label="E-mail" error={errors.email?.message} required>
            {(props) => (
              <input
                {...props}
                {...register('email')}
                type="email"
                autoComplete="username"
                autoFocus
                className={inputClass}
              />
            )}
          </Field>

          <Field id="password" label="Senha" error={errors.password?.message} required>
            {(props) => (
              <input
                {...props}
                {...register('password')}
                type="password"
                autoComplete="current-password"
                className={inputClass}
              />
            )}
          </Field>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-ink-400">
          O primeiro administrador é criado pelo comando{' '}
          <code className="text-ink-200">npm run create:superadmin</code>
        </p>
      </div>
    </div>
  );
}
