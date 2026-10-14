const { z } = require('zod')

const { applicantSchema } = require('./applicant.schema')

const isNotFuture = (value) => new Date(`${value}T00:00:00`) <= new Date()

// Rules for people coming from an Excel file. Same as the Add Applicant form,
// except:
//   - these may be EMPTY: sex, civil status, address, classifications
//   - these are REQUIRED: course, contact number (11 digits), Gmail,
//     birthdate (inherited from the form) and date applied
const importApplicantSchema = applicantSchema.extend({
  sex: z.enum(['Male', 'Female', '']).default(''),

  civilStatus: z
    .enum(['Single', 'Married', 'Widowed', 'Separated', ''])
    .default(''),

  barangay: z.string().trim().default(''),
  municipality: z.string().trim().default(''),
  province: z.string().trim().default(''),

  classifications: z
    .array(z.string().trim().min(1))
    .default([])
    .transform((names) => [...new Set(names)]),

  course: z.string().trim().min(1, 'Course is required.'),

  contactNumber: z
  .string()
  .trim()
  .min(1, 'Contact number is required.')
  .transform((value) => value.replace(/\D/g, ''))
  .refine(
    (digits) => /^9\d{9}$/.test(digits) || /^09\d{9}$/.test(digits),
    'Contact number must be 10 digits starting with 9, or 11 digits starting with 09.'
  )
  .transform((digits) => (digits.length === 10 ? `0${digits}` : digits)),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required.')
    .regex(/^[^\s@]+@gmail\.com$/, 'Email must end with @gmail.com.'),

  dateApplied: z
    .string()
    .trim()
    .min(1, 'Date applied is required.')
    .date('Date applied is not a valid date.')
    .refine(isNotFuture, 'Date applied cannot be in the future.'),
})

module.exports = { importApplicantSchema }
