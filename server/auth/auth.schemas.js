// Validation rules for everything the browser sends to the auth routes.
const { z } = require('zod')

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required.').max(50),
  password: z.string().min(1, 'Password is required.').max(200),
})

const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters.')
    .max(50, 'Username must be 50 characters or fewer.')
    .regex(
      /^[A-Za-z0-9._-]+$/,
      'Username may only contain letters, numbers, dot, dash and underscore.',
    ),
  fullName: z.string().trim().min(1, 'Full name is required.').max(150),
  // bcrypt only uses the first 72 bytes, so longer passwords are rejected.
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(72, 'Password must be 72 characters or fewer.'),
  role: z.enum(['admin', 'staff']).default('staff'),
})

const setActiveSchema = z.object({
  isActive: z.boolean(),
})

// First readable message from a ZodError, for showing in the UI.
const firstIssue = (error) => error.issues[0]?.message || 'Invalid data.'

module.exports = { loginSchema, createUserSchema, setActiveSchema, firstIssue }
