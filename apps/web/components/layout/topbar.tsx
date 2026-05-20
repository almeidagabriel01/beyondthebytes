'use client';

import { usePathname } from 'next/navigation';

type PageConfig = {
  title: string;
  icon: string;
  showNewButton?: boolean;
  titleColor?: string;
};

const PAGE_CONFIG: Record<string, PageConfig> = {
  '/calendario': { title: 'Calendário', icon: 'calendar_today', showNewButton: true },
  '/agenda': { title: 'Agenda do dia', icon: 'event_note', titleColor: 'text-primary' },
  '/pacientes': { title: 'Pacientes', icon: 'group' },
  '/consultas': { title: 'Consultas', icon: 'medical_services' },
  '/historico': { title: 'Histórico', icon: 'history' },
  '/configuracoes': { title: 'Configurações', icon: 'settings' },
};

const DEFAULT_CONFIG: PageConfig = { title: 'Dashboard', icon: 'home' };

export default function TopBar() {
  const pathname = usePathname();
  const config =
    Object.entries(PAGE_CONFIG).find(([key]) => pathname.startsWith(key))?.[1] ?? DEFAULT_CONFIG;

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-white px-8">
      {/* Page title with icon */}
      <div className="flex items-center gap-3">
        <span
          className="material-symbols-outlined text-2xl leading-none text-primary"
          aria-hidden="true"
        >
          {config.icon}
        </span>
        <h1 className={`text-lg font-semibold ${config.titleColor ?? 'text-foreground'}`}>
          {config.title}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Search input — desktop only */}
        <div className="relative hidden md:flex">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] leading-none text-muted-foreground"
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="text"
            placeholder="Buscar paciente..."
            className="w-64 rounded-lg border border-border bg-secondary py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notificações"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden="true">
            notifications
          </span>
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive"
            aria-label="Novas notificações"
          />
        </button>

        {/* Novo agendamento — calendar pages only */}
        {config.showNewButton && (
          <button
            type="button"
            className="hidden md:flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold tracking-wider text-primary-foreground shadow-sm transition-colors hover:opacity-90"
          >
            Novo agendamento
          </button>
        )}

        {/* User avatar */}
        <button
          type="button"
          aria-label="Perfil do usuário"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground transition-colors hover:bg-accent"
        >
          <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden="true">
            person
          </span>
        </button>
      </div>
    </header>
  );
}
