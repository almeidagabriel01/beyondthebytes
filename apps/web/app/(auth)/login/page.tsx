'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginRequestSchema, type LoginRequest } from '@medschedule/shared';
import { clientEnv } from '@/lib/env';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
    defaultValues: { email: '', password: '' },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginRequest) => {
      const res = await fetch(`${clientEnv.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!res.ok) {
        let errorMessage = 'Erro ao entrar';
        try {
          const err = (await res.json()) as { message?: string };
          errorMessage = err.message ?? errorMessage;
        } catch {
          // Response body was not JSON — keep default message
        }
        throw new Error(errorMessage);
      }
      return res.json();
    },
    onSuccess: () => {
      router.push(redirectTo);
    },
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
        {/* Brand */}
        <div className="mb-8 text-center">
          <span className="material-symbols-outlined text-4xl text-primary" aria-hidden="true">
            medical_services
          </span>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Bem-vindo de volta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Entre na sua conta para gerenciar sua agenda
          </p>
        </div>

        {/* Error alert */}
        {loginMutation.isError && (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            {loginMutation.error.message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit((data) => loginMutation.mutate(data))} noValidate>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  Senha
                </label>
                <span className="text-xs text-muted-foreground cursor-default">
                  Esqueceu a senha?
                </span>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              {errors.password && (
                <p id="password-error" className="mt-1 text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Solicite acesso à sua clínica
        </p>
      </div>
    </main>
  );
}
