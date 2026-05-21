'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ClinicalNoteResponse, TiptapDoc } from '@medschedule/shared';
import { NoteViewer } from './note-viewer';

interface Props {
  note: ClinicalNoteResponse | null;
  open: boolean;
  onClose: () => void;
}

function timestamp(iso: string) {
  return format(new Date(iso), "d 'de' MMM yyyy 'às' HH:mm", { locale: ptBR });
}

// Walk the Tiptap doc tree and concatenate text nodes (up to ~140 chars).
function previewText(doc: TiptapDoc, limit = 140): string {
  const out: string[] = [];
  const visit = (node: unknown): void => {
    if (out.join(' ').length >= limit || !node || typeof node !== 'object') return;
    const n = node as { type?: string; text?: string; content?: unknown[] };
    if (n.type === 'text' && typeof n.text === 'string') {
      out.push(n.text);
    }
    if (Array.isArray(n.content)) {
      for (const child of n.content) visit(child);
    }
  };
  visit(doc);
  const joined = out.join(' ').replace(/\s+/g, ' ').trim();
  return joined.length > limit ? joined.slice(0, limit) + '…' : joined;
}

export function NoteHistoryDrawer({ note, open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex">
      <button
        type="button"
        aria-label="Fechar histórico"
        onClick={onClose}
        className="flex-1 bg-black/30 backdrop-blur-sm"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Histórico de revisões"
        className="w-full max-w-md bg-white shadow-xl flex flex-col"
      >
        <header className="px-5 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-[#0f172a]">Histórico</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-2 -mr-2 text-[#64748b] hover:bg-[#f1f5f9] rounded-full"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {!note ? (
            <p className="text-[13px] text-[#64748b]">Nenhuma observação ainda.</p>
          ) : (
            <>
              {note.revisions.map((rev, idx) => (
                <article
                  key={rev.id}
                  className={
                    'rounded-lg border border-[#e2e8f0] p-4 ' +
                    (idx === 0 ? 'bg-[#f5f2fe]' : 'bg-white')
                  }
                >
                  <header className="flex items-center justify-between text-[12px] text-[#64748b]">
                    <span className="font-semibold uppercase tracking-wide">
                      {idx === 0 ? 'Versão atual' : `Versão ${note.revisions.length - idx}`}
                    </span>
                    <time>{timestamp(rev.createdAt)}</time>
                  </header>
                  <p className="mt-1 text-[12px] text-[#475569]">{note.authorName}</p>
                  {idx === 0 ? (
                    <div className="mt-3 pt-3 border-t border-[#e2e8f0]/60">
                      <NoteViewer content={rev.content} />
                    </div>
                  ) : (
                    <p className="mt-3 pt-3 border-t border-[#e2e8f0]/60 text-[13px] text-[#475569] line-clamp-3">
                      {previewText(rev.content) || '(sem texto)'}
                    </p>
                  )}
                </article>
              ))}
              <p className="px-2 pt-2 text-[11px] text-[#94a3b8]">
                Criada em {timestamp(note.createdAt)}
              </p>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
