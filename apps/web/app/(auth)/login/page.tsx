'use client';

import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { LoginRequestSchema, type LoginRequest } from '@medschedule/shared';
import { clientEnv } from '@/lib/env';

function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

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
      // Always land on dashboard (PDF: "Dashboard é a tela inicial operacional").
      router.push('/dashboard');
    },
  });

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8"
      style={{ backgroundColor: '#efecf8' }}
    >
      <div
        className="w-full max-w-[440px] rounded-xl overflow-hidden relative"
        style={{
          backgroundColor: '#ffffff',
          boxShadow: '0 8px 30px rgba(15,23,42,0.06)',
          border: '1px solid rgba(199,196,215,0.3)',
        }}
      >
        {/* Top accent line */}
        <div className="h-1 w-full absolute top-0 left-0" style={{ backgroundColor: '#4648d4' }} />

        <div className="p-8 sm:p-10">
          {/* Brand */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-sm"
              style={{ backgroundColor: '#6063ee' }}
            >
              <span
                className="material-symbols-outlined text-2xl"
                aria-hidden="true"
                style={{ fontVariationSettings: "'FILL' 1", color: '#ffffff' }}
              >
                medical_services
              </span>
            </div>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: '#1b1b23', letterSpacing: '-0.01em' }}
            >
              MedSchedule
            </h1>
          </div>

          {/* Headline */}
          <div className="text-center mb-8 space-y-2">
            <h2 className="text-lg font-semibold" style={{ color: '#1b1b23' }}>
              Bem-vindo de volta
            </h2>
            <p className="text-sm" style={{ color: '#464554' }}>
              Entre na sua conta para gerenciar sua agenda
            </p>
          </div>

          {/* Error alert */}
          {loginMutation.isError && (
            <div
              role="alert"
              className="mb-5 rounded-lg p-3 text-sm"
              style={{ backgroundColor: '#ffdad6', color: '#93000a' }}
            >
              {loginMutation.error.message}
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSubmit((data) => loginMutation.mutate(data))}
            noValidate
            className="space-y-5"
          >
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-semibold tracking-wider"
                style={{ color: '#1b1b23' }}
              >
                E-mail
              </label>
              <div className="relative group">
                <div
                  className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"
                  style={{ color: '#464554' }}
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                    mail
                  </span>
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="doutor@clinica.com.br"
                  {...register('email')}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className="block w-full pl-11 pr-4 py-3 rounded-lg text-sm transition-all duration-200 focus:outline-none"
                  style={{
                    border: errors.email ? '1px solid #ba1a1a' : '1px solid #c7c4d7',
                    backgroundColor: '#fcf8ff',
                    color: '#1b1b23',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4648d4';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(70,72,212,0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = errors.email ? '#ba1a1a' : '#c7c4d7';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
              {errors.email && (
                <p id="email-error" className="text-xs" style={{ color: '#ba1a1a' }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold tracking-wider"
                  style={{ color: '#1b1b23' }}
                >
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] font-medium transition-colors focus:outline-none hover:underline"
                  style={{ color: '#4648d4' }}
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative group">
                <div
                  className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"
                  style={{ color: '#464554' }}
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                    lock
                  </span>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className="block w-full pl-11 pr-12 py-3 rounded-lg text-sm transition-all duration-200 focus:outline-none"
                  style={{
                    border: errors.password ? '1px solid #ba1a1a' : '1px solid #c7c4d7',
                    backgroundColor: '#fcf8ff',
                    color: '#1b1b23',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4648d4';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(70,72,212,0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = errors.password ? '#ba1a1a' : '#c7c4d7';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center focus:outline-none"
                  style={{ color: '#464554' }}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-xs" style={{ color: '#ba1a1a' }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full flex items-center justify-center py-3.5 px-4 rounded-lg text-xs font-semibold tracking-wider shadow-sm transition-all duration-200 mt-2 focus:outline-none active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90"
              style={{ backgroundColor: '#4648d4', color: '#ffffff' }}
            >
              {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div
          className="px-8 py-5 text-center"
          style={{
            backgroundColor: '#f5f2fe',
            borderTop: '1px solid rgba(199,196,215,0.3)',
          }}
        >
          <p className="text-[13px]" style={{ color: '#464554' }}>
            Não tem uma conta?{' '}
            <button
              type="button"
              className="ml-1 text-xs font-semibold tracking-wider transition-colors focus:outline-none"
              style={{ color: '#4648d4' }}
            >
              Solicite acesso à sua clínica
            </button>
          </p>
        </div>
      </div>

      {showForgotModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowForgotModal(false);
          }}
        >
          <div
            className="w-full max-w-[420px] rounded-2xl bg-white shadow-2xl overflow-hidden"
            style={{ border: '1px solid rgba(199,196,215,0.3)' }}
          >
            <div className="px-6 pt-7 pb-5 text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: '#e1e0ff' }}
              >
                <span
                  className="material-symbols-outlined text-2xl"
                  aria-hidden="true"
                  style={{ color: '#4648d4' }}
                >
                  lock_reset
                </span>
              </div>
              <h3
                id="forgot-modal-title"
                className="text-lg font-semibold mb-2"
                style={{ color: '#1b1b23' }}
              >
                Recuperação de senha
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#464554' }}>
                Em breve. Por enquanto, entre em contato com o administrador da sua clínica para
                redefinir sua senha.
              </p>
            </div>
            <div
              className="px-6 py-4 flex justify-end"
              style={{ backgroundColor: '#f5f2fe', borderTop: '1px solid rgba(199,196,215,0.3)' }}
            >
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wider text-white shadow-sm hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#4648d4' }}
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
