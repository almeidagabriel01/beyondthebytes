'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { fetchMe, logout } from '@/lib/auth';
import { UserAvatar } from '@/components/shared/user-avatar';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/calendario', label: 'Calendário', icon: 'calendar_month' },
  { href: '/agenda', label: 'Agenda do dia', icon: 'event_note' },
  { href: '/pacientes', label: 'Pacientes', icon: 'group' },
  { href: '/consultas', label: 'Consultas', icon: 'medical_services' },
  { href: '/historico', label: 'Histórico', icon: 'history' },
  { href: '/configuracoes', label: 'Configurações', icon: 'settings' },
] as const;

const ROLE_LABELS: Record<'ADMIN' | 'STAFF', string> = {
  ADMIN: 'Administrador',
  STAFF: 'Equipe',
};

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
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear();
      router.push('/login');
    },
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    left: number;
    bottom: number;
    width: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Position the portaled menu directly ABOVE the user button (drops up).
  useLayoutEffect(() => {
    if (!menuOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuPosition({
      left: rect.left,
      bottom: window.innerHeight - rect.top + 8,
      width: rect.width,
    });
  }, [menuOpen]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    const target = e.target as Node;
    if (triggerRef.current?.contains(target)) return;
    if (menuRef.current?.contains(target)) return;
    setMenuOpen(false);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('resize', closeMenu);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', closeMenu);
    };
  }, [menuOpen, handleClickOutside, closeMenu]);

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-50 md:w-16 lg:w-64 flex-col bg-sidebar py-6">
      {/* Brand */}
      <div className="mb-8 flex items-center justify-center lg:justify-start lg:px-6">
        {/* Compact brand mark (tablet, icon-only) */}
        <div className="lg:hidden flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-white">
          <span className="material-symbols-outlined text-[18px] leading-none" aria-hidden="true">
            medical_services
          </span>
        </div>
        {/* Full brand (desktop) */}
        <div className="hidden lg:block">
          <h1 className="text-xl font-bold leading-tight text-white">MedSchedule</h1>
          <p className="text-xs leading-tight text-slate-400 mt-0.5">Medical SaaS</p>
        </div>
      </div>

      {/* Novo Agendamento CTA */}
      <div className="px-2 lg:px-4 mb-6 flex justify-center">
        <button
          type="button"
          aria-label="Novo agendamento"
          className="flex items-center justify-center gap-2 rounded-lg bg-sidebar-primary text-white shadow-sm transition-colors hover:opacity-90 h-11 w-11 lg:h-auto lg:w-full lg:py-3 lg:px-4 text-xs font-semibold tracking-wider"
        >
          <span className="material-symbols-outlined text-[18px] leading-none" aria-hidden="true">
            add
          </span>
          <span className="hidden lg:inline">Novo Agendamento</span>
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
              title={label}
              className={cn(
                'mx-2 my-1 flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200',
                'justify-center lg:justify-start lg:px-4',
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
              <span className="hidden lg:inline">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="mt-auto px-2 lg:px-4 pt-4 border-t border-[#1e293b]">
        <button
          ref={triggerRef}
          type="button"
          aria-label="Menu do usuário"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-400 transition-all hover:bg-[#1e293b] hover:text-white justify-center lg:justify-start"
        >
          <UserAvatar name={me?.name} avatarUrl={me?.avatarUrl ?? null} size="sm" />
          <span className="hidden lg:block flex-1 truncate text-left">
            {me?.name || me?.email || '...'}
          </span>
          {/* Wrapper carries `hidden` because the Material Symbols global class
              sets display:inline-block, overriding Tailwind's `hidden` if applied
              directly to the icon span. */}
          <span className="hidden lg:inline-flex shrink-0">
            <span className="material-symbols-outlined text-sm leading-none" aria-hidden="true">
              unfold_more
            </span>
          </span>
        </button>
      </div>

      {menuOpen &&
        menuPosition &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              left: menuPosition.left,
              bottom: menuPosition.bottom,
              minWidth: Math.max(menuPosition.width, 240),
            }}
            className="fixed z-[60] rounded-xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.15)]"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <UserAvatar name={me?.name} avatarUrl={me?.avatarUrl ?? null} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-[#0f172a]">
                  {me?.name || 'Usuário'}
                </p>
                <p className="truncate text-[12px] text-[#64748b]">{me?.email ?? '...'}</p>
                {me?.role && (
                  <span className="mt-1 inline-block rounded-full bg-[#e1e0ff] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#4648d4]">
                    {ROLE_LABELS[me.role]}
                  </span>
                )}
              </div>
            </div>
            <div className="border-t border-[#e2e8f0]" />
            <Link
              href="/configuracoes"
              role="menuitem"
              onClick={closeMenu}
              className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-[#0f172a] hover:bg-[#f8fafc] transition-colors"
            >
              <span
                className="material-symbols-outlined text-[18px] leading-none"
                aria-hidden="true"
              >
                settings
              </span>
              Configurações
            </Link>
            <button
              type="button"
              role="menuitem"
              disabled={logoutMutation.isPending}
              onClick={() => {
                closeMenu();
                logoutMutation.mutate();
              }}
              className="flex w-full items-center gap-2.5 rounded-b-xl px-4 py-2.5 text-left text-[13px] font-medium text-[#ba1a1a] hover:bg-[#fff1f0] transition-colors disabled:opacity-60"
            >
              <span
                className="material-symbols-outlined text-[18px] leading-none"
                aria-hidden="true"
              >
                logout
              </span>
              {logoutMutation.isPending ? 'Saindo...' : 'Sair'}
            </button>
          </div>,
          document.body,
        )}
    </aside>
  );
}
