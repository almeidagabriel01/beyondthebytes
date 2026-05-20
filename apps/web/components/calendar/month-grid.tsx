import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  format,
  isSameDay,
} from 'date-fns';
import type { MonthSummaryItem } from '@medschedule/shared';
import { DayCell } from './day-cell';

const WEEKDAY_HEADERS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface MonthGridProps {
  month: Date;
  selectedDay: Date;
  summary: MonthSummaryItem[];
  onDaySelect: (d: Date) => void;
}

export function MonthGrid({ month, selectedDay, summary, onDaySelect }: MonthGridProps) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  // Build a map keyed by YYYY-MM-DD for O(1) lookups
  const summaryMap = new Map<string, MonthSummaryItem>();
  for (const item of summary) {
    summaryMap.set(item.date, item);
  }

  return (
    <div>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-[#e2e8f0] mb-px">
        {WEEKDAY_HEADERS.map((label) => (
          <div
            key={label}
            className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-[#475569]"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-[#e2e8f0]">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const daySummary = summaryMap.get(key);
          return (
            <DayCell
              key={key}
              day={day}
              currentMonth={month}
              isSelected={isSameDay(day, selectedDay)}
              {...(daySummary !== undefined ? { summary: daySummary } : {})}
              onSelect={onDaySelect}
            />
          );
        })}
      </div>
    </div>
  );
}
