import '@testing-library/jest-dom';
import dotenv from 'dotenv';

dotenv.config();

// Ensure test environment has a valid AUTH_SECRET configured for test suites
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  process.env.AUTH_SECRET = 'test-environment-jwt-secret-key-32-chars-long-secure';
}
