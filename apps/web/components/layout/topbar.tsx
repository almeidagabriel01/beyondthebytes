'use client';

import { usePathname } from 'next/navigation';

const PAGE_TITLES: Record<string, string> = {
  '/calendario': 'Calendário',
  '/agenda': 'Agenda do dia',
  '/pacientes': 'Pacientes',
  '/consultas': 'Consultas',
  '/historico': 'Histórico',
  '/configuracoes': 'Configurações',
};

export default function TopBar() {
  const pathname = usePathname();
  const title =
    Object.entries(PAGE_TITLES).find(([key]) => pathname.startsWith(key))?.[1] ?? 'Dashboard';

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-white px-6">
      <h1 className="flex-1 text-lg font-semibold text-foreground">{title}</h1>

      <div className="flex items-center gap-1">
        {/* Search */}
        <button
          type="button"
          aria-label="Buscar"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden="true">
            search
          </span>
        </button>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notificações"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden="true">
            notifications
          </span>
          {/* Badge — unread indicator */}
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary"
            aria-label="Novas notificações"
          />
        </button>

        {/* User avatar */}
        <button
          type="button"
          aria-label="Perfil do usuário"
          className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
        >
          <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden="true">
            person
          </span>
        </button>
      </div>
    </header>
  );
}
