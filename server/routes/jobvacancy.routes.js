// Mounted at /api/jobvacancy (requireAuth is applied in app.js)
const express = require('express')

const { jobvacancyPool, withTransaction } = require('../db')
const { requireAdmin } = require('../auth/auth.middleware')
const { HttpError } = require('../errors')
const { asyncHandler } = require('../utils/async-handler')
const { parseId } = require('../utils/parse-id')
const { cleanItems, createCleaner } = require('../utils/program-record')
const { createBatchesRouter, getBatchOrFail } = require('../utils/program-batches')

const fields = {
  businessName: 'business_name', tradeName: 'trade_name', acronym: 'acronym', officeType: 'office_type',
  tin: 'tin', employerType: 'employer_type', employerSector: 'employer_sector', workForceSize: 'work_force_size',
  lineOfBusiness: 'line_of_business', streetVillage: 'street_village', barangay: 'barangay',
  municipalityCity: 'municipality_city', province: 'province', ownerFullName: 'owner_full_name',
  contactPerson: 'contact_person', contactPosition: 'contact_position', telephoneNumber: 'telephone_number',
  mobileNumber: 'mobile_number', faxNumber: 'fax_number', email: 'email',
}
const vacancyFields = {
  positionTitle: 'position_title', jobDescription: 'job_description', natureOfWork: 'nature_of_work',
  placeOfWork: 'place_of_work', salary: 'salary', vacancyCount: 'vacancy_count',
}
const select = Object.entries(fields).map(([key, column]) => `${column} AS ${key}`).join(', ')
const clean = createCleaner(fields, { required: ['businessName', 'barangay', 'municipalityCity', 'contactPerson'] })
const cleanVacancies = (items) => cleanItems(items, vacancyFields, { name: 'vacancies', numberFields: ['vacancyCount'] })

const readOne = async (id, batchId, connection = jobvacancyPool) => {
  const [rows] = await connection.query(`SELECT id, ${select} FROM jobvacancy_employers WHERE id = ? AND batch_id = ?`, [id, batchId])
  if (!rows.length) throw new HttpError(404, 'Employer not found.')
  const [vacancies] = await connection.query('SELECT id, position_title AS positionTitle, job_description AS jobDescription, nature_of_work AS natureOfWork, place_of_work AS placeOfWork, salary, vacancy_count AS vacancyCount FROM jobvacancy_vacancies WHERE employer_id = ? ORDER BY id', [id])
  return { ...rows[0], vacancies }
}

const save = async (body, batchId, id = null) => withTransaction(jobvacancyPool, async (connection) => {
  await getBatchOrFail(connection, batchId, { requireOpen: true })
  const employer = clean(body)
  const vacancies = cleanVacancies(body.vacancies || [])
  let employerId = id
  if (id === null) {
    const [result] = await connection.query('INSERT INTO jobvacancy_employers SET ?', { ...employer, batch_id: batchId })
    employerId = result.insertId
  } else {
    await readOne(id, batchId, connection)
    await connection.query('UPDATE jobvacancy_employers SET ? WHERE id = ? AND batch_id = ?', [employer, id, batchId])
    await connection.query('DELETE FROM jobvacancy_vacancies WHERE employer_id = ?', [id])
  }
  for (const vacancy of vacancies) await connection.query('INSERT INTO jobvacancy_vacancies SET ?', { ...vacancy, employer_id: employerId })
  return readOne(employerId, batchId, connection)
})

const employers = express.Router({ mergeParams: true })
const batchIdOf = (request) => parseId(request.params.batchId, 'Group ID')
employers.get('/', asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  await getBatchOrFail(jobvacancyPool, batchId)
  const search = String(request.query.search || '').trim()
  const where = search
    ? `WHERE batch_id = ? AND (CONCAT_WS(' ', ${Object.values(fields).join(', ')}) LIKE ?
       OR EXISTS (
         SELECT 1 FROM jobvacancy_vacancies vacancy
         WHERE vacancy.employer_id = jobvacancy_employers.id
           AND CONCAT_WS(' ', vacancy.position_title, vacancy.job_description, vacancy.nature_of_work, vacancy.place_of_work, vacancy.salary, vacancy.vacancy_count) LIKE ?
       ))`
    : 'WHERE batch_id = ?'
  const parameters = search ? [batchId, `%${search}%`, `%${search}%`] : [batchId]
  const [rows] = await jobvacancyPool.query(`SELECT id, ${select} FROM jobvacancy_employers ${where} ORDER BY id`, parameters)
  response.json(await Promise.all(rows.map((row) => readOne(row.id, batchId))))
}))
employers.post('/', asyncHandler(async (request, response) => response.status(201).json(await save(request.body, batchIdOf(request)))))
employers.put('/:id', asyncHandler(async (request, response) => response.json(await save(request.body, batchIdOf(request), parseId(request.params.id, 'Employer ID')))))
employers.delete('/:id', requireAdmin, asyncHandler(async (request, response) => {
  const batchId = batchIdOf(request)
  await getBatchOrFail(jobvacancyPool, batchId, { requireOpen: true })
  const id = parseId(request.params.id, 'Employer ID')
  const [result] = await jobvacancyPool.query('DELETE FROM jobvacancy_employers WHERE id = ? AND batch_id = ?', [id, batchId])
  if (!result.affectedRows) throw new HttpError(404, 'Employer not found.')
  response.status(204).end()
}))

const router = express.Router()
router.use('/batches', createBatchesRouter({ pool: jobvacancyPool, program: 'JOB VACANCY', applicantsRouter: employers, recordsTable: 'jobvacancy_employers' }))
module.exports = router
