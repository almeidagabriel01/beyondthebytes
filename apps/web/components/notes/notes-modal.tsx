'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TiptapDoc, ClinicalNoteResponse } from '@medschedule/shared';
import { fetchAppointmentNotes, createAppointmentNote, patchClinicalNote } from '@/lib/notes';
import { NoteEditor } from './note-editor';
import { NoteHistoryDrawer } from './note-history-drawer';

interface Props {
  appointmentId: string;
  open: boolean;
  onClose: () => void;
}

const EMPTY_DOC: TiptapDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

export function NotesModal({ appointmentId, open, onClose }: Props) {
  const queryClient = useQueryClient();
  const draftRef = useRef<TiptapDoc>(EMPTY_DOC);
  const [showHistory, setShowHistory] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const notesQuery = useQuery({
    queryKey: ['notes', appointmentId],
    queryFn: ({ signal }) => fetchAppointmentNotes(appointmentId, { signal }),
    enabled: open,
    staleTime: 30_000,
  });

  const currentNote: ClinicalNoteResponse | undefined = notesQuery.data?.[0];
  const initialDoc: TiptapDoc = currentNote?.revisions[0]?.content ?? EMPTY_DOC;

  // Seed draftRef when the note identity changes — so save() ships loaded content
  // if the user opens and clicks save without typing.
  useEffect(() => {
    draftRef.current = currentNote?.revisions[0]?.content ?? EMPTY_DOC;
  }, [currentNote]);

  const save = useMutation({
    mutationFn: async () => {
      const doc = draftRef.current;
      if (currentNote) {
        return patchClinicalNote(currentNote.id, { content: doc });
      }
      return createAppointmentNote(appointmentId, { content: doc });
    },
    onSuccess: () => {
      setSaveError(null);
      void queryClient.invalidateQueries({ queryKey: ['notes', appointmentId] });
    },
    onError: (err: Error) => {
      setSaveError(err.message);
    },
  });

  if (!open) return null;

  const editorKey = `${currentNote?.id ?? 'new'}:${currentNote?.revisions[0]?.id ?? 'fresh'}`;

  return (
    <>
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Observações clínicas"
          className="bg-white w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]"
        >
          <header className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
            <div>
              <h2 className="text-[18px] font-semibold text-[#0f172a]">Observações clínicas</h2>
              {currentNote ? (
                <p className="text-[12px] text-[#64748b]">
                  Última edição por {currentNote.authorName}
                </p>
              ) : (
                <p className="text-[12px] text-[#64748b]">Crie a primeira observação.</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowHistory(true)}
                disabled={!currentNote}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium text-[#475569] hover:bg-[#f1f5f9] disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <span className="material-symbols-outlined text-[18px]">history</span>
                Histórico
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="p-2 -mr-2 text-[#64748b] hover:bg-[#f1f5f9] rounded-full"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {notesQuery.isSuccess ? (
              <NoteEditor
                key={editorKey}
                initialContent={initialDoc}
                onChange={(doc) => {
                  draftRef.current = doc;
                }}
              />
            ) : (
              <p className="text-[13px] text-[#64748b]">Carregando…</p>
            )}
          </div>

          {saveError && (
            <p className="px-6 py-2 text-[13px] text-[#ba1a1a] bg-[#ffdad6]/40 border-t border-[#ba1a1a]/20">
              {saveError}
            </p>
          )}

          <footer className="px-6 py-4 border-t border-[#e2e8f0] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[14px] font-medium text-[#475569] hover:bg-[#f1f5f9]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => save.mutate()}
              disabled={save.isPending || !notesQuery.isSuccess}
              className="px-5 py-2 rounded-lg bg-[#4648d4] text-white text-[14px] font-semibold shadow-sm hover:bg-[#3a3cb8] disabled:opacity-60"
            >
              {save.isPending ? 'Salvando…' : 'Salvar observação'}
            </button>
          </footer>
        </div>
      </div>
      <NoteHistoryDrawer
        note={currentNote ?? null}
        open={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </>
  );
}
