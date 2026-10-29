import { z } from 'zod';
import { CRM_MODULES, PERMISSION_ACTIONS } from '../../types';

export const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export const createUserSchema = z.object({
  employeeId: z
    .string()
    .trim()
    .min(2, { message: 'Employee ID must be at least 2 characters' })
    .max(50, { message: 'Employee ID cannot exceed 50 characters' })
    .toUpperCase()
    .optional(),
  name: z
    .string()
    .trim()
    .min(2, { message: 'Name must be at least 2 characters' })
    .max(100, { message: 'Name cannot exceed 100 characters' }),
  email: z.string().trim().toLowerCase().email({ message: 'Please enter a valid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
    .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' }),
  mobile: z
    .string()
    .trim()
    .min(7, { message: 'Mobile number must be at least 7 digits' })
    .max(20, { message: 'Mobile number cannot exceed 20 characters' }),
  department: z.string().trim().min(2, { message: 'Department is required' }),
  roleId: z.string().regex(objectIdRegex, { message: 'A valid Role ID is required' }),
  designation: z.string().trim().min(2, { message: 'Designation is required' }),
  branch: z.string().trim().min(2, { message: 'Branch is required' }),
  profilePhoto: z.string().trim().optional().default(''),
  joiningDate: z.string().or(z.date()).transform((val) => new Date(val)),
  status: z.enum(['active', 'inactive']).default('active'),
  loginStatus: z.enum(['online', 'offline', 'never_logged_in']).default('never_logged_in'),
  reportingManagerId: z
    .string()
    .regex(objectIdRegex, { message: 'Invalid manager ID format' })
    .nullable()
    .optional(),
  team: z.string().trim().optional().default(''),
  allowedSubRoles: z.array(z.string()).optional().default([]),
  parentAdminId: z
    .string()
    .regex(objectIdRegex, { message: 'Invalid parent admin ID format' })
    .nullable()
    .optional(),
});

export const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Name must be at least 2 characters' })
    .max(100)
    .optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
    .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' })
    .optional(),
  mobile: z.string().trim().min(7).max(20).optional(),
  department: z.string().trim().min(2).optional(),
  roleId: z.string().regex(objectIdRegex).optional(),
  designation: z.string().trim().min(2).optional(),
  branch: z.string().trim().min(2).optional(),
  profilePhoto: z.string().trim().optional(),
  joiningDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .optional(),
  status: z.enum(['active', 'inactive']).optional(),
  reportingManagerId: z
    .string()
    .regex(objectIdRegex)
    .nullable()
    .optional(),
  team: z.string().trim().optional(),
  allowedSubRoles: z.array(z.string()).optional(),
  parentAdminId: z
    .string()
    .regex(objectIdRegex)
    .nullable()
    .optional(),
});

export const createStaffSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Name must be at least 2 characters' })
    .max(100, { message: 'Name cannot exceed 100 characters' }),
  email: z.string().trim().toLowerCase().email({ message: 'Please enter a valid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
    .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' }),
  mobile: z
    .string()
    .trim()
    .min(7, { message: 'Mobile number must be at least 7 digits' })
    .max(20, { message: 'Mobile number cannot exceed 20 characters' }),
  roleId: z.string().regex(objectIdRegex, { message: 'A valid Sub-Role is required' }),
  joiningDate: z.string().or(z.date()).transform((val) => new Date(val)),
  parentAdminId: z
    .string()
    .regex(objectIdRegex, { message: 'Invalid Admin selection' })
    .nullable()
    .optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  department: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  branch: z.string().trim().optional(),
  team: z.string().trim().optional(),
});

export const updateStaffSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Name must be at least 2 characters' })
    .max(100)
    .optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
    .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' })
    .optional(),
  mobile: z.string().trim().min(7).max(20).optional(),
  roleId: z.string().regex(objectIdRegex).optional(),
  joiningDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .optional(),
  parentAdminId: z
    .string()
    .regex(objectIdRegex)
    .nullable()
    .optional(),
  status: z.enum(['active', 'inactive']).optional(),
  department: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  branch: z.string().trim().optional(),
  team: z.string().trim().optional(),
});

export const userStatusSchema = z.object({
  status: z.enum(['active', 'inactive'], {
    errorMap: () => ({ message: 'Status must be active or inactive' }),
  }),
  reason: z.string().trim().max(250).optional(),
});

export const modulePermissionSchema = z.object({
  module: z.enum(CRM_MODULES as [string, ...string[]]),
  actions: z.array(z.enum(PERMISSION_ACTIONS as [string, ...string[]])),
  leadVisibilityScope: z.enum(['assigned', 'team', 'company']).optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  leadVisibilityScope: z.enum(['assigned', 'team', 'company']).optional(),
  permissions: z.array(modulePermissionSchema).optional(),
});

export function formatZodError(error: z.ZodError): { message: string; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });
  return {
    message: error.errors[0]?.message || 'Validation error',
    errors,
  };
}
