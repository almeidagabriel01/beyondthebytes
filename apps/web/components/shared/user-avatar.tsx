import { cn, getInitials } from '@/lib/utils';

interface UserAvatarProps {
  // string | null | undefined — accepts the loose shape returned by useQuery
  // (data is `undefined` while loading, `null` when an avatar field is unset).
  name?: string | null | undefined;
  avatarUrl?: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE = {
  sm: { box: 'w-8 h-8', text: 'text-[12px]' },
  md: { box: 'w-10 h-10', text: 'text-[14px]' },
  lg: { box: 'w-12 h-12', text: 'text-[16px]' },
} as const;

export function UserAvatar({ name, avatarUrl, size = 'md', className }: UserAvatarProps) {
  const cfg = SIZE[size];
  if (avatarUrl) {
    // Plain <img> by design — external avatar providers (e.g. pravatar.cc)
    // are intentionally not added to next.config.js remotePatterns, so
    // next/image would refuse to render them.
    return (
      <img
        src={avatarUrl}
        alt={name ?? 'Avatar'}
        className={cn(cfg.box, 'rounded-full object-cover border border-[#e2e8f0]', className)}
      />
    );
  }
  return (
    <div
      aria-label={name ?? 'Avatar'}
      className={cn(
        cfg.box,
        cfg.text,
        'rounded-full bg-[#e1e0ff] text-[#4648d4] flex items-center justify-center font-semibold shrink-0',
        className,
      )}
    >
      {getInitials(name ?? '?')}
    </div>
  );
}
