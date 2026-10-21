// Mounted at /api/jobvacancy (requireAuth is applied in app.js)
const express = require('express')

const { jobvacancyPool, withTransaction } = require('../db')
const { requireAdmin } = require('../auth/auth.middleware')
const { HttpError } = require('../errors')
const { asyncHandler } = require('../utils/async-handler')
const { parseId } = require('../utils/parse-id')
const { cleanItems, createCleaner } = require('../utils/program-record')

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

const readOne = async (id, connection = jobvacancyPool) => {
  const [rows] = await connection.query(`SELECT id, ${select} FROM jobvacancy_employers WHERE id = ?`, [id])
  if (!rows.length) throw new HttpError(404, 'Employer not found.')
  const [vacancies] = await connection.query('SELECT id, position_title AS positionTitle, job_description AS jobDescription, nature_of_work AS natureOfWork, place_of_work AS placeOfWork, salary, vacancy_count AS vacancyCount FROM jobvacancy_vacancies WHERE employer_id = ? ORDER BY id', [id])
  return { ...rows[0], vacancies }
}

const save = async (body, id = null) => withTransaction(jobvacancyPool, async (connection) => {
  const employer = clean(body)
  const vacancies = cleanVacancies(body.vacancies || [])
  let employerId = id
  if (id === null) {
    const [result] = await connection.query('INSERT INTO jobvacancy_employers SET ?', employer)
    employerId = result.insertId
  } else {
    await readOne(id, connection)
    await connection.query('UPDATE jobvacancy_employers SET ? WHERE id = ?', [employer, id])
    await connection.query('DELETE FROM jobvacancy_vacancies WHERE employer_id = ?', [id])
  }
  for (const vacancy of vacancies) await connection.query('INSERT INTO jobvacancy_vacancies SET ?', { ...vacancy, employer_id: employerId })
  return readOne(employerId, connection)
})

const router = express.Router()
router.get('/employers', asyncHandler(async (_request, response) => {
  const [rows] = await jobvacancyPool.query(`SELECT id, ${select} FROM jobvacancy_employers ORDER BY id`)
  response.json(await Promise.all(rows.map((row) => readOne(row.id))))
}))
router.post('/employers', asyncHandler(async (request, response) => response.status(201).json(await save(request.body))))
router.put('/employers/:id', asyncHandler(async (request, response) => response.json(await save(request.body, parseId(request.params.id, 'Employer ID')))))
router.delete('/employers/:id', requireAdmin, asyncHandler(async (request, response) => {
  const id = parseId(request.params.id, 'Employer ID')
  const [result] = await jobvacancyPool.query('DELETE FROM jobvacancy_employers WHERE id = ?', [id])
  if (!result.affectedRows) throw new HttpError(404, 'Employer not found.')
  response.status(204).end()
}))

module.exports = router
