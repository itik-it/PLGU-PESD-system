// Mounted at /api/guwip (requireAuth is applied in app.js)
//   /batches                         list / create / open-close
//   /batches/:batchId/applicants     applicants of ONE batch
const express = require('express')
const { guwipPool, withTransaction } = require('../db')
const { requireAdmin } = require('../auth/auth.middleware')
const { HttpError } = require('../errors')
const { asyncHandler } = require('../utils/async-handler')
const { parseId } = require('../utils/parse-id')
const { createBatchesRouter, getBatchOrFail } = require('../utils/program-batches')

const fields = {
  lastName: 'last_name', firstName: 'first_name', middleName: 'middle_name', nameExtension: 'name_extension',
  birthdate: 'birthdate', age: 'age', sex: 'sex', civilStatus: 'civil_status', street: 'street',
  barangay: 'barangay', municipality: 'municipality', province: 'province', zipCode: 'zip_code',
  mobileNumber: 'mobile_number', email: 'email', emergencyContactPerson: 'emergency_contact_person',
  emergencyRelationship: 'emergency_relationship', emergencyContactNumber: 'emergency_contact_number',
  highestEducation: 'highest_education', schoolName: 'school_name', course: 'course', major: 'major',
  yearGraduated: 'year_graduated', professionalLicense: 'professional_license', employer: 'employer',
  position: 'position', employmentType: 'employment_type', monthlyIncome: 'monthly_income', remarks: 'remarks',
}
const statusFields = {
  freshGraduate: 'Fresh Graduate', youngProfessional: 'Young Professional',
  firstTimeJobseeker: 'First Time Jobseeker', unemployed: 'Unemployed', underemployed: 'Underemployed',
}
const select = ['id', ...Object.entries(fields).map(([key, column]) => `${column} AS ${key}`)].join(', ')
const applicantData = (body) => Object.fromEntries(Object.entries(fields).map(([key, column]) => [column, body?.[key] === '' ? null : body?.[key] ?? null]))

const batchIdOf = (request) => parseId(request.params.batchId, 'Batch ID')

// Applicants of one batch (or just one applicant of that batch when applicantId is given).
async function readApplicants(batchId, applicantId = null) {
  const [rows] = await guwipPool.query(
    `SELECT ${select} FROM applicants WHERE batch_id = ? ${applicantId ? 'AND id = ?' : ''} ORDER BY id`,
    applicantId ? [batchId, applicantId] : [batchId]
  )
  if (!rows.length) return []
  const ids = rows.map((row) => row.id)
  const [statuses] = await guwipPool.query(
    `SELECT aes.applicant_id, es.status_name FROM applicant_employment_statuses aes
     JOIN employment_statuses es ON es.id = aes.employment_status_id WHERE aes.applicant_id IN (?)`, [ids]
  )
  const [trainings] = await guwipPool.query(
    `SELECT applicant_id, training_title AS title, number_of_hours AS hours, date_conducted AS dateConducted
     FROM applicant_trainings WHERE applicant_id IN (?) ORDER BY id`, [ids]
  )
  const statusById = Object.fromEntries(ids.map((id) => [id, {}]))
  statuses.forEach(({ applicant_id: id, status_name: name }) => {
    const key = Object.entries(statusFields).find(([, label]) => label === name)?.[0]
    if (key) statusById[id][key] = true
  })
  const trainingById = Object.fromEntries(ids.map((id) => [id, []]))
  trainings.forEach((training) => trainingById[training.applicant_id].push({
    title: training.title, hours: training.hours === null ? '' : Number(training.hours), dateConducted: training.dateConducted || '',
  }))
  return rows.map((row) => ({ ...row, ...statusById[row.id], trainings: trainingById[row.id] }))
}

async function readOne(batchId, applicantId) {
  const [row] = await readApplicants(batchId, applicantId)
  if (!row) throw new HttpError(404, 'Applicant not found in this batch.')
  return row
}

async function saveApplicant(id, batchId, body) {
  return withTransaction(guwipPool, async (connection) => {
    await getBatchOrFail(connection, batchId, { requireOpen: true })

    let applicantId = id
    if (id === null) {
      const [result] = await connection.query('INSERT INTO applicants SET ?', { ...applicantData(body), batch_id: batchId })
      applicantId = result.insertId
    } else {
      const [existing] = await connection.query('SELECT id FROM applicants WHERE id = ? AND batch_id = ? FOR UPDATE', [id, batchId])
      if (!existing.length) throw new HttpError(404, 'Applicant not found in this batch.')
      await connection.query('UPDATE applicants SET ? WHERE id = ?', [applicantData(body), id])
      await connection.query('DELETE FROM applicant_employment_statuses WHERE applicant_id = ?', [id])
      await connection.query('DELETE FROM applicant_trainings WHERE applicant_id = ?', [id])
    }
    const [statusRows] = await connection.query('SELECT id, status_name FROM employment_statuses WHERE is_active = TRUE')
    for (const [key, label] of Object.entries(statusFields)) {
      if (body?.[key]) {
        const status = statusRows.find((row) => row.status_name === label)
        if (status) await connection.query('INSERT INTO applicant_employment_statuses SET ?', { applicant_id: applicantId, employment_status_id: status.id })
      }
    }
    for (const training of body?.trainings || []) {
      if (String(training.title || '').trim()) {
        await connection.query('INSERT INTO applicant_trainings SET ?', {
          applicant_id: applicantId, training_title: training.title, number_of_hours: training.hours || null, date_conducted: training.dateConducted || null,
        })
      }
    }
    return applicantId
  })
}

// mergeParams lets this router see :batchId from the parent route.
const applicants = express.Router({ mergeParams: true })

applicants.get('/', asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  await getBatchOrFail(guwipPool, batchId)
  response.json(await readApplicants(batchId))
}))
applicants.post('/', asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  const id = await saveApplicant(null, batchId, request.body)
  response.status(201).json(await readOne(batchId, id))
}))
applicants.put('/:id', asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  const id = parseId(request.params.id, 'Applicant ID')
  await saveApplicant(id, batchId, request.body)
  response.json(await readOne(batchId, id))
}))
applicants.delete('/:id', requireAdmin, asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  const id = parseId(request.params.id, 'Applicant ID')
  await getBatchOrFail(guwipPool, batchId, { requireOpen: true })
  const [result] = await guwipPool.query('DELETE FROM applicants WHERE id = ? AND batch_id = ?', [id, batchId])
  if (!result.affectedRows) throw new HttpError(404, 'Applicant not found in this batch.')
  response.status(204).end()
}))

const router = express.Router()
router.use('/batches', createBatchesRouter({ pool: guwipPool, program: 'GUWIP', applicantsRouter: applicants }))

module.exports = router
