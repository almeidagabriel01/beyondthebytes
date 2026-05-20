import { z } from 'zod';
import { isValidCpf } from '../validators/cpf';

// ── Create ──────────────────────────────────────────────────────────────────

export const CreatePatientSchema = z.object({
  fullName: z.string().min(3, 'Nome deve ter ao menos 3 caracteres').max(150, 'Nome muito longo'),
  cpf: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine(isValidCpf, 'CPF inválido'),
  phone: z
    .string()
    .regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, 'Telefone inválido — formato: (11) 91234-5678'),
  birthDate: z.string().refine((v) => {
    const d = new Date(v);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    const minDate = new Date();
    minDate.setFullYear(now.getFullYear() - 120);
    return d < now && d > minDate;
  }, 'Data de nascimento inválida'),
  email: z.string().email('E-mail inválido').optional(),
  observations: z.string().max(2000).optional(),
});

export type CreatePatient = z.infer<typeof CreatePatientSchema>;

// ── Update (all optional) ────────────────────────────────────────────────────

export const UpdatePatientSchema = CreatePatientSchema.partial();
export type UpdatePatient = z.infer<typeof UpdatePatientSchema>;

// ── Response ─────────────────────────────────────────────────────────────────

export const PatientResponseSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  cpf: z.string(),
  phone: z.string(),
  birthDate: z.string(),
  email: z.string().nullable(),
  observations: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
});

export type PatientResponse = z.infer<typeof PatientResponseSchema>;

// ── List response ─────────────────────────────────────────────────────────────

export const PatientsListResponseSchema = z.object({
  items: z.array(PatientResponseSchema),
  nextCursor: z.string().nullable(),
});

export type PatientsListResponse = z.infer<typeof PatientsListResponseSchema>;

// ── List query params ─────────────────────────────────────────────────────────

export const ListPatientsQuerySchema = z.object({
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListPatientsQuery = z.infer<typeof ListPatientsQuerySchema>;
