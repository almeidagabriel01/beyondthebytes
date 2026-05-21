import { z } from 'zod';

// Tiptap JSON document — we validate the top-level envelope only.
export const TiptapDocSchema = z
  .object({
    type: z.literal('doc'),
    content: z.array(z.unknown()).optional(),
  })
  .passthrough();
export type TiptapDoc = z.infer<typeof TiptapDocSchema>;

export const CreateClinicalNoteSchema = z.object({
  content: TiptapDocSchema,
});
export type CreateClinicalNote = z.infer<typeof CreateClinicalNoteSchema>;

export const UpdateClinicalNoteSchema = z.object({
  content: TiptapDocSchema,
});
export type UpdateClinicalNote = z.infer<typeof UpdateClinicalNoteSchema>;

export const ClinicalNoteRevisionResponseSchema = z.object({
  id: z.string(),
  content: TiptapDocSchema,
  createdAt: z.string(),
});
export type ClinicalNoteRevisionResponse = z.infer<typeof ClinicalNoteRevisionResponseSchema>;

export const ClinicalNoteResponseSchema = z.object({
  id: z.string(),
  appointmentId: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  // Ordered newest first; [0] is the current version.
  revisions: z.array(ClinicalNoteRevisionResponseSchema).min(1),
});
export type ClinicalNoteResponse = z.infer<typeof ClinicalNoteResponseSchema>;
