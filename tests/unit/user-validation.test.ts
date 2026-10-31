import { describe, it, expect } from 'vitest';
import {
  createUserSchema,
  updateUserSchema,
  loginSchema,
  userStatusSchema,
} from '../../src/lib/validation/schemas';

describe('D. User Validation and Sanitization (Section 48)', () => {
  const validUserPayload = {
    employeeId: 'emp042',
    name: 'Sarah Connor',
    email: 'SARAH.CONNOR@REALESTATE.COM',
    password: 'Password123!',
    mobile: '+14155552671',
    department: 'Sales',
    roleId: '66f500000000000000000001',
    designation: 'Senior Sales Consultant',
    branch: 'Downtown Financial Center',
    joiningDate: '2025-01-15',
    status: 'active',
    team: 'Luxury Residential',
  };

  it('should accept a fully valid user creation payload and normalize fields', () => {
    const result = createUserSchema.safeParse(validUserPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.employeeId).toBe('EMP042'); // Uppercase
      expect(result.data.email).toBe('sarah.connor@realestate.com'); // Lowercase
      expect(result.data.joiningDate).toBeInstanceOf(Date);
    }
  });

  it('should reject payload with missing mandatory fields', () => {
    const invalid = { ...validUserPayload, name: '' };
    const result = createUserSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject invalid email formats', () => {
    const invalidEmail = { ...validUserPayload, email: 'not-an-email' };
    const result = createUserSchema.safeParse(invalidEmail);
    expect(result.success).toBe(false);
  });

  it('should enforce password complexity requirements (min 8 chars, uppercase, lowercase, number)', () => {
    const weakPasswords = [
      'short1', // < 8
      'alllowercase123', // missing uppercase
      'ALLUPPERCASE123', // missing lowercase
      'NoNumbersHere!', // missing number
    ];

    weakPasswords.forEach((pw) => {
      const result = createUserSchema.safeParse({ ...validUserPayload, password: pw });
      expect(result.success).toBe(false);
    });
  });

  it('should reject invalid MongoDB ObjectId for roleId', () => {
    const invalidRole = { ...validUserPayload, roleId: 'not-an-objectid' };
    const result = createUserSchema.safeParse(invalidRole);
    expect(result.success).toBe(false);
  });

  it('should validate status change payload', () => {
    expect(userStatusSchema.safeParse({ status: 'active' }).success).toBe(true);
    expect(userStatusSchema.safeParse({ status: 'inactive', reason: 'Resigned' }).success).toBe(true);
    expect(userStatusSchema.safeParse({ status: 'suspended' }).success).toBe(false);
  });

  it('should validate login credentials schema with username or email', () => {
    expect(loginSchema.safeParse({ username: 'superadmin', password: 'SecretPassword' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'admin@crm.com', password: 'SecretPassword' }).success).toBe(true);
    expect(loginSchema.safeParse({ username: '', password: 'SecretPassword' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: '', password: 'SecretPassword' }).success).toBe(false);
    expect(loginSchema.safeParse({ username: 'superadmin', password: '' }).success).toBe(false);
  });

  it('should support username field in createUserSchema while preserving email', () => {
    const withUsername = { ...validUserPayload, username: 'sarah_c' };
    const res = createUserSchema.safeParse(withUsername);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.username).toBe('sarah_c');
      expect(res.data.email).toBe('sarah.connor@realestate.com');
    }
  });
});
