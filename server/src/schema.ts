import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['user', 'admin']);
export type UserRole = z.infer<typeof userRoleSchema>;

// Request status enum
export const requestStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export type RequestStatus = z.infer<typeof requestStatusSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  role: userRoleSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type User = z.infer<typeof userSchema>;

// Ink type schema
export const inkTypeSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  unit: z.string(), // e.g., "botol", "liter", "ml"
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type InkType = z.infer<typeof inkTypeSchema>;

// Ink stock schema
export const inkStockSchema = z.object({
  id: z.number(),
  ink_type_id: z.number(),
  current_stock: z.number().int().nonnegative(),
  minimum_stock: z.number().int().nonnegative(),
  updated_at: z.coerce.date()
});
export type InkStock = z.infer<typeof inkStockSchema>;

// User ink assignment schema
export const userInkAssignmentSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  ink_type_id: z.number(),
  max_quantity_per_request: z.number().int().positive(),
  created_at: z.coerce.date()
});
export type UserInkAssignment = z.infer<typeof userInkAssignmentSchema>;

// Ink request schema
export const inkRequestSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  ink_type_id: z.number(),
  requested_quantity: z.number().int().positive(),
  approved_quantity: z.number().int().nonnegative().nullable(),
  status: requestStatusSchema,
  request_reason: z.string().nullable(),
  admin_notes: z.string().nullable(),
  reviewed_by_admin_id: z.number().nullable(),
  requested_at: z.coerce.date(),
  reviewed_at: z.coerce.date().nullable()
});
export type InkRequest = z.infer<typeof inkRequestSchema>;

// Input schemas for creating entities
export const createUserInputSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  role: userRoleSchema
});
export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const createInkTypeInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  unit: z.string().min(1)
});
export type CreateInkTypeInput = z.infer<typeof createInkTypeInputSchema>;

export const updateInkTypeInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  unit: z.string().min(1).optional()
});
export type UpdateInkTypeInput = z.infer<typeof updateInkTypeInputSchema>;

export const updateInkStockInputSchema = z.object({
  ink_type_id: z.number(),
  current_stock: z.number().int().nonnegative(),
  minimum_stock: z.number().int().nonnegative()
});
export type UpdateInkStockInput = z.infer<typeof updateInkStockInputSchema>;

export const createUserInkAssignmentInputSchema = z.object({
  user_id: z.number(),
  ink_type_id: z.number(),
  max_quantity_per_request: z.number().int().positive()
});
export type CreateUserInkAssignmentInput = z.infer<typeof createUserInkAssignmentInputSchema>;

export const createInkRequestInputSchema = z.object({
  ink_type_id: z.number(),
  requested_quantity: z.number().int().positive(),
  request_reason: z.string().nullable()
});
export type CreateInkRequestInput = z.infer<typeof createInkRequestInputSchema>;

export const reviewInkRequestInputSchema = z.object({
  request_id: z.number(),
  status: z.enum(['approved', 'rejected']),
  approved_quantity: z.number().int().nonnegative().optional(),
  admin_notes: z.string().nullable()
});
export type ReviewInkRequestInput = z.infer<typeof reviewInkRequestInputSchema>;

// Response schemas with joined data
export const inkRequestWithDetailsSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  user_username: z.string(),
  user_email: z.string(),
  ink_type_id: z.number(),
  ink_type_name: z.string(),
  ink_type_unit: z.string(),
  requested_quantity: z.number().int(),
  approved_quantity: z.number().int().nullable(),
  status: requestStatusSchema,
  request_reason: z.string().nullable(),
  admin_notes: z.string().nullable(),
  reviewed_by_admin_id: z.number().nullable(),
  reviewed_by_admin_username: z.string().nullable(),
  requested_at: z.coerce.date(),
  reviewed_at: z.coerce.date().nullable()
});
export type InkRequestWithDetails = z.infer<typeof inkRequestWithDetailsSchema>;

export const inkStockWithDetailsSchema = z.object({
  id: z.number(),
  ink_type_id: z.number(),
  ink_type_name: z.string(),
  ink_type_unit: z.string(),
  current_stock: z.number().int(),
  minimum_stock: z.number().int(),
  updated_at: z.coerce.date()
});
export type InkStockWithDetails = z.infer<typeof inkStockWithDetailsSchema>;

export const userInkAssignmentWithDetailsSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  user_username: z.string(),
  ink_type_id: z.number(),
  ink_type_name: z.string(),
  ink_type_unit: z.string(),
  max_quantity_per_request: z.number().int(),
  created_at: z.coerce.date()
});
export type UserInkAssignmentWithDetails = z.infer<typeof userInkAssignmentWithDetailsSchema>;