'use client';

import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface RightDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  ariaLabel?: string;
  headerActions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  width?: 'md' | 'lg';
}

export function RightDrawer({
  open,
  onClose,
  title,
  ariaLabel,
  headerActions,
  footer,
  children,
  width = 'lg',
}: RightDrawerProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-[#1e293b]/40 backdrop-blur-[2px] animate-[fadeIn_0.2s_ease-out]"
      />
      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
        className={cn(
          'absolute top-0 right-0 h-full bg-white shadow-[-8px_0_24px_rgba(15,23,42,0.08)] flex flex-col overflow-hidden rounded-l-2xl animate-[slideIn_0.25s_cubic-bezier(0.4,0,0.2,1)]',
          width === 'lg' ? 'w-full sm:w-[540px] md:w-[600px]' : 'w-full sm:w-[480px]',
        )}
      >
        <header className="px-6 py-4 border-b border-[#e2e8f0] flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="p-2 -ml-2 text-[#475569] hover:bg-[#f1f5f9] rounded-full transition-colors shrink-0"
              aria-label="Fechar"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <h2 className="text-[18px] font-semibold text-[#0f172a] truncate">{title}</h2>
          </div>
          {headerActions ? <div className="flex gap-2 shrink-0">{headerActions}</div> : null}
        </header>
        <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-6">{children}</div>
        {footer ? (
          <footer className="px-6 py-4 border-t border-[#e2e8f0] bg-white shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
