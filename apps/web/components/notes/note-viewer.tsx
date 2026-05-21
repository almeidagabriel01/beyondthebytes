'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Blockquote from '@tiptap/extension-blockquote';
import type { TiptapDoc } from '@medschedule/shared';
import { cn } from '@/lib/utils';

export function NoteViewer({ content, className }: { content: TiptapDoc; className?: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, blockquote: false }),
      Heading.configure({ levels: [2, 3] }),
      Blockquote,
    ],
    content: content as JSONContent,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-prose focus:outline-none',
          'prose-headings:font-semibold prose-headings:text-[#0f172a]',
          'prose-p:text-[#0f172a]',
        ),
      },
    },
  });

  if (!editor) return null;
  return <EditorContent editor={editor} className={className} />;
}
