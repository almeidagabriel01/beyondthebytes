'use client';

import { useCallback, useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Blockquote from '@tiptap/extension-blockquote';
import type { TiptapDoc } from '@medschedule/shared';
import { cn } from '@/lib/utils';

interface NoteEditorProps {
  initialContent: TiptapDoc | null;
  onChange: (doc: TiptapDoc) => void;
  readOnly?: boolean;
}

const DEFAULT_DOC: TiptapDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

export function NoteEditor({ initialContent, onChange, readOnly = false }: NoteEditorProps) {
  const lastAppliedRef = useRef<string>('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, blockquote: false }),
      Heading.configure({ levels: [2, 3] }),
      Blockquote,
    ],
    content: (initialContent ?? DEFAULT_DOC) as JSONContent,
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => {
      onChange(e.getJSON() as TiptapDoc);
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-prose min-h-[280px] focus:outline-none',
          'prose-headings:font-semibold prose-headings:text-[#0f172a]',
          'prose-p:text-[#0f172a] prose-p:leading-relaxed',
          'prose-blockquote:border-l-4 prose-blockquote:border-[#4648d4] prose-blockquote:text-[#475569]',
          'prose-ul:list-disc prose-ol:list-decimal',
        ),
      },
    },
  });

  const toggle = useCallback(
    (action: () => void) => () => {
      action();
    },
    [],
  );

  // When initialContent identity changes after first mount, replace editor content without firing onUpdate.
  useEffect(() => {
    if (!editor) return;
    const next = initialContent ?? DEFAULT_DOC;
    const serialized = JSON.stringify(next);
    if (serialized === lastAppliedRef.current) return;
    lastAppliedRef.current = serialized;
    editor.commands.setContent(next as JSONContent, { emitUpdate: false });
  }, [editor, initialContent]);

  if (!editor) return null;

  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-white">
      {!readOnly && (
        <div
          role="toolbar"
          aria-label="Formatação"
          className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-[#e2e8f0]"
        >
          <ToolbarBtn
            label="Título 2"
            active={editor.isActive('heading', { level: 2 })}
            onClick={toggle(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
            icon="title"
          />
          <ToolbarBtn
            label="Subtítulo"
            active={editor.isActive('heading', { level: 3 })}
            onClick={toggle(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}
            icon="text_fields"
          />
          <Sep />
          <ToolbarBtn
            label="Negrito"
            active={editor.isActive('bold')}
            onClick={toggle(() => editor.chain().focus().toggleBold().run())}
            icon="format_bold"
          />
          <ToolbarBtn
            label="Itálico"
            active={editor.isActive('italic')}
            onClick={toggle(() => editor.chain().focus().toggleItalic().run())}
            icon="format_italic"
          />
          <Sep />
          <ToolbarBtn
            label="Lista"
            active={editor.isActive('bulletList')}
            onClick={toggle(() => editor.chain().focus().toggleBulletList().run())}
            icon="format_list_bulleted"
          />
          <ToolbarBtn
            label="Lista numerada"
            active={editor.isActive('orderedList')}
            onClick={toggle(() => editor.chain().focus().toggleOrderedList().run())}
            icon="format_list_numbered"
          />
          <ToolbarBtn
            label="Citação"
            active={editor.isActive('blockquote')}
            onClick={toggle(() => editor.chain().focus().toggleBlockquote().run())}
            icon="format_quote"
          />
          <Sep />
          <ToolbarBtn
            label="Desfazer"
            onClick={toggle(() => editor.chain().focus().undo().run())}
            icon="undo"
            disabled={!editor.can().undo()}
          />
          <ToolbarBtn
            label="Refazer"
            onClick={toggle(() => editor.chain().focus().redo().run())}
            icon="redo"
            disabled={!editor.can().redo()}
          />
        </div>
      )}
      <div className="px-6 py-5">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarBtn({
  icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center w-8 h-8 rounded-md text-[#64748b] hover:bg-[#f1f5f9] transition-colors',
        active && 'bg-[#e1e0ff] text-[#4648d4]',
        disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent',
      )}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </button>
  );
}

function Sep() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px bg-[#e2e8f0]" />;
}
