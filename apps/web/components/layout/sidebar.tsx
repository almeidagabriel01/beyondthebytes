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
    staleTime: 5 * 60 * 1000, // 5 minutes — role changes take effect on next login
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
      // Even on error, redirect to login (cookies may be cleared by API)
      queryClient.clear();
      router.push('/login');
    },
  });

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-6">
        <span
          className="material-symbols-outlined text-2xl text-sidebar-primary leading-none"
          aria-hidden="true"
        >
          medical_services
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-sidebar-primary-foreground">
            MedSchedule
          </p>
          <p className="truncate text-xs leading-tight text-sidebar-foreground/60">Medical SaaS</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navegação principal">
        <ul className="space-y-0.5" role="list">
          {navItems.map(({ href, label, icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-l-2 border-sidebar-primary bg-[#312e81] text-white'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                >
                  <span
                    className="material-symbols-outlined text-[20px] leading-none"
                    aria-hidden="true"
                  >
                    {icon}
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="shrink-0 border-t border-sidebar-border p-3 space-y-1">
        {/* User info */}
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground">
          <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden="true">
            account_circle
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{me?.email ?? '...'}</p>
            <p className="truncate text-xs text-sidebar-foreground/60 capitalize">
              {me?.role?.toLowerCase() ?? ''}
            </p>
          </div>
        </div>

        {/* Logout button */}
        <button
          type="button"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-60"
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
