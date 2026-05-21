'use client';

import { usePathname } from 'next/navigation';
import { useTopBarSlot } from '@/context/topbar-slot';

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

  const config =
    Object.entries(PAGE_CONFIG).find(([key]) => pathname.startsWith(key))?.[1] ?? DEFAULT_CONFIG;

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-[#cbd5e1] bg-white px-8">
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

      <div className="flex items-center gap-4">
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

        {/* Notifications — always visible */}
        <button
          type="button"
          aria-label="Notificações"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#475569] transition-colors hover:bg-[#f1f5f9] hover:text-[#0f172a]"
        >
          <span className="material-symbols-outlined text-[24px] leading-none" aria-hidden="true">
            notifications
          </span>
          <span
            className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ba1a1a]"
            aria-label="Novas notificações"
          />
        </button>

        {/* User avatar — always visible */}
        <div
          className="w-10 h-10 rounded-full bg-[#e2e8f0] overflow-hidden border border-[#cbd5e1] cursor-pointer flex items-center justify-center"
          aria-label="Perfil do usuário"
          role="button"
          tabIndex={0}
        >
          <span
            className="material-symbols-outlined text-[20px] leading-none text-[#475569]"
            aria-hidden="true"
          >
            person
          </span>
        </div>
      </div>
    </header>
  );
}
