
import { z } from 'zod';

// Enums
export const userRoleEnum = z.enum(['member', 'staff', 'administrator']);
export const competitionTypeEnum = z.enum(['plank_hold', 'squats', 'attendance', 'other']);
export const dataEntryMethodEnum = z.enum(['staff_only', 'user_entry']);
export const competitionStatusEnum = z.enum(['active', 'inactive', 'completed']);
export const auditActionEnum = z.enum(['create', 'update', 'delete', 'assign', 'deactivate', 'login', 'impersonate']);

// User schemas
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  role: userRoleEnum,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  role: userRoleEnum
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  email: z.string().email().optional(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  role: userRoleEnum.optional(),
  is_active: z.boolean().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Competition schemas
export const competitionSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  type: competitionTypeEnum,
  data_entry_method: dataEntryMethodEnum,
  status: competitionStatusEnum,
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  created_by: z.number(),
  assigned_to: z.number().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Competition = z.infer<typeof competitionSchema>;

export const createCompetitionInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  type: competitionTypeEnum,
  data_entry_method: dataEntryMethodEnum,
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  assigned_to: z.number().optional()
});

export type CreateCompetitionInput = z.infer<typeof createCompetitionInputSchema>;

export const updateCompetitionInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  type: competitionTypeEnum.optional(),
  data_entry_method: dataEntryMethodEnum.optional(),
  status: competitionStatusEnum.optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  assigned_to: z.number().nullable().optional()
});

export type UpdateCompetitionInput = z.infer<typeof updateCompetitionInputSchema>;

// Competition entry schemas
export const competitionEntrySchema = z.object({
  id: z.number(),
  competition_id: z.number(),
  user_id: z.number(),
  value: z.number(),
  unit: z.string().nullable(),
  notes: z.string().nullable(),
  entered_by: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type CompetitionEntry = z.infer<typeof competitionEntrySchema>;

export const createCompetitionEntryInputSchema = z.object({
  competition_id: z.number(),
  user_id: z.number(),
  value: z.number(),
  unit: z.string().nullable(),
  notes: z.string().nullable()
});

export type CreateCompetitionEntryInput = z.infer<typeof createCompetitionEntryInputSchema>;

export const updateCompetitionEntryInputSchema = z.object({
  id: z.number(),
  value: z.number().optional(),
  unit: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});

export type UpdateCompetitionEntryInput = z.infer<typeof updateCompetitionEntryInputSchema>;

// Audit log schema
export const auditLogSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  action: auditActionEnum,
  resource_type: z.string(),
  resource_id: z.number().nullable(),
  details: z.string().nullable(),
  ip_address: z.string().nullable(),
  created_at: z.coerce.date()
});

export type AuditLog = z.infer<typeof auditLogSchema>;

export const createAuditLogInputSchema = z.object({
  user_id: z.number(),
  action: auditActionEnum,
  resource_type: z.string(),
  resource_id: z.number().nullable(),
  details: z.string().nullable(),
  ip_address: z.string().nullable()
});

export type CreateAuditLogInput = z.infer<typeof createAuditLogInputSchema>;

// Auth schemas
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const authContextSchema = z.object({
  user_id: z.number(),
  role: userRoleEnum
});

export type AuthContext = z.infer<typeof authContextSchema>;
