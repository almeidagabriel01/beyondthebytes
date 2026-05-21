import { z } from 'zod';
import { AppointmentStatusSchema } from './appointment';

export const KpisPeriodSchema = z.enum(['week', 'month']);
export type KpisPeriod = z.infer<typeof KpisPeriodSchema>;

export const KpisQuerySchema = z.object({
  period: KpisPeriodSchema.default('week'),
});
export type KpisQuery = z.infer<typeof KpisQuerySchema>;

const NextAppointmentSchema = z.object({
  id: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  status: AppointmentStatusSchema,
  type: z.string(),
  patient: z.object({
    id: z.string(),
    fullName: z.string(),
  }),
});
export type NextAppointment = z.infer<typeof NextAppointmentSchema>;

export const DashboardTodayResponseSchema = z.object({
  totalToday: z.number().int().nonnegative(),
  byStatus: z.record(AppointmentStatusSchema, z.number().int().nonnegative()),
  nextAppointments: z.array(NextAppointmentSchema),
  cancelledToday: z.number().int().nonnegative(),
  completedToday: z.number().int().nonnegative(),
});
export type DashboardTodayResponse = z.infer<typeof DashboardTodayResponseSchema>;

export const DashboardKpisResponseSchema = z.object({
  period: KpisPeriodSchema,
  total: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  cancelled: z.number().int().nonnegative(),
  attendanceRate: z.number().min(0).max(1),
});
export type DashboardKpisResponse = z.infer<typeof DashboardKpisResponseSchema>;
