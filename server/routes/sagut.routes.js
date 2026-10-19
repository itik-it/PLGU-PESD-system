// Mounted at /api/sagut (requireAuth is applied in app.js)
//   /batches                         list / create / open-close
//   /batches/:batchId/applicants     applicants of ONE batch
const express = require('express')
const { z } = require('zod')

const { sagutPool } = require('../db')
const { requireAdmin } = require('../auth/auth.middleware')
const { HttpError } = require('../errors')
const { asyncHandler } = require('../utils/async-handler')
const { parseId } = require('../utils/parse-id')
const { createBatchesRouter, getBatchOrFail } = require('../utils/program-batches')

// mergeParams lets this router see :batchId from the parent route.
const applicants = express.Router({ mergeParams: true })

// FIELD MAP: [name used by the React page, column in sagut.applicants, label for error messages]

const GWA_FIELDS = []
for (const [yearKey, yearNumber] of [['first', '1st'], ['second', '2nd'], ['third', '3rd'], ['fourth', '4th']]) {
  for (const [semKey, semNumber] of [['FirstSem', '1st'], ['SecondSem', '2nd']]) {
    GWA_FIELDS.push([
      `${yearKey}Year${semKey}`,
      `gwa_${yearNumber}_year_${semNumber}_sem`,
      `GWA (${yearNumber} year, ${semNumber} sem)`,
    ])
  }
}

const SECTOR_FIELDS = [
  ['ip', 'is_ip', 'IP'],
  ['women', 'is_women', 'Women'],
  ['pwd', 'is_pwd', 'PWD'],
  ['urbanPoor', 'is_urban_poor', 'Urban Poor'],
  ['soloParentChild', 'is_solo_parent_child', 'Solo Parent Child'],
  ['fourPs', 'is_four_ps', '4Ps'],
]

const EMPLOYMENT_FIELDS = [
  ['employed', 'is_employed', 'Employed'],
  ['unemployed', 'is_unemployed', 'Unemployed'],
  ['selfEmployed', 'is_self_employed', 'Self-Employed'],
]

const FIELDS = [
  ['submissionDate', 'submission_date', 'Date of submission'],
  ['lastName', 'last_name', 'Last name'],
  ['firstName', 'first_name', 'First name'],
  ['middleName', 'middle_name', 'Middle name'],
  ['gender', 'gender', 'Gender'],
  ['contactNumber', 'contact_number', 'Contact #'],
  ['familyIncome', 'family_income', 'Family income'],
  ['incomeSources', 'income_sources', 'Sources'],
  ['municipality', 'municipality', 'Municipality'],
  ['barangay', 'barangay', 'Barangay'],
  ['yearsResidency', 'years_residency', 'Years of residency'],
  ...SECTOR_FIELDS,
  ['highSchool', 'high_school', 'HS last attended'],
  ['age', 'age', 'Age'],
  ['admissionTestDate', 'admission_test_date', 'Date NVSU admission test passed'],
  ['rating', 'rating', 'Rating'],
  ['course', 'course', 'Course'],
  ['placeOfStudy', 'place_of_study', 'Place of study'],
  ...GWA_FIELDS,
  ['awardsReceived', 'awards_received', 'Awards received'],
  ...EMPLOYMENT_FIELDS,
  ['remarks', 'remarks', 'Remarks'],
]

const BOOLEAN_KEYS = new Set([...SECTOR_FIELDS, ...EMPLOYMENT_FIELDS].map(([key]) => key))
const NUMBER_KEYS = new Set([
  'familyIncome', 'yearsResidency', 'age', ...GWA_FIELDS.map(([key]) => key),
])

const COLUMN_LIST = FIELDS.map(([, column]) => `\`${column}\``).join(', ')
const PLACEHOLDERS = FIELDS.map(() => '?').join(', ')
const SET_LIST = FIELDS.map(([, column]) => `\`${column}\` = ?`).join(', ')

// VALIDATION

const blankToNull = (value) => (value === '' || value === undefined ? null : value)

