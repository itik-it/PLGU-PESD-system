// Mounted at /api/jobseeker (requireAuth is applied in app.js)
const express = require('express')

const { jobseekerPool } = require('../db')
const { requireAdmin } = require('../auth/auth.middleware')
const { HttpError } = require('../errors')
const { asyncHandler } = require('../utils/async-handler')
const { parseId } = require('../utils/parse-id')
const { createCleaner } = require('../utils/program-record')

const fields = {
  lastName: 'surname', firstName: 'first_name', middleName: 'middle_name', suffix: 'suffix',
  birthdate: 'birthdate', sex: 'sex', placeOfBirth: 'place_of_birth', religion: 'religion',
  civilStatus: 'civil_status', height: 'height', houseNoStreet: 'house_no_street', village: 'village',
  barangay: 'barangay', municipalityCity: 'municipality_city', province: 'province', tin: 'tin',
  gsisSssIdNo: 'gsis_sss_id_no', pagibigNo: 'pagibig_no', philhealthNo: 'philhealth_no',
  email: 'email', landlineNumber: 'landline_number', cellphoneNumber: 'cellphone_number',
  disabilityVisual: 'disability_visual', disabilitySpeech: 'disability_speech',
  disabilityHearing: 'disability_hearing', disabilityPhysical: 'disability_physical',
  disabilityOthers: 'disability_others', disabilityOthersSpecify: 'disability_others_specify',
  employmentStatus: 'employment_status', laidoffAbroadCountry: 'laidoff_abroad_country',
  employmentOthersSpecify: 'employment_others_specify',
}
const select = Object.entries(fields).map(([key, column]) => `${column} AS ${key}`).join(', ')
const clean = createCleaner(fields, {
  required: ['lastName', 'firstName', 'birthdate', 'sex', 'barangay', 'municipalityCity'],
  dateFields: ['birthdate'],
  booleanFields: ['disabilityVisual', 'disabilitySpeech', 'disabilityHearing', 'disabilityPhysical', 'disabilityOthers'],
})

const readOne = async (id) => {
  const [rows] = await jobseekerPool.query(`SELECT id, ${select} FROM applicants WHERE id = ?`, [id])
  if (!rows.length) throw new HttpError(404, 'Job seeker not found.')
  return rows[0]
}

const router = express.Router()
router.get('/applicants', asyncHandler(async (request, response) => {
  const search = String(request.query.search || '').trim()
  const where = search ? `WHERE CONCAT_WS(' ', ${Object.values(fields).join(', ')}) LIKE ?` : ''
  const parameters = search ? [`%${search}%`] : []
  const [rows] = await jobseekerPool.query(`SELECT id, ${select} FROM applicants ${where} ORDER BY id`, parameters)
  response.json(rows)
}))
router.post('/applicants', asyncHandler(async (request, response) => {
  const [result] = await jobseekerPool.query('INSERT INTO applicants SET ?', clean(request.body))
  response.status(201).json({ id: result.insertId })
}))
router.put('/applicants/:id', asyncHandler(async (request, response) => {
  const id = parseId(request.params.id, 'Applicant ID')
  await readOne(id)
  await jobseekerPool.query('UPDATE applicants SET ? WHERE id = ?', [clean(request.body), id])
  response.json(await readOne(id))
}))
router.delete('/applicants/:id', requireAdmin, asyncHandler(async (request, response) => {
  const id = parseId(request.params.id, 'Applicant ID')
  const [result] = await jobseekerPool.query('DELETE FROM applicants WHERE id = ?', [id])
  if (!result.affectedRows) throw new HttpError(404, 'Job seeker not found.')
  response.status(204).end()
}))

module.exports = router
