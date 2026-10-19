// Mounted at /api/trpatu (requireAuth is applied in app.js)
//   /batches                         list / create / open-close
//   /batches/:batchId/applicants     applicants of ONE batch
const express = require('express')
const { trpatuPool, withTransaction } = require('../db')
const { requireAdmin } = require('../auth/auth.middleware')
const { HttpError } = require('../errors')
const { asyncHandler } = require('../utils/async-handler')
const { parseId } = require('../utils/parse-id')
const { createBatchesRouter, getBatchOrFail } = require('../utils/program-batches')

const applicantFields = {
  lastName: 'last_name', firstName: 'first_name', middleName: 'middle_name', nameExtension: 'name_extension',
  birthdate: 'birthdate', address: 'address', idType: 'id_type', idNumber: 'id_number', contactNumber: 'contact_number',
  occupation: 'occupation', sex: 'sex', civilStatus: 'civil_status', averageMonthlyIncome: 'average_monthly_income', remarks: 'remarks',
}
const beneficiaryFields = {
  beneficiaryType: 'beneficiary_type', beneficiaryFirstName: 'first_name', beneficiaryMiddleName: 'middle_name',
  beneficiaryLastName: 'last_name', skillsTrainingNeed: 'skills_training_need', yearLevel: 'year_level',
}
const select = `a.id, ${Object.entries(applicantFields).map(([key, column]) => `a.${column} AS ${key}`).join(', ')},
  b.beneficiary_type AS beneficiaryType, b.first_name AS beneficiaryFirstName, b.middle_name AS beneficiaryMiddleName,
  b.last_name AS beneficiaryLastName, b.skills_training_need AS skillsTrainingNeed, b.year_level AS yearLevel`
const values = (body, map) => Object.fromEntries(Object.entries(map).map(([key, column]) => [column, body?.[key] === '' ? null : body?.[key] ?? null]))

const batchIdOf = (request) => parseId(request.params.batchId, 'Batch ID')

async function findOne(pool, id, batchId) {
  const [rows] = await pool.query(
    `SELECT ${select} FROM applicants a LEFT JOIN beneficiaries b ON b.applicant_id = a.id WHERE a.id = ? AND a.batch_id = ?`,
    [id, batchId]
  )
  if (!rows.length) throw new HttpError(404, 'Applicant not found in this batch.')
  return rows[0]
}

// mergeParams lets this router see :batchId from the parent route.
const applicants = express.Router({ mergeParams: true })

applicants.get('/', asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  await getBatchOrFail(trpatuPool, batchId)
  const [rows] = await trpatuPool.query(
    `SELECT ${select} FROM applicants a LEFT JOIN beneficiaries b ON b.applicant_id = a.id WHERE a.batch_id = ? ORDER BY a.id`,
    [batchId]
  )
  response.json(rows)
}))

applicants.post('/', asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  const id = await withTransaction(trpatuPool, async (connection) => {
    await getBatchOrFail(connection, batchId, { requireOpen: true })
    const [result] = await connection.query('INSERT INTO applicants SET ?', { ...values(request.body, applicantFields), batch_id: batchId })
    await connection.query('INSERT INTO beneficiaries SET ?', { applicant_id: result.insertId, ...values(request.body, beneficiaryFields) })
    return result.insertId
  })
  response.status(201).json(await findOne(trpatuPool, id, batchId))
}))

applicants.put('/:id', asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  const id = parseId(request.params.id, 'Applicant ID')
  await withTransaction(trpatuPool, async (connection) => {
    await getBatchOrFail(connection, batchId, { requireOpen: true })
    const [existing] = await connection.query('SELECT id FROM applicants WHERE id = ? AND batch_id = ? FOR UPDATE', [id, batchId])
    if (!existing.length) throw new HttpError(404, 'Applicant not found in this batch.')
    await connection.query('UPDATE applicants SET ? WHERE id = ?', [values(request.body, applicantFields), id])
    await connection.query('DELETE FROM beneficiaries WHERE applicant_id = ?', [id])
    await connection.query('INSERT INTO beneficiaries SET ?', { applicant_id: id, ...values(request.body, beneficiaryFields) })
  })
  response.json(await findOne(trpatuPool, id, batchId))
}))

applicants.delete('/:id', requireAdmin, asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  const id = parseId(request.params.id, 'Applicant ID')
  await getBatchOrFail(trpatuPool, batchId, { requireOpen: true })
  const [result] = await trpatuPool.query('DELETE FROM applicants WHERE id = ? AND batch_id = ?', [id, batchId])
  if (!result.affectedRows) throw new HttpError(404, 'Applicant not found in this batch.')
  response.status(204).end()
}))

const router = express.Router()
router.use('/batches', createBatchesRouter({ pool: trpatuPool, program: 'TRPATU', applicantsRouter: applicants }))

module.exports = router
