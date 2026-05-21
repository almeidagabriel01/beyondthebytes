import { z } from 'zod';

export const AppointmentTypeSchema = z.enum(['CONSULTA', 'RETORNO', 'AVALIACAO', 'PROCEDIMENTO']);
export type AppointmentType = z.infer<typeof AppointmentTypeSchema>;

export const AppointmentStatusSchema = z.enum([
  'AGENDADO',
  'CONFIRMADO',
  'AGUARDANDO',
  'EM_ATENDIMENTO',
  'REALIZADO',
  'CANCELADO',
]);
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;

export const INSURANCE_OPTIONS = [
  'Particular',
  'Unimed',
  'SulAmérica',
  'Bradesco Saúde',
  'Amil',
] as const;
export type InsuranceOption = (typeof INSURANCE_OPTIONS)[number];

export const CreateAppointmentSchema = z.object({
  patientId: z.string().cuid(),
  startsAt: z.string().datetime({ offset: true }),
  durationMinutes: z.union([z.literal(30), z.literal(45), z.literal(60)]).default(30),
  type: AppointmentTypeSchema,
  insurance: z.string().min(1).max(60),
  value: z.number().positive().optional(),
  observations: z.string().max(1000).optional(),
});
export type CreateAppointment = z.infer<typeof CreateAppointmentSchema>;

export const UpdateAppointmentSchema = CreateAppointmentSchema.partial().omit({
  patientId: true,
});
export type UpdateAppointment = z.infer<typeof UpdateAppointmentSchema>;

export const CancelAppointmentSchema = z.object({
  reason: z.string().min(1).max(200),
});
export type CancelAppointment = z.infer<typeof CancelAppointmentSchema>;

export const TransitionAppointmentSchema = z.object({
  to: AppointmentStatusSchema,
  reason: z.string().min(1).max(200).optional(),
});
export type TransitionAppointment = z.infer<typeof TransitionAppointmentSchema>;

export const AppointmentEventResponseSchema = z.object({
  id: z.string(),
  appointmentId: z.string(),
  action: z.string(),
  fromStatus: z.string().nullable(),
  toStatus: z.string().nullable(),
  byUserId: z.string(),
  byUserName: z.string(),
  payload: z.unknown().nullable(),
  createdAt: z.string(),
});
export type AppointmentEventResponse = z.infer<typeof AppointmentEventResponseSchema>;

export const MonthSummaryQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type MonthSummaryQuery = z.infer<typeof MonthSummaryQuerySchema>;

export const AppointmentPatientSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  cpf: z.string(),
  phone: z.string(),
});

export const AppointmentResponseSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  patient: AppointmentPatientSchema,
  userId: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  durationMinutes: z.number(),
  type: AppointmentTypeSchema,
  insurance: z.string(),
  value: z.number().nullable(),
  observations: z.string().nullable(),
  status: AppointmentStatusSchema,
  createdById: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  cancelledAt: z.string().nullable(),
  cancelReason: z.string().nullable(),
});
export type AppointmentResponse = z.infer<typeof AppointmentResponseSchema>;

export const MonthSummaryItemSchema = z.object({
  date: z.string(),
  counts: z.record(z.string(), z.number()),
});
export type MonthSummaryItem = z.infer<typeof MonthSummaryItemSchema>;

// Accepts either a full ISO datetime with offset OR a YYYY-MM-DD date.
// YYYY-MM-DD is interpreted in America/Sao_Paulo at start-of-day (for `from`)
// or end-of-day (for `to`) by the service.
const DateOrIsoSchema = z
  .string()
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) || /^\d{4}-\d{2}-\d{2}T/.test(v), {
    message: 'Expected YYYY-MM-DD or ISO 8601 datetime',
  });

// Accepts a single status, or a comma-separated list, or repeated query keys
// (which Express parses as an array via the default `qs` parser).
const StatusFilterSchema = z
  .union([AppointmentStatusSchema, z.array(AppointmentStatusSchema), z.string()])
  .transform((v): AppointmentStatus[] | undefined => {
    if (Array.isArray(v)) return v;
    if (typeof v !== 'string') return undefined;
    const parts = v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return parts as AppointmentStatus[];
  })
  .pipe(z.array(AppointmentStatusSchema).min(1))
  .optional();

export const ListAppointmentsQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  from: DateOrIsoSchema.optional(),
  to: DateOrIsoSchema.optional(),
  status: StatusFilterSchema,
  order: z.enum(['asc', 'desc']).optional(),
  take: z.coerce.number().int().min(1).max(100).default(50).optional(),
  skip: z.coerce.number().int().min(0).default(0).optional(),
});
export type ListAppointmentsQuery = z.infer<typeof ListAppointmentsQuerySchema>;
