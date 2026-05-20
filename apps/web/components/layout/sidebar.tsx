'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { clientEnv } from '@/lib/env';
import type { MeResponse } from '@medschedule/shared';

const navItems = [
  { href: '/calendario', label: 'Calendário', icon: 'calendar_month' },
  { href: '/agenda', label: 'Agenda do dia', icon: 'event_note' },
  { href: '/pacientes', label: 'Pacientes', icon: 'group' },
  { href: '/consultas', label: 'Consultas', icon: 'medical_services' },
  { href: '/historico', label: 'Histórico', icon: 'history' },
  { href: '/configuracoes', label: 'Configurações', icon: 'settings' },
] as const;

async function fetchMe(): Promise<MeResponse> {
  const res = await fetch(`${clientEnv.NEXT_PUBLIC_API_URL}/auth/me`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Not authenticated');
  return res.json() as Promise<MeResponse>;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    retry: false,
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
    onSuccess: () => {
      queryClient.clear();
      router.push('/login');
    },
    onError: () => {
      queryClient.clear();
      router.push('/login');
    },
  });

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar py-6">
      {/* Brand */}
      <div className="px-6 mb-8">
        <h1 className="text-xl font-bold leading-tight text-white">MedSchedule</h1>
        <p className="text-xs leading-tight text-slate-400 mt-0.5">Medical SaaS</p>
      </div>

      {/* Novo Agendamento CTA */}
      <div className="px-4 mb-6">
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-sidebar-primary py-3 px-4 text-xs font-semibold tracking-wider text-white shadow-sm transition-colors hover:opacity-90"
        >
          <span className="material-symbols-outlined text-[18px] leading-none" aria-hidden="true">
            add
          </span>
          Novo Agendamento
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-1" aria-label="Navegação principal">
        {navItems.map(({ href, label, icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'mx-2 my-1 flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-sidebar-primary text-white shadow-md'
                  : 'text-slate-400 hover:bg-[#1e293b] hover:text-white',
              )}
            >
              <span
                className="material-symbols-outlined text-[20px] leading-none"
                aria-hidden="true"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {icon}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="mt-auto px-4 pt-4 border-t border-[#1e293b] space-y-0.5">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-400 transition-all hover:bg-[#1e293b] hover:text-white"
        >
          <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden="true">
            account_circle
          </span>
          <span className="flex-1 truncate text-left">{me?.email ?? '...'}</span>
          <span className="material-symbols-outlined text-sm leading-none" aria-hidden="true">
            unfold_more
          </span>
        </button>
        <button
          type="button"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-400 transition-all hover:bg-[#1e293b] hover:text-white disabled:opacity-60"
          aria-label="Sair da conta"
        >
          <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden="true">
            logout
          </span>
          <span>{logoutMutation.isPending ? 'Saindo...' : 'Sair'}</span>
        </button>
      </div>
    </aside>
  );
}
