// Mounted at /api/ofw (requireAuth is applied in app.js)
//   /batches                         list / create / open-close
//   /batches/:batchId/applicants     OFW records of ONE batch
const express = require('express')
const { z } = require('zod')

const { ofwPool } = require('../db')
const { requireAdmin } = require('../auth/auth.middleware')
const { HttpError } = require('../errors')
const { asyncHandler } = require('../utils/async-handler')
const { parseId } = require('../utils/parse-id')
const { createBatchesRouter, getBatchOrFail } = require('../utils/program-batches')

const fields = {
  ofwStatus: 'ofw_status', lastName: 'last_name', firstName: 'first_name', nameExtension: 'name_extension',
  middleName: 'middle_name', barangay: 'barangay', municipality: 'municipality', passportNumber: 'passport_number',
  owwaMember: 'owwa_member', birthdate: 'birthdate', age: 'age', sex: 'sex', ethnicity: 'ethnicity', religion: 'religion',
  civilStatus: 'civil_status', childrenCount: 'children_count', educationalAttainment: 'educational_attainment',
  cellphoneNumber: 'cellphone_number', email: 'email', facebook: 'facebook', workNature: 'work_nature', occupation: 'occupation',
  monthlyIncome: 'monthly_income', countryOfWork: 'country_of_work', employerName: 'employer_name', employerAddress: 'employer_address',
  foreignAgencyName: 'foreign_agency_name', foreignAgencyAddress: 'foreign_agency_address', localAgency: 'local_agency',
  clienteleCategory: 'clientele_category', preexistingHealthCondition: 'preexisting_health_condition', emergencyContactName: 'emergency_contact_name',
  emergencyContactNumber: 'emergency_contact_number', emergencyRelationship: 'emergency_relationship', emergencyRelationshipOther: 'emergency_relationship_other',
  employmentStatus: 'employment_status', yearsAbroad: 'years_abroad', arrivalDate: 'arrival_date', repatriationNature: 'repatriation_nature',
}
const required = ['ofwStatus', 'lastName', 'firstName', 'barangay', 'municipality']
const dateFields = new Set(['birthdate', 'arrivalDate'])
const numberFields = new Set(['age', 'childrenCount', 'monthlyIncome', 'yearsAbroad'])
const select = Object.entries(fields).map(([key, column]) => `${column} AS ${key}`).join(', ')

const schema = z.object(Object.fromEntries(Object.keys(fields).map((key) => [key, z.any().optional()])))
const clean = (body) => {
  const parsed = schema.parse(body || {})
  for (const key of required) if (!String(parsed[key] ?? '').trim()) throw new HttpError(400, `${key} is required.`)
  const data = {}
  for (const [key, column] of Object.entries(fields)) {
    const value = parsed[key]
    if (value === '' || value === undefined || value === null) data[column] = null
    else if (dateFields.has(key)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value)) || String(value) > new Date().toISOString().slice(0, 10)) throw new HttpError(400, `${key} must be a valid date.`)
      data[column] = value
    } else if (numberFields.has(key)) {
      const number = Number(value)
      if (!Number.isFinite(number) || number < 0) throw new HttpError(400, `${key} must be a non-negative number.`)
      data[column] = number
    } else data[column] = String(value).trim()
  }
  return data
}

const batchIdOf = (request) => parseId(request.params.batchId, 'Batch ID')

const readOne = async (id, batchId) => {
  const [rows] = await ofwPool.query(`SELECT id, ${select} FROM applicants WHERE id = ? AND batch_id = ?`, [id, batchId])
  if (!rows.length) throw new HttpError(404, 'OFW record not found in this batch.')
  return rows[0]
}

// mergeParams lets this router see :batchId from the parent route.
const applicants = express.Router({ mergeParams: true })

applicants.get('/', asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  await getBatchOrFail(ofwPool, batchId)
  const [rows] = await ofwPool.query(`SELECT id, ${select} FROM applicants WHERE batch_id = ? ORDER BY id`, [batchId])
  response.json(rows)
}))
applicants.post('/', asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  await getBatchOrFail(ofwPool, batchId, { requireOpen: true })
  const [result] = await ofwPool.query('INSERT INTO applicants SET ?', { ...clean(request.body), batch_id: batchId })
  response.status(201).json({ id: result.insertId })
}))
applicants.put('/:id', asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  const id = parseId(request.params.id, 'Applicant ID')
  await getBatchOrFail(ofwPool, batchId, { requireOpen: true })
  await readOne(id, batchId)
  await ofwPool.query('UPDATE applicants SET ? WHERE id = ? AND batch_id = ?', [clean(request.body), id, batchId])
  response.json(await readOne(id, batchId))
}))
applicants.delete('/:id', requireAdmin, asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  const id = parseId(request.params.id, 'Applicant ID')
  await getBatchOrFail(ofwPool, batchId, { requireOpen: true })
  const [result] = await ofwPool.query('DELETE FROM applicants WHERE id = ? AND batch_id = ?', [id, batchId])
  if (!result.affectedRows) throw new HttpError(404, 'OFW record not found in this batch.')
  response.status(204).end()
}))

const router = express.Router()
router.use('/batches', createBatchesRouter({ pool: ofwPool, program: 'OFW', applicantsRouter: applicants }))

module.exports = router
