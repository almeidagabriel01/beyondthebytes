'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTopBarSlot } from '@/context/topbar-slot';
import { fetchMe, logout } from '@/lib/auth';
import { UserAvatar } from '@/components/shared/user-avatar';

type PageConfig = {
  title: string;
  icon: string;
  showNewButton?: boolean;
  titleColor?: string;
};

const PAGE_CONFIG: Record<string, PageConfig> = {
  '/calendario': { title: 'Calendário', icon: 'calendar_today', showNewButton: true },
  '/agenda': { title: 'Agenda do dia', icon: 'event_note', titleColor: 'text-[#4648d4]' },
  '/pacientes': { title: 'Pacientes', icon: 'group' },
  '/consultas': { title: 'Consultas', icon: 'medical_services' },
  '/historico': { title: 'Histórico', icon: 'history' },
  '/configuracoes': { title: 'Configurações', icon: 'settings' },
};

const DEFAULT_CONFIG: PageConfig = { title: 'Dashboard', icon: 'home' };

export default function TopBar() {
  const pathname = usePathname();
  const { rightSlot, onNewAppointment } = useTopBarSlot();
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
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Position the portaled menu relative to the avatar button (drops DOWN).
  useLayoutEffect(() => {
    if (!menuOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
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
    window.addEventListener('scroll', closeMenu, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, [menuOpen, handleClickOutside, closeMenu]);

  const config =
    Object.entries(PAGE_CONFIG).find(([key]) => pathname.startsWith(key))?.[1] ?? DEFAULT_CONFIG;

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-[#cbd5e1] bg-white px-4 md:px-8 md:gap-4">
      {/* Page title with icon */}
      <div className="flex items-center gap-3">
        <span
          className="material-symbols-outlined text-2xl leading-none text-[#4648d4]"
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          {config.icon}
        </span>
        <h1 className={`text-lg font-semibold ${config.titleColor ?? 'text-[#0f172a]'}`}>
          {config.title}
        </h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Right slot (Agenda date nav) OR default search+button */}
        {rightSlot ?? (
          <>
            {/* Search input — desktop only */}
            <div className="relative hidden md:flex">
              <span
                className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] leading-none text-[#94a3b8]"
                aria-hidden="true"
              >
                search
              </span>
              <input
                type="text"
                placeholder="Buscar paciente..."
                className="w-64 rounded-lg border border-[#cbd5e1] bg-[#f8fafc] py-2 pl-10 pr-4 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#4648d4] focus:outline-none focus:ring-1 focus:ring-[#4648d4] transition-all"
              />
            </div>

            {/* Novo agendamento — calendar pages only */}
            {config.showNewButton && (
              <>
                <button
                  type="button"
                  onClick={onNewAppointment ?? undefined}
                  className="md:hidden text-[#4648d4] font-bold bg-[#e1e0ff] px-4 py-2 rounded-lg text-xs font-semibold"
                >
                  Novo
                </button>
                <button
                  type="button"
                  onClick={onNewAppointment ?? undefined}
                  className="hidden md:flex items-center gap-2 rounded-lg bg-[#4648d4] px-4 py-2 text-xs font-semibold tracking-wider text-white shadow-sm transition-colors hover:bg-[#3537b3]"
                >
                  <span
                    className="material-symbols-outlined text-base leading-none"
                    aria-hidden="true"
                  >
                    add
                  </span>
                  Novo agendamento
                </button>
              </>
            )}
          </>
        )}

        {/* Notifications — hidden on mobile (unimplemented) */}
        <button
          type="button"
          aria-label="Notificações"
          className="relative hidden md:flex h-9 w-9 items-center justify-center rounded-full text-[#475569] transition-colors hover:bg-[#f1f5f9] hover:text-[#0f172a]"
        >
          <span className="material-symbols-outlined text-[24px] leading-none" aria-hidden="true">
            notifications
          </span>
          <span
            className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ba1a1a]"
            aria-label="Novas notificações"
          />
        </button>

        {/* User avatar — opens dropdown */}
        <button
          ref={triggerRef}
          type="button"
          aria-label="Menu do usuário"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="rounded-full focus:outline-none focus:ring-2 focus:ring-[#4648d4] focus:ring-offset-2"
        >
          <UserAvatar name={me?.name} avatarUrl={me?.avatarUrl ?? null} size="md" />
        </button>

        {menuOpen &&
          menuPosition &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ top: menuPosition.top, right: menuPosition.right }}
              className="fixed z-[60] min-w-[240px] rounded-xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.1)]"
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <UserAvatar name={me?.name} avatarUrl={me?.avatarUrl ?? null} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[#0f172a]">
                    {me?.name || 'Usuário'}
                  </p>
                  <p className="truncate text-[12px] text-[#64748b]">{me?.email ?? '...'}</p>
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
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-medium text-[#ba1a1a] hover:bg-[#fff1f0] transition-colors disabled:opacity-60 rounded-b-xl"
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
      </div>
    </header>
  );
}
