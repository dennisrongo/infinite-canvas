import { z } from 'zod';

/**
 * Environment Variable Validation
 *
 * This module validates required environment variables at module load time.
 * In production, missing or invalid variables will throw an error.
 * In development, they will log a warning but allow the app to continue.
 */

const envSchema = z.object({
  // Database Configuration
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),

  // JWT Secret for authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),

  // NextAuth Configuration
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters for security'),

  // Application Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/, 'PORT must be a number').optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 */
function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `  - ${issue.path.join('.')}: ${issue.message}`
    ).join('\n');

    const message = `Environment variable validation failed:\n${errors}`;

    if (process.env.NODE_ENV === 'production') {
      throw new Error(message);
    }

    console.warn(`\n[WARNING] ${message}\n`);
    console.warn('[WARNING] Using default values where possible. Fix before deploying to production.\n');

    // Return partial config with defaults for development
    return {
      DATABASE_URL: process.env.DATABASE_URL || '',
      JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-min-32-chars-padding!!',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'dev-nextauth-secret-min-32-chars!',
      NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
      PORT: process.env.PORT,
    };
  }

  return result.data;
}

// Validate and export the config
export const env = validateEnv();

// Export individual variables for convenience
export const {
  DATABASE_URL,
  JWT_SECRET,
  NEXTAUTH_URL,
  NEXTAUTH_SECRET,
  NODE_ENV,
  PORT,
} = env;

/**
 * Check if we're running in production
 */
export const isProduction = NODE_ENV === 'production';

/**
 * Check if we're running in development
 */
export const isDevelopment = NODE_ENV === 'development';

/**
 * Check if we're running tests
 */
export const isTest = NODE_ENV === 'test';
