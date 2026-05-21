import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: string;
  hint?: string;
  tone?: 'default' | 'positive' | 'negative' | 'warning';
  className?: string;
}

const TONE: Record<NonNullable<KpiCardProps['tone']>, string> = {
  default: 'text-[#4648d4] bg-[#e1e0ff]',
  positive: 'text-[#0f766e] bg-[#ccfbf1]',
  negative: 'text-[#ba1a1a] bg-[#ffdad6]',
  warning: 'text-[#b55d00] bg-[#ffdcc5]',
};

export function KpiCard({ label, value, icon, hint, tone = 'default', className }: KpiCardProps) {
  return (
    <article
      className={cn(
        'bg-white rounded-xl border border-[#e2e8f0] p-5 shadow-sm flex items-start gap-4',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('material-symbols-outlined shrink-0 rounded-lg p-2 text-[22px]', TONE[tone])}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide font-semibold text-[#94a3b8]">{label}</p>
        <p className="mt-1 text-[28px] font-semibold text-[#0f172a] tabular-nums leading-tight">
          {value}
        </p>
        {hint ? <p className="mt-1 text-[12px] text-[#64748b]">{hint}</p> : null}
      </div>
    </article>
  );
}
