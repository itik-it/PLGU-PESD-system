// Mounted at /api/bridging (requireAuth is applied in app.js)
const express = require('express')

const { bridgingPool, withTransaction } = require('../db')
const { requireAdmin } = require('../auth/auth.middleware')
const { HttpError } = require('../errors')
const { asyncHandler } = require('../utils/async-handler')
const { parseId } = require('../utils/parse-id')
const { cleanItems, createCleaner } = require('../utils/program-record')
const { createBatchesRouter, getBatchOrFail } = require('../utils/program-batches')

const fields = {
  lastName: 'family_name', firstName: 'first_name', middleName: 'middle_name', street: 'street',
  barangay: 'barangay', municipality: 'municipality', province: 'province', mobileNo: 'mobile_no',
  email: 'email', birthTown: 'birth_town', birthCountry: 'birth_country', birthdate: 'birthdate',
  age: 'age', gender: 'gender', civilStatus: 'civil_status', motherFullName: 'mother_full_name',
  fatherFullName: 'father_full_name', currentStatus: 'current_status', isSpesBaby: 'is_spes_baby',
  spesYearOfEmployment: 'spes_year_of_employment', gwa: 'gwa', parentSoloParent: 'parent_solo_parent',
  parentPwd: 'parent_pwd', parentSeniorCitizen: 'parent_senior_citizen', parentIp: 'parent_ip',
  parentArmedConflictVictim: 'parent_armed_conflict_victim', parentRebelReturnee: 'parent_rebel_returnee',
  parentsCombinedMonthlyIncome: 'parents_combined_monthly_income', numberOfSiblings: 'number_of_siblings',
  isIndigentFamily: 'is_indigent_family',
}
const educationFields = { schoolName: 'school_name', yearFrom: 'year_from', yearTo: 'year_to', yearLevel: 'year_level' }
const select = Object.entries(fields).map(([key, column]) => `${column} AS ${key}`).join(', ')
const clean = createCleaner(fields, {
  required: ['lastName', 'firstName', 'mobileNo', 'barangay', 'municipality'],
  dateFields: ['birthdate'],
  numberFields: ['age', 'gwa', 'numberOfSiblings'],
  booleanFields: ['isSpesBaby', 'parentSoloParent', 'parentPwd', 'parentSeniorCitizen', 'parentIp', 'parentArmedConflictVictim', 'parentRebelReturnee', 'isIndigentFamily'],
})
const cleanEducation = (items) => cleanItems(items, educationFields, { name: 'education', numberFields: [] })

const readOne = async (id, batchId, connection = bridgingPool) => {
  const [rows] = await connection.query(`SELECT id, ${select} FROM bridging_applicants WHERE id = ? AND batch_id = ?`, [id, batchId])
  if (!rows.length) throw new HttpError(404, 'Bridging applicant not found.')
  const [education] = await connection.query('SELECT id, school_name AS schoolName, year_from AS yearFrom, year_to AS yearTo, year_level AS yearLevel FROM bridging_education WHERE applicant_id = ? ORDER BY id', [id])
  return { ...rows[0], education }
}

const save = async (body, batchId, id = null) => withTransaction(bridgingPool, async (connection) => {
  await getBatchOrFail(connection, batchId, { requireOpen: true })
  const applicant = clean(body)
  const education = cleanEducation(body.education || [])
  let applicantId = id
  if (id === null) {
    const [result] = await connection.query('INSERT INTO bridging_applicants SET ?', { ...applicant, batch_id: batchId })
    applicantId = result.insertId
  } else {
    await readOne(id, batchId, connection)
    await connection.query('UPDATE bridging_applicants SET ? WHERE id = ? AND batch_id = ?', [applicant, id, batchId])
    await connection.query('DELETE FROM bridging_education WHERE applicant_id = ?', [id])
  }
  for (const item of education) await connection.query('INSERT INTO bridging_education SET ?', { ...item, applicant_id: applicantId })
  return readOne(applicantId, batchId, connection)
})

const applicants = express.Router({ mergeParams: true })
const batchIdOf = (request) => parseId(request.params.batchId, 'Group ID')
applicants.get('/', asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  await getBatchOrFail(bridgingPool, batchId)
  const search = String(request.query.search || '').trim()
  const where = search
    ? `WHERE batch_id = ? AND (CONCAT_WS(' ', ${Object.values(fields).join(', ')}) LIKE ?
       OR EXISTS (
         SELECT 1 FROM bridging_education education
         WHERE education.applicant_id = bridging_applicants.id
           AND CONCAT_WS(' ', education.school_name, education.year_from, education.year_to, education.year_level) LIKE ?
       ))`
    : 'WHERE batch_id = ?'
  const parameters = search ? [batchId, `%${search}%`, `%${search}%`] : [batchId]
  const [rows] = await bridgingPool.query(`SELECT id, ${select} FROM bridging_applicants ${where} ORDER BY id`, parameters)
  const result = await Promise.all(rows.map((row) => readOne(row.id, batchId)))
  response.json(result)
}))
applicants.post('/', asyncHandler(async (request, response) => response.status(201).json(await save(request.body, batchIdOf(request)))))
applicants.put('/:id', asyncHandler(async (request, response) => response.json(await save(request.body, batchIdOf(request), parseId(request.params.id, 'Applicant ID')))))
applicants.delete('/:id', requireAdmin, asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  await getBatchOrFail(bridgingPool, batchId, { requireOpen: true })
  const id = parseId(request.params.id, 'Applicant ID')
  const [result] = await bridgingPool.query('DELETE FROM bridging_applicants WHERE id = ? AND batch_id = ?', [id, batchId])
  if (!result.affectedRows) throw new HttpError(404, 'Bridging applicant not found.')
  response.status(204).end()
}))

const router = express.Router()
router.use('/batches', createBatchesRouter({ pool: bridgingPool, program: 'BRIDGING', applicantsRouter: applicants, recordsTable: 'bridging_applicants' }))
module.exports = router
