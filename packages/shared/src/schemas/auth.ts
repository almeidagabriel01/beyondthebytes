import { z } from 'zod';

// ── Request schemas ─────────────────────────────────────────────────────────
// Used by both the API ZodValidationPipe/DTO and the web react-hook-form

export const LoginRequestSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

// ── Response schemas ────────────────────────────────────────────────────────
// NEVER include passwordHash in any schema exported from shared

export const UserSchema = z.object({
  id: z.string().cuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['ADMIN', 'STAFF']),
});
export type User = z.infer<typeof UserSchema>;

// Auth response — access + refresh tokens live in httpOnly cookies, NOT body
export const AuthResponseSchema = z.object({
  user: UserSchema,
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// /auth/me response — same shape as UserSchema
export const MeResponseSchema = UserSchema;
export type MeResponse = z.infer<typeof MeResponseSchema>;
