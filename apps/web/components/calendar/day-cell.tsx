import { isToday, isSameMonth } from 'date-fns';
import type { MonthSummaryItem } from '@medschedule/shared';

interface DayCellProps {
  day: Date;
  currentMonth: Date;
  isSelected: boolean;
  summary?: MonthSummaryItem | undefined;
  onSelect: (d: Date) => void;
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

export function DayCell({ day, currentMonth, isSelected, summary, onSelect }: DayCellProps) {
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
    cellClass += ' bg-[#f8fafc] hover:bg-[#f1f5f9]';
  } else {
    cellClass += ' bg-white hover:bg-[#f8fafc]';
  }

  return (
    <div
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
        <span className="w-7 h-7 bg-[#4648d4] text-white rounded-full flex items-center justify-center text-sm font-semibold">
          {day.getDate()}
        </span>
      ) : (
        <span className="w-7 h-7 flex items-center justify-center text-sm text-[#0f172a]">
          {day.getDate()}
        </span>
      )}

      {/* Dots */}
      {dots.length > 0 && (
        <div className="flex items-center gap-0.5 mt-1 flex-wrap justify-center">
          {dots.map((color, idx) => (
            <span
              key={idx}
              className={`w-1.5 h-1.5 rounded-full ${DOT_COLOR_CLASS[color]}`}
              aria-hidden="true"
            />
          ))}
        </div>
      )}
    </div>
  );
}
