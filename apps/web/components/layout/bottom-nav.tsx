'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', label: 'Início', icon: 'home' },
  { href: '/calendario', label: 'Calendário', icon: 'calendar_month' },
  { href: '/agenda', label: 'Agenda', icon: 'event_note' },
  { href: '/pacientes', label: 'Pacientes', icon: 'group' },
  { href: '/consultas', label: 'Consultas', icon: 'medical_services' },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#e2e8f0] flex items-stretch shadow-[0_-4px_12px_rgba(15,23,42,0.04)]"
      aria-label="Navegação principal"
    >
      {items.map(({ href, label, icon }) => {
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 text-[10px] font-medium transition-colors',
              isActive ? 'text-[#4648d4]' : 'text-[#64748b] hover:text-[#0f172a]',
            )}
          >
            <span
              className="material-symbols-outlined text-[22px] leading-none"
              aria-hidden="true"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {icon}
            </span>
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
