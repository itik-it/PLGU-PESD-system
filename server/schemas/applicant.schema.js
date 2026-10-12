const { z } = require('zod')

const requiredText = (message) => z.string().trim().min(1, message)
const optionalText = z.string().trim().default('')

const applicantSchema = z.object({
  // PERSONAL INFORMATION
  lastName: requiredText('Last name is required.'),
  firstName: requiredText('First name is required.'),
  middleName: optionalText,
  extensionName: optionalText,

  birthdate: z
    .string()
    .date()
    .refine(
      (value) => new Date(`${value}T00:00:00`) <= new Date(),
      'Birthdate cannot be in the future.'
    ),

  sex: requiredText('Sex is required.'),
  civilStatus: requiredText('Civil status is required.'),
  barangay: requiredText('Barangay is required.'),
  municipality: requiredText('Municipality is required.'),
  province: requiredText('Province is required.'),
  course: optionalText,

  email: z
    .union([z.string().trim().email(), z.literal('')])
    .default(''),

  contactNumber: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' ||
        (/^[+]?[\d\s().-]+$/.test(value) &&
          value.replace(/\D/g, '').length === 11),
      'Contact number must contain 11 digits.'
    )
    .default(''),

  // CLASSIFICATIONS (multiple allowed; duplicates are removed)
  classifications: z
    .array(z.string().trim().min(1))
    .min(1, 'At least one classification is required.')
    .transform((names) => [...new Set(names)]),

  // APPLICATION INFORMATION
  dateApplied: z
    .union([z.string().date(), z.literal('')])
    .refine(
      (value) =>
        value === '' ||
        new Date(`${value}T00:00:00`) <= new Date(),
      'Date applied cannot be in the future.'
    )
    .default(''),

  remarks: optionalText,

  // REQUIREMENTS (checkboxes in React)
  requirements: z.object({
    gipForm: z.boolean().default(false),
    resume: z.boolean().default(false),
    validId: z.boolean().default(false),
    psa: z.boolean().default(false),
    diploma: z.boolean().default(false),
    tor: z.boolean().default(false),
  }),

  // SUPPORTING DOCUMENTS (free text)
  supportingDocuments: optionalText,
})

module.exports = { applicantSchema }