const todayLocal = () => {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

const requiredText = (max, label) =>
  z
    .string({ required_error: `${label} is required.`, invalid_type_error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`)

const optionalText = (max, label) =>
  z
    .preprocess(
      (value) => (value === null || value === undefined ? '' : value),
      z.string().trim().max(max, `${label} must be ${max} characters or fewer.`)
    )
    .transform((value) => (value === '' ? null : value))

const optionalNumber = (label, { max, integer = false }) => {
  let schema = z.coerce
    .number({ invalid_type_error: `${label} must be a number.` })
    .min(0, `${label} cannot be negative.`)
    .max(max, `${label} must be ${max} or less.`)
  if (integer) schema = schema.int(`${label} must be a whole number.`)
  return z.preprocess(blankToNull, schema.nullable())
}

const validDate = (label) =>
  z
    .string({ invalid_type_error: `${label} must be a valid date.` })
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be a valid date.`)
    .refine(
      (value) => new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value,
      `${label} must be a valid date.`
    )
    .refine((value) => value <= todayLocal(), `${label} cannot be in the future.`)

const requiredDate = (label) =>
  z.preprocess(
    (value) => (value === undefined || value === null ? '' : value),
    z.string().min(1, `${label} is required.`).pipe(validDate(label))
  )

const optionalDate = (label) => z.preprocess(blankToNull, validDate(label).nullable())

const flag = z.preprocess((value) => value ?? false, z.boolean())

const labelOf = Object.fromEntries(FIELDS.map(([key, , label]) => [key, label]))

const applicantSchema = z.object({
  submissionDate: requiredDate(labelOf.submissionDate),
  lastName: requiredText(100, labelOf.lastName),
  firstName: requiredText(100, labelOf.firstName),
  middleName: optionalText(100, labelOf.middleName),
  gender: z.enum(['Male', 'Female'], { errorMap: () => ({ message: 'Gender must be Male or Female.' }) }),
  contactNumber: requiredText(30, labelOf.contactNumber),
  familyIncome: optionalNumber(labelOf.familyIncome, { max: 999999999 }),
  incomeSources: optionalText(255, labelOf.incomeSources),
  municipality: requiredText(100, labelOf.municipality),
  barangay: requiredText(100, labelOf.barangay),
  yearsResidency: optionalNumber(labelOf.yearsResidency, { max: 120 }),
  ...Object.fromEntries(SECTOR_FIELDS.map(([key]) => [key, flag])),
  highSchool: optionalText(150, labelOf.highSchool),
  age: optionalNumber(labelOf.age, { max: 120, integer: true }),
  admissionTestDate: optionalDate(labelOf.admissionTestDate),
  rating: optionalText(20, labelOf.rating),
  course: optionalText(150, labelOf.course),
  placeOfStudy: optionalText(150, labelOf.placeOfStudy),
  ...Object.fromEntries(GWA_FIELDS.map(([key, , label]) => [key, optionalNumber(label, { max: 100 })])),
  awardsReceived: optionalText(255, labelOf.awardsReceived),
  ...Object.fromEntries(EMPLOYMENT_FIELDS.map(([key]) => [key, flag])),
  remarks: optionalText(100, labelOf.remarks),
})

// Returns the validated data or throws a 400 with the first problem found.
function parseApplicant(body) {
  const result = applicantSchema.safeParse(body ?? {})
  if (!result.success) throw new HttpError(400, result.error.issues[0].message)
  return result.data
}

const batchIdOf = (request) => parseId(request.params.batchId, 'Batch ID')

// Database row (snake_case) -> object the React page expects (camelCase).
function toApi(row) {
  const output = { id: row.id }

  for (const [key, column] of FIELDS) {
    const value = row[column]

    if (BOOLEAN_KEYS.has(key)) output[key] = Boolean(value)
    else if (value === null || value === undefined) output[key] = ''
    else if (NUMBER_KEYS.has(key)) output[key] = Number(value)
    else output[key] = value
  }

  return output
}

const valuesFor = (data) => FIELDS.map(([key]) => data[key])

// ROUTES

applicants.get(
  '/',
  asyncHandler(async (request, response) => {
    const batchId = batchIdOf(request)
    await getBatchOrFail(sagutPool, batchId)
    const [rows] = await sagutPool.query('SELECT * FROM applicants WHERE batch_id = ? ORDER BY id', [batchId])
    response.json(rows.map(toApi))
  })
)

applicants.post(
  '/',
  asyncHandler(async (request, response) => {
    const batchId = batchIdOf(request)
    await getBatchOrFail(sagutPool, batchId, { requireOpen: true })
    const data = parseApplicant(request.body)

    const [result] = await sagutPool.query(
      `INSERT INTO applicants (${COLUMN_LIST}, batch_id) VALUES (${PLACEHOLDERS}, ?)`,
      [...valuesFor(data), batchId]
    )
    response.status(201).json({ id: result.insertId })
  })
)

applicants.put(
  '/:id',
  asyncHandler(async (request, response) => {
    const batchId = batchIdOf(request)
    const id = parseId(request.params.id, 'Applicant ID')
    await getBatchOrFail(sagutPool, batchId, { requireOpen: true })
    const data = parseApplicant(request.body)

    await sagutPool.query(
      `UPDATE applicants SET ${SET_LIST} WHERE id = ? AND batch_id = ?`,
      [...valuesFor(data), id, batchId]
    )

    const [rows] = await sagutPool.query('SELECT * FROM applicants WHERE id = ? AND batch_id = ?', [id, batchId])
    if (rows.length === 0) throw new HttpError(404, 'Applicant not found in this batch.')

    response.json(toApi(rows[0]))
  })
)

applicants.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (request, response) => {
    const batchId = batchIdOf(request)
    const id = parseId(request.params.id, 'Applicant ID')
    await getBatchOrFail(sagutPool, batchId, { requireOpen: true })

    const [result] = await sagutPool.query('DELETE FROM applicants WHERE id = ? AND batch_id = ?', [id, batchId])
    if (result.affectedRows === 0) throw new HttpError(404, 'Applicant not found in this batch.')

    response.status(204).end()
  })
)

const router = express.Router()
router.use('/batches', createBatchesRouter({ pool: sagutPool, program: 'SAGUT', applicantsRouter: applicants }))

module.exports = router
