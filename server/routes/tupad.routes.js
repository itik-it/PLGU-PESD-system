// Mounted at /api/tupad (requireAuth is applied in app.js)
//   /batches                         list / create / open-close
//   /batches/:batchId/applicants     applicants of ONE batch
const express = require('express')
const { z } = require('zod')

const { tupadPool } = require('../db')
const { requireAdmin } = require('../auth/auth.middleware')
const { HttpError } = require('../errors')
const { asyncHandler } = require('../utils/async-handler')
const { parseId } = require('../utils/parse-id')
const { createBatchesRouter, getBatchOrFail } = require('../utils/program-batches')

const fields = {
  lastName: 'last_name', firstName: 'first_name', middleName: 'middle_name', nameExtension: 'name_extension',
  birthdate: 'birthdate', address: 'address', idType: 'id_type', idNumber: 'id_number', contactNumber: 'contact_number',
  occupation: 'occupation', sex: 'sex', civilStatus: 'civil_status', averageMonthlyIncome: 'average_monthly_income',
  beneficiaryType: 'beneficiary_type', beneficiaryLastName: 'beneficiary_last_name', beneficiaryFirstName: 'beneficiary_first_name',
  beneficiaryMiddleName: 'beneficiary_middle_name', skillsTrainingNeed: 'skills_training_need', yearLevel: 'year_level', remarks: 'remarks',
}
const required = ['lastName', 'firstName', 'birthdate', 'address', 'sex', 'civilStatus', 'beneficiaryType', 'beneficiaryLastName', 'beneficiaryFirstName']
const numberFields = new Set(['averageMonthlyIncome'])
const select = Object.entries(fields).map(([key, column]) => `${column} AS ${key}`).join(', ')
const schema = z.object(Object.fromEntries(Object.keys(fields).map((key) => [key, z.any().optional()])))

const clean = (body) => {
  const parsed = schema.parse(body || {})
  for (const key of required) if (!String(parsed[key] ?? '').trim()) throw new HttpError(400, `${key} is required.`)

  const data = {}
  for (const [key, column] of Object.entries(fields)) {
    const value = parsed[key]
    if (value === '' || value === undefined || value === null) data[column] = null
    else if (key === 'birthdate') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value)) || String(value) > new Date().toISOString().slice(0, 10)) {
        throw new HttpError(400, 'birthdate must be a valid date and cannot be in the future.')
      }
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
  const [rows] = await tupadPool.query(`SELECT id, ${select} FROM applicants WHERE id = ? AND batch_id = ?`, [id, batchId])
  if (!rows.length) throw new HttpError(404, 'TUPAD applicant not found in this batch.')
  return rows[0]
}

// mergeParams lets this router see :batchId from the parent route.
const applicants = express.Router({ mergeParams: true })

applicants.get('/', asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  await getBatchOrFail(tupadPool, batchId)
  const [rows] = await tupadPool.query(`SELECT id, ${select} FROM applicants WHERE batch_id = ? ORDER BY id`, [batchId])
  response.json(rows)
}))

applicants.post('/', asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  await getBatchOrFail(tupadPool, batchId, { requireOpen: true })
  const [result] = await tupadPool.query('INSERT INTO applicants SET ?', { ...clean(request.body), batch_id: batchId })
  response.status(201).json({ id: result.insertId })
}))

applicants.put('/:id', asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  const id = parseId(request.params.id, 'Applicant ID')
  await getBatchOrFail(tupadPool, batchId, { requireOpen: true })
  await readOne(id, batchId)
  await tupadPool.query('UPDATE applicants SET ? WHERE id = ? AND batch_id = ?', [clean(request.body), id, batchId])
  response.json(await readOne(id, batchId))
}))

applicants.delete('/:id', requireAdmin, asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  const id = parseId(request.params.id, 'Applicant ID')
  await getBatchOrFail(tupadPool, batchId, { requireOpen: true })
  const [result] = await tupadPool.query('DELETE FROM applicants WHERE id = ? AND batch_id = ?', [id, batchId])
  if (!result.affectedRows) throw new HttpError(404, 'TUPAD applicant not found in this batch.')
  response.status(204).end()
}))

const router = express.Router()
router.use('/batches', createBatchesRouter({ pool: tupadPool, program: 'TUPAD', applicantsRouter: applicants }))

module.exports = router
