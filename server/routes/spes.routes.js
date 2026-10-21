// Mounted at /api/spes (requireAuth is applied in app.js)
const express = require('express')

const { spesPool, withTransaction } = require('../db')
const { requireAdmin } = require('../auth/auth.middleware')
const { HttpError } = require('../errors')
const { asyncHandler } = require('../utils/async-handler')
const { parseId } = require('../utils/parse-id')
const { cleanItems, createCleaner } = require('../utils/program-record')

const fields = {
  lastName: 'last_name', firstName: 'first_name', middleName: 'middle_name', sex: 'sex', birthdate: 'birthdate',
  placeOfBirth: 'place_of_birth', civilStatus: 'civil_status', citizenship: 'citizenship', email: 'email',
  socialMediaAccount: 'social_media_account', gsisBeneficiary: 'gsis_beneficiary', gsisRelationship: 'gsis_relationship',
  contactNumber: 'contact_number', presentAddress: 'present_address', permanentAddress: 'permanent_address',
  applicantCategory: 'applicant_category', fatherName: 'father_name', fatherContactNo: 'father_contact_no',
  fatherOccupation: 'father_occupation', motherName: 'mother_name', motherContactNo: 'mother_contact_no',
  motherOccupation: 'mother_occupation', parentsLivingTogether: 'parents_living_together',
  parentsSoloParent: 'parents_solo_parent', parentsSeparated: 'parents_separated', parentsPwd: 'parents_pwd',
  parentsSeniorCitizen: 'parents_senior_citizen', parentsSugarPlantationWorker: 'parents_sugar_plantation_worker',
  parentsIndigenousPeople: 'parents_indigenous_people', parentsDisplacedWorker: 'parents_displaced_worker',
  parents4psBeneficiary: 'parents_4ps_beneficiary', parentsLocal: 'parents_local', parentsOfw: 'parents_ofw',
  specialSkills: 'special_skills', otherDoleInterventions: 'other_dole_interventions',
}
const educationFields = { level: 'level', schoolName: 'school_name', course: 'course', yearLevel: 'year_level', dateOfAttendance: 'date_of_attendance' }
const historyFields = { availmentNo: 'availment_no', establishmentName: 'establishment_name', yearAvailed: 'year_availed', spesIdNo: 'spes_id_no' }
const select = Object.entries(fields).map(([key, column]) => `${column} AS ${key}`).join(', ')
const booleans = Object.keys(fields).filter((key) => key.startsWith('parents'))
const clean = createCleaner(fields, { required: ['lastName', 'firstName', 'sex', 'birthdate', 'contactNumber', 'applicantCategory'], dateFields: ['birthdate'], booleanFields: booleans })
const cleanEducation = (items) => cleanItems(items, educationFields, { name: 'education' })
const cleanHistory = (items) => cleanItems(items, historyFields, { name: 'availmentHistory', numberFields: ['availmentNo'] })

const readOne = async (id, connection = spesPool) => {
  const [rows] = await connection.query(`SELECT id, ${select} FROM spes_applicants WHERE id = ?`, [id])
  if (!rows.length) throw new HttpError(404, 'SPES applicant not found.')
  const [education] = await connection.query('SELECT id, level, school_name AS schoolName, course, year_level AS yearLevel, date_of_attendance AS dateOfAttendance FROM spes_education WHERE applicant_id = ? ORDER BY id', [id])
  const [availmentHistory] = await connection.query('SELECT id, availment_no AS availmentNo, establishment_name AS establishmentName, year_availed AS yearAvailed, spes_id_no AS spesIdNo FROM spes_availment_history WHERE applicant_id = ? ORDER BY availment_no', [id])
  return { ...rows[0], education, availmentHistory }
}

const save = async (body, id = null) => withTransaction(spesPool, async (connection) => {
  const applicant = clean(body)
  const education = cleanEducation(body.education || [])
  const history = cleanHistory(body.availmentHistory || [])
  let applicantId = id
  if (id === null) {
    const [result] = await connection.query('INSERT INTO spes_applicants SET ?', applicant)
    applicantId = result.insertId
  } else {
    await readOne(id, connection)
    await connection.query('UPDATE spes_applicants SET ? WHERE id = ?', [applicant, id])
    await connection.query('DELETE FROM spes_education WHERE applicant_id = ?', [id])
    await connection.query('DELETE FROM spes_availment_history WHERE applicant_id = ?', [id])
  }
  for (const item of education) await connection.query('INSERT INTO spes_education SET ?', { ...item, applicant_id: applicantId })
  for (const item of history) await connection.query('INSERT INTO spes_availment_history SET ?', { ...item, applicant_id: applicantId })
  return readOne(applicantId, connection)
})

const router = express.Router()
router.get('/applicants', asyncHandler(async (request, response) => {
  const search = String(request.query.search || '').trim()
  const where = search
    ? `WHERE CONCAT_WS(' ', ${Object.values(fields).join(', ')}) LIKE ?
       OR EXISTS (
         SELECT 1 FROM spes_education education
         WHERE education.applicant_id = spes_applicants.id
           AND CONCAT_WS(' ', education.level, education.school_name, education.course, education.year_level, education.date_of_attendance) LIKE ?
       )
       OR EXISTS (
         SELECT 1 FROM spes_availment_history history
         WHERE history.applicant_id = spes_applicants.id
           AND CONCAT_WS(' ', history.establishment_name, history.year_availed, history.spes_id_no) LIKE ?
       )`
    : ''
  const parameters = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []
  const [rows] = await spesPool.query(`SELECT id, ${select} FROM spes_applicants ${where} ORDER BY id`, parameters)
  response.json(await Promise.all(rows.map((row) => readOne(row.id))))
}))
router.post('/applicants', asyncHandler(async (request, response) => response.status(201).json(await save(request.body))))
router.put('/applicants/:id', asyncHandler(async (request, response) => response.json(await save(request.body, parseId(request.params.id, 'Applicant ID')))))
router.delete('/applicants/:id', requireAdmin, asyncHandler(async (request, response) => {
  const id = parseId(request.params.id, 'Applicant ID')
  const [result] = await spesPool.query('DELETE FROM spes_applicants WHERE id = ?', [id])
  if (!result.affectedRows) throw new HttpError(404, 'SPES applicant not found.')
  response.status(204).end()
}))

module.exports = router
