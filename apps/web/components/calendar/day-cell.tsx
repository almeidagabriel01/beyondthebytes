import { isToday, isSameMonth } from 'date-fns';
import type { MonthSummaryItem } from '@medschedule/shared';
import type { DayPopoverAnchor } from './day-popover';

interface DayCellProps {
  day: Date;
  currentMonth: Date;
  isSelected: boolean;
  summary?: MonthSummaryItem | undefined;
  onSelect: (d: Date) => void;
  onOpenPopover: (d: Date, anchor: DayPopoverAnchor) => void;
}

type DotColor = 'primary' | 'warning' | 'danger';

const DOT_COLOR_CLASS: Record<DotColor, string> = {
  primary: 'bg-[#4648d4]',
  warning: 'bg-[#b55d00]',
  danger: 'bg-[#ba1a1a]',
};

function getDots(summary?: MonthSummaryItem): DotColor[] {
  if (!summary) return [];
  const counts = summary.counts as Record<string, number>;

  const dots: DotColor[] = [];

  const primaryCount =
    (counts['AGENDADO'] ?? 0) + (counts['CONFIRMADO'] ?? 0) + (counts['EM_ATENDIMENTO'] ?? 0);
  const warningCount = counts['AGUARDANDO'] ?? 0;
  const dangerCount = counts['CANCELADO'] ?? 0;

  for (let i = 0; i < primaryCount && dots.length < 5; i++) dots.push('primary');
  for (let i = 0; i < warningCount && dots.length < 5; i++) dots.push('warning');
  for (let i = 0; i < dangerCount && dots.length < 5; i++) dots.push('danger');

  return dots;
}

function anchorFromEvent(
  e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
): DayPopoverAnchor {
  const target = e.currentTarget as HTMLElement;
  // Use the parent day cell as anchor so the popover aligns with the whole cell
  const cell = target.closest('[data-day-cell="true"]') ?? target;
  const rect = cell.getBoundingClientRect();
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
}

export function DayCell({
  day,
  currentMonth,
  isSelected,
  summary,
  onSelect,
  onOpenPopover,
}: DayCellProps) {
  const inMonth = isSameMonth(day, currentMonth);
  const today = isToday(day);
  const dayOfWeek = day.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const dots = getDots(summary);

  if (!inMonth) {
    return (
      <div className="min-h-[100px] p-2 flex flex-col items-center pt-2 bg-white opacity-50 cursor-default">
        <span className="text-sm text-[#94a3b8]">{day.getDate()}</span>
      </div>
    );
  }

  let cellClass =
    'min-h-[100px] p-2 flex flex-col items-center pt-2 transition-colors cursor-pointer';

  if (isSelected) {
    cellClass += ' shadow-[inset_0_0_0_2px_#4648d4] bg-[#e1e0ff]/20';
  } else if (isWeekend) {
    cellClass += ' bg-white hover:bg-[#f1f5f9]';
  } else {
    cellClass += ' bg-white hover:bg-[#f8fafc]';
  }

  const dayNumColor = isWeekend ? 'text-[#475569]' : 'text-[#0f172a]';

  const totalCount = summary
    ? Object.values(summary.counts as Record<string, number>).reduce((a, b) => a + b, 0)
    : 0;

  const hasAppointments = totalCount > 0;

  const popoverLabel = `Ver ${totalCount} ${totalCount === 1 ? 'consulta' : 'consultas'} em ${day.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}`;

  const handlePopoverClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    onOpenPopover(day, anchorFromEvent(e));
  };

  const handlePopoverKey = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onOpenPopover(day, anchorFromEvent(e));
    }
  };

  return (
    <div
      data-day-cell="true"
      className={cellClass}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(day)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(day);
      }}
      aria-pressed={isSelected}
      aria-label={day.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })}
    >
      {/* Day number */}
      {today ? (
        <span className="w-7 h-7 bg-[#4648d4] text-white rounded-full flex items-center justify-center text-[13px] font-bold shadow-sm">
          {day.getDate()}
        </span>
      ) : (
        <span
          className={`w-7 h-7 flex items-center justify-center text-[13px] font-medium ${dayNumColor}`}
        >
          {day.getDate()}
        </span>
      )}

      {/* Today: show count label; other days: show dots. Count/dots are an interactive
          peek trigger when there are appointments. */}
      {today && totalCount > 0 ? (
        <button
          type="button"
          onClick={handlePopoverClick}
          onKeyDown={handlePopoverKey}
          aria-label={popoverLabel}
          className="mt-1 text-[10px] bg-white border border-[#cbd5e1] border-l-2 border-l-[#4648d4] rounded px-1.5 py-0.5 truncate text-[#0f172a] font-medium max-w-full hover:bg-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#4648d4]/40"
        >
          {totalCount} Consultas
        </button>
      ) : (
        dots.length > 0 &&
        (hasAppointments ? (
          <button
            type="button"
            onClick={handlePopoverClick}
            onKeyDown={handlePopoverKey}
            aria-label={popoverLabel}
            className="mt-1 flex items-center gap-0.5 flex-wrap justify-center rounded px-1 py-0.5 hover:bg-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#4648d4]/40"
          >
            {dots.map((color, idx) => (
              <span
                key={idx}
                className={`w-1.5 h-1.5 rounded-full ${DOT_COLOR_CLASS[color]}`}
                aria-hidden="true"
              />
            ))}
          </button>
        ) : (
          <div className="flex items-center gap-0.5 mt-1 flex-wrap justify-center">
            {dots.map((color, idx) => (
              <span
                key={idx}
                className={`w-1.5 h-1.5 rounded-full ${DOT_COLOR_CLASS[color]}`}
                aria-hidden="true"
              />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
