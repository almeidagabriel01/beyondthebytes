'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AppointmentResponse, AppointmentStatus } from '@medschedule/shared';
import { canTransition } from '@medschedule/shared';
import { transitionAppointment } from '@/lib/appointments';

interface QuickAction {
  to: AppointmentStatus;
  label: string;
  icon: string;
  danger?: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
  { to: 'CONFIRMADO', label: 'Confirmar', icon: 'check' },
  { to: 'AGUARDANDO', label: 'Aguardando', icon: 'hourglass_empty' },
  { to: 'EM_ATENDIMENTO', label: 'Iniciar Atendimento', icon: 'play_arrow' },
  { to: 'REALIZADO', label: 'Marcar como Realizado', icon: 'check_circle' },
  { to: 'CANCELADO', label: 'Cancelar', icon: 'event_busy', danger: true },
];

interface QuickActionsMenuProps {
  appointment: AppointmentResponse;
  queryKey: unknown[];
  onCancelRequest: (appt: AppointmentResponse) => void;
}

export function QuickActionsMenu({
  appointment,
  queryKey,
  onCancelRequest,
}: QuickActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const available = QUICK_ACTIONS.filter((a) => canTransition(appointment.status, a.to));

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, handleClickOutside]);

  if (available.length === 0) return null;

  async function handleAction(action: QuickAction, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (action.to === 'CANCELADO') {
      setOpen(false);
      onCancelRequest(appointment);
      return;
    }

    setLoading(true);
    setOpen(false);
    try {
      await transitionAppointment(appointment.id, action.to);
      await qc.invalidateQueries({ queryKey });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={menuRef} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label="Ações rápidas"
        disabled={loading}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="p-1.5 text-[#94a3b8] hover:text-[#4648d4] hover:bg-[#e1e0ff] rounded-md transition-colors disabled:opacity-40"
      >
        <span className="material-symbols-outlined text-[18px] leading-none">
          {loading ? 'progress_activity' : 'more_vert'}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl border border-[#e2e8f0] shadow-[0_8px_24px_rgba(15,23,42,0.1)] py-1 min-w-[180px]">
          {available.map((action) => (
            <button
              key={action.to}
              type="button"
              onClick={(e) => handleAction(action, e)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-left hover:bg-[#f8fafc] transition-colors ${
                action.danger ? 'text-[#ba1a1a]' : 'text-[#0f172a]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] leading-none">
                {action.icon}
              </span>
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
