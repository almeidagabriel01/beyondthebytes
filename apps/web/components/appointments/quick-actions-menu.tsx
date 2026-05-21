'use client';

import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [error, setError] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const available = QUICK_ACTIONS.filter((a) => canTransition(appointment.status, a.to));

  // Position the portaled menu relative to the trigger button.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
  }, [open]);

  // Close on outside click (in portal) and on viewport scroll/resize.
  const handleClickOutside = useCallback((e: MouseEvent) => {
    const target = e.target as Node;
    if (triggerRef.current?.contains(target)) return;
    if (menuRef.current?.contains(target)) return;
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.addEventListener('mousedown', handleClickOutside);
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
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
    setError(null);
    try {
      await transitionAppointment(appointment.id, action.to);
      await qc.invalidateQueries({ queryKey });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar status.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
      {error && (
        <div className="absolute right-0 bottom-full mb-1 z-50 bg-[#ffdad6] text-[#ba1a1a] text-[11px] rounded-md px-2 py-1 whitespace-nowrap shadow-sm border border-[#ba1a1a]/20">
          {error}
        </div>
      )}
      <button
        ref={triggerRef}
        type="button"
        aria-label="Ações rápidas"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={loading}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setError(null);
          setOpen((o) => !o);
        }}
        className="p-1.5 text-[#94a3b8] hover:text-[#4648d4] hover:bg-[#e1e0ff] rounded-md transition-colors disabled:opacity-40"
      >
        <span className="material-symbols-outlined text-[18px] leading-none">
          {loading ? 'progress_activity' : 'more_vert'}
        </span>
      </button>

      {open &&
        menuPosition &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: menuPosition.top, right: menuPosition.right }}
            className="fixed z-[60] bg-white rounded-xl border border-[#e2e8f0] shadow-[0_8px_24px_rgba(15,23,42,0.1)] py-1 min-w-[180px]"
            onClick={(e) => e.stopPropagation()}
          >
            {available.map((action) => (
              <button
                key={action.to}
                type="button"
                role="menuitem"
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
          </div>,
          document.body,
        )}
    </div>
  );
}
