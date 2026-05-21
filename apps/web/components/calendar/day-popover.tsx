'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { formatSlotTime } from '@medschedule/shared';
import type { AppointmentResponse } from '@medschedule/shared';
import { StatusBadge } from '@/components/shared/status-badge';
import { fetchDayAppointments } from '@/lib/appointments';

export interface DayPopoverAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DayPopoverProps {
  date: Date;
  anchor: DayPopoverAnchor | null;
  onClose: () => void;
}

const POPOVER_WIDTH = 300;
const POPOVER_MAX_HEIGHT = 320;
const VIEWPORT_MARGIN = 8;
const ANCHOR_OFFSET = 4;

function computePosition(anchor: DayPopoverAnchor): { top: number; left: number } {
  if (typeof window === 'undefined') {
    return { top: anchor.y + anchor.height + ANCHOR_OFFSET, left: anchor.x };
  }
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Prefer centered under the cell
  let left = anchor.x + anchor.width / 2 - POPOVER_WIDTH / 2;
  left = Math.max(VIEWPORT_MARGIN, Math.min(left, viewportWidth - POPOVER_WIDTH - VIEWPORT_MARGIN));

  let top = anchor.y + anchor.height + ANCHOR_OFFSET;
  // If overflowing bottom, flip above
  if (top + POPOVER_MAX_HEIGHT + VIEWPORT_MARGIN > viewportHeight) {
    const flipped = anchor.y - POPOVER_MAX_HEIGHT - ANCHOR_OFFSET;
    if (flipped >= VIEWPORT_MARGIN) {
      top = flipped;
    } else {
      // Neither fits cleanly — clamp downward, popover will scroll internally
      top = Math.max(VIEWPORT_MARGIN, viewportHeight - POPOVER_MAX_HEIGHT - VIEWPORT_MARGIN);
    }
  }

  return { top, left };
}

export function DayPopover({ date, anchor, onClose }: DayPopoverProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isoDate = format(date, 'yyyy-MM-dd');
  const isOpen = anchor !== null;

  const { data: appointments, status } = useQuery<AppointmentResponse[]>({
    queryKey: ['appointments-day', isoDate],
    queryFn: () => fetchDayAppointments(isoDate),
    staleTime: 2 * 60 * 1000,
    enabled: isOpen,
  });

  // Esc to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const position = useMemo(() => (anchor ? computePosition(anchor) : null), [anchor]);

  if (!isOpen || !mounted || !position) return null;

  const list = appointments ?? [];
  const headerLabel = `${list.length} ${list.length === 1 ? 'consulta' : 'consultas'} em ${format(date, 'dd/MM')}`;

  return createPortal(
    <>
      {/* Outside-click backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
        data-testid="day-popover-backdrop"
      />
      <div
        role="dialog"
        aria-label={headerLabel}
        className="fixed z-50 bg-white border border-[#cbd5e1] rounded-xl shadow-lg flex flex-col overflow-hidden"
        style={{
          top: position.top,
          left: position.left,
          width: POPOVER_WIDTH,
          maxHeight: POPOVER_MAX_HEIGHT,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-2 border-b border-[#e2e8f0] flex items-center justify-between gap-2 shrink-0">
          <span className="text-[13px] font-semibold text-[#0f172a] truncate">{headerLabel}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-[#64748b] hover:text-[#0f172a] rounded p-0.5 -mr-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] leading-none">close</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {status === 'pending' && (
            <div className="p-3 flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-[#f1f5f9] rounded-md animate-pulse" />
              ))}
            </div>
          )}

          {status === 'error' && (
            <div className="px-4 py-6 text-center text-[12px] text-[#64748b]">
              Erro ao carregar consultas.
            </div>
          )}

          {status === 'success' && list.length === 0 && (
            <div className="px-4 py-6 text-center text-[12px] text-[#64748b]">
              Nenhuma consulta neste dia.
            </div>
          )}

          {status === 'success' && list.length > 0 && (
            <ul className="divide-y divide-[#f1f5f9]">
              {list.map((appt) => {
                const isCancelled = appt.status === 'CANCELADO';
                return (
                  <li key={appt.id}>
                    <Link
                      href={`/consultas?id=${appt.id}`}
                      onClick={onClose}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-[#f8fafc] focus:bg-[#f8fafc] focus:outline-none transition-colors"
                    >
                      <div className="flex flex-col items-center min-w-[44px] shrink-0">
                        <span
                          className={`text-[13px] font-semibold leading-tight ${isCancelled ? 'text-[#94a3b8]' : 'text-[#0f172a]'}`}
                        >
                          {formatSlotTime(new Date(appt.startsAt))}
                        </span>
                        <span className="text-[10px] text-[#94a3b8] mt-0.5">
                          {appt.durationMinutes}m
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-[13px] font-medium truncate ${isCancelled ? 'text-[#94a3b8] line-through' : 'text-[#0f172a]'}`}
                        >
                          {appt.patient.fullName}
                        </div>
                      </div>
                      <StatusBadge status={appt.status} className="shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
