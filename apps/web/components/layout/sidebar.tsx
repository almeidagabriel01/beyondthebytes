'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/calendario', label: 'Calendário', icon: 'calendar_month' },
  { href: '/agenda', label: 'Agenda do dia', icon: 'event_note' },
  { href: '/pacientes', label: 'Pacientes', icon: 'group' },
  { href: '/consultas', label: 'Consultas', icon: 'medical_services' },
  { href: '/historico', label: 'Histórico', icon: 'history' },
  { href: '/configuracoes', label: 'Configurações', icon: 'settings' },
] as const;

export default function Sidebar() {
  const pathname = usePathname();

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
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden="true">
            account_circle
          </span>
          <span className="flex-1 truncate text-left">Clínica Bela Vida</span>
          <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden="true">
            unfold_more
          </span>
        </button>
      </div>
    </aside>
  );
}
