// Mounted at /api/dilp (requireAuth is applied in app.js)
const express = require('express')
const { z } = require('zod')

const { dilpPool } = require('../db')
const { requireAdmin } = require('../auth/auth.middleware')
const { HttpError } = require('../errors')
const { asyncHandler } = require('../utils/async-handler')
const { parseId } = require('../utils/parse-id')
const { createBatchesRouter, getBatchOrFail } = require('../utils/program-batches')

const fields = {
  dateApplied: 'date_applied', projectName: 'project_name', projectLocation: 'project_location', projectType: 'project_type', projectComponent: 'project_component', implementationMode: 'implementation_mode',
  lastName: 'last_name', firstName: 'first_name', middleName: 'middle_name', nameExtension: 'name_extension', houseBlockLot: 'house_block_lot', street: 'street', barangay: 'barangay', municipality: 'municipality', province: 'province', sex: 'sex', civilStatus: 'civil_status', civilStatusOther: 'civil_status_other', birthdate: 'birthdate', birthplace: 'birthplace', disability: 'disability', disabilityOther: 'disability_other', contactNumber: 'contact_number', beneficiaryType: 'beneficiary_type', overseasWork: 'overseas_work', tesdaGraduate: 'tesda_graduate', tesdaCertificate: 'tesda_certificate', monthlyNetIncome: 'monthly_net_income', childrenCount: 'children_count', is4psBeneficiary: 'is_4ps_beneficiary', beneficiaryName: 'beneficiary_name', beneficiaryContactNumber: 'beneficiary_contact_number', is4psGraduate: 'is_4ps_graduate', idType: 'id_type', idNumber: 'id_number', hasCertIndigency: 'has_cert_indigency', facebook: 'facebook', instagram: 'instagram', email: 'email',
}
const required = ['dateApplied', 'projectName', 'projectType', 'projectComponent', 'implementationMode', 'lastName', 'firstName', 'barangay', 'municipality', 'sex', 'birthdate']
const dateFields = new Set(['dateApplied', 'birthdate'])
const numberFields = new Set(['monthlyNetIncome', 'childrenCount'])
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
// Applicants router: mounted by createBatchesRouter under /:batchId/applicants
const applicants = express.Router({ mergeParams: true })
const batchIdOf = (request) => parseId(request.params.batchId, 'Batch ID')
// Loads the batch (404 if missing); writes are blocked when the batch is closed.
const loadBatch = async (batchId, { write = false } = {}) => {
  const batch = await getBatchOrFail(dilpPool, batchId)
  if (write && batch && batch.status === 'closed') throw new HttpError(409, 'This batch is closed. Records are read-only.')
  return batch
}
const readOne = async (id, batchId) => {
  const [rows] = await dilpPool.query(`SELECT id, ${select} FROM applicants WHERE id = ? AND batch_id = ?`, [id, batchId])
  if (!rows.length) throw new HttpError(404, 'DILP applicant not found.')
  return rows[0]
}

applicants.get('/', asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  await loadBatch(batchId)
  const [rows] = await dilpPool.query(`SELECT id, ${select} FROM applicants WHERE batch_id = ? ORDER BY id`, [batchId])
  response.json(rows)
}))
applicants.post('/', asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  await loadBatch(batchId, { write: true })
  const [result] = await dilpPool.query('INSERT INTO applicants SET ?', { ...clean(request.body), batch_id: batchId })
  response.status(201).json({ id: result.insertId })
}))
applicants.put('/:id', asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  await loadBatch(batchId, { write: true })
  const id = parseId(request.params.id, 'Applicant ID')
  await readOne(id, batchId)
  await dilpPool.query('UPDATE applicants SET ? WHERE id = ? AND batch_id = ?', [clean(request.body), id, batchId])
  response.json(await readOne(id, batchId))
}))
applicants.delete('/:id', requireAdmin, asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  await loadBatch(batchId, { write: true })
  const id = parseId(request.params.id, 'Applicant ID')
  const [result] = await dilpPool.query('DELETE FROM applicants WHERE id = ? AND batch_id = ?', [id, batchId])
  if (!result.affectedRows) throw new HttpError(404, 'DILP applicant not found.')
  response.status(204).end()
}))

const router = express.Router()
router.use('/batches', createBatchesRouter({ pool: dilpPool, program: 'DILP', applicantsRouter: applicants }))

module.exports = router
