import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Alert } from '@/components/ui/Alert.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Field, inputClass } from '@/components/ui/Field.jsx';
import { useAuth } from '@/hooks/useAuth.js';

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
  const { signIn, isAuthenticated, isRestoring } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [erro, setErro] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

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
          <span className="text-2xl font-bold tracking-tight">
            Motor<span className="text-brand-500">Shop</span>
          </span>
          <p className="mt-1 text-sm text-ink-400">Acesso ao painel administrativo</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4 rounded-xl border border-ink-800 bg-ink-800/30 p-6"
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
