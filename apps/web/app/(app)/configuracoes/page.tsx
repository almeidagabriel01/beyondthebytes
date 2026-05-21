'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { MeResponse } from '@medschedule/shared';
import { clientEnv } from '@/lib/env';

async function fetchMe(): Promise<MeResponse> {
  const res = await fetch(`${clientEnv.NEXT_PUBLIC_API_URL}/auth/me`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Não autenticado');
  return res.json() as Promise<MeResponse>;
}

const ROLE_LABELS: Record<MeResponse['role'], string> = {
  ADMIN: 'Administrador',
  STAFF: 'Equipe',
};

export default function ConfiguracoesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    staleTime: 5 * 60 * 1000,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${clientEnv.NEXT_PUBLIC_API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok && res.status !== 204) {
        throw new Error('Logout failed');
      }
    },
    onSettled: () => {
      queryClient.clear();
      router.push('/login');
    },
  });

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <header className="mb-6">
        <h1 className="text-[24px] font-semibold tracking-tight text-[#0f172a]">Configurações</h1>
        <p className="mt-1 text-[13px] text-[#64748b]">Sua conta e preferências da clínica.</p>
      </header>

      <section className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden mb-6">
        <header className="px-6 py-4 border-b border-[#e2e8f0] bg-[#f8fafc]">
          <h2 className="text-[14px] font-semibold text-[#0f172a]">Conta</h2>
        </header>
        <div className="p-6 space-y-4">
          {meQuery.isLoading && <p className="text-[13px] text-[#64748b]">Carregando...</p>}
          {meQuery.isError && (
            <p className="text-[13px] text-[#ba1a1a]">Erro ao carregar dados da conta.</p>
          )}
          {meQuery.data && (
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-x-6">
              <dt className="text-[12px] font-semibold text-[#64748b] uppercase tracking-wide sm:col-span-1">
                Nome
              </dt>
              <dd className="text-[14px] text-[#0f172a] sm:col-span-2">
                {meQuery.data.name || '—'}
              </dd>
              <dt className="text-[12px] font-semibold text-[#64748b] uppercase tracking-wide sm:col-span-1">
                E-mail
              </dt>
              <dd className="text-[14px] text-[#0f172a] sm:col-span-2">{meQuery.data.email}</dd>
              <dt className="text-[12px] font-semibold text-[#64748b] uppercase tracking-wide sm:col-span-1">
                Papel
              </dt>
              <dd className="text-[14px] text-[#0f172a] sm:col-span-2">
                {ROLE_LABELS[meQuery.data.role]}
              </dd>
            </dl>
          )}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden mb-6">
        <header className="px-6 py-4 border-b border-[#e2e8f0] bg-[#f8fafc]">
          <h2 className="text-[14px] font-semibold text-[#0f172a]">Segurança</h2>
        </header>
        <div className="p-6 space-y-3">
          <button
            type="button"
            disabled
            title="Em breve"
            className="inline-flex items-center gap-2 rounded-lg border border-[#e2e8f0] px-4 py-2 text-[13px] font-medium text-[#64748b] bg-white cursor-not-allowed opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">lock_reset</span>
            Alterar senha (em breve)
          </button>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
        <header className="px-6 py-4 border-b border-[#e2e8f0] bg-[#f8fafc]">
          <h2 className="text-[14px] font-semibold text-[#0f172a]">Sessão</h2>
        </header>
        <div className="p-6">
          <button
            type="button"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-[#ba1a1a] text-white px-4 py-2 text-[13px] font-semibold hover:bg-[#9a1717] disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            {logoutMutation.isPending ? 'Saindo...' : 'Sair da conta'}
          </button>
        </div>
      </section>
    </div>
  );
}
