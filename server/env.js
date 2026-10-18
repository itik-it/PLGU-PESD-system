// Loads server/.env no matter which folder the command is run from, then
// validates it. If anything required is missing, the server refuses to start
// instead of silently falling back (e.g. to the MySQL root user).
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true })

const { z } = require('zod')

const envSchema = z
  .object({
    NODE_ENV: z.string().default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    CLIENT_ORIGIN: z.string().min(1).default('http://localhost:5173'),

    DB_HOST: z.string().min(1).default('127.0.0.1'),
    DB_PORT: z.coerce.number().int().positive().default(3306),
    DB_USER: z.string().min(1, 'DB_USER is required.'),
    // The key must exist. An empty value is tolerated only outside production.
    DB_PASSWORD: z.string({ required_error: 'DB_PASSWORD is required.' }),
    DB_CONNECTION_LIMIT: z.coerce.number().int().positive().default(10),
    DB_GIP_NAME: z.string().min(1).default('lgu_gip'),
    DB_USERS_NAME: z.string().min(1).default('lgu_users'),
    DB_SAGUT_NAME: z.string().min(1).default('lgu_sagut'),
    DB_GUWIP_NAME: z.string().min(1).default('lgu_guwip'),
    DB_DOKTOR_NAME: z.string().min(1).default('lgu_doktor'),
    DB_TRPATU_NAME: z.string().min(1).default('lgu_trpatu'),

    // Add the variables used by auth/session.js here (for example a session
    // secret) so they are validated at startup too:
    // SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be 32+ characters.'),
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.DB_PASSWORD !== '', {
    path: ['DB_PASSWORD'],
    message: 'DB_PASSWORD must not be empty in production.',
  })

const result = envSchema.safeParse(process.env)

if (!result.success) {
  console.error('Invalid environment configuration in server/.env:')
  for (const issue of result.error.issues) {
    console.error(`  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
  }
  process.exit(1)
}

module.exports = result.data