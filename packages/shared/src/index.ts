// Shared Zod schemas, types, and pure domain functions.

export const MEDSCHEDULE_VERSION = '0.0.1';

export * from './schemas/auth';
export * from './schemas/patient';
export { isValidCpf } from './validators/cpf';
export * from './schemas/appointment';
export * from './domain/scheduling';
export * from './domain/appointment-status';
export * from './schemas/dashboard';
